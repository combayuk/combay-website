import { prisma, withDatabase } from "@/lib/db";
import { CATEGORIES, PRODUCTS, searchProducts, type CatalogProduct, type ConditionCode, type StockStatus } from "@/lib/catalog";
import { PUBLIC_CATEGORY_LIST, canonicalCategoryForText, isPublicCategoryMatch } from "@/lib/categoryTaxonomy";

export type ProductWriteInput = Omit<Partial<CatalogProduct>, "images" | "specs" | "variants" | "documents"> & {
  id?: string;
  status?: "PUBLISHED" | "DRAFT" | "ARCHIVED";
  source?: string;
  locationBin?: string;
  itemLocation?: string;
  hsCode?: string;
  ebayItemId?: string;
  syncExcluded?: boolean;
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
  images?: { url: string; alt?: string; isPrimary?: boolean; sortOrder?: number }[];
  specs?: { label: string; value: string }[];
  variants?: { id?: string; sku?: string | null; label: string; optionName?: string | null; optionValue?: string | null; price?: number | null; stockQty: number; sortOrder?: number; ebayVariationSku?: string | null; ebayVariationData?: any }[];
  documents?: { name: string; url: string; fileType?: string }[];
};

type DbProduct = Awaited<ReturnType<typeof prisma.product.findMany>>[number] & {
  category?: { name: string; slug: string } | null;
  images?: { url: string; alt: string | null; isPrimary: boolean; sortOrder: number }[];
  documents?: { name: string; url: string; fileType: string | null }[];
  specs?: { label: string; value: string; sortOrder: number }[];
  variants?: { id: string; sku: string | null; label: string; optionName: string | null; optionValue: string | null; price: any; stockQty: number; sortOrder: number }[];
  tags?: { name: string }[];
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
  const productImages = (product.images ?? []) as Array<{ url: string; alt: string | null; isPrimary: boolean; sortOrder: number }>;
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
    images: productImages.map((image) => ({ url: image.url, alt: image.alt, isPrimary: image.isPrimary, sortOrder: image.sortOrder })),
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
    syncExcluded: product.syncExcluded ?? false,
    rawEbayDescription: (product as any).rawEbayDescription ?? "",
    titleLocked: (product as any).titleLocked ?? false,
    priceLocked: (product as any).priceLocked ?? false,
    imagesLocked: (product as any).imagesLocked ?? false,
    specsLocked: (product as any).specsLocked ?? false,
    descriptionLocked: (product as any).descriptionLocked ?? false,
    dimensionsCm: product.dimensions ?? "",
    weightKg: product.weight === null || product.weight === undefined ? "" : String(product.weight),
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

async function nextSku() {
  const latest = await prisma.product.findMany({
    where: { sku: { startsWith: "CBUK" } },
    select: { sku: true },
    orderBy: { sku: "desc" },
    take: 50,
  });
  const max = (latest as Array<{ sku: string }>).reduce((highest: number, item: { sku: string }) => {
    const match = item.sku.match(/^CBUK(\d{5})$/i);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `CBUK${String(max + 1).padStart(5, "0")}`;
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
      alt: image.alt ?? input.title ?? null,
      isPrimary: image.isPrimary ?? index === 0,
      sortOrder: image.sortOrder ?? index,
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
    const where: any = {};

    if (params.status) where.status = params.status;
    else if (!params.includeArchived) where.status = "PUBLISHED";

    // Public category filtering is applied after products are mapped into Combay's canonical taxonomy.
    // This hides noisy marketplace/eBay categories without requiring destructive DB cleanup.
    if (params.condition) where.condition = params.condition;
    if (params.priceMin !== null && params.priceMin !== undefined) where.price = { ...(where.price ?? {}), gte: params.priceMin };
    if (params.priceMax !== null && params.priceMax !== undefined) where.price = { ...(where.price ?? {}), lte: params.priceMax };

    if (params.query) {
      where.OR = [
        { sku: { contains: params.query, mode: "insensitive" } },
        { title: { contains: params.query, mode: "insensitive" } },
        { brand: { contains: params.query, mode: "insensitive" } },
        { manufacturer: { contains: params.query, mode: "insensitive" } },
        { model: { contains: params.query, mode: "insensitive" } },
        { mpn: { contains: params.query, mode: "insensitive" } },
        { description: { contains: params.query, mode: "insensitive" } },
        { specs: { some: { OR: [{ label: { contains: params.query, mode: "insensitive" } }, { value: { contains: params.query, mode: "insensitive" } }] } } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
        documents: true,
        specs: { orderBy: { sortOrder: "asc" } },
        variants: { orderBy: { sortOrder: "asc" } },
        tags: true,
      },
      orderBy: { sku: "asc" },
      take: 5000,
    });

    const mappedProducts = products.map(mapDbProduct);
    const filteredProducts = params.category ? mappedProducts.filter((product) => isPublicCategoryMatch(product, params.category)) : mappedProducts;

    return { products: filteredProducts, categories: PUBLIC_CATEGORY_LIST };
  });

  if (dbResult.ok) {
    return {
      source: "database",
      message: "Products served from PostgreSQL/Prisma.",
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
    .filter((product) => isPublicCategoryMatch(product, params.category));

  return {
    source: "catalog-fallback",
    message: dbResult.reason,
    products,
    total: products.length,
    categories: PUBLIC_CATEGORY_LIST,
  };
}

export async function getProductByIdFromRepository(id: string) {
  const dbResult = await withDatabase(async () => {
    const product = await prisma.product.findFirst({
      where: { OR: [{ id }, { sku: id }, { slug: id }] },
      include: { category: true, images: true, documents: true, specs: true, variants: { orderBy: { sortOrder: "asc" } }, tags: true },
    });
    return product ? mapDbProduct(product) : null;
  });

  if (dbResult.ok) return { source: "database", product: dbResult.data };

  return {
    source: "catalog-fallback",
    product: PRODUCTS.find((product) => product.id === id || product.sku === id || product.slug === id) ?? null,
  };
}

export async function saveProductToRepository(input: ProductWriteInput) {
  return withDatabase(async () => {
    const sku = input.sku?.trim() || await nextSku();
    const title = input.title?.trim() || "Untitled product";
    const slug = slugify(input.slug || title, sku.toLowerCase());
    const categoryId = await getCategoryId({ category: input.category, categorySlug: input.categorySlug, title, brand: input.brand, manufacturer: input.manufacturer, model: input.model, mpn: input.mpn });
    const relations = relationPayload(input);
    const existing = input.id
      ? await prisma.product.findFirst({ where: { OR: [{ id: input.id }, { sku }, { slug }] } })
      : await prisma.product.findUnique({ where: { sku } });

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
      syncExcluded: Boolean((input as any).syncExcluded),
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

    const saved = await prisma.product.findUnique({
      where: { id: product.id },
      include: { category: true, images: true, documents: true, specs: true, variants: { orderBy: { sortOrder: "asc" } }, tags: true },
    });

    return saved ? mapDbProduct(saved) : product;
  });
}

export async function archiveProductInRepository(id: string) {
  return withDatabase(async () => {
    const existing = await prisma.product.findFirst({ where: { OR: [{ id }, { sku: id }, { slug: id }] } });
    if (!existing) throw new Error("Product not found.");
    return prisma.product.update({ where: { id: existing.id }, data: { status: "ARCHIVED" } });
  });
}
