import { prisma, withDatabase } from "@/lib/db";
import {
  PUBLIC_CATEGORY_GROUPS,
  canonicalCategoryForText,
  getCanonicalBySlug,
  normaliseSelectedCategorySlug,
} from "@/lib/categoryTaxonomy";
import { ensureOperationalTables } from "@/lib/operationalSchema";

export type CatalogueQualityIssueCode =
  | "MISSING_IMAGE"
  | "MISSING_DESCRIPTION"
  | "PLACEHOLDER_EBAY_DESCRIPTION"
  | "MISSING_OVERVIEW"
  | "MISSING_CATEGORY"
  | "CATEGORY_REVIEW"
  | "MISSING_IDENTITY"
  | "MISSING_SPECS"
  | "MISSING_SHIPPING"
  | "STOCK_PRICE_REVIEW"
  | "EBAY_REVIEW"
  | "PUBLIC_INCOMPLETE";

export type CatalogueQualityIssue = {
  code: CatalogueQualityIssueCode;
  label: string;
  severity: "high" | "medium" | "low";
  detail: string;
};

export type CatalogueQualityRow = {
  id: string;
  sku: string;
  title: string;
  slug: string;
  status: string;
  source: string;
  brand: string;
  manufacturer: string;
  model: string;
  mpn: string;
  category: string;
  categorySlug: string;
  suggestedCategory: string;
  suggestedCategorySlug: string;
  price: number | null;
  priceOnRequest: boolean;
  stockQty: number;
  imageUrl: string | null;
  imageCount: number;
  specCount: number;
  documentCount: number;
  variantCount: number;
  shippingPolicyId: string | null;
  ebayLinked: boolean;
  ebayPublishStatus: string;
  ebayLastError: string;
  reviewedAt: string | null;
  reviewStatus: string | null;
  readiness: "Ready to sell" | "Needs review" | "Not launch-ready";
  score: number;
  issues: CatalogueQualityIssue[];
};

export type CatalogueQualityReport = {
  generatedAt: string;
  rows: CatalogueQualityRow[];
  summary: {
    scanned: number;
    ready: number;
    needsReview: number;
    notLaunchReady: number;
    visibleIncomplete: number;
    missingImages: number;
    missingDescriptions: number;
    missingSpecs: number;
    missingShipping: number;
    categoryReview: number;
    ebayPlaceholder: number;
  };
  filters: {
    q: string;
    status: string;
    issue: string;
    category: string;
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  categories: Array<{ label: string; slug: string }>;
  shippingPolicies: Array<{ id: string; name: string; isDefault: boolean }>;
};

function asText(value: unknown) {
  return String(value ?? "").trim();
}

function toNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function iso(value: unknown) {
  const date = value instanceof Date ? value : value ? new Date(String(value)) : null;
  return date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function slugify(value: string, fallback = "category") {
  const slug = asText(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || fallback;
}

function isWeakText(value: unknown, minLength = 70) {
  const text = asText(value).replace(/\s+/g, " ");
  if (!text) return true;
  if (text.length < minLength) return true;
  return /^(imported from active ebay listing|no description|description pending|tbc|n\/a|na)$/i.test(text);
}

function hasEbayPlaceholder(value: unknown) {
  return /imported from active ebay listing|shipping\s*&\s*returns|terms\s*&\s*conditions|t&c/i.test(asText(value));
}

export function stripCommercialFooterFromEbayDescription(value: unknown) {
  const text = asText(value)
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text) return "";
  const split = text.split(/\n?\s*(shipping\s*&\s*returns|shipping and returns|returns policy|terms\s*&\s*conditions|terms and conditions|t\s*&\s*c'?s?|payment|delivery information)\s*\n?/i)[0];
  return asText(split).replace(/\n{3,}/g, "\n\n");
}

function issue(code: CatalogueQualityIssueCode, label: string, severity: "high" | "medium" | "low", detail: string): CatalogueQualityIssue {
  return { code, label, severity, detail };
}

function publicCategoryOptions() {
  return PUBLIC_CATEGORY_GROUPS.map((category) => ({ label: category.label, slug: category.slug }));
}

async function ensureCatalogueQualityTables() {
  await ensureOperationalTables().catch(() => null);
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "ProductQualityReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL UNIQUE,
    "status" TEXT NOT NULL DEFAULT 'REVIEWED',
    "note" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedBy" TEXT
  )`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ProductQualityReview_status_idx" ON "ProductQualityReview"("status")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ProductQualityReview_reviewedAt_idx" ON "ProductQualityReview"("reviewedAt")`);
}

async function categoryIdForSlug(targetSlug: string) {
  const canonical = getCanonicalBySlug(targetSlug);
  const label = canonical?.groupLabel || publicCategoryOptions().find((item) => item.slug === targetSlug)?.label || targetSlug.replace(/-/g, " ");
  const slug = canonical?.groupSlug || normaliseSelectedCategorySlug(targetSlug) || slugify(label);
  const category = await prisma.category.upsert({
    where: { slug },
    update: { name: label },
    create: { name: label, slug },
  });
  return category.id;
}

function productIdentity(product: any) {
  return [product.brand, product.manufacturer, product.model, product.mpn].map(asText).filter(Boolean);
}

function generateDeterministicOverview(product: any) {
  const title = asText(product.title) || "This item";
  const sku = asText(product.sku);
  const brand = asText(product.brand || product.manufacturer);
  const model = asText(product.model || product.mpn);
  const category = canonicalCategoryForText({
    title: product.title,
    category: product.category?.name,
    categorySlug: product.category?.slug,
    brand: product.brand,
    manufacturer: product.manufacturer,
    model: product.model,
    mpn: product.mpn,
    specsText: (product.specs || []).map((spec: any) => `${spec.label} ${spec.value}`).join(" "),
  });
  const bits = [brand, model].filter(Boolean).join(" / ");
  return `${title}${sku ? ` (${sku})` : ""} is listed by Combay as ${category.groupLabel.toLowerCase()} stock for industrial, technical or procurement-led buyers.${bits ? ` Key identification: ${bits}.` : ""} Please review the condition, images, specifications and shipping notes before purchase or request a quote if you need compatibility, export or documentation confirmation.`;
}

function analyseProduct(product: any, review: any | undefined): CatalogueQualityRow {
  const specsText = (product.specs || []).map((spec: any) => `${spec.label} ${spec.value}`).join(" ");
  const canonical = canonicalCategoryForText({
    title: product.title,
    category: product.category?.name,
    categorySlug: product.category?.slug,
    brand: product.brand,
    manufacturer: product.manufacturer,
    model: product.model,
    mpn: product.mpn,
    specsText,
  });
  const currentCategorySlug = asText(product.category?.slug);
  const currentCategory = asText(product.category?.name);
  const images = product.images || [];
  const issues: CatalogueQualityIssue[] = [];
  const imageCount = product._count?.images ?? images.length ?? 0;
  const specCount = product._count?.specs ?? product.specs?.length ?? 0;
  const documentCount = product._count?.documents ?? 0;
  const variantCount = product._count?.variants ?? 0;
  const ebayLinked = Boolean(product.ebayOfferId || product.ebayListingId || product.ebayItemId || product.ebayInventoryItemSku);

  if (!imageCount) issues.push(issue("MISSING_IMAGE", "Needs image", "high", "No product image is available for the public card/detail page."));
  if (isWeakText(product.description, 90)) issues.push(issue("MISSING_DESCRIPTION", "Needs description", "high", "Description is missing, too short or not useful for a buyer."));
  if (hasEbayPlaceholder(product.description) || hasEbayPlaceholder(product.productOverview)) issues.push(issue("PLACEHOLDER_EBAY_DESCRIPTION", "Clean eBay text", "medium", "Imported/boilerplate eBay wording should be removed before launch."));
  if (isWeakText(product.productOverview, 80)) issues.push(issue("MISSING_OVERVIEW", "Needs overview", "medium", "Overview tab needs procurement-oriented copy, not placeholder text."));
  if (!product.categoryId || /ebay import|uncategor/i.test(`${currentCategory} ${currentCategorySlug}`)) issues.push(issue("MISSING_CATEGORY", "Needs category", "high", "Product is missing a proper Combay public category."));
  if (currentCategorySlug && canonical.groupSlug && currentCategorySlug !== canonical.groupSlug) {
    issues.push(issue("CATEGORY_REVIEW", "Category review", "medium", `Current category looks like ${currentCategory || currentCategorySlug}; suggested ${canonical.groupLabel}.`));
  }
  if (!productIdentity(product).length) issues.push(issue("MISSING_IDENTITY", "Needs identity fields", "medium", "Brand/manufacturer/model/MPN are all missing."));
  if (!specCount) issues.push(issue("MISSING_SPECS", "Needs specs", "medium", "No structured specifications/item specifics have been added."));
  if (!product.shippingPolicyId && !product.shippingManualQuoteRequired && !product.shippingCollectionOnly) issues.push(issue("MISSING_SHIPPING", "Needs shipping", "medium", "No shipping policy or manual quote/collection flag is assigned."));
  if (product.status === "PUBLISHED" && product.stockQty <= 0) issues.push(issue("STOCK_PRICE_REVIEW", "Visible stock review", "high", "Published product has zero stock and may need archive, RFQ-only or eBay status review."));
  if (product.status === "PUBLISHED" && !product.priceOnRequest && (product.price === null || product.price === undefined)) issues.push(issue("STOCK_PRICE_REVIEW", "Price logic review", "high", "Published product has no price and is not marked price-on-request."));
  if (ebayLinked && (/ERROR|FAILED|BLOCKED/i.test(asText(product.ebayPublishStatus)) || asText(product.ebayLastError))) issues.push(issue("EBAY_REVIEW", "eBay review", "medium", "eBay-linked product has an error/status that needs review."));

  if (product.status === "PUBLISHED" && issues.length) issues.push(issue("PUBLIC_INCOMPLETE", "Visible but incomplete", "high", "This product is public while still having launch-readiness issues."));

  const high = issues.filter((item) => item.severity === "high").length;
  const medium = issues.filter((item) => item.severity === "medium").length;
  const score = Math.max(0, 100 - high * 18 - medium * 9 - issues.filter((item) => item.severity === "low").length * 4);
  const readiness = high ? "Not launch-ready" : medium ? "Needs review" : "Ready to sell";

  return {
    id: product.id,
    sku: product.sku,
    title: product.title,
    slug: product.slug,
    status: product.status,
    source: product.source || "database",
    brand: product.brand || "",
    manufacturer: product.manufacturer || "",
    model: product.model || "",
    mpn: product.mpn || "",
    category: currentCategory || "—",
    categorySlug: currentCategorySlug || "",
    suggestedCategory: canonical.groupLabel,
    suggestedCategorySlug: canonical.groupSlug,
    price: product.price === null || product.price === undefined ? null : Number(product.price),
    priceOnRequest: Boolean(product.priceOnRequest),
    stockQty: Number(product.stockQty || 0),
    imageUrl: images[0]?.url || null,
    imageCount,
    specCount,
    documentCount,
    variantCount,
    shippingPolicyId: product.shippingPolicyId || null,
    ebayLinked,
    ebayPublishStatus: product.ebayPublishStatus || "NOT_LISTED",
    ebayLastError: product.ebayLastError || "",
    reviewedAt: iso(review?.reviewedAt),
    reviewStatus: review?.status || null,
    readiness,
    score,
    issues,
  };
}

function rowMatchesIssue(row: CatalogueQualityRow, issueFilter: string) {
  if (!issueFilter || issueFilter === "all") return true;
  if (issueFilter === "ready") return row.readiness === "Ready to sell";
  if (issueFilter === "not-ready") return row.readiness === "Not launch-ready";
  if (issueFilter === "needs-review") return row.readiness === "Needs review";
  return row.issues.some((issueItem) => issueItem.code === issueFilter);
}

export async function loadCatalogueQualityReport(options: { q?: string; status?: string; issue?: string; category?: string; page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, Number(options.page || 1));
  const pageSize = Math.min(80, Math.max(12, Number(options.pageSize || 40)));
  const result = await withDatabase(async () => {
    await ensureCatalogueQualityTables();
    const where: any = { deletedAt: null };
    if (options.status && options.status !== "all") where.status = options.status;
    const q = asText(options.q);
    if (q) {
      where.OR = [
        { sku: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
        { manufacturer: { contains: q, mode: "insensitive" } },
        { model: { contains: q, mode: "insensitive" } },
        { mpn: { contains: q, mode: "insensitive" } },
      ];
    }
    const categorySlug = asText(options.category);
    if (categorySlug && categorySlug !== "all") {
      const canonical = getCanonicalBySlug(categorySlug);
      where.category = { is: { slug: canonical?.groupSlug || categorySlug } };
    }

    const scanTake = 500;
    const [products, reviews, shippingPolicies] = await Promise.all([
      prisma.product.findMany({
        where,
        select: {
          id: true,
          sku: true,
          title: true,
          slug: true,
          status: true,
          source: true,
          brand: true,
          manufacturer: true,
          model: true,
          mpn: true,
          categoryId: true,
          category: { select: { name: true, slug: true } },
          condition: true,
          price: true,
          priceOnRequest: true,
          stockQty: true,
          description: true,
          productOverview: true,
          rawEbayDescription: true,
          shippingPolicyId: true,
          shippingManualQuoteRequired: true,
          shippingCollectionOnly: true,
          ebayOfferId: true,
          ebayListingId: true,
          ebayItemId: true,
          ebayInventoryItemSku: true,
          ebayPublishStatus: true,
          ebayLastError: true,
          images: { orderBy: [{ isPrimary: "desc" as const }, { sortOrder: "asc" as const }], take: 1, select: { url: true } },
          specs: { take: 12, select: { label: true, value: true } },
          _count: { select: { images: true, specs: true, documents: true, variants: true } },
        },
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
        take: scanTake,
      }),
      prisma.$queryRawUnsafe<any[]>(`SELECT "productId", "status", "reviewedAt" FROM "ProductQualityReview"`).catch(() => []),
      prisma.shippingPolicy.findMany({ where: { isActive: true }, select: { id: true, name: true, isDefault: true }, orderBy: [{ isDefault: "desc" }, { name: "asc" }] }).catch(() => []),
    ]);
    const reviewMap = new Map<string, any>((reviews || []).map((review: any) => [review.productId, review]));
    let rows = (products as any[]).map((product) => analyseProduct(product, reviewMap.get(product.id)));
    rows = rows.filter((row) => rowMatchesIssue(row, asText(options.issue || "all")));
    const total = rows.length;
    const paged = rows.slice((page - 1) * pageSize, page * pageSize);
    const summary = {
      scanned: rows.length,
      ready: rows.filter((row) => row.readiness === "Ready to sell").length,
      needsReview: rows.filter((row) => row.readiness === "Needs review").length,
      notLaunchReady: rows.filter((row) => row.readiness === "Not launch-ready").length,
      visibleIncomplete: rows.filter((row) => row.issues.some((item) => item.code === "PUBLIC_INCOMPLETE")).length,
      missingImages: rows.filter((row) => row.issues.some((item) => item.code === "MISSING_IMAGE")).length,
      missingDescriptions: rows.filter((row) => row.issues.some((item) => item.code === "MISSING_DESCRIPTION")).length,
      missingSpecs: rows.filter((row) => row.issues.some((item) => item.code === "MISSING_SPECS")).length,
      missingShipping: rows.filter((row) => row.issues.some((item) => item.code === "MISSING_SHIPPING")).length,
      categoryReview: rows.filter((row) => row.issues.some((item) => item.code === "CATEGORY_REVIEW" || item.code === "MISSING_CATEGORY")).length,
      ebayPlaceholder: rows.filter((row) => row.issues.some((item) => item.code === "PLACEHOLDER_EBAY_DESCRIPTION")).length,
    };
    return {
      generatedAt: new Date().toISOString(),
      rows: paged,
      summary,
      filters: {
        q,
        status: asText(options.status || "all"),
        issue: asText(options.issue || "all"),
        category: asText(options.category || "all"),
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      categories: publicCategoryOptions(),
      shippingPolicies: (shippingPolicies as any[]).map((policy) => ({ id: policy.id, name: policy.name, isDefault: Boolean(policy.isDefault) })),
    } satisfies CatalogueQualityReport;
  });
  if (result.ok) return { ok: true as const, data: result.data };
  return { ok: false as const, reason: result.reason };
}

export async function applyCatalogueQualityAction(input: { ids?: string[]; action?: string; categorySlug?: string; shippingPolicyId?: string; value?: string; note?: string }) {
  return withDatabase(async () => {
    await ensureCatalogueQualityTables();
    const ids = Array.from(new Set((input.ids || []).map(asText).filter(Boolean))).slice(0, 300);
    if (!ids.length) throw new Error("Select at least one product.");
    const action = asText(input.action);
    let updated = 0;

    if (action === "assign-category") {
      const targetSlug = asText(input.categorySlug);
      if (!targetSlug) throw new Error("Select a category to assign.");
      const categoryId = await categoryIdForSlug(targetSlug);
      const result = await prisma.product.updateMany({ where: { id: { in: ids } }, data: { categoryId } });
      updated = result.count;
    } else if (action === "assign-shipping") {
      const shippingPolicyId = asText(input.shippingPolicyId);
      if (!shippingPolicyId) throw new Error("Select a shipping policy to assign.");
      const result = await prisma.product.updateMany({ where: { id: { in: ids } }, data: { shippingPolicyId } });
      updated = result.count;
    } else if (action === "archive") {
      const result = await prisma.product.updateMany({ where: { id: { in: ids } }, data: { status: "ARCHIVED" as any } });
      updated = result.count;
    } else if (action === "mark-reviewed") {
      for (const id of ids) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "ProductQualityReview" ("id", "productId", "status", "note", "reviewedAt", "reviewedBy") VALUES ($1, $2, 'REVIEWED', $3, CURRENT_TIMESTAMP, 'admin') ON CONFLICT ("productId") DO UPDATE SET "status" = 'REVIEWED', "note" = EXCLUDED."note", "reviewedAt" = CURRENT_TIMESTAMP, "reviewedBy" = 'admin'`,
          `pqr_${id}`,
          id,
          asText(input.note || "Marked reviewed from catalogue quality centre."),
        );
        updated += 1;
      }
    } else if (action === "set-brand" || action === "set-manufacturer") {
      const value = asText(input.value);
      if (!value) throw new Error("Enter the value to apply.");
      const data = action === "set-brand" ? { brand: value } : { manufacturer: value };
      const result = await prisma.product.updateMany({ where: { id: { in: ids } }, data });
      updated = result.count;
    } else if (action === "generate-overview") {
      const products = await prisma.product.findMany({
        where: { id: { in: ids } },
        select: { id: true, sku: true, title: true, brand: true, manufacturer: true, model: true, mpn: true, category: { select: { name: true, slug: true } }, specs: { take: 8, select: { label: true, value: true } } },
      });
      for (const product of products as any[]) {
        await prisma.product.update({ where: { id: product.id }, data: { productOverview: generateDeterministicOverview(product) } });
        updated += 1;
      }
    } else if (action === "clean-ebay-description") {
      const products = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, description: true, rawEbayDescription: true } });
      for (const product of products as any[]) {
        const cleaned = stripCommercialFooterFromEbayDescription(product.description || product.rawEbayDescription || "");
        if (cleaned) {
          await prisma.product.update({ where: { id: product.id }, data: { description: cleaned } });
          updated += 1;
        }
      }
    } else {
      throw new Error("Unknown catalogue quality action.");
    }

    return { updated, action };
  });
}
