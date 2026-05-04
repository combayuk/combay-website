import { prisma, withDatabase } from "@/lib/db";
import { CATEGORIES, PRODUCTS, searchProducts, type CatalogProduct, type ConditionCode, type StockStatus } from "@/lib/catalog";

type ProductWithRelations = Awaited<ReturnType<typeof prisma.product.findMany>>[number] & {
  category?: { name: string; slug: string } | null;
  images?: { url: string; isPrimary: boolean; sortOrder: number }[];
  documents?: { name: string; url: string; fileType: string | null }[];
};

function stockStatus(stockQty: number, priceOnRequest: boolean): StockStatus {
  if (priceOnRequest) return "POA";
  if (stockQty <= 0) return "OUT_OF_STOCK";
  if (stockQty <= 2) return "LOW_STOCK";
  return "IN_STOCK";
}

function mapDbProduct(product: ProductWithRelations): CatalogProduct {
  const price = product.price === null || product.price === undefined ? null : Number(product.price);
  const primaryImage = product.images?.find((image) => image.isPrimary)?.url ?? product.images?.[0]?.url ?? null;

  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    title: product.title,
    brand: product.brand ?? "",
    manufacturer: product.manufacturer ?? product.brand ?? "",
    model: product.model ?? "",
    mpn: product.mpn ?? "",
    category: product.category?.name ?? "Uncategorised",
    categorySlug: product.category?.slug ?? "uncategorised",
    condition: product.condition as ConditionCode,
    price,
    priceOnRequest: product.priceOnRequest,
    stockQty: product.stockQty,
    stockStatus: stockStatus(product.stockQty, product.priceOnRequest),
    leadTime: product.leadTime ?? "UK dispatch normally within 1–2 working days after cleared payment.",
    warranty: product.warranty ?? "30-day return-to-base warranty unless otherwise stated.",
    dispatchNote: product.dispatchNote ?? "Packed for courier dispatch with serial number recorded before shipment.",
    image: primaryImage,
    description: product.description ?? "",
    productOverview: product.productOverview ?? product.description ?? "",
    specs: [],
    documents: (product.documents ?? []).map((document) => ({
      name: document.name,
      url: document.url,
      fileType: document.fileType ?? "Document",
    })),
    tags: [product.sku, product.brand, product.manufacturer, product.model, product.mpn].filter(Boolean) as string[],
  };
}

export async function getProductsFromRepository(params: {
  query?: string;
  category?: string;
  condition?: string;
  priceMin?: number | null;
  priceMax?: number | null;
}) {
  const dbResult = await withDatabase(async () => {
    const where: any = {
      status: "PUBLISHED",
    };

    if (params.category) {
      where.category = { slug: params.category };
    }

    if (params.condition) {
      where.condition = params.condition;
    }

    if (params.priceMin !== null && params.priceMin !== undefined) {
      where.price = { ...(where.price ?? {}), gte: params.priceMin };
    }

    if (params.priceMax !== null && params.priceMax !== undefined) {
      where.price = { ...(where.price ?? {}), lte: params.priceMax };
    }

    if (params.query) {
      where.OR = [
        { sku: { contains: params.query, mode: "insensitive" } },
        { title: { contains: params.query, mode: "insensitive" } },
        { brand: { contains: params.query, mode: "insensitive" } },
        { manufacturer: { contains: params.query, mode: "insensitive" } },
        { model: { contains: params.query, mode: "insensitive" } },
        { mpn: { contains: params.query, mode: "insensitive" } },
        { description: { contains: params.query, mode: "insensitive" } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
        documents: true,
      },
      orderBy: { sku: "asc" },
      take: 100,
    });

    return products.map(mapDbProduct);
  });

  if (dbResult.ok) {
    return {
      source: "database",
      message: "Products served from PostgreSQL/Prisma.",
      products: dbResult.data,
      total: dbResult.data.length,
      categories: CATEGORIES,
    };
  }

  const products = searchProducts({
    query: params.query ?? "",
    category: params.category ?? "",
    condition: params.condition ?? "",
    priceMin: params.priceMin ?? null,
    priceMax: params.priceMax ?? null,
  });

  return {
    source: "catalog-fallback",
    message: dbResult.reason,
    products,
    total: PRODUCTS.length,
    categories: CATEGORIES,
  };
}

export async function getProductByIdFromRepository(id: string) {
  const dbResult = await withDatabase(async () => {
    const product = await prisma.product.findFirst({
      where: { OR: [{ id }, { sku: id }, { slug: id }] },
      include: { category: true, images: true, documents: true },
    });
    return product ? mapDbProduct(product) : null;
  });

  if (dbResult.ok) return { source: "database", product: dbResult.data };

  return {
    source: "catalog-fallback",
    product: PRODUCTS.find((product) => product.id === id || product.sku === id || product.slug === id) ?? null,
  };
}
