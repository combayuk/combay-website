export const dynamic = "force-dynamic";

import { syncRecentEbayOrders } from "@/lib/ebayOrders";

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET || "";
  const auth = req.headers.get("authorization") || "";
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  if (expected && auth !== `Bearer ${expected}` && token !== expected) {
    return Response.json({ ok: false, error: "Unauthorized cron request." }, { status: 401 });
  }
  const result = await syncRecentEbayOrders({ days: 7, limit: 50, triggeredBy: "cron" });
  return Response.json(result, { status: result.ok ? 200 : 500 });
}

export async function POST(req: Request) {
  return GET(req);
}
