import { prisma } from "@/lib/db";
import { saveProductToRepository } from "@/lib/productRepository";

type EbayConfig = {
  id?: string;
  environment: string;
  marketplaceId: string;
  clientId?: string | null;
  clientSecret?: string | null;
  ruName?: string | null;
  refreshToken?: string | null;
  accessToken?: string | null;
  accessTokenExpiresAt?: Date | null;
};

type SyncCounts = {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  records: number;
};

export type EbaySyncMode = "test10" | "first50" | "all";

type EbaySyncOptions = {
  mode?: EbaySyncMode;
  maxListings?: number;
  maxPages?: number;
};

function normaliseSyncOptions(options: EbaySyncOptions = {}) {
  const mode = options.mode || "test10";
  if (mode === "all") return { mode, maxListings: options.maxListings ?? 500, maxPages: options.maxPages ?? 25 };
  if (mode === "first50") return { mode, maxListings: 50, maxPages: 5 };
  return { mode: "test10" as const, maxListings: 10, maxPages: 2 };
}

async function markStaleEbayRuns() {
  const cutoff = new Date(Date.now() - 20 * 60 * 1000);
  await prisma.ebaySyncRun.updateMany({
    where: { status: "RUNNING", startedAt: { lt: cutoff }, finishedAt: null },
    data: { status: "FAILED", message: "Sync marked failed after exceeding the 20-minute safety window.", finishedAt: new Date() },
  }).catch(() => null);
}

type NormalizedEbayListing = {
  ebayItemId?: string;
  sku?: string;
  title: string;
  price: number | null;
  quantity: number;
  images: string[];
  specs: { label: string; value: string }[];
  rawDescription?: string;
  cleanDescription?: string;
  category?: string;
  condition?: "NEW" | "NEW_OPEN_BOX" | "USED" | "FOR_PARTS";
  brand?: string;
  manufacturer?: string;
  model?: string;
  mpn?: string;
  listingUrl?: string;
  sourceMethod: "inventory-api" | "active-listings";
};

const EBAY_BASE_SCOPE = "https://api.ebay.com/oauth/api_scope";
const INVENTORY_READONLY_SCOPE = "https://api.ebay.com/oauth/api_scope/sell.inventory.readonly";
const INVENTORY_SCOPE = "https://api.ebay.com/oauth/api_scope/sell.inventory";
const EBAY_SCOPES = `${EBAY_BASE_SCOPE} ${INVENTORY_READONLY_SCOPE} ${INVENTORY_SCOPE}`;

function apiRoot(environment?: string) {
  return environment === "sandbox" ? "https://api.sandbox.ebay.com" : "https://api.ebay.com";
}

function authRoot(environment?: string) {
  return environment === "sandbox" ? "https://auth.sandbox.ebay.com" : "https://auth.ebay.com";
}

function tokenUrl(environment?: string) {
  return `${apiRoot(environment)}/identity/v1/oauth2/token`;
}

function tradingApiUrl(environment?: string) {
  return environment === "sandbox" ? "https://api.sandbox.ebay.com/ws/api.dll" : "https://api.ebay.com/ws/api.dll";
}

function ebayLocaleForMarketplace(marketplaceId?: string | null) {
  const marketplace = String(marketplaceId || "EBAY_GB").toUpperCase();
  const localeMap: Record<string, string> = {
    EBAY_GB: "en-GB",
    EBAY_US: "en-US",
    EBAY_AU: "en-AU",
    EBAY_CA: "en-CA",
    EBAY_IE: "en-IE",
    EBAY_DE: "de-DE",
    EBAY_FR: "fr-FR",
    EBAY_IT: "it-IT",
    EBAY_ES: "es-ES",
  };
  return localeMap[marketplace] || "en-GB";
}

function ebaySiteIdForMarketplace(marketplaceId?: string | null) {
  const marketplace = String(marketplaceId || "EBAY_GB").toUpperCase();
  const siteMap: Record<string, string> = {
    EBAY_US: "0",
    EBAY_CA: "2",
    EBAY_GB: "3",
    EBAY_AU: "15",
    EBAY_DE: "77",
    EBAY_FR: "71",
    EBAY_IT: "101",
    EBAY_ES: "186",
    EBAY_IE: "205",
  };
  return siteMap[marketplace] || "3";
}

function ebayMarketplaceHeaders(token: string, config: EbayConfig) {
  const marketplaceId = config.marketplaceId || "EBAY_GB";
  const locale = ebayLocaleForMarketplace(marketplaceId);
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "Accept-Language": locale,
    "Content-Language": locale,
    "X-EBAY-C-MARKETPLACE-ID": marketplaceId,
  };
}

function tradingHeaders(token: string, config: EbayConfig, callName: string) {
  return {
    "Content-Type": "text/xml",
    "X-EBAY-API-COMPATIBILITY-LEVEL": "1231",
    "X-EBAY-API-CALL-NAME": callName,
    "X-EBAY-API-SITEID": ebaySiteIdForMarketplace(config.marketplaceId),
    "X-EBAY-API-IAF-TOKEN": token,
    "Accept-Language": ebayLocaleForMarketplace(config.marketplaceId),
  };
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
    scope: EBAY_SCOPES,
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
      Authorization: `Basic ${credentials}`,
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
    scope: EBAY_SCOPES,
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

function htmlDecode(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripCdata(value: string) {
  return value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

function xmlText(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? htmlDecode(stripCdata(match[1].trim())) : "";
}

function xmlBlocks(xml: string, tag: string) {
  return Array.from(xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${tag}>`, "gi"))).map((match) => match[0]);
}

function cleanEbayDescription(raw: string) {
  if (!raw) return "";
  return htmlDecode(raw)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+|\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function conditionFromEbay(value: string) {
  const normalised = value.toLowerCase();
  if (normalised.includes("parts") || normalised.includes("not working")) return "FOR_PARTS" as const;
  if (normalised.includes("new other") || normalised.includes("open box")) return "NEW_OPEN_BOX" as const;
  if (normalised.includes("new")) return "NEW" as const;
  return "USED" as const;
}

function specsFromTradingXml(xml: string) {
  return xmlBlocks(xmlText(xml, "ItemSpecifics") || xml, "NameValueList")
    .map((block) => {
      const label = xmlText(block, "Name");
      const values = xmlBlocks(block, "Value").map((valueBlock) => xmlText(valueBlock, "Value")).filter(Boolean);
      return label && values.length ? { label, value: values.join(", ") } : null;
    })
    .filter(Boolean) as { label: string; value: string }[];
}

async function getOffersForSku(token: string, config: EbayConfig, sku: string) {
  const params = new URLSearchParams({ sku, marketplace_id: config.marketplaceId || "EBAY_GB" });
  const response = await fetch(`${apiRoot(config.environment)}/sell/inventory/v1/offer?${params.toString()}`, {
    headers: ebayMarketplaceHeaders(token, config),
  });
  if (!response.ok) return [];
  const data = await response.json().catch(() => ({}));
  return Array.isArray(data.offers) ? data.offers : [];
}

async function saveEbayListing(listing: NormalizedEbayListing) {
  const where: any[] = [];
  if (listing.ebayItemId) where.push({ ebayItemId: listing.ebayItemId });
  if (listing.sku) where.push({ sku: listing.sku });
  const existing = where.length
    ? await prisma.product.findFirst({
        where: { OR: where },
        include: { images: { orderBy: { sortOrder: "asc" } }, specs: { orderBy: { sortOrder: "asc" } }, category: true },
      })
    : null;

  if (existing?.syncExcluded) return "skipped" as const;

  const existingImages = existing?.images?.map((image) => ({ url: image.url, alt: image.alt ?? listing.title, isPrimary: image.isPrimary, sortOrder: image.sortOrder })) ?? [];
  const existingSpecs = existing?.specs?.map((spec) => ({ label: spec.label, value: spec.value })) ?? [];
  const importedImages = listing.images.map((url, index) => ({ url, alt: listing.title, isPrimary: index === 0, sortOrder: index }));
  const cleanDescription = listing.cleanDescription || cleanEbayDescription(listing.rawDescription || "");
  const descriptionPrefix = listing.sourceMethod === "active-listings" ? "Imported from active eBay listing." : "Imported from eBay Inventory API.";
  const description = cleanDescription || descriptionPrefix;
  const category = listing.category || "eBay Import";
  const categorySlug = category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "ebay-import";
  const sku = listing.sku?.trim() || undefined;

  const result = await saveProductToRepository({
    id: existing?.id,
    sku,
    title: existing?.titleLocked ? existing.title : listing.title,
    brand: listing.brand || aspect(Object.fromEntries(listing.specs.map((s) => [s.label, s.value])), ["Brand", "Manufacturer"]),
    manufacturer: listing.manufacturer || aspect(Object.fromEntries(listing.specs.map((s) => [s.label, s.value])), ["Manufacturer", "Brand"]),
    model: listing.model || aspect(Object.fromEntries(listing.specs.map((s) => [s.label, s.value])), ["Model"]),
    mpn: listing.mpn || aspect(Object.fromEntries(listing.specs.map((s) => [s.label, s.value])), ["MPN", "Manufacturer Part Number"]),
    category,
    categorySlug,
    condition: listing.condition ?? "USED",
    status: listing.quantity > 0 ? "PUBLISHED" : "DRAFT",
    source: "ebay",
    price: existing?.priceLocked ? (existing.price === null ? undefined : Number(existing.price)) : (listing.price === null ? undefined : listing.price),
    priceOnRequest: existing?.priceLocked ? existing.priceOnRequest : listing.price === null,
    stockQty: listing.quantity,
    description: existing?.descriptionLocked ? existing.description ?? "" : description,
    productOverview: existing?.descriptionLocked ? existing.productOverview ?? existing.description ?? "" : description,
    images: existing?.imagesLocked ? existingImages : importedImages,
    specs: existing?.specsLocked ? existingSpecs : listing.specs,
    ebayItemId: listing.ebayItemId,
    syncExcluded: existing?.syncExcluded ?? false,
  });

  const saved = result.ok ? result.data as any : null;
  if (saved?.id) {
    await prisma.product.update({
      where: { id: String(saved.id) },
      data: {
        ebayItemId: listing.ebayItemId ?? null,
        source: "ebay",
        rawEbayDescription: listing.rawDescription || null,
      },
    }).catch(() => null);
  }

  return existing ? "updated" as const : "imported" as const;
}

async function syncInventoryApiItems(token: string, config: EbayConfig, options: ReturnType<typeof normaliseSyncOptions>): Promise<SyncCounts> {
  const counts: SyncCounts = { imported: 0, updated: 0, skipped: 0, errors: [], records: 0 };
  let offset = 0;
  const limit = 50;
  let total = 0;
  do {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    const response = await fetch(`${apiRoot(config.environment)}/sell/inventory/v1/inventory_item?${params.toString()}`, {
      headers: ebayMarketplaceHeaders(token, config),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.errors?.[0]?.message || data.message || `eBay inventory request failed (${response.status})`);
    const items = Array.isArray(data.inventoryItems) ? data.inventoryItems : [];
    total = Number(data.total ?? items.length ?? 0);
    for (const item of items) {
      if (counts.records >= options.maxListings) break;
      counts.records++;
      try {
        const sku = String(item.sku || "").trim();
        if (!sku) { counts.skipped++; continue; }
        const offers = await getOffersForSku(token, config, sku);
        const activeOffer = offers.find((offer: any) => offer.status === "PUBLISHED") || offers[0] || null;
        const aspects = item.product?.aspects as Record<string, string[] | string> | undefined;
        const rawDescription = String(item.product?.description || "");
        const result = await saveEbayListing({
          ebayItemId: activeOffer?.listing?.listingId ? String(activeOffer.listing.listingId) : undefined,
          sku,
          title: String(item.product?.title || sku),
          brand: aspect(aspects, ["Brand", "Manufacturer"]),
          manufacturer: aspect(aspects, ["Manufacturer", "Brand"]),
          model: aspect(aspects, ["Model"]),
          mpn: aspect(aspects, ["MPN", "Manufacturer Part Number"]),
          price: asMoney(activeOffer?.pricingSummary?.price?.value),
          quantity: Number(item.availability?.shipToLocationAvailability?.quantity ?? 0),
          images: Array.isArray(item.product?.imageUrls) ? item.product.imageUrls.map((url: string) => String(url)) : [],
          specs: Object.entries(aspects ?? {}).map(([label, raw]) => ({ label, value: Array.isArray(raw) ? raw.join(", ") : String(raw) })),
          rawDescription,
          cleanDescription: cleanEbayDescription(rawDescription),
          condition: "USED",
          category: "eBay Import",
          sourceMethod: "inventory-api",
        });
        if (result === "imported") counts.imported++;
        else if (result === "updated") counts.updated++;
        else counts.skipped++;
      } catch (err: any) {
        counts.errors.push(err.message || "Unknown Inventory API item sync error");
      }
    }
    offset += limit;
  } while (offset < total && counts.records < options.maxListings);
  return counts;
}

async function tradingApiCall(token: string, config: EbayConfig, callName: string, body: string) {
  const response = await fetch(tradingApiUrl(config.environment), {
    method: "POST",
    headers: tradingHeaders(token, config, callName),
    body,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`eBay Trading API ${callName} failed (${response.status}): ${text.slice(0, 250)}`);
  const ack = xmlText(text, "Ack");
  if (ack && !["Success", "Warning"].includes(ack)) {
    const longMessage = xmlText(text, "LongMessage") || xmlText(text, "ShortMessage") || `${callName} failed with Ack ${ack}`;
    throw new Error(longMessage);
  }
  return text;
}

async function getTradingItemDetails(token: string, config: EbayConfig, itemId: string) {
  const body = `<?xml version="1.0" encoding="utf-8"?>
<GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <ItemID>${itemId}</ItemID>
  <DetailLevel>ReturnAll</DetailLevel>
  <IncludeItemSpecifics>true</IncludeItemSpecifics>
</GetItemRequest>`;
  return tradingApiCall(token, config, "GetItem", body);
}

function listingFromTradingXml(itemXml: string, sourceMethod: "active-listings"): NormalizedEbayListing | null {
  const ebayItemId = xmlText(itemXml, "ItemID");
  const title = xmlText(itemXml, "Title") || ebayItemId;
  if (!ebayItemId || !title) return null;
  const sku = xmlText(itemXml, "SKU") || xmlText(itemXml, "SellerSKU") || undefined;
  const rawDescription = xmlText(itemXml, "Description");
  const quantityAvailable = Number(xmlText(itemXml, "QuantityAvailable") || xmlText(itemXml, "Quantity") || 0);
  const sellingStatus = xmlText(itemXml, "SellingStatus");
  const currentPriceBlock = xmlBlocks(sellingStatus || itemXml, "CurrentPrice")[0] || "";
  const price = asMoney(xmlText(currentPriceBlock, "CurrentPrice") || currentPriceBlock.replace(/<[^>]+>/g, ""));
  const pictureDetails = xmlText(itemXml, "PictureDetails") || itemXml;
  const images = xmlBlocks(pictureDetails, "PictureURL").map((block) => xmlText(block, "PictureURL")).filter(Boolean);
  const specs = specsFromTradingXml(itemXml);
  const specMap = Object.fromEntries(specs.map((s) => [s.label, s.value]));
  const conditionDisplay = xmlText(itemXml, "ConditionDisplayName") || xmlText(itemXml, "ConditionID");
  const primaryCategory = xmlText(itemXml, "PrimaryCategory") || itemXml;
  const category = xmlText(primaryCategory, "CategoryName") || "eBay Import";

  return {
    ebayItemId,
    sku,
    title,
    price,
    quantity: Number.isFinite(quantityAvailable) ? quantityAvailable : 0,
    images,
    specs,
    rawDescription,
    cleanDescription: cleanEbayDescription(rawDescription),
    category,
    condition: conditionFromEbay(conditionDisplay),
    brand: aspect(specMap, ["Brand", "Manufacturer"]),
    manufacturer: aspect(specMap, ["Manufacturer", "Brand"]),
    model: aspect(specMap, ["Model"]),
    mpn: aspect(specMap, ["MPN", "Manufacturer Part Number"]),
    sourceMethod,
  };
}

async function syncTradingActiveListings(token: string, config: EbayConfig, options: ReturnType<typeof normaliseSyncOptions>): Promise<SyncCounts> {
  const counts: SyncCounts = { imported: 0, updated: 0, skipped: 0, errors: [], records: 0 };
  let page = 1;
  let totalPages = 1;
  const seen = new Set<string>();
  do {
    const body = `<?xml version="1.0" encoding="utf-8"?>
<GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <ActiveList>
    <Include>true</Include>
    <Pagination>
      <EntriesPerPage>50</EntriesPerPage>
      <PageNumber>${page}</PageNumber>
    </Pagination>
  </ActiveList>
  <DetailLevel>ReturnAll</DetailLevel>
  <ErrorLanguage>${ebayLocaleForMarketplace(config.marketplaceId).replace("-", "_")}</ErrorLanguage>
  <WarningLevel>High</WarningLevel>
</GetMyeBaySellingRequest>`;
    const xml = await tradingApiCall(token, config, "GetMyeBaySelling", body);
    totalPages = Number(xmlText(xml, "TotalNumberOfPages") || 1);
    const activeList = xmlText(xml, "ActiveList") || xml;
    const itemBlocks = xmlBlocks(activeList, "Item");
    for (const itemBlock of itemBlocks) {
      if (counts.records >= options.maxListings) break;
      const itemId = xmlText(itemBlock, "ItemID");
      if (!itemId || seen.has(itemId)) continue;
      seen.add(itemId);
      counts.records++;
      try {
        const detailedXml = await getTradingItemDetails(token, config, itemId).catch(() => itemBlock);
        const listing = listingFromTradingXml(detailedXml, "active-listings") || listingFromTradingXml(itemBlock, "active-listings");
        if (!listing) { counts.skipped++; continue; }
        const result = await saveEbayListing(listing);
        if (result === "imported") counts.imported++;
        else if (result === "updated") counts.updated++;
        else counts.skipped++;
      } catch (err: any) {
        counts.errors.push(`Item ${itemId}: ${err.message || "Unknown ActiveList item sync error"}`);
      }
    }
    page++;
  } while (page <= totalPages && page <= options.maxPages && counts.records < options.maxListings);
  return counts;
}

export async function runEbayInventorySync(inputOptions: EbaySyncOptions = {}) {
  const options = normaliseSyncOptions(inputOptions);
  await markStaleEbayRuns();
  const activeRun = await prisma.ebaySyncRun.findFirst({ where: { status: "RUNNING", finishedAt: null }, orderBy: { startedAt: "desc" } });
  if (activeRun) {
    return { ok: false, imported: 0, updated: 0, skipped: 0, errors: ["Another eBay sync is already running. Use Reset stuck sync if this is stale."], message: "Another eBay sync is already running." };
  }
  const run = await prisma.ebaySyncRun.create({ data: { status: "RUNNING", message: `Starting unified eBay inventory sync (${options.mode}, max ${options.maxListings} listings).` } });
  let imported = 0, updated = 0, skipped = 0;
  const errors: string[] = [];
  const notes: string[] = [];
  try {
    const { token, config } = await getEbayAccessToken();

    const inventoryCounts = await syncInventoryApiItems(token, config, options);
    imported += inventoryCounts.imported;
    updated += inventoryCounts.updated;
    skipped += inventoryCounts.skipped;
    errors.push(...inventoryCounts.errors);
    notes.push(`Inventory API: ${inventoryCounts.records} records.`);

    if (inventoryCounts.records === 0) {
      notes.push("Inventory API returned 0 records; using Active Listings fallback.");
      const tradingCounts = await syncTradingActiveListings(token, config, options);
      imported += tradingCounts.imported;
      updated += tradingCounts.updated;
      skipped += tradingCounts.skipped;
      errors.push(...tradingCounts.errors);
      notes.push(`Active Listings fallback: ${tradingCounts.records} records.`);
    } else {
      notes.push("Active Listings fallback not used because Inventory API returned records.");
    }

    if (errors.some((error) => error.toLowerCase().includes("scope") || error.toLowerCase().includes("token"))) {
      notes.push("If Active Listings fallback reports token/scope errors, reconnect eBay OAuth so the app receives the base eBay scope as well as Inventory scopes.");
    }

    await prisma.ebaySyncConfig.update({ where: { id: config.id }, data: { lastSyncAt: new Date() } });
    const message = `Unified sync complete (${options.mode}, max ${options.maxListings} listings). ${notes.join(" ")}`;
    await prisma.ebaySyncRun.update({ where: { id: run.id }, data: { status: errors.length ? "PARTIAL" : "SUCCESS", message, imported, updated, skipped, errors, finishedAt: new Date() } });
    return { ok: true, imported, updated, skipped, errors, message };
  } catch (err: any) {
    await prisma.ebaySyncRun.update({ where: { id: run.id }, data: { status: "FAILED", message: err.message || "eBay sync failed.", imported, updated, skipped, errors, finishedAt: new Date() } });
    return { ok: false, imported, updated, skipped, errors: [...errors, err.message || "eBay sync failed."] };
  }
}


export async function resetStuckEbaySyncRuns() {
  const result = await prisma.ebaySyncRun.updateMany({
    where: { status: "RUNNING", finishedAt: null },
    data: { status: "FAILED", message: "Manually reset by admin.", finishedAt: new Date() },
  });
  return { ok: true, resetCount: result.count };
}
