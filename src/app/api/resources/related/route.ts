export const dynamic = "force-dynamic";

import { listResourcesForProduct } from "@/lib/resources";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId") || "";
  const result = await listResourcesForProduct(productId, { publicOnly: true, take: Number(searchParams.get("take") || 4) });
  if (!result.ok) return Response.json({ ok: false, error: result.reason }, { status: 202 });
  return Response.json({ ok: true, resources: result.data });
}
