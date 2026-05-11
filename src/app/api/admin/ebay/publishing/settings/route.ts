export const dynamic = "force-dynamic";

import { getEbayPublishingSettings, saveEbayPublishingSettings } from "@/lib/ebayPublishing";

export async function GET() {
  const result = await getEbayPublishingSettings();
  if (!result.ok) return Response.json({ ok: false, error: result.reason }, { status: 202 });
  return Response.json({ ok: true, ...result.data });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const result = await saveEbayPublishingSettings(body);
  if (!result.ok) return Response.json({ ok: false, error: result.reason }, { status: 202 });
  return Response.json({ ok: true, config: result.data });
}
