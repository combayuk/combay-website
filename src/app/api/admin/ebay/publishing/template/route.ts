import { createOrUpdateEbayTemplate } from "@/lib/ebayPublishing";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const result = await createOrUpdateEbayTemplate(body);
  if (!result.ok) return Response.json({ ok: false, error: result.reason }, { status: 202 });
  return Response.json({ ok: true, template: result.data });
}
