import { getAdminProductsListFromRepository, getProductsFromRepository, saveProductToRepository } from "@/lib/productRepository";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? searchParams.get("cat") ?? "";
  const condition = searchParams.get("condition") ?? "";
  const status = searchParams.get("status") ?? "";
  const admin = searchParams.get("admin") === "1";
  const priceMinRaw = searchParams.get("priceMin") ?? searchParams.get("min");
  const priceMaxRaw = searchParams.get("priceMax") ?? searchParams.get("max");
  const priceMin = priceMinRaw ? Number(priceMinRaw) : null;
  const priceMax = priceMaxRaw ? Number(priceMaxRaw) : null;
  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("pageSize") || 50);

  if (admin) {
    const result = await getAdminProductsListFromRepository({ query: q, category, status, page, pageSize });
    return Response.json({
      ok: true,
      source: result.source,
      message: result.message,
      count: result.products.length,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
      counts: result.counts,
      categories: result.categories,
      products: result.products,
    });
  }

  const result = await getProductsFromRepository({
    query: q,
    category,
    condition,
    status,
    includeArchived: admin,
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

  if (!body?.title) {
    return Response.json({ ok: false, error: "Product title is required." }, { status: 400 });
  }

  const dbResult = await saveProductToRepository(body);

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
