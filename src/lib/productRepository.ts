import { prisma, withDatabase } from "@/lib/db";
import { CATEGORIES, PRODUCTS, searchProducts, type CatalogProduct, type ConditionCode, type StockStatus } from "@/lib/catalog";
import { PUBLIC_CATEGORY_LIST, canonicalCategoryForText, isPublicCategoryMatch } from "@/lib/categoryTaxonomy";
import { buildProductShippingSummary } from "@/lib/shipping";
import { ensureOperationalTables } from "@/lib/operationalSchema";

export type ProductWriteInput = Omit<Partial<CatalogProduct>, "images" | "specs" | "variants" | "documents"> & {
  id?: string;
  status?: "PUBLISHED" | "DRAFT" | "ARCHIVED";
  source?: string;
  locationBin?: string;
  itemLocation?: string;
  hsCode?: string;
  ebayItemId?: string;
  syncExcluded?: boolean;
  ebayExcludedFromSync?: boolean;
  shippingPolicyId?: string | null;
  packedWeightKg?: string | null;
  packedLengthCm?: string | null;
  packedWidthCm?: string | null;
  packedHeightCm?: string | null;
  shippingManualQuoteRequired?: boolean;
  shippingCollectionOnly?: boolean;
  shippingUkAllowed?: boolean;
  shippingEuropeAllowed?: boolean;
  shippingWorldwideAllowed?: boolean;
  shippingOverrides?: Record<string, unknown> | null;
  rawEbayDescription?: string | null;
  titleLocked?: boolean;
  priceLocked?: boolean;
  imagesLocked?: boolean;
  specsLocked?: boolean;
  descriptionLocked?: boolean;
  weightKg?: string;
  dimensionsCm?: string;
  adminNotes?: string;
  image?: string | null;
  videoUrl?: string | null;
  images?: { url: string; originalUrl?: string | null; alt?: string | null; isPrimary?: boolean; sortOrder?: number; backgroundProcessedAt?: Date | null; backgroundProcessingStatus?: string | null; backgroundProcessingError?: string | null }[];
  specs?: { label: string; value: string }[];
  variants?: { id?: string; sku?: string | null; label: string; optionName?: string | null; optionValue?: string | null; price?: number | null; stockQty: number; sortOrder?: number; ebayVariationSku?: string | null; ebayVariationData?: any; ebaySku?: string | null; ebayOfferId?: string | null; ebayInventoryItemGroupKey?: string | null; ebayQuantity?: number | null; ebayPrice?: number | null; ebaySpecificsJson?: any }[];
  documents?: { name: string; url: string; fileType?: string }[];
};

type DbProduct = Awaited<ReturnType<typeof prisma.product.findMany>>[number] & {
  category?: { name: string; slug: string } | null;
  images?: { url: string; originalUrl?: string | null; alt: string | null; isPrimary: boolean; sortOrder: number; backgroundProcessedAt?: Date | null; backgroundProcessingStatus?: string | null; backgroundProcessingError?: string | null }[];
  documents?: { name: string; url: string; fileType: string | null }[];
  specs?: { label: string; value: string; sortOrder: number }[];
  variants?: { id: string; sku: string | null; label: string; optionName: string | null; optionValue: string | null; price: any; stockQty: number; sortOrder: number }[];
  tags?: { name: string }[];
  shippingPolicy?: any;
  shippingOverrides?: any[];
};

function slugify(value: string, fallback = "product") {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || fallback;
}

function stockStatus(stockQty: number, priceOnRequest: boolean): StockStatus {
  if (priceOnRequest) return "POA";
  if (stockQty <= 0) return "OUT_OF_STOCK";
  if (stockQty <= 2) return "LOW_STOCK";
  return "IN_STOCK";
}

export function mapDbProduct(product: DbProduct): CatalogProduct & Record<string, unknown> {
  const price = product.price === null || product.price === undefined ? null : Number(product.price);
  const productImages = (product.images ?? []) as Array<{ url: string; originalUrl?: string | null; alt: string | null; isPrimary: boolean; sortOrder: number; backgroundProcessedAt?: Date | null; backgroundProcessingStatus?: string | null; backgroundProcessingError?: string | null }>;
  const productSpecs = (product.specs ?? []) as Array<{ label: string; value: string; sortOrder: number }>;
  const productDocs = (product.documents ?? []) as Array<{ name: string; url: string; fileType: string | null }>;
  const productTags = (product.tags ?? []) as Array<{ name: string }>;
  const productVariants = ((product as any).variants ?? []) as Array<{ id: string; sku: string | null; label: string; optionName: string | null; optionValue: string | null; price: any; stockQty: number; sortOrder: number }>;
  const primaryImage = productImages.find((image) => image.isPrimary)?.url ?? productImages[0]?.url ?? null;
  const canonicalCategory = canonicalCategoryForText({
    title: product.title,
    category: product.category?.name,
    categorySlug: product.category?.slug,
    brand: product.brand,
    manufacturer: product.manufacturer,
    model: product.model,
    mpn: product.mpn,
    specsText: productSpecs.map((spec) => `${spec.label} ${spec.value}`).join(" "),
  });

  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    title: product.title,
    brand: product.brand ?? "",
    manufacturer: product.manufacturer ?? product.brand ?? "",
    model: product.model ?? "",
    mpn: product.mpn ?? "",
    category: canonicalCategory.groupLabel,
    categorySlug: canonicalCategory.groupSlug,
    subcategory: canonicalCategory.subcategoryLabel ?? "",
    subcategorySlug: canonicalCategory.subcategorySlug ?? "",
    condition: product.condition as ConditionCode,
    price,
    priceOnRequest: product.priceOnRequest,
    stockQty: product.stockQty,
    stockStatus: stockStatus(product.stockQty, product.priceOnRequest),
    leadTime: product.leadTime ?? "UK dispatch normally within 1–2 working days after cleared payment.",
    warranty: product.warranty ?? "30-day return-to-base warranty unless otherwise stated.",
    dispatchNote: product.dispatchNote ?? "Packed for courier dispatch with serial number recorded before shipment.",
    image: primaryImage,
    videoUrl: (product as any).videoUrl ?? null,
    images: productImages.map((image) => ({
      url: image.url,
      originalUrl: image.originalUrl ?? null,
      alt: image.alt,
      isPrimary: image.isPrimary,
      sortOrder: image.sortOrder,
      backgroundProcessedAt: image.backgroundProcessedAt?.toISOString?.() ?? null,
      backgroundProcessingStatus: image.backgroundProcessingStatus ?? null,
      backgroundProcessingError: image.backgroundProcessingError ?? null,
    })),
    variants: productVariants
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        label: variant.label,
        optionName: variant.optionName,
        optionValue: variant.optionValue,
        price: variant.price === null || variant.price === undefined ? null : Number(variant.price),
        stockQty: variant.stockQty,
        sortOrder: variant.sortOrder,
      })),
    description: product.description ?? "",
    productOverview: product.productOverview ?? product.description ?? "",
    specs: productSpecs
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((spec) => ({ label: spec.label, value: spec.value })),
    documents: productDocs.map((document) => ({
      name: document.name,
      url: document.url,
      fileType: document.fileType ?? "Document",
    })),
    tags: productTags.length ? productTags.map((tag) => tag.name) : [product.sku, product.brand, product.manufacturer, product.model, product.mpn].filter(Boolean) as string[],
    status: product.status,
    source: product.source ?? "database",
    createdAt: product.createdAt?.toISOString?.() ?? "",
    updatedAt: product.updatedAt?.toISOString?.() ?? "",
    locationBin: product.locationBin ?? "",
    itemLocation: (product as any).itemLocation ?? "United Kingdom",
    hsCode: product.hsCode ?? "",
    seoTitle: (product as any).seoTitle ?? "",
    seoDescription: (product as any).seoDescription ?? "",
    seoKeywords: (product as any).seoKeywords ?? "",
    ebayItemId: product.ebayItemId ?? "",
    ebayListingId: (product as any).ebayListingId ?? "",
    ebayOfferId: (product as any).ebayOfferId ?? "",
    ebayPublishStatus: (product as any).ebayPublishStatus ?? "NOT_LISTED",
    ebayLastPushedAt: (product as any).ebayLastPushedAt?.toISOString?.() ?? null,
    ebayLastError: (product as any).ebayLastError ?? null,
    ebayValidationErrorsJson: (product as any).ebayValidationErrorsJson ?? null,
    syncExcluded: product.syncExcluded ?? false,
    ebayExcludedFromSync: (product as any).ebayExcludedFromSync ?? product.syncExcluded ?? false,
    ebayShowOnUsCanada: Boolean((product as any).ebayShowOnUsCanada),
    deletedAt: (product as any).deletedAt?.toISOString?.() ?? null,
    deleteStatus: (product as any).deleteStatus ?? null,
    rawEbayDescription: (product as any).rawEbayDescription ?? "",
    titleLocked: (product as any).titleLocked ?? false,
    priceLocked: (product as any).priceLocked ?? false,
    imagesLocked: (product as any).imagesLocked ?? false,
    specsLocked: (product as any).specsLocked ?? false,
    descriptionLocked: (product as any).descriptionLocked ?? false,
    dimensionsCm: product.dimensions ?? "",
    weightKg: product.weight === null || product.weight === undefined ? "" : String(product.weight),
    shippingPolicyId: (product as any).shippingPolicyId ?? null,
    packedWeightKg: (product as any).packedWeightKg === null || (product as any).packedWeightKg === undefined ? "" : String((product as any).packedWeightKg),
    packedLengthCm: (product as any).packedLengthCm === null || (product as any).packedLengthCm === undefined ? "" : String((product as any).packedLengthCm),
    packedWidthCm: (product as any).packedWidthCm === null || (product as any).packedWidthCm === undefined ? "" : String((product as any).packedWidthCm),
    packedHeightCm: (product as any).packedHeightCm === null || (product as any).packedHeightCm === undefined ? "" : String((product as any).packedHeightCm),
    shippingManualQuoteRequired: Boolean((product as any).shippingManualQuoteRequired),
    shippingCollectionOnly: Boolean((product as any).shippingCollectionOnly),
    shippingUkAllowed: (product as any).shippingUkAllowed ?? true,
    shippingEuropeAllowed: (product as any).shippingEuropeAllowed ?? true,
    shippingWorldwideAllowed: (product as any).shippingWorldwideAllowed ?? true,
    shippingOverrides: ((product as any).shippingOverrides?.[0]?.zoneOverridesJson ?? null) as any,
    shipping: buildProductShippingSummary(product as any, "United Kingdom"),
  };
}

function mapPublicListProduct(product: any): CatalogProduct & Record<string, unknown> {
  const price = product.price === null || product.price === undefined ? null : Number(product.price);
  const canonical = canonicalCategoryForText({
    title: product.title,
    category: product.category?.name,
    categorySlug: product.category?.slug,
    brand: product.brand,
    manufacturer: product.manufacturer,
    model: product.model,
    mpn: product.mpn,
  });
  const primaryImage = product.images?.[0]?.url ?? null;
  const hasVariants = Boolean(product.variants?.length);
  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    title: product.title,
    brand: product.brand ?? product.manufacturer ?? "",
    manufacturer: product.manufacturer ?? product.brand ?? "",
    model: product.model ?? "",
    mpn: product.mpn ?? "",
    category: canonical.groupLabel,
    categorySlug: canonical.groupSlug,
    subcategory: canonical.subcategoryLabel ?? "",
    subcategorySlug: canonical.subcategorySlug ?? "",
    condition: product.condition as ConditionCode,
    price,
    priceOnRequest: product.priceOnRequest,
    stockQty: product.stockQty,
    stockStatus: stockStatus(product.stockQty, product.priceOnRequest),
    leadTime: product.leadTime ?? "UK dispatch normally within 1–2 working days after cleared payment.",
    warranty: product.warranty ?? "30-day return-to-base warranty unless otherwise stated.",
    dispatchNote: product.dispatchNote ?? "Packed for courier dispatch with serial number recorded before shipment.",
    image: primaryImage,
    images: primaryImage ? [{ url: primaryImage, alt: product.title, isPrimary: true, sortOrder: 0 }] : [],
    variants: hasVariants ? [{ id: product.variants[0].id, sku: product.variants[0].sku, label: product.variants[0].label || "Option", optionName: product.variants[0].optionName, optionValue: product.variants[0].optionValue, price: product.variants[0].price === null || product.variants[0].price === undefined ? null : Number(product.variants[0].price), stockQty: product.variants[0].stockQty, sortOrder: product.variants[0].sortOrder ?? 0 }] : [],
    description: product.description ?? "",
    productOverview: product.productOverview ?? product.description ?? "",
    specs: [],
    documents: [],
    tags: [product.sku, product.brand, product.manufacturer, product.model, product.mpn].filter(Boolean) as string[],
    status: product.status,
    source: product.source ?? "database",
    createdAt: product.createdAt?.toISOString?.() ?? "",
    updatedAt: product.updatedAt?.toISOString?.() ?? "",
  };
}

async function getCategoryId(input?: { category?: string; categorySlug?: string; title?: string; brand?: string; manufacturer?: string; model?: string; mpn?: string }) {
  const canonical = canonicalCategoryForText({
    title: input?.title,
    category: input?.category,
    categorySlug: input?.categorySlug,
    brand: input?.brand,
    manufacturer: input?.manufacturer,
    model: input?.model,
    mpn: input?.mpn,
  });
  const label = canonical.groupLabel;
  const slug = canonical.groupSlug;
  const category = await prisma.category.upsert({
    where: { slug },
    update: { name: label },
    create: { name: label, slug },
  });
  return category.id;
}

function cbuKNumber(value?: string | null) {
  const match = String(value || "").trim().match(/^CBUK(\d+)$/i);
  return match ? Number(match[1]) : 0;
}

function formatCombaySku(number: number) {
  return `CBUK${String(Math.max(1, Math.floor(number))).padStart(5, "0")}`;
}

export async function nextSku() {
  await ensureOperationalTables().catch(() => null);
  // Phase 27B rule: new products use highest existing/historical CBUK number + 1.
  // Supports legacy short SKUs such as CBUK0009 as well as standard CBUK00009/CBUK00001.
  const [products, auditLogs] = await Promise.all([
    prisma.product.findMany({ where: { sku: { startsWith: "CBUK" } }, select: { sku: true }, take: 50000 }),
    prisma.skuAuditLog.findMany({ select: { oldSku: true, newSku: true }, take: 50000 }).catch(() => [] as Array<{ oldSku?: string | null; newSku?: string | null }>),
  ]);
  let highest = 0;
  for (const item of products as Array<{ sku: string }>) highest = Math.max(highest, cbuKNumber(item.sku));
  for (const item of auditLogs as Array<{ oldSku?: string | null; newSku?: string | null }>) {
    highest = Math.max(highest, cbuKNumber(item.oldSku), cbuKNumber(item.newSku));
  }
  return formatCombaySku(highest + 1);
}

async function safeSkuForCreate(desired?: string | null) {
  const cleanDesired = String(desired || "").trim().toUpperCase();
  if (cleanDesired) {
    const existing = await prisma.product.findUnique({ where: { sku: cleanDesired } }).catch(() => null);
    if (!existing) {
      const n = cbuKNumber(cleanDesired);
      return n ? formatCombaySku(n) : cleanDesired;
    }
  }
  return nextSku();
}

function relationPayload(input: ProductWriteInput) {
  const images = input.images?.length
    ? input.images
    : input.image
      ? [{ url: input.image, alt: input.title, isPrimary: true, sortOrder: 0 }]
      : [];

  return {
    images: images.map((image, index) => ({
      url: image.url,
      originalUrl: image.originalUrl ?? null,
      alt: image.alt ?? input.title ?? null,
      isPrimary: image.isPrimary ?? index === 0,
      sortOrder: image.sortOrder ?? index,
      backgroundProcessedAt: image.backgroundProcessedAt ?? null,
      backgroundProcessingStatus: image.backgroundProcessingStatus ?? null,
      backgroundProcessingError: image.backgroundProcessingError ?? null,
    })),
    specs: (input.specs ?? []).filter((spec) => spec.label && spec.value).map((spec, index) => ({
      label: spec.label,
      value: spec.value,
      sortOrder: index,
    })),
    documents: (input.documents ?? []).filter((doc) => doc.name && doc.url).map((doc) => ({
      name: doc.name,
      url: doc.url,
      fileType: doc.fileType ?? "Document",
    })),
    variants: (input.variants ?? [])
      .filter((variant) => variant.label || variant.sku || variant.optionValue)
      .map((variant, index) => ({
        sku: variant.sku || null,
        label: variant.label || [variant.optionName, variant.optionValue].filter(Boolean).join(": ") || variant.sku || `Variant ${index + 1}`,
        optionName: variant.optionName || null,
        optionValue: variant.optionValue || null,
        price: variant.price === null || variant.price === undefined ? null : Number(variant.price),
        stockQty: Math.max(0, Math.floor(Number(variant.stockQty ?? 0))),
        sortOrder: variant.sortOrder ?? index,
        ebayVariationSku: variant.ebayVariationSku || variant.sku || null,
        ebayVariationData: variant.ebayVariationData ?? undefined,
        ebaySku: variant.ebaySku || variant.ebayVariationSku || variant.sku || null,
        ebayOfferId: variant.ebayOfferId || null,
        ebayInventoryItemGroupKey: variant.ebayInventoryItemGroupKey || null,
        ebayQuantity: variant.ebayQuantity === null || variant.ebayQuantity === undefined ? null : Number(variant.ebayQuantity),
        ebayPrice: variant.ebayPrice === null || variant.ebayPrice === undefined ? null : Number(variant.ebayPrice),
        ebaySpecificsJson: variant.ebaySpecificsJson ?? undefined,
      })),
  };
}

export async function getProductsFromRepository(params: {
  query?: string;
  category?: string;
  condition?: string;
  status?: string;
  includeArchived?: boolean;
  priceMin?: number | null;
  priceMax?: number | null;
}) {
  const dbResult = await withDatabase(async () => {
    await ensureOperationalTables().catch(() => null);
    const where: any = { deletedAt: null };

    if (params.status) where.status = params.status;
    else if (!params.includeArchived) where.status = "PUBLISHED";

    if (params.condition) where.condition = params.condition;
    if (params.priceMin !== null && params.priceMin !== undefined) where.price = { ...(where.price ?? {}), gte: params.priceMin };
    if (params.priceMax !== null && params.priceMax !== undefined) where.price = { ...(where.price ?? {}), lte: params.priceMax };

    const query = String(params.query || "").trim();
    if (query) {
      where.OR = [
        { sku: { contains: query, mode: "insensitive" } },
        { title: { contains: query, mode: "insensitive" } },
        { brand: { contains: query, mode: "insensitive" } },
        { manufacturer: { contains: query, mode: "insensitive" } },
        { model: { contains: query, mode: "insensitive" } },
        { mpn: { contains: query, mode: "insensitive" } },
      ];
    }

    // Phase 27H speed fix: public shop list uses a lightweight product-card query.
    // Full specs/documents/all images/shipping rates are loaded only on the product detail page.
    const rawProducts = await prisma.product.findMany({
      where,
      select: {
        id: true, sku: true, title: true, slug: true, brand: true, manufacturer: true, model: true, mpn: true,
        condition: true, price: true, priceOnRequest: true, stockQty: true, status: true, source: true,
        description: true, productOverview: true, dispatchNote: true, leadTime: true, warranty: true,
        createdAt: true, updatedAt: true,
        category: { select: { name: true, slug: true } },
        images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1, select: { url: true } },
        variants: { orderBy: { sortOrder: "asc" }, take: 1, select: { id: true, sku: true, label: true, optionName: true, optionValue: true, price: true, stockQty: true, sortOrder: true } },
      },
      orderBy: [{ updatedAt: "desc" }, { sku: "asc" }],
      take: params.category ? 240 : 96,
    });

    const mappedProducts = rawProducts.map(mapPublicListProduct);
    const filteredProducts = params.category ? mappedProducts.filter((product: CatalogProduct & Record<string, unknown>) => isPublicCategoryMatch(product, params.category)).slice(0, 96) : mappedProducts;

    return { products: filteredProducts, categories: PUBLIC_CATEGORY_LIST };
  });

  if (dbResult.ok) {
    return {
      source: "database",
      message: "Products served from a lightweight PostgreSQL public catalogue query.",
      products: dbResult.data.products,
      total: dbResult.data.products.length,
      categories: dbResult.data.categories,
    };
  }

  const products = searchProducts({
    query: params.query ?? "",
    category: "",
    condition: params.condition ?? "",
    priceMin: params.priceMin ?? null,
    priceMax: params.priceMax ?? null,
  })
    .map((product) => {
      const canonical = canonicalCategoryForText({
        title: product.title,
        category: product.category,
        categorySlug: product.categorySlug,
        brand: product.brand,
        manufacturer: product.manufacturer,
        model: product.model,
        mpn: product.mpn,
        specsText: product.specs?.map((s) => `${s.label} ${s.value}`).join(" "),
      });
      return { ...product, category: canonical.groupLabel, categorySlug: canonical.groupSlug, subcategory: canonical.subcategoryLabel ?? "", subcategorySlug: canonical.subcategorySlug ?? "" };
    })
    .filter((product) => isPublicCategoryMatch(product, params.category))
    .slice(0, 96);

  return {
    source: "catalog-fallback",
    message: dbResult.reason,
    products,
    total: products.length,
    categories: PUBLIC_CATEGORY_LIST,
  };
}

export async function getAdminProductsListFromRepository(params: {
  query?: string;
  category?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, Number(params.page || 1));
  const pageSize = Math.min(100, Math.max(10, Number(params.pageSize || 50)));
  const dbResult = await withDatabase(async () => {
    await ensureOperationalTables().catch(() => null);
    const where: any = { deletedAt: null };
    if (params.status) where.status = params.status;
    if (params.category) {
      where.category = { OR: [{ slug: params.category }, { name: { contains: params.category, mode: "insensitive" } }] };
    }
    if (params.query) {
      where.OR = [
        { sku: { contains: params.query, mode: "insensitive" } },
        { title: { contains: params.query, mode: "insensitive" } },
        { brand: { contains: params.query, mode: "insensitive" } },
        { manufacturer: { contains: params.query, mode: "insensitive" } },
        { model: { contains: params.query, mode: "insensitive" } },
        { mpn: { contains: params.query, mode: "insensitive" } },
        { ebayListingId: { contains: params.query, mode: "insensitive" } },
        { ebayOfferId: { contains: params.query, mode: "insensitive" } },
      ];
    }

    const [total, statusCounts, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.groupBy({ by: ["status"], _count: { _all: true } }).catch(() => []),
      prisma.product.findMany({
        where,
        select: {
          id: true, sku: true, title: true, slug: true, brand: true, manufacturer: true, mpn: true, condition: true,
          price: true, priceOnRequest: true, stockQty: true, status: true, source: true, updatedAt: true,
          ebayPublishStatus: true, ebayListingId: true, ebayOfferId: true, ebayMarketplaceId: true, ebayItemId: true,
          deleteStatus: true, deletedAt: true,
          category: { select: { name: true, slug: true } },
          images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1, select: { url: true } },
        },
        orderBy: [{ updatedAt: "desc" }, { sku: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const counts = { PUBLISHED: 0, DRAFT: 0, ARCHIVED: 0 } as Record<string, number>;
    (statusCounts as any[]).forEach((row) => { counts[row.status] = row._count?._all ?? 0; });
    return {
      products: products.map((product: any) => {
        const canonical = canonicalCategoryForText({ title: product.title, category: product.category?.name, categorySlug: product.category?.slug, brand: product.brand, manufacturer: product.manufacturer, mpn: product.mpn });
        return {
          id: product.id,
          sku: product.sku,
          title: product.title,
          slug: product.slug,
          brand: product.brand ?? product.manufacturer ?? "",
          manufacturer: product.manufacturer ?? product.brand ?? "",
          mpn: product.mpn ?? "",
          category: canonical.groupLabel,
          categorySlug: canonical.groupSlug,
          condition: product.condition,
          price: product.price === null || product.price === undefined ? null : Number(product.price),
          priceOnRequest: product.priceOnRequest,
          stockQty: product.stockQty,
          status: product.status,
          source: product.source ?? "database",
          image: product.images?.[0]?.url ?? null,
          updatedAt: product.updatedAt?.toISOString?.() ?? "",
          ebayPublishStatus: product.ebayPublishStatus ?? "NOT_LISTED",
          ebayListingId: product.ebayListingId ?? "",
          ebayItemId: product.ebayItemId ?? "",
          ebayOfferId: product.ebayOfferId ?? "",
          ebayMarketplaceId: product.ebayMarketplaceId ?? "EBAY_GB",
          deleteStatus: product.deleteStatus ?? null,
          deletedAt: product.deletedAt?.toISOString?.() ?? null,
        };
      }),
      total,
      counts,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  });

  if (dbResult.ok) return { source: "database", message: "Admin product list served from lightweight paginated endpoint.", categories: PUBLIC_CATEGORY_LIST, ...dbResult.data };
  const fallback = await getProductsFromRepository({ query: params.query, category: params.category, status: params.status, includeArchived: true });
  const start = (page - 1) * pageSize;
  return { ...fallback, products: fallback.products.slice(start, start + pageSize), page, pageSize, totalPages: Math.max(1, Math.ceil(fallback.products.length / pageSize)), counts: {} };
}

export async function getProductByIdFromRepository(id: string) {
  const dbResult = await withDatabase(async () => {
    await ensureOperationalTables().catch(() => null);
    const product = await prisma.product.findFirst({
      where: { OR: [{ id }, { sku: id }, { slug: id }] },
      include: { category: true, images: true, documents: true, specs: true, variants: { orderBy: { sortOrder: "asc" } }, tags: true, shippingPolicy: { include: { rates: { include: { zone: true } } } }, shippingOverrides: true },
    });
    return product ? mapDbProduct(product) : null;
  });

  if (dbResult.ok) return { source: "database", product: dbResult.data, error: null };

  const fallback = PRODUCTS.find((product) => product.id === id || product.sku === id || product.slug === id) ?? null;
  return {
    source: "catalog-fallback",
    product: fallback,
    error: fallback ? null : dbResult.reason,
  };
}

export async function saveProductToRepository(input: ProductWriteInput) {
  return withDatabase(async () => {
    await ensureOperationalTables().catch(() => null);
    const existingById = input.id ? await prisma.product.findUnique({ where: { id: input.id } }).catch(() => null) : null;
    const title = input.title?.trim() || "Untitled product";
    let sku = existingById?.sku || input.sku?.trim().toUpperCase() || "";
    if (!existingById) {
      // Never update an existing product just because the browser submitted a duplicated SKU.
      // This fixes repeated new products being saved as the same SKU such as CBUK0009.
      sku = await safeSkuForCreate(sku);
    } else if (sku && sku !== existingById.sku) {
      const conflict = await prisma.product.findFirst({ where: { sku, NOT: { id: existingById.id } } }).catch(() => null);
      if (conflict) sku = existingById.sku;
    }
    const slug = slugify(input.slug || title, sku.toLowerCase());
    const categoryId = await getCategoryId({ category: input.category, categorySlug: input.categorySlug, title, brand: input.brand, manufacturer: input.manufacturer, model: input.model, mpn: input.mpn });
    const relations = relationPayload(input);
    const existing = existingById;

    const data: any = {
      title,
      slug,
      sku,
      brand: input.brand ?? null,
      manufacturer: input.manufacturer ?? null,
      model: input.model ?? null,
      mpn: input.mpn ?? null,
      categoryId,
      condition: input.condition ?? "USED",
      status: input.status ?? "DRAFT",
      price: input.priceOnRequest || input.price === null || input.price === undefined ? null : Number(input.price),
      priceOnRequest: Boolean(input.priceOnRequest),
      stockQty: Number(input.stockQty ?? 0),
      description: input.description ?? null,
      productOverview: input.productOverview ?? null,
      videoUrl: (input as any).videoUrl?.trim?.() || null,
      dispatchNote: input.dispatchNote ?? null,
      leadTime: input.leadTime ?? null,
      warranty: input.warranty ?? null,
      locationBin: input.locationBin ?? null,
      itemLocation: input.itemLocation?.trim?.() || "United Kingdom",
      hsCode: input.hsCode ?? null,
      dimensions: input.dimensionsCm ?? null,
      weight: input.weightKg ? Number(input.weightKg) : null,
      source: input.source ?? "admin",
      seoTitle: (input as any).seoTitle ?? null,
      seoDescription: (input as any).seoDescription ?? null,
      seoKeywords: (input as any).seoKeywords ?? (Array.isArray(input.tags) ? input.tags.join(", ") : null),
      ebayItemId: (input as any).ebayItemId ?? null,
      syncExcluded: Boolean((input as any).syncExcluded ?? (input as any).ebayExcludedFromSync),
      ebayExcludedFromSync: Boolean((input as any).ebayExcludedFromSync ?? (input as any).syncExcluded),
      ebayShowOnUsCanada: Boolean((input as any).ebayShowOnUsCanada),
      shippingPolicyId: (input as any).shippingPolicyId || null,
      packedWeightKg: (input as any).packedWeightKg ? Number((input as any).packedWeightKg) : null,
      packedLengthCm: (input as any).packedLengthCm ? Number((input as any).packedLengthCm) : null,
      packedWidthCm: (input as any).packedWidthCm ? Number((input as any).packedWidthCm) : null,
      packedHeightCm: (input as any).packedHeightCm ? Number((input as any).packedHeightCm) : null,
      shippingManualQuoteRequired: Boolean((input as any).shippingManualQuoteRequired),
      shippingCollectionOnly: Boolean((input as any).shippingCollectionOnly),
      shippingUkAllowed: (input as any).shippingUkAllowed !== false,
      shippingEuropeAllowed: (input as any).shippingEuropeAllowed !== false,
      shippingWorldwideAllowed: (input as any).shippingWorldwideAllowed !== false,
      rawEbayDescription: (input as any).rawEbayDescription ?? null,
      titleLocked: Boolean((input as any).titleLocked),
      priceLocked: Boolean((input as any).priceLocked),
      imagesLocked: Boolean((input as any).imagesLocked),
      specsLocked: Boolean((input as any).specsLocked),
      descriptionLocked: Boolean((input as any).descriptionLocked),
    };

    const product = existing
      ? await prisma.product.update({ where: { id: existing.id }, data })
      : await prisma.product.create({ data });

    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    if (relations.images.length) {
      await prisma.productImage.createMany({ data: relations.images.map((image) => ({ ...image, productId: product.id })) });
    }

    await prisma.productSpec.deleteMany({ where: { productId: product.id } });
    if (relations.specs.length) {
      await prisma.productSpec.createMany({ data: relations.specs.map((spec) => ({ ...spec, productId: product.id })) });
    }

    await prisma.productDocument.deleteMany({ where: { productId: product.id } });
    if (relations.documents.length) {
      await prisma.productDocument.createMany({ data: relations.documents.map((document) => ({ ...document, productId: product.id })) });
    }

    await prisma.productVariant.deleteMany({ where: { productId: product.id } });
    if (relations.variants.length) {
      await prisma.productVariant.createMany({ data: relations.variants.map((variant) => ({ ...variant, productId: product.id })) });
    }

    const shippingOverrides = (input as any).shippingOverrides && typeof (input as any).shippingOverrides === "object" ? (input as any).shippingOverrides : null;
    const hasShippingOverride = Boolean(shippingOverrides && Object.keys(shippingOverrides).length) || Boolean((input as any).shippingManualQuoteRequired) || Boolean((input as any).shippingCollectionOnly);
    if (hasShippingOverride) {
      await prisma.productShippingOverride.upsert({
        where: { productId: product.id },
        update: {
          shippingPolicyId: (input as any).shippingPolicyId || null,
          zoneOverridesJson: shippingOverrides,
          packedWeightKg: (input as any).packedWeightKg ? Number((input as any).packedWeightKg) : null,
          packedLengthCm: (input as any).packedLengthCm ? Number((input as any).packedLengthCm) : null,
          packedWidthCm: (input as any).packedWidthCm ? Number((input as any).packedWidthCm) : null,
          packedHeightCm: (input as any).packedHeightCm ? Number((input as any).packedHeightCm) : null,
          manualQuoteRequired: Boolean((input as any).shippingManualQuoteRequired),
          collectionOnly: Boolean((input as any).shippingCollectionOnly),
        },
        create: {
          productId: product.id,
          shippingPolicyId: (input as any).shippingPolicyId || null,
          zoneOverridesJson: shippingOverrides,
          packedWeightKg: (input as any).packedWeightKg ? Number((input as any).packedWeightKg) : null,
          packedLengthCm: (input as any).packedLengthCm ? Number((input as any).packedLengthCm) : null,
          packedWidthCm: (input as any).packedWidthCm ? Number((input as any).packedWidthCm) : null,
          packedHeightCm: (input as any).packedHeightCm ? Number((input as any).packedHeightCm) : null,
          manualQuoteRequired: Boolean((input as any).shippingManualQuoteRequired),
          collectionOnly: Boolean((input as any).shippingCollectionOnly),
        },
      });
    } else {
      await prisma.productShippingOverride.deleteMany({ where: { productId: product.id } });
    }

    const saved = await prisma.product.findUnique({
      where: { id: product.id },
      include: { category: true, images: true, documents: true, specs: true, variants: { orderBy: { sortOrder: "asc" } }, tags: true, shippingPolicy: { include: { rates: { include: { zone: true } } } }, shippingOverrides: true },
    });

    return saved ? mapDbProduct(saved) : product;
  });
}

export async function getNextSkuFromRepository() {
  return withDatabase(async () => ({ sku: await nextSku() }));
}

export async function migrateExistingProductsToSequentialSkus() {
  return withDatabase(async () => {
    await ensureOperationalTables().catch(() => null);
    const products = await prisma.product.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, sku: true, ebayListingId: true, ebayOfferId: true, ebayInventoryItemSku: true },
    });
    const migrationRun = `sku-migration-${Date.now()}`;
    // Avoid unique conflicts when SKUs are being swapped/re-numbered by temporarily moving all rows first.
    for (let index = 0; index < products.length; index += 1) {
      await prisma.product.update({ where: { id: products[index].id }, data: { sku: `TMP-${migrationRun}-${index + 1}` } });
    }

    const changed: Array<{ id: string; oldSku: string; newSku: string; ebayLinked: boolean }> = [];
    for (let index = 0; index < products.length; index += 1) {
      const product = products[index];
      const newSku = formatCombaySku(index + 1);
      const oldSku = product.sku;
      await prisma.product.update({
        where: { id: product.id },
        data: {
          sku: newSku,
          ebayInventoryItemSku: product.ebayListingId || product.ebayOfferId ? (product.ebayInventoryItemSku || oldSku) : newSku,
          ebaySkuLocked: Boolean(product.ebayListingId || product.ebayOfferId),
        } as any,
      });
      if (oldSku !== newSku) {
        await prisma.skuAuditLog.create({
          data: {
            productId: product.id,
            oldSku,
            newSku,
            reason: product.ebayListingId || product.ebayOfferId ? "Phase 27B historical SKU migration. eBay-linked product retained marketplace inventory SKU and requires eBay SKU repair review." : "Phase 27B historical SKU migration to strict CBUK sequence.",
            changedBy: "system",
            ebayUpdateStatus: product.ebayListingId || product.ebayOfferId ? "REVIEW_REQUIRED" : "NOT_REQUIRED",
          },
        }).catch(() => null);
        changed.push({ id: product.id, oldSku, newSku, ebayLinked: Boolean(product.ebayListingId || product.ebayOfferId) });
      }
    }
    return { total: products.length, changedCount: changed.length, changed, nextSku: await nextSku() };
  });
}

export async function hardDeleteProductInRepository(id: string) {
  return withDatabase(async () => {
    await ensureOperationalTables().catch(() => null);
    const product = await prisma.product.findFirst({ where: { OR: [{ id }, { sku: id }, { slug: id }] } });
    if (!product) throw new Error("Product not found.");
    const [orderItems, invoiceLines, movements, ebayLogs] = await Promise.all([
      prisma.orderItem.count({ where: { OR: [{ productId: product.id }, { sku: product.sku }] } }).catch(() => 0),
      prisma.invoiceLine.count({ where: { sku: product.sku } }).catch(() => 0),
      prisma.inventoryMovement.count({ where: { OR: [{ productId: product.id }, { sku: product.sku }] } }).catch(() => 0),
      prisma.ebaySyncLog.count({ where: { OR: [{ productId: product.id }, { sku: product.sku }, { ebayListingId: product.ebayListingId || product.ebayItemId || "__none__" }, { ebayOfferId: product.ebayOfferId || "__none__" }] } }).catch(() => 0),
    ]);
    const blockers = { orderItems, invoiceLines, movements, ebayLogs, ebayListingId: Boolean(product.ebayListingId || product.ebayItemId), ebayOfferId: Boolean(product.ebayOfferId) };
    // Phase 27H: eBay history alone must not block deletion from the Combay website/admin catalogue.
    // Only business/accounting/stock records block destructive deletion. Marketplace ending remains a separate action.
    const blocked = Boolean(orderItems || invoiceLines || movements);
    if (blocked) {
      await prisma.product.update({ where: { id: product.id }, data: { status: "ARCHIVED", deleteRequestedAt: new Date(), deleteStatus: "DELETE_BLOCKED", deletedAt: new Date() } as any }).catch(() => null);
      return { deleted: false, archived: true, blocked: true, blockers, message: "Product has order, invoice, or stock movement history, so it was removed from active Combay views and marked delete-blocked instead of destroying accounting/stock evidence." };
    }
    await prisma.product.delete({ where: { id: product.id } });
    return { deleted: true, archived: false, blocked: false, blockers, message: ebayLogs || product.ebayListingId || product.ebayItemId || product.ebayOfferId ? "Product permanently deleted from Combay. eBay history/logs were retained separately for audit; this did not end the eBay listing." : "Product permanently deleted from Combay." };
  });
}

export async function archiveProductInRepository(id: string) {
  return withDatabase(async () => {
    await ensureOperationalTables().catch(() => null);
    const existing = await prisma.product.findFirst({ where: { OR: [{ id }, { sku: id }, { slug: id }] } });
    if (!existing) throw new Error("Product not found.");
    return prisma.product.update({ where: { id: existing.id }, data: { status: "ARCHIVED" } });
  });
}


export async function restoreProductInRepository(id: string) {
  return withDatabase(async () => {
    await ensureOperationalTables().catch(() => null);
    const existing = await prisma.product.findFirst({ where: { OR: [{ id }, { sku: id }, { slug: id }] } });
    if (!existing) throw new Error("Product not found.");
    return prisma.product.update({ where: { id: existing.id }, data: { status: "DRAFT", deletedAt: null, deleteRequestedAt: null, deletePurgeAfter: null, deleteStatus: null } as any });
  });
}

export async function bulkDeleteOrArchiveProductsInRepository(ids: string[], mode: "archive" | "hard" | "restore" = "archive") {
  return withDatabase(async () => {
    await ensureOperationalTables().catch(() => null);
    const uniqueIds = Array.from(new Set(ids.map((id) => String(id || "").trim()).filter(Boolean))).slice(0, 200);
    const result: { success: true; deleted: number; archived: number; restored: number; skipped: number; failed: number; errors: Array<{ productId: string; sku?: string; reason: string }> } = {
      success: true,
      deleted: 0,
      archived: 0,
      restored: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    for (const productId of uniqueIds) {
      try {
        const action = mode === "hard" ? await hardDeleteProductInRepository(productId) : mode === "restore" ? await restoreProductInRepository(productId) : await archiveProductInRepository(productId);
        if (!action.ok) {
          result.failed += 1;
          result.errors.push({ productId, reason: action.reason || "Action failed." });
          continue;
        }
        const data: any = action.data;
        if (mode === "hard") {
          if (data?.deleted) result.deleted += 1;
          else if (data?.archived) result.archived += 1;
          else result.skipped += 1;
          if (data?.blocked) result.errors.push({ productId, reason: data.message || "Protected product was archived instead of hard-deleted." });
        } else if (mode === "restore") {
          result.restored += 1;
        } else {
          result.archived += 1;
        }
      } catch (error) {
        result.failed += 1;
        result.errors.push({ productId, reason: error instanceof Error ? error.message : "Unknown product action error." });
      }
    }

    return result;
  });
}
