export const dynamic = "force-dynamic";

import { exchangeEbayCode } from "@/lib/ebay";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) return Response.redirect(`${url.origin}/admin/ebay?connected=0`);
  try {
    await exchangeEbayCode(code);
    return Response.redirect(`${url.origin}/admin/ebay?connected=1`);
  } catch (error: any) {
    return Response.redirect(`${url.origin}/admin/ebay?connected=0&error=${encodeURIComponent(error.message || "eBay connection failed")}`);
  }
}
