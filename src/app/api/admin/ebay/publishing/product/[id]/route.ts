export const dynamic = "force-dynamic";

import { applyEbayCategoryToProduct, generateEbayDescriptionForProduct, getEbayProductPublishingState, publishProductToEbay, endEbayListingForProduct, queueEbayPublishReview, saveEbayProductDraft, suggestEbayCategoriesForProduct, validateEbayProduct } from "@/lib/ebayPublishing";

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
  else if (action === "live-publish") result = await publishProductToEbay(params.id, { confirmLivePublish: Boolean(body.confirmLivePublish), triggeredBy: "admin" });
  else if (action === "end-listing") result = await endEbayListingForProduct(params.id, { confirmEndListing: Boolean(body.confirmEndListing), triggeredBy: "admin" });
  else if (action === "suggest-categories") result = await suggestEbayCategoriesForProduct(params.id, body.query, body.marketplaceId);
  else if (action === "apply-category") result = await applyEbayCategoryToProduct(params.id, { categoryId: body.categoryId, categoryName: body.categoryName, categoryPath: body.categoryPath, marketplaceId: body.marketplaceId });
  else result = await saveEbayProductDraft(params.id, body.product || body);

  if (!result.ok) return Response.json({ ok: false, error: result.reason }, { status: 202 });
  return Response.json({ ok: true, ...result.data });
}
