export const dynamic = "force-dynamic";

import { repairMissingEbayDetailImports } from "@/lib/ebay";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const limit = body?.limit === undefined ? 75 : Number(body.limit);
  const result = await repairMissingEbayDetailImports(limit);
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
