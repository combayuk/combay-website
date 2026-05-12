export const dynamic = "force-dynamic";

import { clearEbayOAuthConnection, buildEbayConsentUrl, getEbayConfig } from "@/lib/ebay";

export async function POST(req: Request) {
  try {
    const reset = await clearEbayOAuthConnection();
    const url = new URL(req.url);
    const config = await getEbayConfig();
    let reconnectUrl = "";
    try {
      reconnectUrl = buildEbayConsentUrl(config, `${url.origin}/api/ebay/auth/callback`);
    } catch {
      reconnectUrl = "/admin/ebay";
    }
    return Response.json({ ok: true, reset, reconnectUrl, message: "Saved eBay OAuth tokens cleared. Reconnect eBay to grant the latest Account, Inventory and Fulfillment permissions." });
  } catch (error: any) {
    return Response.json({ ok: false, error: error?.message || "Could not reset eBay connection." }, { status: 400 });
  }
}
