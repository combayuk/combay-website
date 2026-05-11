export const dynamic = "force-dynamic";

import { processNextApprovedEbayPublishJob } from "@/lib/ebayPublishing";

export async function POST() {
  const result = await processNextApprovedEbayPublishJob();
  if (!result.ok) return Response.json({ ok: false, error: result.reason }, { status: 202 });
  return Response.json({ ok: true, ...result.data });
}
