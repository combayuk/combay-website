export const dynamic = "force-dynamic";

import { remapProductsToPublicCategories } from "@/lib/ebay";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const limit = body?.limit === undefined ? 1000 : Number(body.limit);
  const result = await remapProductsToPublicCategories(limit);
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
