import { getProductsFromRepository } from "@/lib/productRepository";
import { prisma, withDatabase } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const condition = searchParams.get("condition") ?? "";
  const priceMinRaw = searchParams.get("priceMin");
  const priceMaxRaw = searchParams.get("priceMax");
  const priceMin = priceMinRaw ? Number(priceMinRaw) : null;
  const priceMax = priceMaxRaw ? Number(priceMaxRaw) : null;

  const result = await getProductsFromRepository({
    query: q,
    category,
    condition,
    priceMin: Number.isFinite(priceMin) ? priceMin : null,
    priceMax: Number.isFinite(priceMax) ? priceMax : null,
  });

  return Response.json({
    ok: true,
    source: result.source,
    message: result.message,
    count: result.products.length,
    total: result.total,
    categories: result.categories,
    products: result.products,
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as any;

  if (!body?.title || !body?.sku) {
    return Response.json({ ok: false, error: "Product title and SKU are required." }, { status: 400 });
  }

  const dbResult = await withDatabase(async () => {
    let categoryId: string | undefined;
    if (body.category || body.categorySlug) {
      const category = await prisma.category.upsert({
        where: { slug: body.categorySlug || String(body.category).toLowerCase().replace(/[^a-z0-9]+/g, "-") },
        update: { name: body.category || body.categorySlug },
        create: { name: body.category || body.categorySlug, slug: body.categorySlug || String(body.category).toLowerCase().replace(/[^a-z0-9]+/g, "-") },
      });
      categoryId = category.id;
    }

    return prisma.product.upsert({
      where: { sku: body.sku },
      update: {
        title: body.title,
        brand: body.brand ?? null,
        manufacturer: body.manufacturer ?? null,
        model: body.model ?? null,
        mpn: body.mpn ?? null,
        categoryId,
        condition: body.condition ?? "USED",
        status: body.status ?? "DRAFT",
        price: body.price === null || body.price === undefined || body.price === "" ? null : Number(body.price),
        priceOnRequest: Boolean(body.priceOnRequest),
        stockQty: Number(body.stockQty ?? 0),
        description: body.description ?? null,
        productOverview: body.productOverview ?? null,
        dispatchNote: body.dispatchNote ?? null,
        leadTime: body.leadTime ?? null,
        warranty: body.warranty ?? null,
        locationBin: body.locationBin ?? null,
        hsCode: body.hsCode ?? null,
        source: body.source ?? "admin",
      },
      create: {
        title: body.title,
        slug: body.slug || String(body.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        sku: body.sku,
        brand: body.brand ?? null,
        manufacturer: body.manufacturer ?? null,
        model: body.model ?? null,
        mpn: body.mpn ?? null,
        categoryId,
        condition: body.condition ?? "USED",
        status: body.status ?? "DRAFT",
        price: body.price === null || body.price === undefined || body.price === "" ? null : Number(body.price),
        priceOnRequest: Boolean(body.priceOnRequest),
        stockQty: Number(body.stockQty ?? 0),
        description: body.description ?? null,
        productOverview: body.productOverview ?? null,
        dispatchNote: body.dispatchNote ?? null,
        leadTime: body.leadTime ?? null,
        warranty: body.warranty ?? null,
        locationBin: body.locationBin ?? null,
        hsCode: body.hsCode ?? null,
        source: body.source ?? "admin",
      },
    });
  });

  if (!dbResult.ok) {
    return Response.json({
      ok: false,
      mode: "preview",
      message: "Product received but not persisted because PostgreSQL is not connected.",
      reason: dbResult.reason,
      received: body,
    }, { status: 202 });
  }

  return Response.json({ ok: true, source: "database", product: dbResult.data });
}
