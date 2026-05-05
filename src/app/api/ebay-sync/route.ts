export const dynamic = "force-dynamic";

import { runEbayInventorySync } from "@/lib/ebay";

export async function GET() {
  return Response.json({ ok: true, message: "Use POST /api/ebay/sync for eBay inventory sync." });
}

export async function POST() {
  const result = await runEbayInventorySync();
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
