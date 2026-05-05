import { prisma } from "@/lib/db";
import { saveProductToRepository } from "@/lib/productRepository";

type EbayConfig = {
  environment: string;
  marketplaceId: string;
  clientId?: string | null;
  clientSecret?: string | null;
  ruName?: string | null;
  refreshToken?: string | null;
  accessToken?: string | null;
  accessTokenExpiresAt?: Date | null;
};

const INVENTORY_READONLY_SCOPE = "https://api.ebay.com/oauth/api_scope/sell.inventory.readonly";
const INVENTORY_SCOPE = "https://api.ebay.com/oauth/api_scope/sell.inventory";

function apiRoot(environment?: string) {
  return environment === "sandbox" ? "https://api.sandbox.ebay.com" : "https://api.ebay.com";
}

function authRoot(environment?: string) {
  return environment === "sandbox" ? "https://auth.sandbox.ebay.com" : "https://auth.ebay.com";
}

function tokenUrl(environment?: string) {
  return `${apiRoot(environment)}/identity/v1/oauth2/token`;
}

export async function getEbayConfig() {
  const existing = await prisma.ebaySyncConfig.findFirst({ orderBy: { updatedAt: "desc" } });
  if (existing) {
    return {
      ...existing,
      clientId: existing.clientId || process.env.EBAY_CLIENT_ID || null,
      clientSecret: existing.clientSecret || process.env.EBAY_CLIENT_SECRET || null,
      ruName: existing.ruName || process.env.EBAY_RUNAME || null,
      environment: existing.environment || process.env.EBAY_ENVIRONMENT || "production",
      marketplaceId: existing.marketplaceId || process.env.EBAY_MARKETPLACE_ID || "EBAY_GB",
    };
  }
  return prisma.ebaySyncConfig.create({
    data: {
      environment: process.env.EBAY_ENVIRONMENT || "production",
      marketplaceId: process.env.EBAY_MARKETPLACE_ID || "EBAY_GB",
      clientId: process.env.EBAY_CLIENT_ID || null,
      clientSecret: process.env.EBAY_CLIENT_SECRET || null,
      ruName: process.env.EBAY_RUNAME || null,
    },
  });
}

export async function saveEbayConfig(input: Partial<EbayConfig>) {
  const existing = await getEbayConfig();
  return prisma.ebaySyncConfig.update({
    where: { id: existing.id },
    data: {
      environment: input.environment ?? existing.environment,
      marketplaceId: input.marketplaceId ?? existing.marketplaceId,
      clientId: input.clientId ?? existing.clientId,
      clientSecret: input.clientSecret ?? existing.clientSecret,
      ruName: input.ruName ?? existing.ruName,
      refreshToken: input.refreshToken ?? existing.refreshToken,
    },
  });
}

export function buildEbayConsentUrl(config: EbayConfig, callbackUrl?: string) {
  if (!config.clientId || !config.ruName) throw new Error("Missing eBay Client ID or RuName.");
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.ruName,
    response_type: "code",
    scope: `${INVENTORY_READONLY_SCOPE} ${INVENTORY_SCOPE}`,
  });
  if (callbackUrl) params.set("state", Buffer.from(JSON.stringify({ callbackUrl })).toString("base64url"));
  return `${authRoot(config.environment)}/oauth2/authorize?${params.toString()}`;
}

async function tokenRequest(config: EbayConfig, body: URLSearchParams) {
  if (!config.clientId || !config.clientSecret) throw new Error("Missing eBay Client ID or Client Secret.");
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
  const response = await fetch(tokenUrl(config.environment), {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error_description || data.error || `eBay token request failed (${response.status})`);
  return data;
}

export async function exchangeEbayCode(code: string) {
  const config = await getEbayConfig();
  if (!config.ruName) throw new Error("Missing eBay RuName/redirect URI.");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.ruName,
  });
  const data = await tokenRequest(config, body);
  await prisma.ebaySyncConfig.update({
    where: { id: config.id },
    data: {
      refreshToken: data.refresh_token ?? config.refreshToken,
      accessToken: data.access_token ?? null,
      accessTokenExpiresAt: data.expires_in ? new Date(Date.now() + Number(data.expires_in) * 1000) : null,
    },
  });
  return data;
}

export async function getEbayAccessToken() {
  const config = await getEbayConfig();
  if (config.accessToken && config.accessTokenExpiresAt && config.accessTokenExpiresAt.getTime() > Date.now() + 120000) {
    return { token: config.accessToken, config };
  }
  if (!config.refreshToken) throw new Error("No eBay refresh token saved. Connect eBay first or paste a refresh token.");
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: config.refreshToken,
    scope: INVENTORY_READONLY_SCOPE,
  });
  const data = await tokenRequest(config, body);
  const updated = await prisma.ebaySyncConfig.update({
    where: { id: config.id },
    data: {
      accessToken: data.access_token,
      accessTokenExpiresAt: data.expires_in ? new Date(Date.now() + Number(data.expires_in) * 1000) : null,
    },
  });
  return { token: data.access_token as string, config: updated };
}

function aspect(aspects: Record<string, string[] | string> | undefined, keys: string[]) {
  if (!aspects) return "";
  for (const key of keys) {
    const foundKey = Object.keys(aspects).find((k) => k.toLowerCase() === key.toLowerCase());
    if (!foundKey) continue;
    const value = aspects[foundKey];
    return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
  }
  return "";
}

function asMoney(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function getOffersForSku(token: string, config: EbayConfig, sku: string) {
  const params = new URLSearchParams({ sku, marketplace_id: config.marketplaceId || "EBAY_GB" });
  const response = await fetch(`${apiRoot(config.environment)}/sell/inventory/v1/offer?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!response.ok) return [];
  const data = await response.json().catch(() => ({}));
  return Array.isArray(data.offers) ? data.offers : [];
}

export async function runEbayInventorySync() {
  const run = await prisma.ebaySyncRun.create({ data: { status: "RUNNING", message: "Starting eBay inventory sync." } });
  let imported = 0, updated = 0, skipped = 0;
  const errors: string[] = [];
  try {
    const { token, config } = await getEbayAccessToken();
    let offset = 0;
    const limit = 50;
    let total = 0;
    do {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      const response = await fetch(`${apiRoot(config.environment)}/sell/inventory/v1/inventory_item?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.errors?.[0]?.message || data.message || `eBay inventory request failed (${response.status})`);
      const items = Array.isArray(data.inventoryItems) ? data.inventoryItems : [];
      total = Number(data.total ?? items.length ?? 0);
      for (const item of items) {
        try {
          const sku = String(item.sku || "").trim();
          if (!sku) { skipped++; continue; }
          const existing = await prisma.product.findUnique({ where: { sku } });
          if (existing?.syncExcluded) { skipped++; continue; }
          const offers = await getOffersForSku(token, config, sku);
          const activeOffer = offers.find((offer: any) => offer.status === "PUBLISHED") || offers[0] || null;
          const aspects = item.product?.aspects as Record<string, string[] | string> | undefined;
          const price = asMoney(activeOffer?.pricingSummary?.price?.value);
          const quantity = Number(item.availability?.shipToLocationAvailability?.quantity ?? 0);
          const title = String(item.product?.title || sku);
          const description = String(item.product?.description || "");
          const images = Array.isArray(item.product?.imageUrls) ? item.product.imageUrls.map((url: string, i: number) => ({ url, alt: title, isPrimary: i === 0, sortOrder: i })) : [];
          const specs = Object.entries(aspects ?? {}).map(([label, raw]) => ({ label, value: Array.isArray(raw) ? raw.join(", ") : String(raw) }));
          const savedResult = await saveProductToRepository({
            id: existing?.id,
            sku,
            title,
            brand: aspect(aspects, ["Brand", "Manufacturer"]),
            manufacturer: aspect(aspects, ["Manufacturer", "Brand"]),
            model: aspect(aspects, ["Model"]),
            mpn: aspect(aspects, ["MPN", "Manufacturer Part Number"]),
            category: "eBay Import",
            categorySlug: "ebay-import",
            condition: "USED" as any,
            status: "PUBLISHED",
            source: "ebay",
            price: price === null ? undefined : price,
            priceOnRequest: price === null,
            stockQty: quantity,
            description,
            productOverview: description,
            images,
            specs,
            ebayItemId: activeOffer?.listing?.listingId ? String(activeOffer.listing.listingId) : undefined,
          });
          const savedProduct = savedResult.ok ? savedResult.data as any : null;
          if (savedProduct?.id) {
            await prisma.product.update({ where: { id: String(savedProduct.id) }, data: { ebayItemId: activeOffer?.listing?.listingId ? String(activeOffer.listing.listingId) : null, source: "ebay" } }).catch(() => null);
          }
          existing ? updated++ : imported++;
        } catch (err: any) {
          errors.push(err.message || "Unknown item sync error");
        }
      }
      offset += limit;
    } while (offset < total && offset < 1000);
    await prisma.ebaySyncConfig.update({ where: { id: config.id }, data: { lastSyncAt: new Date() } });
    await prisma.ebaySyncRun.update({ where: { id: run.id }, data: { status: "SUCCESS", message: "Sync complete.", imported, updated, skipped, errors, finishedAt: new Date() } });
    return { ok: true, imported, updated, skipped, errors };
  } catch (err: any) {
    await prisma.ebaySyncRun.update({ where: { id: run.id }, data: { status: "FAILED", message: err.message || "eBay sync failed.", imported, updated, skipped, errors, finishedAt: new Date() } });
    return { ok: false, imported, updated, skipped, errors: [...errors, err.message || "eBay sync failed."] };
  }
}
