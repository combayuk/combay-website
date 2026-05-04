import { getProductsFromRepository, saveProductToRepository } from "@/lib/productRepository";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const condition = searchParams.get("condition") ?? "";
  const status = searchParams.get("status") ?? "";
  const admin = searchParams.get("admin") === "1";
  const priceMinRaw = searchParams.get("priceMin");
  const priceMaxRaw = searchParams.get("priceMax");
  const priceMin = priceMinRaw ? Number(priceMinRaw) : null;
  const priceMax = priceMaxRaw ? Number(priceMaxRaw) : null;

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
