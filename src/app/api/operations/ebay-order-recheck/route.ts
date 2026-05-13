export const dynamic = "force-dynamic";

import { requireAdminApiSession } from "@/lib/apiAccess";
import { syncRecentEbayOrders } from "@/lib/ebayOrders";

export async function POST(req: Request) {
  const access = await requireAdminApiSession();
  if (!access.ok) return access.response;
  const body = await req.json().catch(() => ({}));
  const result = await syncRecentEbayOrders({
    days: Math.max(1, Math.min(90, Number(body?.days || 30))),
    limit: Math.max(10, Math.min(100, Number(body?.limit || 100))),
    triggeredBy: "admin-operations-recheck",
  });
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
