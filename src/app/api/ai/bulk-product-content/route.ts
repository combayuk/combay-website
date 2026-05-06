import { prisma, withDatabase } from "@/lib/db";
import { generateGeminiProductContent } from "@/lib/geminiProductWriter";

export const dynamic = "force-dynamic";

type QueueMode = "missing" | "ebay" | "oldest";

const FALLBACK_PHRASES = [
  "imported from active ebay listing",
  "imported from ebay listing",
  "imported from active listing",
];

function compact(value?: string | null) {
  return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function hasFallback(value?: string | null) {
  const text = compact(value).toLowerCase();
  return FALLBACK_PHRASES.some((phrase) => text.includes(phrase));
}

function isWeak(value?: string | null, min = 50) {
  const text = compact(value);
  return text.length < min || hasFallback(text);
}

function normaliseMode(value: unknown): QueueMode {
  if (value === "ebay" || value === "oldest" || value === "missing") return value;
  return "missing";
}

function normaliseBatchSize(value: unknown) {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed)) return 3;
  return Math.max(1, Math.min(10, parsed));
}

function productWhere(mode: QueueMode) {
  const active = { status: { not: "ARCHIVED" as const } };
  const missingContent = {
    OR: [
      { productOverview: null },
      { productOverview: "" },
      { productOverview: { contains: "Imported from active eBay listing", mode: "insensitive" as const } },
      { seoTitle: null },
      { seoTitle: "" },
      { seoDescription: null },
      { seoDescription: "" },
      { seoKeywords: null },
      { seoKeywords: "" },
      { description: null },
      { description: "" },
      { description: { contains: "Imported from active eBay listing", mode: "insensitive" as const } },
    ],
  };

  if (mode === "ebay") {
    return {
      AND: [
        active,
        { OR: [{ source: { contains: "ebay", mode: "insensitive" as const } }, { ebayItemId: { not: null } }] },
        missingContent,
      ],
    };
  }

  if (mode === "oldest") return active;
  return { AND: [active, missingContent] };
}

type ProductRecord = Awaited<ReturnType<typeof prisma.product.findMany>>[number] & {
  category?: { name: string; slug: string } | null;
  specs?: { label: string; value: string; sortOrder: number }[];
  tags?: { name: string }[];
};

function needsGeneration(product: ProductRecord, mode: QueueMode) {
  if (mode === "oldest") return true;
  return (
    isWeak(product.productOverview, 60) ||
    isWeak(product.seoTitle, 20) ||
    isWeak(product.seoDescription, 70) ||
    isWeak(product.seoKeywords, 10) ||
    isWeak(product.description, 35)
  );
}

function includeProduct() {
  return {
    category: true,
    specs: { orderBy: { sortOrder: "asc" as const } },
    tags: true,
  };
}

function selectQueue(products: ProductRecord[], mode: QueueMode, batchSize: number) {
  const filtered = products.filter((product) => needsGeneration(product, mode));
  return { totalNeedingWork: filtered.length, selected: filtered.slice(0, batchSize) };
}

async function fetchQueue(mode: QueueMode, batchSize: number) {
  // Pull a wider window than the requested batch so client-side quality checks can skip already-useful records.
  return prisma.product.findMany({
    where: productWhere(mode) as any,
    include: includeProduct(),
    orderBy: mode === "oldest" ? { updatedAt: "asc" } : { sku: "asc" },
    take: mode === "oldest" ? Math.max(25, batchSize * 3) : 500,
  }) as Promise<ProductRecord[]>;
}

function productLabel(product: ProductRecord) {
  return `${product.sku} — ${product.title}`;
}

async function saveTags(productId: string, tags: string[]) {
  const cleanTags = Array.from(new Set(tags.map(compact).filter(Boolean))).slice(0, 20);
  if (!cleanTags.length) return;

  const tagRecords = [];
  for (const tag of cleanTags) {
    tagRecords.push(await prisma.tag.upsert({ where: { name: tag }, update: {}, create: { name: tag } }));
  }

  await prisma.product.update({
    where: { id: productId },
    data: { tags: { set: tagRecords.map((tag) => ({ id: tag.id })) } },
  });
}

async function generateForProduct(product: ProductRecord) {
  const suggestion = await generateGeminiProductContent({
    title: product.title,
    sku: product.sku,
    brand: product.brand,
    manufacturer: product.manufacturer,
    model: product.model,
    mpn: product.mpn,
    category: product.category?.name ?? null,
    condition: product.condition,
    description: product.rawEbayDescription || product.description,
    productOverview: product.productOverview,
    itemLocation: product.itemLocation,
    specs: (product.specs ?? []).map((spec) => ({ label: spec.label, value: spec.value })),
    tags: (product.tags ?? []).map((tag) => tag.name),
  }, "all");

  const description = !product.description || hasFallback(product.description) || compact(product.description).length < 35
    ? suggestion.description
    : product.description;

  await prisma.product.update({
    where: { id: product.id },
    data: {
      description,
      productOverview: suggestion.productOverview || product.productOverview,
      seoTitle: suggestion.seoTitle || product.seoTitle,
      seoDescription: suggestion.seoDescription || product.seoDescription,
      seoKeywords: suggestion.tags.join(", "),
    },
  });
  await saveTags(product.id, suggestion.tags);

  return { sku: product.sku, title: product.title, provider: suggestion.provider, model: suggestion.model, note: suggestion.note };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as any;
  const action = body?.action === "generate" ? "generate" : "queue";
  const mode = normaliseMode(body?.mode);
  const batchSize = normaliseBatchSize(body?.batchSize);

  const dbResult = await withDatabase(async () => {
    const products = await fetchQueue(mode, batchSize);
    const { totalNeedingWork, selected } = selectQueue(products, mode, batchSize);

    if (action === "queue") {
      return {
        mode,
        batchSize,
        totalScanned: products.length,
        totalNeedingWork,
        preview: selected.map((product) => ({ id: product.id, sku: product.sku, title: product.title, category: product.category?.name ?? "Uncategorised" })),
      };
    }

    const updated: Array<{ sku: string; title: string; provider?: string; model?: string; note?: string }> = [];
    const errors: Array<{ sku: string; title: string; error: string }> = [];

    for (const product of selected) {
      try {
        updated.push(await generateForProduct(product));
      } catch (error) {
        errors.push({ sku: product.sku, title: product.title, error: error instanceof Error ? error.message : "AI generation failed." });
      }
    }

    return {
      mode,
      batchSize,
      totalScanned: products.length,
      totalNeedingWork,
      processed: selected.length,
      updated,
      errors,
      message: `Bulk AI run complete. Scanned ${products.length}; found ${totalNeedingWork} needing work; processed ${selected.length}; updated ${updated.length}; errors ${errors.length}.`,
    };
  });

  if (!dbResult.ok) {
    return Response.json({ ok: false, error: dbResult.reason }, { status: 500 });
  }

  return Response.json({ ok: true, ...dbResult.data });
}
