export const dynamic = "force-dynamic";

import { requireAdminApiSession } from "@/lib/apiAccess";
import { applyProductCategorySuggestion } from "@/lib/operationalAudit";

export async function POST(req: Request) {
  const access = await requireAdminApiSession();
  if (!access.ok) return access.response;
  const body = await req.json().catch(() => ({}));
  const result = await applyProductCategorySuggestion({ productId: body?.productId, targetSlug: body?.targetSlug });
  if (!result.ok) return Response.json({ ok: false, error: result.reason }, { status: 400 });
  return Response.json({ ok: true, result: result.data });
}
