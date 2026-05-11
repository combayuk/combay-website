export const dynamic = "force-dynamic";

import { generateEbayDescriptionForProduct, getEbayProductPublishingState, queueEbayPublishReview, saveEbayProductDraft, validateEbayProduct } from "@/lib/ebayPublishing";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const result = await getEbayProductPublishingState(params.id);
  if (!result.ok) return Response.json({ ok: false, error: result.reason }, { status: 202 });
  return Response.json({ ok: true, ...result.data });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "save");
  let result;
  if (action === "generate-description") result = await generateEbayDescriptionForProduct(params.id, body.templateId);
  else if (action === "validate") result = await validateEbayProduct(params.id);
  else if (action === "queue-review") result = await queueEbayPublishReview(params.id);
  else result = await saveEbayProductDraft(params.id, body.product || body);

  if (!result.ok) return Response.json({ ok: false, error: result.reason }, { status: 202 });
  return Response.json({ ok: true, ...result.data });
}
