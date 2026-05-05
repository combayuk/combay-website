import { buildEbayConsentUrl, getEbayConfig } from "@/lib/ebay";

export async function GET(req: Request) {
  try {
    const config = await getEbayConfig();
    const url = new URL(req.url);
    const consentUrl = buildEbayConsentUrl(config, `${url.origin}/api/ebay/auth/callback`);
    return Response.redirect(consentUrl);
  } catch (error: any) {
    return Response.json({ ok: false, error: error.message || "Could not start eBay OAuth." }, { status: 400 });
  }
}
