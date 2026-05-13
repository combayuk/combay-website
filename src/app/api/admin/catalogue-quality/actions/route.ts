export const dynamic = "force-dynamic";

import { requireAdminApiSession } from "@/lib/apiAccess";
import { applyCatalogueQualityAction } from "@/lib/catalogueQuality";

export async function POST(req: Request) {
  const access = await requireAdminApiSession();
  if (!access.ok) return access.response;
  const body = await req.json().catch(() => ({}));
  const result = await applyCatalogueQualityAction({
    ids: Array.isArray(body?.ids) ? body.ids : [],
    action: body?.action,
    categorySlug: body?.categorySlug,
    shippingPolicyId: body?.shippingPolicyId,
    value: body?.value,
    note: body?.note,
  });
  if (!result.ok) return Response.json({ ok: false, error: result.reason }, { status: 400 });
  return Response.json({ ok: true, result: result.data });
}
