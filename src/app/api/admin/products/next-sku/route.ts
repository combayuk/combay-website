import { getNextSkuFromRepository } from "@/lib/productRepository";

export async function GET() {
  const result = await getNextSkuFromRepository();
  if (!result.ok) return Response.json({ ok: false, error: result.reason || "Could not calculate next SKU." }, { status: 202 });
  return Response.json({ ok: true, ...result.data });
}
