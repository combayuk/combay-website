export const dynamic = "force-dynamic";

import { getEbayConfig, saveEbayConfig } from "@/lib/ebay";

export async function GET() {
  const config = await getEbayConfig();
  return Response.json({
    ok: true,
    config: {
      environment: config.environment,
      marketplaceId: config.marketplaceId,
      clientId: config.clientId ?? "",
      clientSecretConfigured: Boolean(config.clientSecret),
      ruName: config.ruName ?? "",
      refreshTokenConfigured: Boolean(config.refreshToken),
      lastSyncAt: config.lastSyncAt,
    },
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const config = await saveEbayConfig({
    environment: body.environment || "production",
    marketplaceId: body.marketplaceId || "EBAY_GB",
    clientId: body.clientId || undefined,
    clientSecret: body.clientSecret || undefined,
    ruName: body.ruName || undefined,
    refreshToken: body.refreshToken || undefined,
  });
  return Response.json({ ok: true, config: { id: config.id, environment: config.environment, marketplaceId: config.marketplaceId, lastSyncAt: config.lastSyncAt } });
}
