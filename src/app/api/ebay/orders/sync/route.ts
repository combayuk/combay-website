export const dynamic = "force-dynamic";

import { requireAdminApiSession } from "@/lib/apiAccess";
import { getEbayOrderSyncStatus, syncRecentEbayOrders } from "@/lib/ebayOrders";

export async function GET() {
  const access = await requireAdminApiSession();
  if (!access.ok) return access.response;
  const status = await getEbayOrderSyncStatus();
  return Response.json({ ok: true, ...status });
}

export async function POST(req: Request) {
  const access = await requireAdminApiSession();
  if (!access.ok) return access.response;
  const body = await req.json().catch(() => ({}));
  const result = await syncRecentEbayOrders({
    days: Number(body?.days || 14),
    limit: Number(body?.limit || 50),
    triggeredBy: "admin",
  });
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
