import { CATEGORIES, PRODUCTS, searchProducts } from "@/lib/catalog";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const condition = searchParams.get("condition") ?? "";
  const priceMinRaw = searchParams.get("priceMin");
  const priceMaxRaw = searchParams.get("priceMax");
  const priceMin = priceMinRaw ? Number(priceMinRaw) : null;
  const priceMax = priceMaxRaw ? Number(priceMaxRaw) : null;

  const products = searchProducts({
    query: q,
    category,
    condition,
    priceMin: Number.isFinite(priceMin) ? priceMin : null,
    priceMax: Number.isFinite(priceMax) ? priceMax : null,
  });

  return Response.json({
    ok: true,
    source: "phase2-catalog-fallback",
    message: "Product API is DB-ready. It currently serves the structured Phase 2 catalogue until PostgreSQL is connected.",
    count: products.length,
    total: PRODUCTS.length,
    categories: CATEGORIES,
    products,
  });
}

export async function POST(req: Request) {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  return Response.json(
    {
      ok: false,
      source: "phase2-catalog-fallback",
      message: "Product creation requires PostgreSQL/Prisma connection in Phase 3 admin CRUD. Request body received for validation.",
      received: body,
    },
    { status: 501 },
  );
}
