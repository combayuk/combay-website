export const dynamic = "force-dynamic";

import { repairImportedEbayListings } from "@/lib/ebayPublishing";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const result = await repairImportedEbayListings(body.limit ?? 100);
  if (!result.ok) return Response.json({ ok: false, error: result.reason }, { status: 202 });
  return Response.json({ ok: true, ...result.data });
}
