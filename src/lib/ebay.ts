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
  startPage?: number;
  nextPage?: number;
  totalPages?: number;
  done?: boolean;
};

export type EbaySyncMode = "test10" | "first50" | "all";

type EbaySyncOptions = {
  mode?: EbaySyncMode;
  maxListings?: number;
  maxPages?: number;
  startPage?: number;
  entriesPerPage?: number;
  fast?: boolean;
};

function normaliseSyncOptions(options: EbaySyncOptions = {}) {
  const mode = options.mode || "test10";
  const startPage = Math.max(1, Number(options.startPage || 1));
  const entriesPerPage = Math.min(100, Math.max(10, Number(options.entriesPerPage || 50)));

  // Full sync is intentionally paged client-side. Each request processes one or a few eBay pages only,
  // avoiding Vercel timeouts and allowing inventories of 5,000+ listings to be processed in batches.
  if (mode === "all") return { mode, maxListings: options.maxListings ?? 50, maxPages: options.maxPages ?? 1, startPage, entriesPerPage, fast: options.fast ?? true };
  if (mode === "first50") return { mode, maxListings: 50, maxPages: 1, startPage: 1, entriesPerPage, fast: options.fast ?? true };
  return { mode: "test10" as const, maxListings: 10, maxPages: 1, startPage: 1, entriesPerPage: 10, fast: options.fast ?? true };
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
  variants?: { sku?: string | null; label: string; optionName?: string | null; optionValue?: string | null; price?: number | null; stockQty: number; sortOrder?: number; ebayVariationSku?: string | null; ebayVariationData?: any }[];
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
  const text = htmlDecode(raw)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<h[1-6][^>]*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+|\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const cutoff = text.search(/(^|\n|\b)(shipping\s*&\s*returns|shipping\s+and\s+returns|shipping|returns|terms\s*&\s*conditions|terms\s+and\s+conditions|t\s*&\s*c'?s|t&c'?s|payment|postage|delivery|customs|warranty\s+and\s+returns)(\b|\n)/i);
  const cleaned = cutoff > 0 ? text.slice(0, cutoff).trim() : text;
  return cleaned.replace(/Imported from active eBay listing\.?/gi, "").trim();
}

function isFallbackEbayDescription(value?: string | null) {
  const text = String(value || "").trim().toLowerCase();
  return !text || text === "imported from active ebay listing." || text === "imported from ebay inventory api." || text.includes("imported from active ebay listing");
}

function normaliseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanSpecValue(value: string) {
  return normaliseWhitespace(htmlDecode(value || "").replace(/<[^>]+>/g, " "));
}

function dedupeByLower(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = String(raw || "").trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function conditionFromEbay(value: string) {
  const normalised = value.toLowerCase();
  if (normalised.includes("parts") || normalised.includes("not working")) return "FOR_PARTS" as const;
  if (normalised.includes("new other") || normalised.includes("open box")) return "NEW_OPEN_BOX" as const;
  if (normalised.includes("new")) return "NEW" as const;
  return "USED" as const;
}

function firstSentence(text: string, maxLength = 360) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (cleaned.length <= maxLength) return cleaned;
  const slice = cleaned.slice(0, maxLength);
  const sentenceEnd = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("; "));
  return `${slice.slice(0, sentenceEnd > 120 ? sentenceEnd + 1 : maxLength).trim()}…`;
}

function buildProcurementOverview(listing: NormalizedEbayListing, cleanDescription: string) {
  const specMap = Object.fromEntries(listing.specs.map((s) => [s.label, s.value]));
  const brand = listing.brand || listing.manufacturer || aspect(specMap, ["Brand", "Manufacturer", "Make"]);
  const model = listing.model || aspect(specMap, ["Model", "Model Number"]);
  const mpn = listing.mpn || aspect(specMap, ["MPN", "Manufacturer Part Number", "Part Number"]);
  const title = normaliseWhitespace(listing.title);
  const category = listing.category && listing.category !== "eBay Import" ? listing.category : "industrial equipment";
  const baseDescription = normaliseWhitespace(cleanDescription || "");
  const identity = dedupeByLower([brand, model, mpn]).join(" ");
  const intro = baseDescription
    ? firstSentence(baseDescription, 420)
    : `${title}${identity ? ` (${identity})` : ""} is a Combay-supplied ${category} item suitable for industrial maintenance, replacement stock, engineering stores or procurement teams requiring a clearly identified part.`;

  const usefulSpecs = listing.specs
    .map((spec) => ({ label: normaliseWhitespace(spec.label), value: cleanSpecValue(spec.value) }))
    .filter((spec) => spec.label && spec.value)
    .filter((spec) => !["brand", "manufacturer", "model", "mpn", "manufacturer part number", "condition"].includes(spec.label.toLowerCase()))
    .slice(0, 8);

  const paragraphs: string[] = [];
  paragraphs.push(intro);

  const detailBits = [];
  if (brand) detailBits.push(`manufacturer/brand ${brand}`);
  if (model) detailBits.push(`model ${model}`);
  if (mpn) detailBits.push(`part number ${mpn}`);
  if (listing.sku) detailBits.push(`Combay SKU ${listing.sku}`);
  if (detailBits.length) {
    paragraphs.push(`Key identification details include ${detailBits.join(", ")}. This helps buyers cross-check compatibility before purchase or quotation.`);
  }

  if (usefulSpecs.length) {
    const specSentence = usefulSpecs.map((spec) => `${spec.label}: ${spec.value}`).join("; ");
    paragraphs.push(`Relevant item specifics recorded for this listing include ${specSentence}.`);
  }

  paragraphs.push("Please review the product photographs, item specifics and condition notes before ordering. For compatibility-critical equipment, request confirmation against your exact machine, system, part number or application before payment.");

  return paragraphs.join("\n\n");
}


function mergeListingDetails(summary: NormalizedEbayListing | null, detail: NormalizedEbayListing | null): NormalizedEbayListing | null {
  if (!summary && !detail) return null;
  if (!summary) return detail;
  if (!detail) return summary;
  return {
    ...summary,
    ...detail,
    // Keep operational fields from the active-list summary when eBay's GetItem detail response omits them.
    ebayItemId: detail.ebayItemId || summary.ebayItemId,
    sku: detail.sku || summary.sku,
    title: detail.title || summary.title,
    price: detail.price ?? summary.price,
    quantity: Number.isFinite(detail.quantity) && detail.quantity >= 0 ? detail.quantity : summary.quantity,
    images: detail.images.length ? detail.images : summary.images,
    specs: detail.specs.length ? detail.specs : summary.specs,
    rawDescription: detail.rawDescription || summary.rawDescription,
    cleanDescription: detail.cleanDescription || summary.cleanDescription,
    category: detail.category && detail.category !== "eBay Import" ? detail.category : summary.category,
    brand: detail.brand || summary.brand,
    manufacturer: detail.manufacturer || summary.manufacturer,
    model: detail.model || summary.model,
    mpn: detail.mpn || summary.mpn,
    variants: detail.variants?.length ? detail.variants : summary.variants,
    sourceMethod: "active-listings",
  };
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, limit), items.length);
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await worker(items[current], current);
    }
  }));
  return results;
}

function specsFromTradingXml(xml: string) {
  const seen = new Set<string>();
  return xmlBlocks(xmlText(xml, "ItemSpecifics") || xml, "NameValueList")
    .map((block) => {
      const label = cleanSpecValue(xmlText(block, "Name"));
      const values = dedupeByLower(xmlBlocks(block, "Value").map((valueBlock) => cleanSpecValue(xmlText(valueBlock, "Value"))).filter(Boolean));
      if (!label || !values.length) return null;
      const key = label.toLowerCase();
      if (seen.has(key)) return null;
      seen.add(key);
      return { label, value: values.join(", ") };
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

async function saveEbayListing(listing: NormalizedEbayListing, options: { forceRichUpdate?: boolean } = {}) {
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
  const importedImages = dedupeByLower(listing.images.filter(Boolean)).slice(0, 15).map((url, index) => ({ url, alt: listing.title, isPrimary: index === 0, sortOrder: index }));
  const importedVariants = listing.variants ?? [];
  const variantStockTotal = importedVariants.reduce((sum, variant) => sum + Math.max(0, Number(variant.stockQty || 0)), 0);
  const cleanDescription = listing.cleanDescription || cleanEbayDescription(listing.rawDescription || "");
  const descriptionPrefix = listing.sourceMethod === "active-listings" ? "Imported from active eBay listing." : "Imported from eBay Inventory API.";
  const description = cleanDescription || descriptionPrefix;
  const generatedOverview = buildProcurementOverview(listing, cleanDescription);
  const existingDescriptionIsFallback = isFallbackEbayDescription(existing?.description);
  const existingOverviewIsFallback = isFallbackEbayDescription(existing?.productOverview) || !String(existing?.productOverview || "").trim();
  const existingImagesMissing = !existingImages.length;
  const existingSpecsMissing = !existingSpecs.length;
  const existingCategoryMissing = !existing?.category?.name || existing.category.name === "eBay Import";
  const forceRichUpdate = Boolean(options.forceRichUpdate || existingDescriptionIsFallback || existingOverviewIsFallback || existingImagesMissing || existingSpecsMissing || existingCategoryMissing);
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
    stockQty: importedVariants.length ? variantStockTotal : listing.quantity,
    variants: importedVariants,
    description: existing?.descriptionLocked && !forceRichUpdate ? existing.description ?? "" : description,
    productOverview: existing?.descriptionLocked && !forceRichUpdate ? existing.productOverview ?? existing.description ?? "" : generatedOverview,
    images: existing?.imagesLocked && !forceRichUpdate ? existingImages : importedImages,
    specs: existing?.specsLocked && !forceRichUpdate ? existingSpecs : listing.specs,
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
        const summaryListing: NormalizedEbayListing = {
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
          variants: [],
          sourceMethod: "inventory-api",
        };
        let listing = summaryListing;
        if (summaryListing.ebayItemId) {
          const detailedXml = await getTradingItemDetails(token, config, summaryListing.ebayItemId).catch(() => "");
          const detailedListing = detailedXml ? listingFromTradingXml(detailedXml, "active-listings") : null;
          listing = mergeListingDetails(summaryListing, detailedListing) || summaryListing;
        }
        const result = await saveEbayListing(listing, { forceRichUpdate: true });
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
  <IncludeWatchCount>false</IncludeWatchCount>
  <OutputSelector>Item.ItemID</OutputSelector>
  <OutputSelector>Item.SKU</OutputSelector>
  <OutputSelector>Item.Title</OutputSelector>
  <OutputSelector>Item.Description</OutputSelector>
  <OutputSelector>Item.PictureDetails</OutputSelector>
  <OutputSelector>Item.ItemSpecifics</OutputSelector>
  <OutputSelector>Item.PrimaryCategory</OutputSelector>
  <OutputSelector>Item.ConditionDisplayName</OutputSelector>
  <OutputSelector>Item.ConditionID</OutputSelector>
  <OutputSelector>Item.Quantity</OutputSelector>
  <OutputSelector>Item.QuantityAvailable</OutputSelector>
  <OutputSelector>Item.SellingStatus</OutputSelector>
  <OutputSelector>Item.StartPrice</OutputSelector>
  <OutputSelector>Item.Variations</OutputSelector>
</GetItemRequest>`;
  return tradingApiCall(token, config, "GetItem", body);
}


function variationsFromTradingXml(xml: string) {
  const variationsBlock = xmlText(xml, "Variations") || "";
  if (!variationsBlock) return [];
  const variationBlocks = xmlBlocks(variationsBlock, "Variation");
  return variationBlocks.map((block, index) => {
    const sku = xmlText(block, "SKU") || xmlText(block, "SellerSKU") || null;
    const specificsBlock = xmlText(block, "VariationSpecifics") || block;
    const pairs = xmlBlocks(specificsBlock, "NameValueList").map((pairBlock) => {
      const name = xmlText(pairBlock, "Name");
      const value = xmlText(pairBlock, "Value");
      return name && value ? { name, value } : null;
    }).filter(Boolean) as { name: string; value: string }[];
    const label = pairs.length ? pairs.map((pair) => `${pair.name}: ${pair.value}`).join(" / ") : sku || `Variation ${index + 1}`;
    const quantity = Number(xmlText(block, "Quantity") || 0);
    const quantitySold = Number(xmlText(block, "QuantitySold") || xmlText(xmlText(block, "SellingStatus") || block, "QuantitySold") || 0);
    const quantityAvailable = xmlText(block, "QuantityAvailable");
    const stockQty = quantityAvailable ? Number(quantityAvailable) : Math.max(0, quantity - quantitySold);
    const price = asMoney(xmlText(block, "StartPrice") || xmlText(block, "CurrentPrice"));
    return {
      sku,
      label,
      optionName: pairs[0]?.name ?? null,
      optionValue: pairs[0]?.value ?? null,
      price,
      stockQty: Number.isFinite(stockQty) ? stockQty : 0,
      sortOrder: index,
      ebayVariationSku: sku,
      ebayVariationData: { specifics: pairs },
    };
  });
}

function listingFromTradingXml(itemXml: string, sourceMethod: "active-listings"): NormalizedEbayListing | null {
  const itemBlock = xmlText(itemXml, "Item") || itemXml;
  const ebayItemId = xmlText(itemBlock, "ItemID");
  const title = xmlText(itemBlock, "Title") || ebayItemId;
  if (!ebayItemId || !title) return null;
  const sku = xmlText(itemBlock, "SKU") || xmlText(itemBlock, "SellerSKU") || xmlText(itemBlock, "SellerInventoryID") || undefined;
  const rawDescription = xmlText(itemBlock, "Description");
  const quantityAvailable = Number(xmlText(itemBlock, "QuantityAvailable") || xmlText(itemBlock, "Quantity") || 0);
  const sellingStatus = xmlText(itemBlock, "SellingStatus");
  const currentPriceBlock = xmlBlocks(sellingStatus || itemBlock, "CurrentPrice")[0] || "";
  const price = asMoney(xmlText(currentPriceBlock, "CurrentPrice") || currentPriceBlock.replace(/<[^>]+>/g, "") || xmlText(itemBlock, "StartPrice"));
  const pictureDetails = xmlText(itemBlock, "PictureDetails") || itemBlock;
  const images = dedupeByLower([
    ...xmlBlocks(pictureDetails, "PictureURL").map((block) => xmlText(block, "PictureURL")),
    ...xmlBlocks(pictureDetails, "ExternalPictureURL").map((block) => xmlText(block, "ExternalPictureURL")),
    xmlText(pictureDetails, "GalleryURL"),
    xmlText(pictureDetails, "PictureURLLarge"),
  ]).slice(0, 15);
  const specs = specsFromTradingXml(itemBlock);
  const specMap = Object.fromEntries(specs.map((s) => [s.label, s.value]));
  const conditionDisplay = xmlText(itemBlock, "ConditionDisplayName") || xmlText(itemBlock, "ConditionID");
  const primaryCategory = xmlText(itemBlock, "PrimaryCategory") || itemBlock;
  const categoryName = xmlText(primaryCategory, "CategoryName");
  const categoryId = xmlText(primaryCategory, "CategoryID");
  const category = categoryName || (categoryId ? `eBay Category ${categoryId}` : "eBay Import");
  const variants = variationsFromTradingXml(itemBlock);
  const variantStockTotal = variants.reduce((sum, variant) => sum + Math.max(0, Number(variant.stockQty || 0)), 0);
  const parentSku = variants.some((variant) => variant.sku && variant.sku === sku) ? undefined : sku;

  return {
    ebayItemId,
    sku: parentSku,
    title,
    price,
    quantity: variants.length ? variantStockTotal : Number.isFinite(quantityAvailable) ? quantityAvailable : 0,
    images,
    specs,
    rawDescription,
    cleanDescription: cleanEbayDescription(rawDescription),
    category,
    condition: conditionFromEbay(conditionDisplay),
    brand: aspect(specMap, ["Brand", "Manufacturer", "Make"]),
    manufacturer: aspect(specMap, ["Manufacturer", "Brand", "Make"]),
    model: aspect(specMap, ["Model", "Model Number"]),
    mpn: aspect(specMap, ["MPN", "Manufacturer Part Number", "Part Number"]),
    variants,
    sourceMethod,
  };
}

async function syncTradingActiveListings(token: string, config: EbayConfig, options: ReturnType<typeof normaliseSyncOptions>): Promise<SyncCounts> {
  const counts: SyncCounts = { imported: 0, updated: 0, skipped: 0, errors: [], records: 0, startPage: options.startPage, nextPage: options.startPage, totalPages: 1, done: false };
  let page = options.startPage;
  let totalPages = options.startPage;
  const seen = new Set<string>();
  const lastPage = options.startPage + options.maxPages - 1;

  do {
    const body = `<?xml version="1.0" encoding="utf-8"?>
<GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <ActiveList>
    <Include>true</Include>
    <Pagination>
      <EntriesPerPage>${options.entriesPerPage}</EntriesPerPage>
      <PageNumber>${page}</PageNumber>
    </Pagination>
  </ActiveList>
  <DetailLevel>ReturnAll</DetailLevel>
  <ErrorLanguage>${ebayLocaleForMarketplace(config.marketplaceId).replace("-", "_")}</ErrorLanguage>
  <WarningLevel>High</WarningLevel>
</GetMyeBaySellingRequest>`;
    const xml = await tradingApiCall(token, config, "GetMyeBaySelling", body);
    totalPages = Number(xmlText(xml, "TotalNumberOfPages") || page || 1);
    counts.totalPages = totalPages;
    const activeList = xmlText(xml, "ActiveList") || xml;
    const itemBlocks = xmlBlocks(activeList, "Item");

    const pageItems: { itemId: string; itemBlock: string }[] = [];
    for (const itemBlock of itemBlocks) {
      if (counts.records + pageItems.length >= options.maxListings) break;
      const itemId = xmlText(itemBlock, "ItemID");
      if (!itemId || seen.has(itemId)) continue;
      seen.add(itemId);
      pageItems.push({ itemId, itemBlock });
    }

    const pageResults = await mapWithConcurrency(pageItems, 6, async ({ itemId, itemBlock }) => {
      try {
        const summaryListing = listingFromTradingXml(itemBlock, "active-listings");
        // GetMyeBaySelling is fast but often omits the fields Combay needs for product pages.
        // GetItem enriches each active listing with pictures, full description, item specifics and category.
        const detailedXml = await getTradingItemDetails(token, config, itemId).catch((err: any) => {
          throw new Error(err?.message || "Could not fetch detailed eBay listing data.");
        });
        const detailedListing = listingFromTradingXml(detailedXml, "active-listings");
        const listing = mergeListingDetails(summaryListing, detailedListing);
        if (!listing) return { result: "skipped" as const, error: "Could not parse listing after detail enrichment." };
        const result = await saveEbayListing(listing, { forceRichUpdate: true });
        return { result };
      } catch (err: any) {
        const fallbackListing = listingFromTradingXml(itemBlock, "active-listings");
        const fallbackHasUsefulDetails = Boolean(fallbackListing && (fallbackListing.images.length || fallbackListing.specs.length || !isFallbackEbayDescription(fallbackListing.cleanDescription || fallbackListing.rawDescription)));
        if (fallbackListing && fallbackHasUsefulDetails) {
          const result = await saveEbayListing(fallbackListing, { forceRichUpdate: true }).catch(() => "skipped" as const);
          return { result, error: `Item ${itemId}: detail enrichment failed; saved useful ActiveList data only. ${err.message || "Unknown ActiveList item sync error"}` };
        }
        return { result: "skipped" as const, error: `Item ${itemId}: detail enrichment failed and summary data was too shallow, so existing product data was not overwritten. ${err.message || "Unknown ActiveList item sync error"}` };
      }
    });

    for (const item of pageResults) {
      counts.records++;
      if (item.result === "imported") counts.imported++;
      else if (item.result === "updated") counts.updated++;
      else counts.skipped++;
      if (item.error) counts.errors.push(item.error);
    }

    page++;
    counts.nextPage = page;
  } while (page <= totalPages && page <= lastPage && counts.records < options.maxListings);

  counts.done = page > totalPages;
  counts.nextPage = counts.done ? undefined : page;
  return counts;
}


export async function runEbayInventorySync(inputOptions: EbaySyncOptions = {}) {
  const options = normaliseSyncOptions(inputOptions);
  await markStaleEbayRuns();
  const activeRun = await prisma.ebaySyncRun.findFirst({ where: { status: "RUNNING", finishedAt: null }, orderBy: { startedAt: "desc" } });
  if (activeRun) {
    return { ok: false, imported: 0, updated: 0, skipped: 0, errors: ["Another eBay sync is already running. Use Reset stuck sync if this is stale."], message: "Another eBay sync is already running." };
  }
  const run = await prisma.ebaySyncRun.create({ data: { status: "RUNNING", message: `Starting unified eBay inventory sync (${options.mode}, page ${options.startPage}, max ${options.maxListings} listings).` } });
  let imported = 0, updated = 0, skipped = 0;
  let records = 0;
  let nextPage: number | undefined;
  let totalPages: number | undefined;
  let done = true;
  const errors: string[] = [];
  const notes: string[] = [];
  try {
    const { token, config } = await getEbayAccessToken();

    const inventoryCounts = await syncInventoryApiItems(token, config, options);
    imported += inventoryCounts.imported;
    updated += inventoryCounts.updated;
    skipped += inventoryCounts.skipped;
    errors.push(...inventoryCounts.errors);
    records += inventoryCounts.records;
    notes.push(`Inventory API: ${inventoryCounts.records} records.`);

    if (inventoryCounts.records === 0) {
      notes.push("Inventory API returned 0 records; using Active Listings detail enrichment.");
    } else {
      notes.push("Inventory API returned records; running Active Listings detail enrichment as well so older/shallow products receive images, descriptions, categories and item specifics.");
    }

    const tradingCounts = await syncTradingActiveListings(token, config, options);
    imported += tradingCounts.imported;
    updated += tradingCounts.updated;
    skipped += tradingCounts.skipped;
    records += tradingCounts.records;
    nextPage = tradingCounts.nextPage;
    totalPages = tradingCounts.totalPages;
    done = Boolean(tradingCounts.done);
    errors.push(...tradingCounts.errors);
    notes.push(`Active Listings detail enrichment: ${tradingCounts.records} enriched records on page ${tradingCounts.startPage}${tradingCounts.totalPages ? ` of ${tradingCounts.totalPages}` : ""}.`);

    if (errors.some((error) => error.toLowerCase().includes("scope") || error.toLowerCase().includes("token"))) {
      notes.push("If Active Listings fallback reports token/scope errors, reconnect eBay OAuth so the app receives the base eBay scope as well as Inventory scopes.");
    }

    await prisma.ebaySyncConfig.update({ where: { id: config.id }, data: { lastSyncAt: new Date() } });
    const message = `Unified sync complete (${options.mode}, page ${options.startPage}, max ${options.maxListings} listings). ${notes.join(" ")}${done ? " Done." : ` Next page: ${nextPage}.`}`;
    await prisma.ebaySyncRun.update({ where: { id: run.id }, data: { status: errors.length ? "PARTIAL" : "SUCCESS", message, imported, updated, skipped, errors, finishedAt: new Date() } });
    return { ok: true, imported, updated, skipped, records, errors, message, nextPage, totalPages, done };
  } catch (err: any) {
    await prisma.ebaySyncRun.update({ where: { id: run.id }, data: { status: "FAILED", message: err.message || "eBay sync failed.", imported, updated, skipped, errors, finishedAt: new Date() } });
    return { ok: false, imported, updated, skipped, errors: [...errors, err.message || "eBay sync failed."] };
  }
}


export async function repairMissingEbayDetailImports(limit = 75) {
  await markStaleEbayRuns();
  const candidateLimit = Math.max(1, Math.min(250, Number(limit || 75)));
  const run = await prisma.ebaySyncRun.create({ data: { status: "RUNNING", message: `Scanning all eBay products and repairing up to ${candidateLimit} shallow imports.` } });
  let imported = 0, updated = 0, skipped = 0;
  const errors: string[] = [];
  try {
    const { token, config } = await getEbayAccessToken();

    // Important: do not take the newest 100 products first. The stubborn products are usually older
    // summary-only imports, so we count the whole eBay catalogue and then repair the actual shallow rows.
    const ebayProductWhere: any = {
      syncExcluded: false,
      OR: [
        { source: "ebay" },
        { ebayItemId: { not: null } },
        { description: { contains: "Imported from active eBay listing", mode: "insensitive" } },
        { description: { contains: "Imported from eBay Inventory API", mode: "insensitive" } },
        { productOverview: { contains: "Imported from active eBay listing", mode: "insensitive" } },
        { category: { is: { name: "eBay Import" } } },
      ],
    };

    const shallowWhere: any = {
      AND: [
        ebayProductWhere,
        {
          OR: [
            { images: { none: {} } },
            { specs: { none: {} } },
            { category: { is: null } },
            { category: { is: { name: "eBay Import" } } },
            { description: null },
            { description: { equals: "", mode: "insensitive" } },
            { description: { contains: "Imported from active eBay listing", mode: "insensitive" } },
            { description: { contains: "Imported from eBay Inventory API", mode: "insensitive" } },
            { productOverview: null },
            { productOverview: { equals: "", mode: "insensitive" } },
            { productOverview: { contains: "Imported from active eBay listing", mode: "insensitive" } },
            { rawEbayDescription: null },
          ],
        },
      ],
    };

    const [totalEbayProducts, totalRepairCandidates, products] = await Promise.all([
      prisma.product.count({ where: ebayProductWhere }),
      prisma.product.count({ where: shallowWhere }),
      prisma.product.findMany({
        where: shallowWhere,
        include: { images: true, specs: true, category: true },
        // Old shallow records are normally the ones still showing fallback data.
        orderBy: [{ updatedAt: "asc" }],
        take: candidateLimit,
      }),
    ]);

    const repairProducts = products.filter((product: any) => {
      const imageMissing = !product.images?.length;
      const specsMissing = !product.specs?.length;
      const categoryMissing = !product.category?.name || product.category.name === "eBay Import";
      const descMissing = isFallbackEbayDescription(product.description);
      const overviewMissing = isFallbackEbayDescription(product.productOverview);
      const rawMissing = !String(product.rawEbayDescription || "").trim();
      return imageMissing || specsMissing || categoryMissing || descMissing || overviewMissing || rawMissing;
    });

    const activeIndex = repairProducts.some((p: any) => !p.ebayItemId)
      ? await buildActiveListingIndex(token, config, 250)
      : new Map<string, string>();

    for (const product of repairProducts) {
      try {
        const itemId = product.ebayItemId || (product.sku ? activeIndex.get(String(product.sku).toLowerCase()) : undefined);
        if (!itemId) {
          skipped++;
          errors.push(`SKU ${product.sku || product.id}: could not find eBay item ID for repair.`);
          continue;
        }
        const detailedXml = await getTradingItemDetails(token, config, itemId);
        const detailedListing = listingFromTradingXml(detailedXml, "active-listings");
        if (!detailedListing) {
          skipped++;
          errors.push(`SKU ${product.sku || product.id}: eBay detail response could not be parsed.`);
          continue;
        }
        const result = await saveEbayListing({ ...detailedListing, sku: detailedListing.sku || product.sku || undefined }, { forceRichUpdate: true });
        if (result === "imported") imported++;
        else if (result === "updated") updated++;
        else skipped++;
      } catch (err: any) {
        skipped++;
        errors.push(`SKU ${product.sku || product.id}: ${err.message || "repair failed"}`);
      }
    }

    const remaining = Math.max(0, totalRepairCandidates - repairProducts.length);
    const message = `Repair complete. Scanned ${totalEbayProducts} eBay products; found ${totalRepairCandidates} shallow products; processed ${repairProducts.length} in this run${remaining ? `; ${remaining} still queued, run repair again.` : "."}`;
    await prisma.ebaySyncRun.update({ where: { id: run.id }, data: { status: errors.length ? "PARTIAL" : "SUCCESS", message, imported, updated, skipped, errors, finishedAt: new Date() } });
    return { ok: true, imported, updated, skipped, checked: totalEbayProducts, repairCandidates: totalRepairCandidates, processed: repairProducts.length, remaining, errors, message };
  } catch (err: any) {
    await prisma.ebaySyncRun.update({ where: { id: run.id }, data: { status: "FAILED", message: err.message || "eBay repair failed.", imported, updated, skipped, errors, finishedAt: new Date() } });
    return { ok: false, imported, updated, skipped, errors: [...errors, err.message || "eBay repair failed."] };
  }
}

async function buildActiveListingIndex(token: string, config: EbayConfig, maxPages = 250) {
  const index = new Map<string, string>();
  let page = 1;
  let totalPages = 1;
  do {
    const body = `<?xml version="1.0" encoding="utf-8"?>
<GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <ActiveList>
    <Include>true</Include>
    <Pagination><EntriesPerPage>100</EntriesPerPage><PageNumber>${page}</PageNumber></Pagination>
  </ActiveList>
  <DetailLevel>ReturnAll</DetailLevel>
</GetMyeBaySellingRequest>`;
    const xml = await tradingApiCall(token, config, "GetMyeBaySelling", body);
    totalPages = Number(xmlText(xml, "TotalNumberOfPages") || page || 1);
    const activeList = xmlText(xml, "ActiveList") || xml;
    const itemBlocks = xmlBlocks(activeList, "Item");
    for (const itemBlock of itemBlocks) {
      const itemId = xmlText(itemBlock, "ItemID");
      const sku = xmlText(itemBlock, "SKU") || xmlText(itemBlock, "SellerSKU") || xmlText(itemBlock, "SellerInventoryID");
      if (itemId && sku) index.set(String(sku).toLowerCase(), itemId);
    }
    page++;
  } while (page <= totalPages && page <= maxPages);
  return index;
}


export async function resetStuckEbaySyncRuns() {
  const result = await prisma.ebaySyncRun.updateMany({
    where: { status: "RUNNING", finishedAt: null },
    data: { status: "FAILED", message: "Manually reset by admin.", finishedAt: new Date() },
  });
  return { ok: true, resetCount: result.count };
}
