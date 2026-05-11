import { prisma, withDatabase } from "@/lib/db";
import { getEbayAccessToken } from "@/lib/ebay";

type EbayProductRecord = any;

const SKU_PREFIX = "CBUK";
const MARKETPLACE = "EBAY_GB";


export const EBAY_MARKETPLACE_OPTIONS = [
  { value: "EBAY_GB", label: "United Kingdom (EBAY_GB)" },
  { value: "EBAY_US", label: "United States (EBAY_US)" },
  { value: "EBAY_IE", label: "Ireland (EBAY_IE)" },
  { value: "EBAY_DE", label: "Germany (EBAY_DE)" },
  { value: "EBAY_FR", label: "France (EBAY_FR)" },
  { value: "EBAY_IT", label: "Italy (EBAY_IT)" },
  { value: "EBAY_ES", label: "Spain (EBAY_ES)" },
  { value: "EBAY_AU", label: "Australia (EBAY_AU)" },
  { value: "EBAY_CA", label: "Canada (EBAY_CA)" },
];

export const EBAY_LISTING_DURATION_OPTIONS = [
  { value: "GTC", label: "Good 'Til Cancelled (recommended fixed-price default)" },
  { value: "DAYS_30", label: "30 days" },
  { value: "DAYS_10", label: "10 days" },
  { value: "DAYS_7", label: "7 days" },
  { value: "DAYS_5", label: "5 days" },
  { value: "DAYS_3", label: "3 days" },
];

type EbayOption = { id: string; name: string; marketplaceId?: string; isDefault?: boolean; raw?: any };

type EbayPublishingOptionState = {
  marketplaceOptions: typeof EBAY_MARKETPLACE_OPTIONS;
  listingDurationOptions: typeof EBAY_LISTING_DURATION_OPTIONS;
  paymentPolicies: EbayOption[];
  returnPolicies: EbayOption[];
  fulfillmentPolicies: EbayOption[];
  inventoryLocations: EbayOption[];
  fetchedFromEbay: boolean;
  fetchMessage: string;
};

function missingSchemaMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/does not exist in the current database|does not exist|Unknown column|column .* does not exist|table .* does not exist/i.test(message)) {
    return `Database update required before eBay publishing can be used. Run npm install, then npx --yes prisma@5.22.0 generate and npx --yes prisma@5.22.0 db push against the same DATABASE_URL used by this deployment. Original database message: ${message}`;
  }
  return null;
}

function apiRootForEnvironment(environment?: string | null) {
  return environment === "sandbox" ? "https://api.sandbox.ebay.com" : "https://api.ebay.com";
}

function policyName(policy: any, fallback: string) {
  return String(policy?.name || policy?.policyName || policy?.description || fallback || "Unnamed policy");
}

function mapBusinessPolicy(policy: any, type: "payment" | "return" | "fulfillment"): EbayOption | null {
  const id = policy?.paymentPolicyId || policy?.returnPolicyId || policy?.fulfillmentPolicyId || policy?.policyId || policy?.id;
  if (!id) return null;
  return {
    id: String(id),
    name: policyName(policy, `${type} policy ${id}`),
    marketplaceId: policy?.marketplaceId,
    isDefault: Boolean(policy?.categoryTypes?.some?.((item: any) => item?.default === true) || policy?.isDefault),
    raw: policy,
  };
}

function mapInventoryLocation(location: any): EbayOption | null {
  const id = location?.merchantLocationKey || location?.key || location?.id;
  if (!id) return null;
  const address = location?.location?.address || location?.address || {};
  const city = address?.city || location?.city || "";
  const country = address?.country || location?.countryCode || "";
  return {
    id: String(id),
    name: [location?.name || location?.merchantLocationKey || id, city, country].filter(Boolean).join(" · "),
    isDefault: Boolean(location?.isDefault),
    raw: location,
  };
}

async function getJsonOrEmpty(url: string, token: string, marketplaceId?: string | null) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-EBAY-C-MARKETPLACE-ID": marketplaceId || MARKETPLACE,
    },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.errors?.[0]?.message || body?.error_description || body?.message || `eBay API returned ${response.status}`);
  return body;
}


type EbayCategorySuggestionResult = {
  categoryId: string;
  categoryName: string;
  categoryPath: string;
  leafCategoryTreeNode?: boolean;
  relevancy?: string;
  categoryTreeId?: string;
  raw?: any;
};

type EbayAspectMetadata = {
  name: string;
  required: boolean;
  recommended: boolean;
  selectionOnly: boolean;
  mode?: string;
  usage?: string;
  values: string[];
  raw?: any;
};

function cleanCategoryQuery(value: unknown) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9\-\/\.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}

function categorySuggestionQueryForProduct(product: EbayProductRecord, query?: string | null) {
  const manual = cleanCategoryQuery(query);
  if (manual) return manual;
  return cleanCategoryQuery([
    product.title,
    product.brand || product.manufacturer,
    product.model,
    product.mpn,
    product.category?.name,
    product.category?.slug,
  ].filter(Boolean).join(" "));
}

function normaliseAspectKey(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function productSpecLookup(product: EbayProductRecord) {
  const lookup = new Map<string, string>();
  const add = (key: string, value: any) => {
    const cleanKey = normaliseAspectKey(key);
    const text = String(value ?? "").trim();
    if (cleanKey && text && !lookup.has(cleanKey)) lookup.set(cleanKey, text);
  };
  add("Brand", product.brand || product.manufacturer);
  add("Manufacturer", product.manufacturer || product.brand);
  add("MPN", product.mpn);
  add("Model", product.model);
  add("Product Type", product.category?.name);
  add("Type", product.category?.name);
  add("Condition", conditionLabel(product.condition));
  (product.specs || []).forEach((spec: any) => {
    add(spec.label || spec.name, spec.value);
  });
  return lookup;
}

function selectAllowedAspectValue(rawValue: string, aspect: EbayAspectMetadata) {
  const value = String(rawValue || "").trim();
  if (!value) return "";
  if (!aspect.values.length) return value;
  const exact = aspect.values.find((candidate) => candidate.toLowerCase() === value.toLowerCase());
  if (exact) return exact;
  const loose = aspect.values.find((candidate) => normaliseAspectKey(candidate) === normaliseAspectKey(value));
  if (loose) return loose;
  return aspect.selectionOnly ? "" : value;
}

function autoMapAspects(product: EbayProductRecord, aspects: EbayAspectMetadata[], existing?: any) {
  const lookup = productSpecLookup(product);
  const output: Record<string, any> = existing && typeof existing === "object" && !Array.isArray(existing) ? { ...existing } : {};
  delete output._raw;
  const aliases: Record<string, string[]> = {
    brand: ["brand", "manufacturer", "make"],
    manufacturer: ["manufacturer", "brand", "make"],
    mpn: ["mpn", "manufacturerpartnumber", "partnumber", "modelnumber", "model"],
    model: ["model", "modelnumber", "mpn", "partnumber"],
    type: ["type", "producttype", "category"],
    producttype: ["producttype", "type", "category"],
    condition: ["condition"],
  };

  aspects.forEach((aspect) => {
    if (!aspect.name || output[aspect.name]?.length) return;
    const key = normaliseAspectKey(aspect.name);
    const possibleKeys = [key, ...(aliases[key] || [])];
    let found = "";
    for (const candidate of possibleKeys) {
      const value = lookup.get(candidate);
      if (value) { found = value; break; }
    }
    const safeValue = selectAllowedAspectValue(found, aspect);
    if (safeValue) output[aspect.name] = [safeValue];
  });

  output._requiredAspects = aspects.filter((aspect) => aspect.required).map((aspect) => aspect.name);
  output._recommendedAspects = aspects.filter((aspect) => aspect.recommended && !aspect.required).map((aspect) => aspect.name).slice(0, 40);
  output._aspectMetadata = aspects.slice(0, 80).map((aspect) => ({ name: aspect.name, required: aspect.required, recommended: aspect.recommended, selectionOnly: aspect.selectionOnly, values: aspect.values.slice(0, 80) }));
  output._generatedBy = "Combay eBay category assistant";
  return output;
}

function mapTaxonomySuggestion(item: any, categoryTreeId: string): EbayCategorySuggestionResult | null {
  const node = item?.category || item?.categoryTreeNode || item?.categorySuggestion?.category;
  const categoryId = node?.categoryId || item?.category?.categoryId || item?.categoryId;
  const categoryName = node?.categoryName || item?.category?.categoryName || item?.categoryName;
  if (!categoryId || !categoryName) return null;
  const ancestors = item?.categoryTreeNodeAncestors || item?.category?.categoryTreeNodeAncestors || [];
  const path = [...ancestors].reverse().map((ancestor: any) => ancestor.categoryName).filter(Boolean).concat(categoryName).join(" > ");
  return {
    categoryId: String(categoryId),
    categoryName: String(categoryName),
    categoryPath: path || String(categoryName),
    leafCategoryTreeNode: item?.leafCategoryTreeNode === true || node?.leafCategoryTreeNode === true,
    relevancy: item?.relevancy,
    categoryTreeId,
    raw: item,
  };
}

function mapTaxonomyAspect(item: any): EbayAspectMetadata | null {
  const name = item?.localizedAspectName || item?.aspectName || item?.name;
  if (!name) return null;
  const constraint = item?.aspectConstraint || {};
  const usage = String(constraint.aspectUsage || item?.aspectUsage || "").toUpperCase();
  const mode = String(constraint.aspectMode || item?.aspectMode || "").toUpperCase();
  const required = constraint.aspectRequired === true || usage === "REQUIRED";
  const recommended = required || usage === "RECOMMENDED";
  const values: string[] = Array.isArray(item?.aspectValues)
    ? item.aspectValues.map((value: any) => String(value?.localizedValue || value?.value || value || "").trim()).filter(Boolean)
    : [];
  return {
    name: String(name),
    required,
    recommended,
    selectionOnly: mode === "SELECTION_ONLY" || Boolean(constraint.aspectMode && mode.includes("SELECTION")),
    mode,
    usage,
    values: Array.from(new Set(values)).slice(0, 250),
    raw: item,
  };
}

async function getEbayDefaultCategoryTreeId(marketplaceId = MARKETPLACE) {
  const { token, config } = await getEbayAccessToken();
  const marketplace = marketplaceId || config.marketplaceId || MARKETPLACE;
  const root = apiRootForEnvironment(config.environment);
  const data = await getJsonOrEmpty(`${root}/commerce/taxonomy/v1/get_default_category_tree_id?marketplace_id=${encodeURIComponent(marketplace)}`, token, marketplace);
  const categoryTreeId = data?.categoryTreeId || data?.categoryTree?.categoryTreeId;
  if (!categoryTreeId) throw new Error("eBay did not return a category tree ID for this marketplace.");
  return { categoryTreeId: String(categoryTreeId), categoryTreeVersion: data?.categoryTreeVersion || data?.categoryTree?.categoryTreeVersion || null, marketplaceId: marketplace };
}

export async function suggestEbayCategoriesForProduct(productId: string, query?: string | null, marketplaceId?: string | null) {
  return withDatabase(async () => {
    await ensureEbayPublishingDefaults();
    const product = await getProductForEbay(productId);
    if (!product) throw new Error("Product not found.");
    const marketplace = marketplaceId || product.ebayMarketplaceId || MARKETPLACE;
    const searchQuery = categorySuggestionQueryForProduct(product, query);
    if (!searchQuery) throw new Error("Add a product title, brand, model or search phrase before searching eBay categories.");
    const { token, config } = await getEbayAccessToken();
    const tree = await getEbayDefaultCategoryTreeId(marketplace);
    const root = apiRootForEnvironment(config.environment);
    const url = `${root}/commerce/taxonomy/v1/category_tree/${encodeURIComponent(tree.categoryTreeId)}/get_category_suggestions?q=${encodeURIComponent(searchQuery)}`;
    const data = await getJsonOrEmpty(url, token, marketplace);
    const suggestions = (data?.categorySuggestions || [])
      .map((item: any) => mapTaxonomySuggestion(item, tree.categoryTreeId))
      .filter(Boolean)
      .slice(0, 12);
    await prisma.ebaySyncLog.create({ data: { productId: product.id, sku: product.sku, productTitle: product.title, actionType: "EBAY_CATEGORY_SUGGESTIONS", status: suggestions.length ? "SUCCESS" : "MANUAL_REVIEW", message: suggestions.length ? `Fetched ${suggestions.length} eBay category suggestions.` : "No eBay category suggestions were returned for this query.", rawPayload: { query: searchQuery, marketplace, suggestions }, finishedAt: new Date() } }).catch(() => null);
    return { query: searchQuery, marketplaceId: marketplace, categoryTreeId: tree.categoryTreeId, suggestions };
  });
}

export async function fetchEbayAspectsForCategory(categoryId: string, marketplaceId = MARKETPLACE) {
  const marketplace = marketplaceId || MARKETPLACE;
  const { token, config } = await getEbayAccessToken();
  const tree = await getEbayDefaultCategoryTreeId(marketplace);
  const root = apiRootForEnvironment(config.environment);
  const url = `${root}/commerce/taxonomy/v1/category_tree/${encodeURIComponent(tree.categoryTreeId)}/get_item_aspects_for_category?category_id=${encodeURIComponent(categoryId)}`;
  const data = await getJsonOrEmpty(url, token, marketplace);
  const aspects = (data?.aspects || []).map(mapTaxonomyAspect).filter(Boolean) as EbayAspectMetadata[];
  return { marketplaceId: marketplace, categoryTreeId: tree.categoryTreeId, categoryTreeVersion: tree.categoryTreeVersion, aspects };
}

export async function applyEbayCategoryToProduct(productId: string, input: { categoryId: string; categoryName?: string; categoryPath?: string; marketplaceId?: string | null }) {
  return withDatabase(async () => {
    await ensureEbayPublishingDefaults();
    const product = await getProductForEbay(productId);
    if (!product) throw new Error("Product not found.");
    const categoryId = String(input.categoryId || "").trim();
    if (!categoryId) throw new Error("Select a valid eBay category first.");
    const marketplace = input.marketplaceId || product.ebayMarketplaceId || MARKETPLACE;
    const aspectResult = await fetchEbayAspectsForCategory(categoryId, marketplace);
    const categoryName = String(input.categoryName || input.categoryPath || categoryId).trim();
    const mergedSpecifics = autoMapAspects(product, aspectResult.aspects, product.ebaySpecificsJson);
    mergedSpecifics._categoryId = categoryId;
    mergedSpecifics._categoryName = categoryName;
    mergedSpecifics._categoryPath = input.categoryPath || categoryName;
    mergedSpecifics._categoryTreeId = aspectResult.categoryTreeId;
    mergedSpecifics._marketplaceId = marketplace;

    if (product.category?.slug) {
      await prisma.ebayCategoryMapping.upsert({
        where: { combayCategorySlug_marketplaceId: { combayCategorySlug: product.category.slug, marketplaceId: marketplace } },
        create: { combayCategorySlug: product.category.slug, combayCategoryName: product.category.name, ebayCategoryId: categoryId, ebayCategoryName: categoryName, marketplaceId: marketplace, confidence: 90, isDefault: true },
        update: { ebayCategoryId: categoryId, ebayCategoryName: categoryName, confidence: 90, isDefault: true },
      }).catch(() => null);
    }

    await Promise.all(aspectResult.aspects.slice(0, 80).map((aspect) => {
      const lookup = productSpecLookup(product);
      const matched = lookup.has(normaliseAspectKey(aspect.name)) ? aspect.name : null;
      if (!matched) return Promise.resolve(null);
      return prisma.ebayAspectMapping.upsert({
        where: { ebayCategoryId_combaySpecLabel_marketplaceId: { ebayCategoryId: categoryId, combaySpecLabel: matched, marketplaceId: marketplace } },
        create: { ebayCategoryId: categoryId, combaySpecLabel: matched, ebayAspectName: aspect.name, isRequired: aspect.required, marketplaceId: marketplace },
        update: { ebayAspectName: aspect.name, isRequired: aspect.required },
      }).catch(() => null);
    }));

    const validation = validateEbayProductRecord({ ...product, ebayMarketplaceId: marketplace, ebayCategoryId: categoryId, ebayCategoryName: categoryName, ebaySpecificsJson: mergedSpecifics });
    const updated = await prisma.product.update({ where: { id: product.id }, data: { ebayMarketplaceId: marketplace, ebayCategoryId: categoryId, ebayCategoryName: categoryName, ebaySpecificsJson: mergedSpecifics, ebayValidationErrorsJson: validation, ebayPublishStatus: validation.valid ? "READY_TO_PUBLISH" : "VALIDATION_FAILED" } });
    await prisma.ebaySyncLog.create({ data: { productId: product.id, sku: updated.sku, productTitle: updated.title, actionType: "APPLY_EBAY_CATEGORY", status: "SUCCESS", message: `Applied eBay category ${categoryName} (${categoryId}) and fetched ${aspectResult.aspects.length} aspect definitions.`, rawPayload: { categoryId, categoryName, categoryPath: input.categoryPath, validation, aspects: aspectResult.aspects }, finishedAt: new Date() } }).catch(() => null);
    return { product: updated, validation, category: { categoryId, categoryName, categoryPath: input.categoryPath || categoryName }, aspects: aspectResult.aspects, specifics: mergedSpecifics };
  });
}

async function fetchLiveEbayPublishingOptions(marketplaceId = MARKETPLACE): Promise<Partial<EbayPublishingOptionState>> {
  const { token, config } = await getEbayAccessToken();
  const marketplace = marketplaceId || config.marketplaceId || MARKETPLACE;
  const root = apiRootForEnvironment(config.environment);
  const params = `marketplace_id=${encodeURIComponent(marketplace)}`;

  const [payments, returns, fulfillments, locations] = await Promise.all([
    getJsonOrEmpty(`${root}/sell/account/v1/payment_policy?${params}`, token, marketplace),
    getJsonOrEmpty(`${root}/sell/account/v1/return_policy?${params}`, token, marketplace),
    getJsonOrEmpty(`${root}/sell/account/v1/fulfillment_policy?${params}`, token, marketplace),
    getJsonOrEmpty(`${root}/sell/inventory/v1/location?limit=200&offset=0`, token, marketplace),
  ]);

  return {
    paymentPolicies: (payments.paymentPolicies || []).map((item: any) => mapBusinessPolicy(item, "payment")).filter(Boolean),
    returnPolicies: (returns.returnPolicies || []).map((item: any) => mapBusinessPolicy(item, "return")).filter(Boolean),
    fulfillmentPolicies: (fulfillments.fulfillmentPolicies || []).map((item: any) => mapBusinessPolicy(item, "fulfillment")).filter(Boolean),
    inventoryLocations: (locations.locations || []).map(mapInventoryLocation).filter(Boolean),
    fetchedFromEbay: true,
    fetchMessage: "Fetched live eBay business policies and inventory locations from the connected seller account.",
  };
}

async function getLocalPolicyOptions(marketplaceId = MARKETPLACE): Promise<Partial<EbayPublishingOptionState>> {
  const [payment, ret, fulfillment, locations] = await Promise.all([
    prisma.ebayPolicyMapping.findMany({ where: { type: "payment", marketplaceId, isActive: true }, orderBy: [{ isDefault: "desc" }, { ebayPolicyName: "asc" }] }).catch(() => []),
    prisma.ebayPolicyMapping.findMany({ where: { type: "return", marketplaceId, isActive: true }, orderBy: [{ isDefault: "desc" }, { ebayPolicyName: "asc" }] }).catch(() => []),
    prisma.ebayPolicyMapping.findMany({ where: { type: "fulfillment", marketplaceId, isActive: true }, orderBy: [{ isDefault: "desc" }, { ebayPolicyName: "asc" }] }).catch(() => []),
    prisma.ebayInventoryLocation.findMany({ where: { isActive: true }, orderBy: [{ isDefault: "desc" }, { name: "asc" }] }).catch(() => []),
  ]);
  return {
    paymentPolicies: payment.map((item: any) => ({ id: item.ebayPolicyId, name: item.ebayPolicyName || item.ebayPolicyId, marketplaceId: item.marketplaceId, isDefault: item.isDefault })),
    returnPolicies: ret.map((item: any) => ({ id: item.ebayPolicyId, name: item.ebayPolicyName || item.ebayPolicyId, marketplaceId: item.marketplaceId, isDefault: item.isDefault })),
    fulfillmentPolicies: fulfillment.map((item: any) => ({ id: item.ebayPolicyId, name: item.ebayPolicyName || item.ebayPolicyId, marketplaceId: item.marketplaceId, isDefault: item.isDefault })),
    inventoryLocations: locations.map((item: any) => ({ id: item.key, name: `${item.name} (${item.key})`, isDefault: item.isDefault, raw: item })),
  };
}

async function upsertFetchedOptions(options: Partial<EbayPublishingOptionState>, marketplaceId = MARKETPLACE) {
  await Promise.all([
    ...(options.paymentPolicies || []).map((policy) => prisma.ebayPolicyMapping.upsert({ where: { id: `payment_${marketplaceId}_${policy.id}` }, create: { id: `payment_${marketplaceId}_${policy.id}`, type: "payment", ebayPolicyId: policy.id, ebayPolicyName: policy.name, marketplaceId, isDefault: Boolean(policy.isDefault), isActive: true }, update: { ebayPolicyName: policy.name, isDefault: Boolean(policy.isDefault), isActive: true } }).catch(() => null)),
    ...(options.returnPolicies || []).map((policy) => prisma.ebayPolicyMapping.upsert({ where: { id: `return_${marketplaceId}_${policy.id}` }, create: { id: `return_${marketplaceId}_${policy.id}`, type: "return", ebayPolicyId: policy.id, ebayPolicyName: policy.name, marketplaceId, isDefault: Boolean(policy.isDefault), isActive: true }, update: { ebayPolicyName: policy.name, isDefault: Boolean(policy.isDefault), isActive: true } }).catch(() => null)),
    ...(options.fulfillmentPolicies || []).map((policy) => prisma.ebayPolicyMapping.upsert({ where: { id: `fulfillment_${marketplaceId}_${policy.id}` }, create: { id: `fulfillment_${marketplaceId}_${policy.id}`, type: "fulfillment", ebayPolicyId: policy.id, ebayPolicyName: policy.name, marketplaceId, isDefault: Boolean(policy.isDefault), isActive: true }, update: { ebayPolicyName: policy.name, isDefault: Boolean(policy.isDefault), isActive: true } }).catch(() => null)),
    ...(options.inventoryLocations || []).map((location) => {
      const address = location.raw?.location?.address || location.raw?.address || {};
      const postcode = address?.postalCode || location.raw?.postcode || location.raw?.postalCode || null;
      const city = address?.city || location.raw?.city || null;
      const countryCode = address?.country || location.raw?.countryCode || "GB";
      return prisma.ebayInventoryLocation.upsert({
        where: { key: location.id },
        create: { key: location.id, name: location.name || location.id, countryCode, postcode, city, isDefault: Boolean(location.isDefault), isActive: true },
        update: { name: location.name || location.id, countryCode, postcode, city, isDefault: Boolean(location.isDefault), isActive: true },
      }).catch(() => null);
    }),
  ]);
}

function pickDefault(options: EbayOption[], current?: string | null) {
  if (current && options.some((item) => item.id === current)) return current;
  return options.find((item) => item.isDefault)?.id || options[0]?.id || current || "";
}


let ebayPublishingSchemaPromise: Promise<void> | null = null;

async function ensureEbayPublishingDatabaseSchema() {
  if (ebayPublishingSchemaPromise) return ebayPublishingSchemaPromise;
  ebayPublishingSchemaPromise = (async () => {
    const statements = [
      `CREATE TABLE IF NOT EXISTS "EbaySyncConfig" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "environment" TEXT NOT NULL DEFAULT 'production',
        "marketplaceId" TEXT NOT NULL DEFAULT 'EBAY_GB',
        "clientId" TEXT,
        "clientSecret" TEXT,
        "ruName" TEXT,
        "refreshToken" TEXT,
        "accessToken" TEXT,
        "accessTokenExpiresAt" TIMESTAMP(3),
        "lastSyncAt" TIMESTAMP(3),
        "syncCursorPage" INTEGER NOT NULL DEFAULT 1,
        "syncTotalPages" INTEGER,
        "syncLastMode" TEXT,
        "syncLastBatchSize" INTEGER NOT NULL DEFAULT 50,
        "syncLastStartedAt" TIMESTAMP(3),
        "syncLastCompletedAt" TIMESTAMP(3),
        "syncDone" BOOLEAN NOT NULL DEFAULT true,
        "syncPaused" BOOLEAN NOT NULL DEFAULT false,
        "syncLastMessage" TEXT,
        "syncLastError" TEXT,
        "defaultInventoryLocationKey" TEXT,
        "defaultPaymentPolicyId" TEXT,
        "defaultReturnPolicyId" TEXT,
        "defaultFulfillmentPolicyId" TEXT,
        "defaultListingDuration" TEXT DEFAULT 'GTC',
        "defaultSkuPrefix" TEXT DEFAULT 'CBUK',
        "autoGenerateSku" BOOLEAN NOT NULL DEFAULT true,
        "autoPublishToEbay" BOOLEAN NOT NULL DEFAULT false,
        "manualApprovalBeforePublish" BOOLEAN NOT NULL DEFAULT true,
        "defaultDescriptionTemplateId" TEXT,
        "defaultConditionMappingJson" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `ALTER TABLE IF EXISTS "EbaySyncConfig" ADD COLUMN IF NOT EXISTS "defaultInventoryLocationKey" TEXT;`,
      `ALTER TABLE IF EXISTS "EbaySyncConfig" ADD COLUMN IF NOT EXISTS "defaultPaymentPolicyId" TEXT;`,
      `ALTER TABLE IF EXISTS "EbaySyncConfig" ADD COLUMN IF NOT EXISTS "defaultReturnPolicyId" TEXT;`,
      `ALTER TABLE IF EXISTS "EbaySyncConfig" ADD COLUMN IF NOT EXISTS "defaultFulfillmentPolicyId" TEXT;`,
      `ALTER TABLE IF EXISTS "EbaySyncConfig" ADD COLUMN IF NOT EXISTS "defaultListingDuration" TEXT DEFAULT 'GTC';`,
      `ALTER TABLE IF EXISTS "EbaySyncConfig" ADD COLUMN IF NOT EXISTS "defaultSkuPrefix" TEXT DEFAULT 'CBUK';`,
      `ALTER TABLE IF EXISTS "EbaySyncConfig" ADD COLUMN IF NOT EXISTS "autoGenerateSku" BOOLEAN NOT NULL DEFAULT true;`,
      `ALTER TABLE IF EXISTS "EbaySyncConfig" ADD COLUMN IF NOT EXISTS "autoPublishToEbay" BOOLEAN NOT NULL DEFAULT false;`,
      `ALTER TABLE IF EXISTS "EbaySyncConfig" ADD COLUMN IF NOT EXISTS "manualApprovalBeforePublish" BOOLEAN NOT NULL DEFAULT true;`,
      `ALTER TABLE IF EXISTS "EbaySyncConfig" ADD COLUMN IF NOT EXISTS "defaultDescriptionTemplateId" TEXT;`,
      `ALTER TABLE IF EXISTS "EbaySyncConfig" ADD COLUMN IF NOT EXISTS "defaultConditionMappingJson" JSONB;`,

      `CREATE TABLE IF NOT EXISTS "EbaySyncLog" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "productId" TEXT,
        "sku" TEXT,
        "productTitle" TEXT,
        "actionType" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "ebayListingId" TEXT,
        "ebayOfferId" TEXT,
        "message" TEXT,
        "errorMessage" TEXT,
        "rawPayload" JSONB,
        "retryCount" INTEGER NOT NULL DEFAULT 0,
        "triggeredBy" TEXT,
        "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "finishedAt" TIMESTAMP(3)
      );`,
      `CREATE INDEX IF NOT EXISTS "EbaySyncLog_productId_idx" ON "EbaySyncLog"("productId");`,
      `CREATE INDEX IF NOT EXISTS "EbaySyncLog_sku_idx" ON "EbaySyncLog"("sku");`,
      `CREATE INDEX IF NOT EXISTS "EbaySyncLog_actionType_idx" ON "EbaySyncLog"("actionType");`,
      `CREATE INDEX IF NOT EXISTS "EbaySyncLog_status_idx" ON "EbaySyncLog"("status");`,
      `CREATE INDEX IF NOT EXISTS "EbaySyncLog_startedAt_idx" ON "EbaySyncLog"("startedAt");`,

      `CREATE TABLE IF NOT EXISTS "EbayPolicyMapping" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "type" TEXT NOT NULL,
        "combayKey" TEXT,
        "ebayPolicyId" TEXT NOT NULL,
        "ebayPolicyName" TEXT,
        "marketplaceId" TEXT NOT NULL DEFAULT 'EBAY_GB',
        "isDefault" BOOLEAN NOT NULL DEFAULT false,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE INDEX IF NOT EXISTS "EbayPolicyMapping_type_marketplaceId_idx" ON "EbayPolicyMapping"("type", "marketplaceId");`,
      `CREATE INDEX IF NOT EXISTS "EbayPolicyMapping_combayKey_idx" ON "EbayPolicyMapping"("combayKey");`,
      `CREATE INDEX IF NOT EXISTS "EbayPolicyMapping_isDefault_idx" ON "EbayPolicyMapping"("isDefault");`,

      `CREATE TABLE IF NOT EXISTS "EbayCategoryMapping" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "combayCategorySlug" TEXT NOT NULL,
        "combayCategoryName" TEXT,
        "ebayCategoryId" TEXT NOT NULL,
        "ebayCategoryName" TEXT,
        "marketplaceId" TEXT NOT NULL DEFAULT 'EBAY_GB',
        "confidence" DECIMAL(5,2),
        "isDefault" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "EbayCategoryMapping_combayCategorySlug_marketplaceId_key" ON "EbayCategoryMapping"("combayCategorySlug", "marketplaceId");`,
      `CREATE INDEX IF NOT EXISTS "EbayCategoryMapping_ebayCategoryId_idx" ON "EbayCategoryMapping"("ebayCategoryId");`,

      `CREATE TABLE IF NOT EXISTS "EbayAspectMapping" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "ebayCategoryId" TEXT NOT NULL,
        "combaySpecLabel" TEXT NOT NULL,
        "ebayAspectName" TEXT NOT NULL,
        "isRequired" BOOLEAN NOT NULL DEFAULT false,
        "marketplaceId" TEXT NOT NULL DEFAULT 'EBAY_GB',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "EbayAspectMapping_ebayCategoryId_combaySpecLabel_market_key" ON "EbayAspectMapping"("ebayCategoryId", "combaySpecLabel", "marketplaceId");`,
      `CREATE INDEX IF NOT EXISTS "EbayAspectMapping_ebayAspectName_idx" ON "EbayAspectMapping"("ebayAspectName");`,

      `CREATE TABLE IF NOT EXISTS "EbayPublishJob" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "productId" TEXT NOT NULL,
        "sku" TEXT,
        "action" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'QUEUED',
        "marketplaceId" TEXT NOT NULL DEFAULT 'EBAY_GB',
        "payload" JSONB,
        "errorMessage" TEXT,
        "attempts" INTEGER NOT NULL DEFAULT 0,
        "queuedBy" TEXT,
        "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "startedAt" TIMESTAMP(3),
        "finishedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE INDEX IF NOT EXISTS "EbayPublishJob_productId_idx" ON "EbayPublishJob"("productId");`,
      `CREATE INDEX IF NOT EXISTS "EbayPublishJob_sku_idx" ON "EbayPublishJob"("sku");`,
      `CREATE INDEX IF NOT EXISTS "EbayPublishJob_action_idx" ON "EbayPublishJob"("action");`,
      `CREATE INDEX IF NOT EXISTS "EbayPublishJob_status_idx" ON "EbayPublishJob"("status");`,
      `CREATE INDEX IF NOT EXISTS "EbayPublishJob_queuedAt_idx" ON "EbayPublishJob"("queuedAt");`,

      `CREATE TABLE IF NOT EXISTS "EbayListingRevision" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "productId" TEXT NOT NULL,
        "sku" TEXT,
        "action" TEXT NOT NULL,
        "previousJson" JSONB,
        "nextJson" JSONB,
        "reason" TEXT,
        "createdBy" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE INDEX IF NOT EXISTS "EbayListingRevision_productId_idx" ON "EbayListingRevision"("productId");`,
      `CREATE INDEX IF NOT EXISTS "EbayListingRevision_sku_idx" ON "EbayListingRevision"("sku");`,
      `CREATE INDEX IF NOT EXISTS "EbayListingRevision_createdAt_idx" ON "EbayListingRevision"("createdAt");`,

      `CREATE TABLE IF NOT EXISTS "EbayInventoryLocation" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "key" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "countryCode" TEXT NOT NULL DEFAULT 'GB',
        "postcode" TEXT,
        "addressLine1" TEXT,
        "city" TEXT,
        "isDefault" BOOLEAN NOT NULL DEFAULT false,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "EbayInventoryLocation_key_key" ON "EbayInventoryLocation"("key");`,
      `CREATE INDEX IF NOT EXISTS "EbayInventoryLocation_isDefault_idx" ON "EbayInventoryLocation"("isDefault");`,
      `CREATE INDEX IF NOT EXISTS "EbayInventoryLocation_isActive_idx" ON "EbayInventoryLocation"("isActive");`,

      `CREATE TABLE IF NOT EXISTS "EbayDescriptionTemplate" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "html" TEXT NOT NULL,
        "isDefault" BOOLEAN NOT NULL DEFAULT false,
        "isSystem" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE INDEX IF NOT EXISTS "EbayDescriptionTemplate_isDefault_idx" ON "EbayDescriptionTemplate"("isDefault");`,
      `CREATE INDEX IF NOT EXISTS "EbayDescriptionTemplate_isSystem_idx" ON "EbayDescriptionTemplate"("isSystem");`,

      `ALTER TABLE IF EXISTS "Product" ADD COLUMN IF NOT EXISTS "ebayListingId" TEXT;`,
      `ALTER TABLE IF EXISTS "Product" ADD COLUMN IF NOT EXISTS "ebayOfferId" TEXT;`,
      `ALTER TABLE IF EXISTS "Product" ADD COLUMN IF NOT EXISTS "ebayInventoryItemSku" TEXT;`,
      `ALTER TABLE IF EXISTS "Product" ADD COLUMN IF NOT EXISTS "ebayMarketplaceId" TEXT DEFAULT 'EBAY_GB';`,
      `ALTER TABLE IF EXISTS "Product" ADD COLUMN IF NOT EXISTS "ebayCategoryId" TEXT;`,
      `ALTER TABLE IF EXISTS "Product" ADD COLUMN IF NOT EXISTS "ebayCategoryName" TEXT;`,
      `ALTER TABLE IF EXISTS "Product" ADD COLUMN IF NOT EXISTS "ebayPublishStatus" TEXT DEFAULT 'NOT_LISTED';`,
      `ALTER TABLE IF EXISTS "Product" ADD COLUMN IF NOT EXISTS "ebayLastPushedAt" TIMESTAMP(3);`,
      `ALTER TABLE IF EXISTS "Product" ADD COLUMN IF NOT EXISTS "ebayLastPulledAt" TIMESTAMP(3);`,
      `ALTER TABLE IF EXISTS "Product" ADD COLUMN IF NOT EXISTS "ebayLastError" TEXT;`,
      `ALTER TABLE IF EXISTS "Product" ADD COLUMN IF NOT EXISTS "ebayExcludedFromSync" BOOLEAN NOT NULL DEFAULT false;`,
      `ALTER TABLE IF EXISTS "Product" ADD COLUMN IF NOT EXISTS "ebaySourceOfTruth" TEXT DEFAULT 'COMBAY';`,
      `ALTER TABLE IF EXISTS "Product" ADD COLUMN IF NOT EXISTS "ebayConditionId" TEXT;`,
      `ALTER TABLE IF EXISTS "Product" ADD COLUMN IF NOT EXISTS "ebayConditionEnum" TEXT;`,
      `ALTER TABLE IF EXISTS "Product" ADD COLUMN IF NOT EXISTS "ebayFulfillmentPolicyId" TEXT;`,
      `ALTER TABLE IF EXISTS "Product" ADD COLUMN IF NOT EXISTS "ebayPaymentPolicyId" TEXT;`,
      `ALTER TABLE IF EXISTS "Product" ADD COLUMN IF NOT EXISTS "ebayReturnPolicyId" TEXT;`,
      `ALTER TABLE IF EXISTS "Product" ADD COLUMN IF NOT EXISTS "ebayInventoryLocationKey" TEXT;`,
      `ALTER TABLE IF EXISTS "Product" ADD COLUMN IF NOT EXISTS "ebayDescriptionHtml" TEXT;`,
      `ALTER TABLE IF EXISTS "Product" ADD COLUMN IF NOT EXISTS "ebayDescriptionTemplateId" TEXT;`,
      `ALTER TABLE IF EXISTS "Product" ADD COLUMN IF NOT EXISTS "ebaySpecificsJson" JSONB;`,
      `ALTER TABLE IF EXISTS "Product" ADD COLUMN IF NOT EXISTS "ebayValidationErrorsJson" JSONB;`,
      `ALTER TABLE IF EXISTS "Product" ADD COLUMN IF NOT EXISTS "ebaySkuLocked" BOOLEAN NOT NULL DEFAULT false;`,
      `CREATE INDEX IF NOT EXISTS "Product_ebayPublishStatus_idx" ON "Product"("ebayPublishStatus");`,
      `CREATE INDEX IF NOT EXISTS "Product_ebayMarketplaceId_idx" ON "Product"("ebayMarketplaceId");`,
      `CREATE INDEX IF NOT EXISTS "Product_ebayCategoryId_idx" ON "Product"("ebayCategoryId");`,
      `CREATE INDEX IF NOT EXISTS "Product_ebayExcludedFromSync_idx" ON "Product"("ebayExcludedFromSync");`,
      `CREATE INDEX IF NOT EXISTS "Product_ebayInventoryItemSku_idx" ON "Product"("ebayInventoryItemSku");`,

      `ALTER TABLE IF EXISTS "ProductVariant" ADD COLUMN IF NOT EXISTS "ebayVariationSku" TEXT;`,
      `ALTER TABLE IF EXISTS "ProductVariant" ADD COLUMN IF NOT EXISTS "ebayVariationData" JSONB;`,
      `ALTER TABLE IF EXISTS "ProductVariant" ADD COLUMN IF NOT EXISTS "ebaySku" TEXT;`,
      `ALTER TABLE IF EXISTS "ProductVariant" ADD COLUMN IF NOT EXISTS "ebayOfferId" TEXT;`,
      `ALTER TABLE IF EXISTS "ProductVariant" ADD COLUMN IF NOT EXISTS "ebayInventoryItemGroupKey" TEXT;`,
      `ALTER TABLE IF EXISTS "ProductVariant" ADD COLUMN IF NOT EXISTS "ebayQuantity" INTEGER;`,
      `ALTER TABLE IF EXISTS "ProductVariant" ADD COLUMN IF NOT EXISTS "ebayPrice" DECIMAL(10,2);`,
      `ALTER TABLE IF EXISTS "ProductVariant" ADD COLUMN IF NOT EXISTS "ebaySpecificsJson" JSONB;`,
      `CREATE INDEX IF NOT EXISTS "ProductVariant_ebaySku_idx" ON "ProductVariant"("ebaySku");`,
      `CREATE INDEX IF NOT EXISTS "ProductVariant_ebayOfferId_idx" ON "ProductVariant"("ebayOfferId");`,

      `ALTER TABLE IF EXISTS "ShippingPolicy" ADD COLUMN IF NOT EXISTS "ebayFulfillmentPolicyId" TEXT;`,
      `ALTER TABLE IF EXISTS "ShippingPolicy" ADD COLUMN IF NOT EXISTS "ebayMarketplaceId" TEXT DEFAULT 'EBAY_GB';`,
      `ALTER TABLE IF EXISTS "ShippingPolicy" ADD COLUMN IF NOT EXISTS "ebayDomesticShippingServiceCode" TEXT;`,
      `ALTER TABLE IF EXISTS "ShippingPolicy" ADD COLUMN IF NOT EXISTS "ebayInternationalShippingServiceCode" TEXT;`,
      `ALTER TABLE IF EXISTS "ShippingPolicy" ADD COLUMN IF NOT EXISTS "ebayExcludedLocationsJson" JSONB;`,
      `ALTER TABLE IF EXISTS "ShippingPolicy" ADD COLUMN IF NOT EXISTS "ebayHandlingTimeDays" INTEGER;`,
      `ALTER TABLE IF EXISTS "ShippingPolicy" ADD COLUMN IF NOT EXISTS "ebayCollectionOnly" BOOLEAN NOT NULL DEFAULT false;`,
      `ALTER TABLE IF EXISTS "ShippingPolicy" ADD COLUMN IF NOT EXISTS "ebayFreightRequired" BOOLEAN NOT NULL DEFAULT false;`,
      `ALTER TABLE IF EXISTS "ShippingPolicy" ADD COLUMN IF NOT EXISTS "ebayMappingStatus" TEXT DEFAULT 'UNMAPPED';`,
      `CREATE INDEX IF NOT EXISTS "ShippingPolicy_ebayMarketplaceId_idx" ON "ShippingPolicy"("ebayMarketplaceId");`
    ];

    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement);
    }
  })().catch((error) => {
    ebayPublishingSchemaPromise = null;
    throw error;
  });
  return ebayPublishingSchemaPromise;
}

const DEFAULT_EBAY_TEMPLATE = `<div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #1f2937; line-height: 1.55; max-width: 920px; margin: 0 auto; border: 1px solid #dbe3ec; background: #ffffff;">
  <div style="background: #2D4F7A; padding: 18px 22px; color: #ffffff;">
    <table style="width:100%; border-collapse:collapse;">
      <tr>
        <td style="vertical-align:middle; width:180px;"><img src="https://combay-website-lt8v.vercel.app/images/combay-logo-white.svg" alt="Combay Limited" style="max-width:160px; height:auto; display:block;" /></td>
        <td style="vertical-align:middle; text-align:right; font-size:12px; letter-spacing:1.5px; text-transform:uppercase; color:#f6e7c8;">Industrial equipment · Sourcing · Supply</td>
      </tr>
    </table>
    <h1 style="margin: 16px 0 0; font-size: 23px; line-height: 1.25; color:#ffffff;">{{productTitle}}</h1>
    <p style="margin: 7px 0 0; color: #eef4fb; font-size: 13px;">Professional industrial, automation and technical equipment supplied by Combay Limited.</p>
  </div>
  <div style="height: 5px; background: #E8A44A;"></div>
  <div style="padding: 22px;">
    <div style="margin: 0 0 18px; padding: 14px 16px; background:#f8fafc; border-left:4px solid #E8A44A;">
      <strong style="color:#2D4F7A;">Combay SKU:</strong> {{sku}}<br/>
      <span style="color:#4b5563;">Please review the full description, condition notes and images before purchase. Contact Combay if you need compatibility confirmation.</span>
    </div>

    <h2 style="color: #2D4F7A; font-size: 18px; margin: 0 0 8px;">Product Overview</h2>
    <p style="margin-top:0;">{{overview}}</p>

    <h2 style="color: #2D4F7A; font-size: 18px; margin-bottom: 8px;">Key Details</h2>
    {{keyDetailsTable}}

    <h2 style="color: #2D4F7A; font-size: 18px; margin-bottom: 8px;">Description</h2>
    <p>{{description}}</p>

    <h2 style="color: #2D4F7A; font-size: 18px; margin-bottom: 8px;">Technical Specifications</h2>
    {{specificationsTable}}

    <h2 style="color: #2D4F7A; font-size: 18px; margin-bottom: 8px;">Condition & Testing</h2>
    <p>{{conditionDescription}}</p>

    <h2 style="color: #2D4F7A; font-size: 18px; margin-bottom: 8px;">What Is Included</h2>
    <p>{{includedItems}}</p>

    <h2 style="color: #2D4F7A; font-size: 18px; margin-bottom: 8px;">Shipping, Dispatch & Returns</h2>
    <p>{{shippingSummary}}</p>
    <p style="font-size:13px;color:#4b5563;">Goods are packed for courier dispatch with serial numbers recorded before shipment where applicable. Returns and warranty terms apply as stated in the listing and invoice.</p>

    <div style="margin-top: 24px; padding: 16px; background: #f8fafc; border: 1px solid #e5e7eb;">
      <strong style="display:block;color:#2D4F7A;font-size:16px;margin-bottom:6px;">About Combay Limited</strong>
      <p style="margin:0;color:#374151;">Combay Limited supplies industrial automation, electrical, laboratory and technical equipment to businesses, engineers, resellers and procurement teams. We focus on practical product information, clear condition notes and professional B2B fulfilment.</p>
    </div>
  </div>
  <div style="padding: 14px 22px; background:#2D4F7A; color:#ffffff; font-size:12px;">
    <strong>Combay Limited</strong> · Industrial equipment supply, sourcing and asset recovery · sales@combay.co.uk
  </div>
</div>`;

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripUnsafeHtml(html: string) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/javascript:/gi, "");
}

function sentence(value: unknown, fallback: string) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function money(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? `£${n.toFixed(2)}` : "To be confirmed";
}

function plainTextFromHtml(value: string) {
  return String(value || "")
    .replace(/<br\s*\/?\>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeDescriptionText(value: unknown) {
  const text = plainTextFromHtml(String(value ?? ""));
  return escapeHtml(text || "Please review the title, images, specifications and condition notes before purchase. Contact Combay if you need confirmation of compatibility before ordering.");
}

function tableRows(rows: Array<[string, unknown]>) {
  return `<table style="width: 100%; border-collapse: collapse; margin-bottom: 18px;">${rows.map(([label, value]) => `<tr><td style="border: 1px solid #e5e7eb; padding: 8px; background: #f8fafc; width: 35%;"><strong>${escapeHtml(label)}</strong></td><td style="border: 1px solid #e5e7eb; padding: 8px;">${escapeHtml(value || "—")}</td></tr>`).join("")}</table>`;
}

function specsTable(product: EbayProductRecord) {
  const specs = Array.isArray(product.specs) ? product.specs : [];
  if (!specs.length) return `<p>No additional technical specifications have been provided. Please review images and contact Combay if you require confirmation before purchase.</p>`;
  return tableRows(specs.slice(0, 40).map((spec: any) => [spec.label || "Specification", spec.value || "—"]));
}

function conditionLabel(value: string | null | undefined) {
  const v = String(value || "USED").toUpperCase();
  if (v === "NEW") return "New";
  if (v === "NEW_OPEN_BOX") return "New other / open box";
  if (v === "FOR_PARTS") return "For parts or not working";
  return "Used";
}

function defaultConditionNote(product: EbayProductRecord) {
  if (product.condition === "NEW") return "New item. Please review images, manufacturer details and included accessories before purchase.";
  if (product.condition === "NEW_OPEN_BOX") return "New other/open-box item. Packaging may show storage or handling marks. Please review images before purchase.";
  if (product.condition === "FOR_PARTS") return "Sold for parts, repair or spares. This item may be incomplete, untested or non-working and should be purchased only by buyers who understand the condition.";
  return "Used industrial item. May show cosmetic marks from previous installation, handling or storage. Where testing is stated, it applies only to the functions described in the listing. Please review images and description before purchase.";
}

function shippingSummary(product: EbayProductRecord) {
  const policy = product.shippingPolicy?.name || product.shipping?.policyName || "Combay shipping policy";
  const manual = product.shippingManualQuoteRequired || product.shippingCollectionOnly || product.shippingPolicy?.manualQuoteRequired;
  if (manual) return "Shipping quote required. Heavy, specialist, palletised, collection-only or export orders may require manual freight confirmation before dispatch.";
  const rate = product.shippingPolicy?.rates?.find((item: any) => item.zone?.name === "UK") || product.shippingPolicy?.rates?.[0];
  const cost = rate?.cost === null || rate?.cost === undefined ? "to be confirmed" : money(rate.cost);
  const dispatch = rate?.dispatchMinDays ? `${rate.dispatchMinDays}${rate.dispatchMaxDays && rate.dispatchMaxDays !== rate.dispatchMinDays ? `–${rate.dispatchMaxDays}` : ""} working days` : product.leadTime || "normally within 1–2 working days";
  return `${policy}. UK shipping from ${cost}. Dispatch ${dispatch}. International orders may require confirmation depending on destination, size and weight.`;
}

function replaceTemplateTokens(template: string, product: EbayProductRecord) {
  const keyDetails = tableRows([
    ["SKU", product.sku],
    ["Brand", product.brand || product.manufacturer],
    ["Model / MPN", [product.model, product.mpn].filter(Boolean).join(" / ")],
    ["Condition", conditionLabel(product.condition)],
    ["Availability", `${Number(product.stockQty ?? 0)} available`],
  ]);
  const replacements: Record<string, string> = {
    productTitle: escapeHtml(product.title),
    sku: escapeHtml(product.sku),
    brand: escapeHtml(product.brand || product.manufacturer || "Combay"),
    mpn: escapeHtml([product.model, product.mpn].filter(Boolean).join(" / ") || "—"),
    condition: escapeHtml(conditionLabel(product.condition)),
    availability: escapeHtml(`${Number(product.stockQty ?? 0)} available`),
    overview: safeDescriptionText(product.productOverview || product.description),
    description: safeDescriptionText(product.description || product.productOverview),
    conditionDescription: escapeHtml(product.ebayConditionDescription || defaultConditionNote(product)),
    includedItems: escapeHtml(product.includedItems || "Only the item(s) shown/described are included. Accessories, manuals, cables, software or packaging are included only where expressly stated."),
    shippingSummary: escapeHtml(shippingSummary(product)),
    keyDetailsTable: keyDetails,
    specificationsTable: specsTable(product),
  };
  return stripUnsafeHtml(template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key) => replacements[key] ?? ""));
}

export function buildCombayEbayDescription(product: EbayProductRecord, templateHtml?: string | null) {
  return replaceTemplateTokens(templateHtml || DEFAULT_EBAY_TEMPLATE, product);
}

export function validateEbaySafeHtml(html: string) {
  const errors: string[] = [];
  if (/<script/i.test(html)) errors.push("Description contains script tags, which are not eBay-safe.");
  if (/<iframe/i.test(html)) errors.push("Description contains iframe content, which is not eBay-safe.");
  if (/<form/i.test(html)) errors.push("Description contains form elements, which are not allowed.");
  if (/javascript:/i.test(html)) errors.push("Description contains javascript: links, which are not allowed.");
  if (/\son[a-z]+\s*=/i.test(html)) errors.push("Description contains inline event handlers, which are not allowed.");
  return errors;
}

export async function ensureEbayPublishingDefaults() {
  await ensureEbayPublishingDatabaseSchema();
  await prisma.product.updateMany({ where: { ebayConditionEnum: "USED" }, data: { ebayConditionEnum: "USED_EXCELLENT", ebayConditionId: "3000" } }).catch(() => null);
  const template = await prisma.ebayDescriptionTemplate.findFirst({ where: { isDefault: true } });
  const defaultTemplate = template
    ? await prisma.ebayDescriptionTemplate.update({
        where: { id: template.id },
        data: template.isSystem ? {
          name: "Combay default eBay template",
          description: "Professional eBay-safe Combay branded listing template with logo, slogan and B2B sections.",
          html: DEFAULT_EBAY_TEMPLATE,
        } : {},
      })
    : await prisma.ebayDescriptionTemplate.create({
        data: {
          name: "Combay default eBay template",
          description: "Professional eBay-safe Combay branded listing template with logo, slogan and B2B sections.",
          html: DEFAULT_EBAY_TEMPLATE,
          isDefault: true,
          isSystem: true,
        },
      });

  const location = await prisma.ebayInventoryLocation.findFirst({ where: { isDefault: true } });
  const envDispatchPostcode = ebayDispatchPostcodeFromEnv();
  const defaultLocation = location || await prisma.ebayInventoryLocation.upsert({
    where: { key: "COMBAY-UK-MAIN" },
    create: {
      key: "COMBAY-UK-MAIN",
      name: "Combay UK dispatch location",
      countryCode: "GB",
      postcode: envDispatchPostcode || null,
      city: "Chelmsford",
      isDefault: true,
      isActive: true,
    },
    update: {
      name: "Combay UK dispatch location",
      countryCode: "GB",
      ...(isFullUkPostcode(envDispatchPostcode) ? { postcode: envDispatchPostcode } : {}),
      city: "Chelmsford",
      isDefault: true,
      isActive: true,
    },
  });

  const config = await prisma.ebaySyncConfig.findFirst({ orderBy: { updatedAt: "desc" } });
  if (config) {
    await prisma.ebaySyncConfig.update({
      where: { id: config.id },
      data: {
        defaultDescriptionTemplateId: config.defaultDescriptionTemplateId || defaultTemplate.id,
        defaultInventoryLocationKey: config.defaultInventoryLocationKey || defaultLocation.key,
        marketplaceId: config.marketplaceId || MARKETPLACE,
        defaultSkuPrefix: config.defaultSkuPrefix || SKU_PREFIX,
        defaultListingDuration: config.defaultListingDuration || "GTC",
        autoGenerateSku: config.autoGenerateSku ?? true,
        manualApprovalBeforePublish: config.manualApprovalBeforePublish ?? true,
      },
    });
  } else {
    await prisma.ebaySyncConfig.create({
      data: {
        marketplaceId: MARKETPLACE,
        defaultDescriptionTemplateId: defaultTemplate.id,
        defaultInventoryLocationKey: defaultLocation.key,
        defaultSkuPrefix: SKU_PREFIX,
        defaultListingDuration: "GTC",
        autoGenerateSku: true,
        manualApprovalBeforePublish: true,
        autoPublishToEbay: false,
      },
    });
  }
  return { template: defaultTemplate, location: defaultLocation };
}

export async function getEbayPublishingSettings() {
  return withDatabase(async () => {
    try {
      await ensureEbayPublishingDefaults();
      const config = await prisma.ebaySyncConfig.findFirst({ orderBy: { updatedAt: "desc" } });
      const marketplaceId = config?.marketplaceId || MARKETPLACE;

      let localOptions = await getLocalPolicyOptions(marketplaceId);
      let liveOptions: Partial<EbayPublishingOptionState> = {};
      try {
        liveOptions = await fetchLiveEbayPublishingOptions(marketplaceId);
        await upsertFetchedOptions(liveOptions, marketplaceId);
        localOptions = await getLocalPolicyOptions(marketplaceId);
      } catch (error) {
        liveOptions = {
          fetchedFromEbay: false,
          fetchMessage: error instanceof Error
            ? `Could not fetch live eBay business policies yet: ${error.message}`
            : "Could not fetch live eBay business policies yet.",
        };
      }

      const [templates, locations, logs, jobs] = await Promise.all([
        prisma.ebayDescriptionTemplate.findMany({ orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }] }),
        prisma.ebayInventoryLocation.findMany({ orderBy: [{ isDefault: "desc" }, { name: "asc" }] }),
        prisma.ebaySyncLog.findMany({ orderBy: { startedAt: "desc" }, take: 10 }),
        prisma.ebayPublishJob.findMany({ orderBy: { queuedAt: "desc" }, take: 10 }),
      ]);

      const options: EbayPublishingOptionState = {
        marketplaceOptions: EBAY_MARKETPLACE_OPTIONS,
        listingDurationOptions: EBAY_LISTING_DURATION_OPTIONS,
        paymentPolicies: localOptions.paymentPolicies?.length ? localOptions.paymentPolicies : (liveOptions.paymentPolicies || []),
        returnPolicies: localOptions.returnPolicies?.length ? localOptions.returnPolicies : (liveOptions.returnPolicies || []),
        fulfillmentPolicies: localOptions.fulfillmentPolicies?.length ? localOptions.fulfillmentPolicies : (liveOptions.fulfillmentPolicies || []),
        inventoryLocations: [
          ...locations.map((item: any) => ({ id: item.key, name: `${item.name} (${item.key})`, isDefault: item.isDefault, raw: item })),
          ...(liveOptions.inventoryLocations || []).filter((live) => !locations.some((local: any) => local.key === live.id)),
        ],
        fetchedFromEbay: Boolean(liveOptions.fetchedFromEbay),
        fetchMessage: liveOptions.fetchMessage || "Using locally saved eBay publishing options.",
      };

      const autoDefaults = {
        defaultInventoryLocationKey: pickDefault(options.inventoryLocations, config?.defaultInventoryLocationKey),
        defaultPaymentPolicyId: pickDefault(options.paymentPolicies, config?.defaultPaymentPolicyId),
        defaultReturnPolicyId: pickDefault(options.returnPolicies, config?.defaultReturnPolicyId),
        defaultFulfillmentPolicyId: pickDefault(options.fulfillmentPolicies, config?.defaultFulfillmentPolicyId),
        defaultDescriptionTemplateId: pickDefault(templates.map((item: any) => ({ id: item.id, name: item.name, isDefault: item.isDefault })), config?.defaultDescriptionTemplateId),
      };

      return { schemaReady: true, config: { ...config, ...autoDefaults }, templates, locations, logs, jobs, options };
    } catch (error) {
      const schemaMessage = missingSchemaMessage(error);
      if (schemaMessage) {
        return {
          schemaReady: false,
          schemaMessage,
          config: {
            marketplaceId: MARKETPLACE,
            defaultListingDuration: "GTC",
            defaultSkuPrefix: SKU_PREFIX,
            autoGenerateSku: true,
            manualApprovalBeforePublish: true,
            autoPublishToEbay: false,
          },
          templates: [],
          locations: [],
          logs: [],
          jobs: [],
          options: {
            marketplaceOptions: EBAY_MARKETPLACE_OPTIONS,
            listingDurationOptions: EBAY_LISTING_DURATION_OPTIONS,
            paymentPolicies: [],
            returnPolicies: [],
            fulfillmentPolicies: [],
            inventoryLocations: [],
            fetchedFromEbay: false,
            fetchMessage: "eBay policy fetch is paused until the database schema is updated.",
          },
        };
      }
      throw error;
    }
  });
}

export async function saveEbayPublishingSettings(input: any) {
  return withDatabase(async () => {
    try {
      await ensureEbayPublishingDefaults();
      const config = await prisma.ebaySyncConfig.findFirst({ orderBy: { updatedAt: "desc" } });
      const marketplaceId = EBAY_MARKETPLACE_OPTIONS.some((item) => item.value === input.marketplaceId) ? input.marketplaceId : (config?.marketplaceId || MARKETPLACE);
      const listingDuration = EBAY_LISTING_DURATION_OPTIONS.some((item) => item.value === input.defaultListingDuration) ? input.defaultListingDuration : "GTC";
      const selectedLocationKey = safeMerchantLocationKey(input.defaultInventoryLocationKey || config?.defaultInventoryLocationKey || "COMBAY-UK-MAIN");
      const existingLocation = await prisma.ebayInventoryLocation.findFirst({ where: { key: selectedLocationKey } }).catch(() => null);
      const locationCountryCode = String(input.inventoryLocationCountryCode || existingLocation?.countryCode || "GB").trim().toUpperCase() || "GB";
      const locationPostcode = locationCountryCode === "GB"
        ? normaliseUkPostcode(input.inventoryLocationPostcode || existingLocation?.postcode || ebayDispatchPostcodeFromEnv())
        : String(input.inventoryLocationPostcode || existingLocation?.postcode || "").trim();
      if (locationCountryCode === "GB" && !isFullUkPostcode(locationPostcode)) {
        throw new Error(locationNeedsFullUkPostcodeMessage(selectedLocationKey, locationPostcode));
      }
      await prisma.ebayInventoryLocation.upsert({
        where: { key: selectedLocationKey },
        create: {
          key: selectedLocationKey,
          name: cleanEbayLocationName(input.inventoryLocationName || existingLocation?.name || "Combay UK dispatch location"),
          countryCode: locationCountryCode,
          postcode: locationPostcode || null,
          addressLine1: String(input.inventoryLocationAddressLine1 || existingLocation?.addressLine1 || "").trim() || null,
          city: String(input.inventoryLocationCity || existingLocation?.city || "Chelmsford").trim() || null,
          isDefault: true,
          isActive: true,
        },
        update: {
          name: cleanEbayLocationName(input.inventoryLocationName || existingLocation?.name || "Combay UK dispatch location"),
          countryCode: locationCountryCode,
          postcode: locationPostcode || null,
          addressLine1: String(input.inventoryLocationAddressLine1 || existingLocation?.addressLine1 || "").trim() || null,
          city: String(input.inventoryLocationCity || existingLocation?.city || "Chelmsford").trim() || null,
          isDefault: true,
          isActive: true,
        },
      });
      const payload = {
        marketplaceId,
        defaultInventoryLocationKey: selectedLocationKey,
        defaultPaymentPolicyId: input.defaultPaymentPolicyId || null,
        defaultReturnPolicyId: input.defaultReturnPolicyId || null,
        defaultFulfillmentPolicyId: input.defaultFulfillmentPolicyId || null,
        defaultListingDuration: listingDuration,
        defaultSkuPrefix: String(input.defaultSkuPrefix || SKU_PREFIX).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || SKU_PREFIX,
        autoGenerateSku: input.autoGenerateSku !== false,
        autoPublishToEbay: Boolean(input.autoPublishToEbay),
        manualApprovalBeforePublish: input.manualApprovalBeforePublish !== false,
        defaultDescriptionTemplateId: input.defaultDescriptionTemplateId || null,
      };
      return config
        ? prisma.ebaySyncConfig.update({ where: { id: config.id }, data: payload })
        : prisma.ebaySyncConfig.create({ data: { ...payload, environment: "production" } });
    } catch (error) {
      const schemaMessage = missingSchemaMessage(error);
      if (schemaMessage) throw new Error(schemaMessage);
      throw error;
    }
  });
}

async function nextCombaySku(prefix = SKU_PREFIX) {
  const products = await prisma.product.findMany({ where: { sku: { startsWith: prefix } }, select: { sku: true }, orderBy: { sku: "desc" }, take: 100 });
  const max = products.reduce((highest: number, item: { sku: string }) => {
    const match = item.sku.match(new RegExp(`^${prefix}(\\d{5})$`, "i"));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `${prefix}${String(max + 1).padStart(5, "0")}`;
}

async function getProductForEbay(id: string) {
  return prisma.product.findFirst({
    where: { OR: [{ id }, { sku: id }, { slug: id }] },
    include: {
      category: true,
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
      specs: { orderBy: { sortOrder: "asc" } },
      variants: { orderBy: { sortOrder: "asc" } },
      shippingPolicy: { include: { rates: { include: { zone: true } } } },
    },
  });
}

const EBAY_CONDITION_BY_ID: Record<string, string> = {
  "1000": "NEW",
  "1500": "NEW_OTHER",
  "1750": "NEW_WITH_DEFECTS",
  "2000": "CERTIFIED_REFURBISHED",
  "2010": "EXCELLENT_REFURBISHED",
  "2020": "VERY_GOOD_REFURBISHED",
  "2030": "GOOD_REFURBISHED",
  "2500": "SELLER_REFURBISHED",
  "2750": "LIKE_NEW",
  "2990": "PRE_OWNED_EXCELLENT",
  "3000": "USED_EXCELLENT",
  "3010": "PRE_OWNED_FAIR",
  "4000": "USED_VERY_GOOD",
  "5000": "USED_GOOD",
  "6000": "USED_ACCEPTABLE",
  "7000": "FOR_PARTS_OR_NOT_WORKING",
};

const EBAY_VALID_CONDITIONS = new Set(Object.values(EBAY_CONDITION_BY_ID));

export function normaliseEbayConditionEnum(value: any, fallback = "USED_EXCELLENT") {
  const text = String(value || "").trim().toUpperCase();
  if (!text) return fallback;
  if (EBAY_VALID_CONDITIONS.has(text)) return text;
  if (EBAY_CONDITION_BY_ID[text]) return EBAY_CONDITION_BY_ID[text];
  if (text === "USED") return "USED_EXCELLENT";
  if (text === "OPEN_BOX" || text === "NEW_OPEN_BOX") return "NEW_OTHER";
  if (text === "FOR_PARTS" || text === "PARTS" || text === "NOT_WORKING") return "FOR_PARTS_OR_NOT_WORKING";
  if (text === "REFURBISHED") return "SELLER_REFURBISHED";
  return fallback;
}

function conditionIdForEnum(conditionEnum: string) {
  return Object.entries(EBAY_CONDITION_BY_ID).find(([, enumValue]) => enumValue === conditionEnum)?.[0] || "3000";
}

export function mapConditionToEbay(product: EbayProductRecord) {
  const condition = String(product.condition || "USED").toUpperCase();
  if (condition === "NEW") return { conditionEnum: "NEW", conditionId: "1000", note: defaultConditionNote(product) };
  if (condition === "NEW_OPEN_BOX") return { conditionEnum: "NEW_OTHER", conditionId: "1500", note: defaultConditionNote(product) };
  if (condition === "FOR_PARTS") return { conditionEnum: "FOR_PARTS_OR_NOT_WORKING", conditionId: "7000", note: defaultConditionNote(product) };
  return { conditionEnum: "USED_EXCELLENT", conditionId: "3000", note: defaultConditionNote(product) };
}

function imageValidation(images: Array<{ url: string }>) {
  if (!images.length) return ["At least one externally accessible product image is required before eBay publishing."];
  const errors: string[] = [];
  images.forEach((image, index) => {
    if (!/^https?:\/\//i.test(String(image.url || ""))) errors.push(`Image ${index + 1} is not an externally accessible HTTP/HTTPS URL.`);
  });
  return errors;
}

export function validateEbayProductRecord(product: EbayProductRecord) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const title = String(product.title || "").trim();
  const sku = String(product.sku || "").trim();

  if (!sku) errors.push("SKU is required.");
  if (sku && !/^CBUK\d{5}(-\d{3})?$/i.test(sku)) warnings.push("SKU is not in the preferred Combay CBUK00001 format.");
  if (!title) errors.push("eBay title/product title is required.");
  if (title.length > 80) errors.push("eBay title must be 80 characters or fewer.");
  if (product.priceOnRequest || product.price === null || product.price === undefined) errors.push("A fixed product price is required for eBay publishing. POA products should remain quote-only.");
  if (Number(product.stockQty ?? 0) <= 0) errors.push("Stock quantity must be greater than zero before publishing.");
  if (product.ebayExcludedFromSync || product.syncExcluded) errors.push("Product is excluded from eBay sync/publishing.");
  if (!product.ebayCategoryId) errors.push("eBay category ID is required. Use the eBay category assistant to select a category from eBay, rather than going to eBay manually.");
  const specifics = product.ebaySpecificsJson && typeof product.ebaySpecificsJson === "object" && !Array.isArray(product.ebaySpecificsJson) ? product.ebaySpecificsJson : {};
  const requiredAspects = Array.isArray(specifics._requiredAspects) ? specifics._requiredAspects : [];
  requiredAspects.forEach((aspectName: string) => {
    const value = specifics[aspectName];
    const hasValue = Array.isArray(value) ? value.some((item) => String(item || "").trim()) : Boolean(String(value || "").trim());
    if (!hasValue) errors.push(`Required eBay item specific missing: ${aspectName}.`);
  });
  if (!requiredAspects.length && product.ebayCategoryId) warnings.push("eBay category is selected but required aspect metadata has not been fetched yet. Use Apply category / Refresh aspects before live publish.");
  if (!product.ebayFulfillmentPolicyId && !product.shippingPolicy?.ebayFulfillmentPolicyId) errors.push("No eBay fulfilment policy is mapped yet. Select one before live publish.");
  if (!product.ebayPaymentPolicyId) errors.push("No eBay payment policy is selected yet.");
  if (!product.ebayReturnPolicyId) errors.push("No eBay return policy is selected yet.");
  if (!product.ebayInventoryLocationKey) errors.push("No eBay inventory location is selected yet.");
  if (product.shippingManualQuoteRequired || product.shippingCollectionOnly || product.shippingPolicy?.manualQuoteRequired) errors.push("Product uses manual quote/collection-only shipping. Use freight/collection policy mapping before live eBay publish.");
  errors.push(...imageValidation(product.images || []));

  const html = String(product.ebayDescriptionHtml || "");
  if (!html.trim()) errors.push("Branded eBay HTML description has not been generated yet.");
  errors.push(...validateEbaySafeHtml(html));

  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (variants.length) {
    errors.push("Variation listings are blocked until the dedicated eBay variation publishing phase is enabled. Publish this product only after variation support is implemented or split it into separate non-variation listings.");
    variants.forEach((variant: any, index: number) => {
      if (!variant.sku && !variant.ebaySku) errors.push(`Variation ${index + 1} needs a SKU before eBay publishing.`);
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}

export async function getEbayProductPublishingState(productId: string) {
  return withDatabase(async () => {
    await ensureEbayPublishingDefaults();
    const product = await getProductForEbay(productId);
    if (!product) throw new Error("Product not found.");
    const logs = await prisma.ebaySyncLog.findMany({ where: { productId: product.id }, orderBy: { startedAt: "desc" }, take: 8 });
    const jobs = await prisma.ebayPublishJob.findMany({ where: { productId: product.id }, orderBy: { queuedAt: "desc" }, take: 5 });
    const config = await prisma.ebaySyncConfig.findFirst({ orderBy: { updatedAt: "desc" } });
    const marketplaceId = product.ebayMarketplaceId || config?.marketplaceId || MARKETPLACE;
    const templates = await prisma.ebayDescriptionTemplate.findMany({ orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }] });
    const locations = await prisma.ebayInventoryLocation.findMany({ where: { isActive: true }, orderBy: [{ isDefault: "desc" }, { name: "asc" }] });
    const localOptions = await getLocalPolicyOptions(marketplaceId);
    const options = {
      marketplaceOptions: EBAY_MARKETPLACE_OPTIONS,
      listingDurationOptions: EBAY_LISTING_DURATION_OPTIONS,
      paymentPolicies: localOptions.paymentPolicies || [],
      returnPolicies: localOptions.returnPolicies || [],
      fulfillmentPolicies: localOptions.fulfillmentPolicies || [],
      inventoryLocations: locations.map((item: any) => ({ id: item.key, name: `${item.name} (${item.key})`, isDefault: item.isDefault, raw: item })),
    };
    const validation = validateEbayProductRecord(product);
    const selectedLocationKey = safeMerchantLocationKey(product.ebayInventoryLocationKey || config?.defaultInventoryLocationKey || "COMBAY-UK-MAIN");
    const selectedLocation = locations.find((item: any) => item.key === selectedLocationKey);
    if (selectedLocation) {
      const locationCheck = validateLocalInventoryLocationForEbay(selectedLocation, selectedLocationKey);
      locationCheck.errors.forEach((message) => {
        if (!validation.errors.includes(message)) validation.errors.push(message);
      });
      validation.valid = validation.errors.length === 0;
    }
    return { product, logs, jobs, config, templates, locations, options, validation };
  });
}

export async function saveEbayProductDraft(productId: string, input: any) {
  return withDatabase(async () => {
    await ensureEbayPublishingDefaults();
    const product = await getProductForEbay(productId);
    if (!product) throw new Error("Product not found.");
    if (product.ebaySkuLocked && input.sku && input.sku !== product.sku) throw new Error("SKU is locked because this product has already been prepared/published for eBay.");
    const condition = mapConditionToEbay(product);
    const data: any = {
      ebayMarketplaceId: input.ebayMarketplaceId || MARKETPLACE,
      ebayCategoryId: input.ebayCategoryId || null,
      ebayCategoryName: input.ebayCategoryName || null,
      ebayListingId: input.ebayListingId || null,
      ebayOfferId: input.ebayOfferId || null,
      ebayInventoryItemSku: input.ebayInventoryItemSku || product.sku,
      ebayConditionId: conditionIdForEnum(normaliseEbayConditionEnum(input.ebayConditionEnum || condition.conditionEnum)),
      ebayConditionEnum: normaliseEbayConditionEnum(input.ebayConditionEnum || condition.conditionEnum),
      ebayFulfillmentPolicyId: input.ebayFulfillmentPolicyId || null,
      ebayPaymentPolicyId: input.ebayPaymentPolicyId || null,
      ebayReturnPolicyId: input.ebayReturnPolicyId || null,
      ebayInventoryLocationKey: input.ebayInventoryLocationKey || null,
      ebayDescriptionTemplateId: input.ebayDescriptionTemplateId || null,
      ebayDescriptionHtml: stripUnsafeHtml(input.ebayDescriptionHtml || product.ebayDescriptionHtml || ""),
      ebaySpecificsJson: input.ebaySpecificsJson || product.ebaySpecificsJson || null,
      ebaySourceOfTruth: input.ebaySourceOfTruth || "COMBAY",
      ebayExcludedFromSync: Boolean(input.ebayExcludedFromSync),
      syncExcluded: Boolean(input.ebayExcludedFromSync),
      ebayPublishStatus: input.ebayPublishStatus || product.ebayPublishStatus || "DRAFTED_FOR_EBAY",
    };
    const validation = validateEbayProductRecord({ ...product, ...data });
    data.ebayValidationErrorsJson = validation;
    if (!validation.valid && data.ebayPublishStatus === "READY_TO_PUBLISH") data.ebayPublishStatus = "VALIDATION_FAILED";
    const updated = await prisma.product.update({ where: { id: product.id }, data });
    await prisma.ebaySyncLog.create({ data: { productId: product.id, sku: updated.sku, productTitle: updated.title, actionType: "SAVE_EBAY_DRAFT", status: "SUCCESS", message: "Saved local eBay draft fields and validation state.", rawPayload: { validation }, finishedAt: new Date() } });
    return { product: updated, validation };
  });
}

export async function generateEbayDescriptionForProduct(productId: string, templateId?: string | null) {
  return withDatabase(async () => {
    await ensureEbayPublishingDefaults();
    const product = await getProductForEbay(productId);
    if (!product) throw new Error("Product not found.");
    const template = templateId
      ? await prisma.ebayDescriptionTemplate.findUnique({ where: { id: templateId } })
      : await prisma.ebayDescriptionTemplate.findFirst({ where: { isDefault: true } });
    const html = buildCombayEbayDescription(product, template?.html);
    const validation = validateEbayProductRecord({ ...product, ebayDescriptionHtml: html, ebayDescriptionTemplateId: template?.id });
    const updated = await prisma.product.update({
      where: { id: product.id },
      data: {
        ebayDescriptionHtml: html,
        ebayDescriptionTemplateId: template?.id ?? null,
        ebayConditionId: conditionIdForEnum(normaliseEbayConditionEnum(product.ebayConditionEnum || mapConditionToEbay(product).conditionEnum)),
        ebayConditionEnum: normaliseEbayConditionEnum(product.ebayConditionEnum || mapConditionToEbay(product).conditionEnum),
        ebayValidationErrorsJson: validation,
        ebayPublishStatus: validation.valid ? "READY_TO_PUBLISH" : "VALIDATION_FAILED",
      },
    });
    await prisma.ebaySyncLog.create({ data: { productId: product.id, sku: updated.sku, productTitle: updated.title, actionType: "GENERATE_EBAY_DESCRIPTION", status: "SUCCESS", message: "Generated Combay-branded eBay-safe HTML description.", rawPayload: { validation }, finishedAt: new Date() } });
    return { html, validation, product: updated };
  });
}

export async function validateEbayProduct(productId: string) {
  return withDatabase(async () => {
    await ensureEbayPublishingDefaults();
    const product = await getProductForEbay(productId);
    if (!product) throw new Error("Product not found.");
    const validation = validateEbayProductRecord(product);
    const updated = await prisma.product.update({
      where: { id: product.id },
      data: { ebayValidationErrorsJson: validation, ebayPublishStatus: validation.valid ? "READY_TO_PUBLISH" : "VALIDATION_FAILED" },
    });
    await prisma.ebaySyncLog.create({ data: { productId: product.id, sku: updated.sku, productTitle: updated.title, actionType: "VALIDATE_EBAY_LISTING", status: validation.valid ? "SUCCESS" : "FAILED", message: validation.valid ? "Product passed local eBay publishing validation." : "Product failed local eBay publishing validation.", rawPayload: validation, finishedAt: new Date() } });
    return { validation, product: updated };
  });
}

export async function queueEbayPublishReview(productId: string) {
  return withDatabase(async () => {
    await ensureEbayPublishingDefaults();
    const product = await getProductForEbay(productId);
    if (!product) throw new Error("Product not found.");
    const validation = validateEbayProductRecord(product);
    if (!validation.valid) throw new Error(`Product cannot be queued until validation passes: ${validation.errors.join(" ")}`);
    const job = await prisma.ebayPublishJob.create({
      data: {
        productId: product.id,
        sku: product.sku,
        action: product.ebayListingId ? "UPDATE_EXISTING_EBAY_LISTING" : "PUBLISH_NEW_EBAY_LISTING",
        status: "AWAITING_MANUAL_APPROVAL",
        marketplaceId: product.ebayMarketplaceId || MARKETPLACE,
        payload: { validation, note: "Prepared for the live eBay publish worker/API phase. This job is intentionally not auto-published." },
      },
    });
    await prisma.product.update({ where: { id: product.id }, data: { ebayPublishStatus: "UPDATE_PENDING", ebaySkuLocked: true } });
    await prisma.ebaySyncLog.create({ data: { productId: product.id, sku: product.sku, productTitle: product.title, actionType: "QUEUE_EBAY_PUBLISH_REVIEW", status: "SUCCESS", message: "Product queued for manual approval before live eBay publishing.", rawPayload: { jobId: job.id, validation }, finishedAt: new Date() } });
    return { job, validation };
  });
}


function marketplaceCurrency(marketplaceId?: string | null) {
  const marketplace = String(marketplaceId || MARKETPLACE).toUpperCase();
  const map: Record<string, string> = {
    EBAY_GB: "GBP",
    EBAY_IE: "EUR",
    EBAY_DE: "EUR",
    EBAY_FR: "EUR",
    EBAY_IT: "EUR",
    EBAY_ES: "EUR",
    EBAY_US: "USD",
    EBAY_CA: "CAD",
    EBAY_AU: "AUD",
  };
  return map[marketplace] || "GBP";
}

function moneyValue(value: any) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return "0.00";
  return number.toFixed(2);
}

function normaliseAspectValues(value: any): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 20);
  if (value === null || value === undefined) return [];
  const text = String(value).trim();
  return text ? [text] : [];
}

function ebayAspectsForProduct(product: EbayProductRecord) {
  const aspects: Record<string, string[]> = {};
  const setAspect = (name: string, value: any) => {
    const values = normaliseAspectValues(value);
    if (values.length) aspects[name] = Array.from(new Set([...(aspects[name] || []), ...values])).slice(0, 20);
  };

  if (product.ebaySpecificsJson && typeof product.ebaySpecificsJson === "object" && !Array.isArray(product.ebaySpecificsJson)) {
    Object.entries(product.ebaySpecificsJson).forEach(([key, value]) => {
      if (!String(key).startsWith("_")) setAspect(key, value);
    });
  }

  (product.specs || []).forEach((spec: any) => {
    const label = String(spec.label || spec.name || "").trim();
    const value = String(spec.value || "").trim();
    if (label && value) setAspect(label, value);
  });

  setAspect("Brand", product.brand || product.manufacturer || "Combay");
  if (product.mpn) setAspect("MPN", product.mpn);
  if (product.model) setAspect("Model", product.model);
  if (product.manufacturer && !aspects.Manufacturer) setAspect("Manufacturer", product.manufacturer);
  return aspects;
}

function publicImageUrls(product: EbayProductRecord) {
  return (product.images || [])
    .map((image: any) => String(image.url || "").trim())
    .filter((url: string) => /^https:\/\//i.test(url))
    .slice(0, 12);
}

function truncateText(value: any, max = 1000) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function livePublishValidation(product: EbayProductRecord) {
  const base = validateEbayProductRecord(product);
  const errors = [...(base.errors || [])];
  const warnings = [...(base.warnings || [])];
  const add = (message: string) => { if (!errors.includes(message)) errors.push(message); };
  const warn = (message: string) => { if (!warnings.includes(message)) warnings.push(message); };

  const sku = String(product.ebayInventoryItemSku || product.sku || "").trim();
  const categoryId = String(product.ebayCategoryId || "").trim();
  const marketplaceId = String(product.ebayMarketplaceId || MARKETPLACE).trim();
  const price = Number(product.price);

  if (!product.ebayDescriptionHtml?.trim()) add("Generate and save the branded eBay HTML description before live publish.");
  if (!product.ebayPaymentPolicyId) add("Select a valid eBay payment policy before live publish.");
  if (!product.ebayReturnPolicyId) add("Select a valid eBay return policy before live publish.");
  if (!product.ebayFulfillmentPolicyId && !product.shippingPolicy?.ebayFulfillmentPolicyId) add("Select a valid eBay fulfilment policy before live publish.");
  if (!product.ebayInventoryLocationKey) add("Select an eBay inventory location before live publish.");
  if (!publicImageUrls(product).length) add("At least one HTTPS product image is required before live publish.");
  if (!sku) add("A Combay/eBay SKU is required before live publish.");
  if (sku.length > 50) add("eBay SKU must be 50 characters or fewer.");
  if (categoryId && !/^\d+$/.test(categoryId)) add("eBay category ID must be numeric. Use the category assistant rather than free text.");
  if (!marketplaceId.startsWith("EBAY_")) add("Marketplace must be a valid eBay marketplace ID such as EBAY_GB.");
  if (!Number.isFinite(price) || price <= 0) add("eBay price must be a positive numeric value.");
  const conditionEnum = normaliseEbayConditionEnum(product.ebayConditionEnum || mapConditionToEbay(product).conditionEnum);
  if (!EBAY_VALID_CONDITIONS.has(conditionEnum)) add("eBay condition must be a valid Inventory API condition enum. Save the eBay draft again so Combay can normalise the condition mapping.");
  if (String(product.ebayConditionEnum || "").toUpperCase() === "USED") warn("This product had the old invalid eBay condition enum USED. The live publish payload will send USED_EXCELLENT / condition ID 3000 instead.");
  if (String(product.ebayDescriptionHtml || "").length > 490000) warn("eBay description is very large. If eBay rejects the request, shorten the HTML description.");
  if (String(product.title || "").length > 80) warn("eBay title will be truncated to 80 characters for Inventory API publishing.");
  if (product.shippingManualQuoteRequired || product.shippingCollectionOnly || product.shippingPolicy?.manualQuoteRequired) {
    add("Manual quote or collection-only shipping products are blocked from live publish until a suitable eBay freight/collection fulfilment policy is selected and manually reviewed.");
  }
  return { valid: errors.length === 0, errors, warnings };
}

class EbayInventoryApiError extends Error {
  status: number;
  method: string;
  path: string;
  marketplaceId: string;
  requestPayload: any;
  requestHeaders?: any;
  responsePayload: any;

  constructor(args: { status: number; method: string; path: string; marketplaceId: string; requestPayload?: any; requestHeaders?: any; responsePayload: any; message: string }) {
    super(args.message);
    this.name = "EbayInventoryApiError";
    this.status = args.status;
    this.method = args.method;
    this.path = args.path;
    this.marketplaceId = args.marketplaceId;
    this.requestPayload = args.requestPayload;
    this.requestHeaders = args.requestHeaders;
    this.responsePayload = args.responsePayload;
  }
}

function ebayErrorParameters(error: any) {
  const params = Array.isArray(error?.parameters) ? error.parameters : [];
  return params
    .map((param: any) => `${param?.name || "parameter"}: ${param?.value || ""}`.trim())
    .filter(Boolean);
}

function ebayErrorMessage(body: any, fallback: string) {
  const errors = Array.isArray(body?.errors) ? body.errors : [];
  if (errors.length) {
    return errors.map((error: any) => {
      const parts = [
        error.errorId,
        error.domain || error.category ? `${error.domain || "eBay"}/${error.category || "ERROR"}` : null,
        error.message,
        error.longMessage,
        ...ebayErrorParameters(error),
        Array.isArray(error.inputRefIds) && error.inputRefIds.length ? `input: ${error.inputRefIds.join(", ")}` : null,
      ].filter(Boolean);
      return parts.join(" — ");
    }).join(" | ");
  }
  return body?.message || body?.error_description || body?.error || fallback;
}

function ebayRequestLanguage(marketplace: string) {
  // eBay Inventory REST calls need valid language headers. In Vercel/Node,
  // fetch can add Accept-Language: * when omitted; eBay rejects that with 25709.
  // Therefore live publish requests set both Accept-Language and Content-Language
  // to a real marketplace locale. EBAY_GB uses en-GB.
  const value = String(marketplace || MARKETPLACE).toUpperCase();
  if (value === "EBAY_GB") return "en-GB";
  if (value === "EBAY_US") return "en-US";
  if (value === "EBAY_AU") return "en-AU";
  if (value === "EBAY_CA") return "en-CA";
  if (value === "EBAY_IE") return "en-IE";
  if (value === "EBAY_DE") return "de-DE";
  if (value === "EBAY_FR") return "fr-FR";
  if (value === "EBAY_IT") return "it-IT";
  if (value === "EBAY_ES") return "es-ES";
  return "en-US";
}

async function ebayInventoryApiRequest(path: string, method: string, body?: any, marketplaceId?: string | null) {
  const { token, config } = await getEbayAccessToken();
  const marketplace = marketplaceId || config.marketplaceId || MARKETPLACE;
  const root = apiRootForEnvironment(config.environment);
  const language = ebayRequestLanguage(marketplace);
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Accept-Language": language,
    "Content-Type": "application/json",
    "Content-Language": language,
    "X-EBAY-C-MARKETPLACE-ID": marketplace,
  };
  const response = await fetch(`${root}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const text = await response.text();
  let parsed: any = {};
  try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { raw: text }; }
  if (!response.ok) {
    throw new EbayInventoryApiError({
      status: response.status,
      method,
      path,
      marketplaceId: marketplace,
      requestPayload: body,
      requestHeaders: { ...headers, Authorization: "Bearer ***redacted***" },
      responsePayload: parsed,
      message: ebayErrorMessage(parsed, `eBay Inventory API ${method} ${path} failed with ${response.status}`),
    });
  }
  return parsed;
}


function safeMerchantLocationKey(value?: string | null) {
  const clean = String(value || "")
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 36);
  return clean || "COMBAY-UK-MAIN";
}

function cleanEbayLocationName(value?: string | null) {
  return String(value || "Combay UK dispatch location")
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .trim()
    .slice(0, 80) || "Combay UK dispatch location";
}

function normaliseUkPostcode(value?: string | null) {
  const compact = String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();
  if (!compact) return "";
  if (compact.length <= 3) return compact;
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

function isFullUkPostcode(value?: string | null) {
  const normalised = normaliseUkPostcode(value);
  return /^(GIR 0AA|[A-Z]{1,2}[0-9][0-9A-Z]?\s[0-9][A-Z]{2})$/.test(normalised);
}

function compactPostcodeKey(value?: string | null) {
  return normaliseUkPostcode(value).replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

function ebayDispatchPostcodeFromEnv() {
  return normaliseUkPostcode(process.env.COMBAY_EBAY_DISPATCH_POSTCODE || process.env.EBAY_DISPATCH_POSTCODE || "");
}

function locationNeedsFullUkPostcodeMessage(key: string, postcode?: string | null) {
  const current = String(postcode || "").trim() || "blank";
  return `eBay inventory location ${key} has postcode '${current}'. eBay UK requires a full UK postcode, not just an outward code such as CM17. Go to Admin → eBay Publish → Default inventory location details, enter the full dispatch postcode, save settings, then publish again.`;
}

function sanitiseLocalInventoryLocation(location: any, key: string) {
  const country = String(location?.countryCode || "GB").trim().toUpperCase() || "GB";
  const postcode = country === "GB"
    ? normaliseUkPostcode(location?.postcode || ebayDispatchPostcodeFromEnv())
    : String(location?.postcode || "").trim();
  return {
    key,
    name: cleanEbayLocationName(location?.name),
    countryCode: country,
    postcode,
    city: String(location?.city || "Chelmsford").trim() || "Chelmsford",
    addressLine1: String(location?.addressLine1 || "").trim(),
    stateOrProvince: String(location?.stateOrProvince || (country === "GB" ? "Essex" : "")).trim(),
    isDefault: Boolean(location?.isDefault),
  };
}

function validateLocalInventoryLocationForEbay(location: any, key: string) {
  const prepared = sanitiseLocalInventoryLocation(location, key);
  const errors: string[] = [];
  if (prepared.countryCode === "GB" && !isFullUkPostcode(prepared.postcode)) {
    errors.push(locationNeedsFullUkPostcodeMessage(key, prepared.postcode));
  }
  return { valid: errors.length === 0, errors, location: prepared };
}

function defaultEbayWarehouseLocationPayload(location?: any) {
  const key = safeMerchantLocationKey(location?.key || "COMBAY-UK-MAIN");
  const prepared = sanitiseLocalInventoryLocation(location, key);
  if (prepared.countryCode === "GB" && !isFullUkPostcode(prepared.postcode)) {
    throw new Error(locationNeedsFullUkPostcodeMessage(key, prepared.postcode));
  }
  return {
    name: cleanEbayLocationName(prepared.name),
    merchantLocationStatus: "ENABLED",
    locationTypes: ["WAREHOUSE"],
    location: {
      address: {
        ...(prepared.addressLine1 ? { addressLine1: prepared.addressLine1 } : {}),
        city: prepared.city,
        ...(prepared.stateOrProvince ? { stateOrProvince: prepared.stateOrProvince } : {}),
        postalCode: prepared.postcode,
        country: prepared.countryCode,
      },
    },
  };
}

function ebayErrorHasId(error: any, id: number) {
  const payload = error instanceof EbayInventoryApiError ? error.responsePayload : null;
  const errors = Array.isArray(payload?.errors) ? payload.errors : [];
  return errors.some((item: any) => Number(item?.errorId) === id);
}

function ebayErrorMentionsLocation(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return /location information not found|merchantLocationKey|inventory location/i.test(message);
}

async function createOrEnableEbayWarehouseLocation(product: EbayProductRecord, config: any, marketplaceId: string, key: string, location: any, reason: string) {
  const createPayload = defaultEbayWarehouseLocationPayload({ ...location, key });
  try {
    await ebayInventoryApiRequest(`/sell/inventory/v1/location/${encodeURIComponent(key)}`, "POST", createPayload, marketplaceId);
    await logEbayPublishEvent(product, "EBAY_CREATE_INVENTORY_LOCATION", "SUCCESS", `Created eBay warehouse inventory location ${key}.`, { merchantLocationKey: key, reason, locationPayload: createPayload });
  } catch (createError) {
    // If eBay says the location already exists, continue and try to enable/use it. Otherwise surface the real location error.
    if (!(createError instanceof EbayInventoryApiError) || !ebayErrorHasId(createError, 25803)) throw createError;
    await logEbayPublishEvent(product, "EBAY_CREATE_INVENTORY_LOCATION", "RUNNING", `eBay location ${key} already exists; Combay will enable and use it.`, { merchantLocationKey: key, reason, locationPayload: createPayload }, null, null, null);
  }

  await ebayInventoryApiRequest(`/sell/inventory/v1/location/${encodeURIComponent(key)}/enable`, "POST", undefined, marketplaceId).catch(() => null);
  await prisma.ebayInventoryLocation.upsert({
    where: { key },
    create: { key, name: createPayload.name, countryCode: createPayload.location.address.country, postcode: createPayload.location.address.postalCode, city: createPayload.location.address.city, addressLine1: createPayload.location.address.addressLine1 || null, isDefault: Boolean(config?.defaultInventoryLocationKey === key || !config?.defaultInventoryLocationKey), isActive: true },
    update: { name: createPayload.name, countryCode: createPayload.location.address.country, postcode: createPayload.location.address.postalCode, city: createPayload.location.address.city, addressLine1: createPayload.location.address.addressLine1 || null, isActive: true },
  }).catch(() => null);
  if (!product.ebayInventoryLocationKey || product.ebayInventoryLocationKey !== key) {
    await prisma.product.update({ where: { id: product.id }, data: { ebayInventoryLocationKey: key } }).catch(() => null);
  }
  if (config?.id && (!config.defaultInventoryLocationKey || config.defaultInventoryLocationKey !== key)) {
    await prisma.ebaySyncConfig.update({ where: { id: config.id }, data: { defaultInventoryLocationKey: key } }).catch(() => null);
  }
  return key;
}

async function ensureLiveEbayInventoryLocationForOffer(product: EbayProductRecord, config: any, marketplaceId: string) {
  let key = safeMerchantLocationKey(product.ebayInventoryLocationKey || config?.defaultInventoryLocationKey || "COMBAY-UK-MAIN");
  const localLocation = await prisma.ebayInventoryLocation.findFirst({ where: { key } }).catch(() => null);
  const localCheck = validateLocalInventoryLocationForEbay(localLocation || { key, name: "Combay UK dispatch location", countryCode: "GB", city: "Chelmsford", postcode: ebayDispatchPostcodeFromEnv() }, key);
  if (!localCheck.valid) {
    const message = localCheck.errors.join(" ");
    await logEbayPublishEvent(product, "EBAY_VERIFY_INVENTORY_LOCATION", "FAILED", message, { merchantLocationKey: key, localLocation }, message, product.ebayOfferId || null, product.ebayListingId || null);
    throw new Error(message);
  }
  const preparedLocation = localCheck.location;

  // Verify the selected merchantLocationKey exists in the connected eBay seller account.
  // A local Combay dropdown row is not enough: eBay requires an Inventory API location with the
  // same merchantLocationKey before createOffer/publishOffer can succeed.
  try {
    const live = await ebayInventoryApiRequest(`/sell/inventory/v1/location/${encodeURIComponent(key)}`, "GET", undefined, marketplaceId);
    const status = String(live?.merchantLocationStatus || live?.locationStatus || "").toUpperCase();
    const liveAddress = live?.location?.address || {};
    const livePostcode = liveAddress?.postalCode || "";
    const liveCountry = String(liveAddress?.country || preparedLocation.countryCode || "GB").toUpperCase();

    // eBay can return an existing location key that is technically present but unusable for UK publish
    // if it was created with only the outward code (e.g. CM17). In that case create a fresh location key
    // using the full saved postcode, then use that key in the offer payload.
    if (liveCountry === "GB" && !isFullUkPostcode(livePostcode)) {
      const postcodeSuffix = compactPostcodeKey(preparedLocation.postcode);
      const repairedKey = safeMerchantLocationKey(`${key}-${postcodeSuffix}`);
      if (repairedKey && repairedKey !== key) {
        await logEbayPublishEvent(product, "EBAY_REPAIR_INVENTORY_LOCATION", "RUNNING", `Existing eBay inventory location ${key} does not have a full UK postcode. Creating/using repaired location key ${repairedKey}.`, { originalKey: key, repairedKey, liveLocation: live, preparedLocation }, null, product.ebayOfferId || null, product.ebayListingId || null);
        return createOrEnableEbayWarehouseLocation(product, config, marketplaceId, repairedKey, preparedLocation, "existing_location_missing_full_uk_postcode");
      }
    }

    if (status && status !== "ENABLED") {
      await ebayInventoryApiRequest(`/sell/inventory/v1/location/${encodeURIComponent(key)}/enable`, "POST", undefined, marketplaceId).catch(() => null);
    }
    await prisma.ebayInventoryLocation.upsert({
      where: { key },
      create: { key, name: cleanEbayLocationName(live?.name || localLocation?.name), countryCode: liveAddress?.country || preparedLocation.countryCode, postcode: normaliseUkPostcode(liveAddress?.postalCode || preparedLocation.postcode) || preparedLocation.postcode || null, city: liveAddress?.city || preparedLocation.city || null, addressLine1: liveAddress?.addressLine1 || preparedLocation.addressLine1 || null, isDefault: Boolean(localLocation?.isDefault || config?.defaultInventoryLocationKey === key), isActive: true },
      update: { name: cleanEbayLocationName(live?.name || localLocation?.name), countryCode: liveAddress?.country || preparedLocation.countryCode, postcode: normaliseUkPostcode(liveAddress?.postalCode || preparedLocation.postcode) || preparedLocation.postcode || null, city: liveAddress?.city || preparedLocation.city || null, addressLine1: liveAddress?.addressLine1 || preparedLocation.addressLine1 || null, isActive: true },
    }).catch(() => null);
    return key;
  } catch (verifyError) {
    // eBay returned that the selected location is unknown. Create a WAREHOUSE location with the saved full postcode.
    if (!(verifyError instanceof EbayInventoryApiError) && !ebayErrorMentionsLocation(verifyError)) throw verifyError;
  }

  return createOrEnableEbayWarehouseLocation(product, config, marketplaceId, key, preparedLocation, "location_not_found_on_ebay");
}

function inventoryItemPayload(product: EbayProductRecord) {
  const condition = mapConditionToEbay(product);
  const images = publicImageUrls(product);
  const payload: any = {
    availability: {
      shipToLocationAvailability: {
        quantity: Math.max(0, Number(product.stockQty || 0)),
      },
    },
    condition: normaliseEbayConditionEnum(product.ebayConditionEnum || condition.conditionEnum),
    product: {
      title: truncateText(product.title, 80),
      description: truncateText(product.description || product.productOverview || product.title, 4000),
      aspects: ebayAspectsForProduct(product),
      imageUrls: images,
    },
  };
  const conditionDescription = truncateText(condition.note || product.ebayConditionDescription, 1000);
  if (conditionDescription && !["NEW", "LIKE_NEW", "NEW_OTHER", "NEW_WITH_DEFECTS"].includes(String(payload.condition))) payload.conditionDescription = conditionDescription;
  const weight = Number(product.packedWeightKg || product.weight || 0);
  if (weight > 0) {
    payload.packageWeightAndSize = {
      packageType: "PACKAGE_THICK_ENVELOPE",
      weight: { value: Number(weight.toFixed(3)), unit: "KILOGRAM" },
    };
    const length = Number(product.packedLengthCm || 0);
    const width = Number(product.packedWidthCm || 0);
    const height = Number(product.packedHeightCm || 0);
    if (length > 0 && width > 0 && height > 0) {
      payload.packageWeightAndSize.dimensions = { length, width, height, unit: "CENTIMETER" };
    }
  }
  return payload;
}

function offerPayload(product: EbayProductRecord, config: any, sku: string) {
  const marketplaceId = product.ebayMarketplaceId || config?.marketplaceId || MARKETPLACE;
  const fulfillmentPolicyId = product.ebayFulfillmentPolicyId || product.shippingPolicy?.ebayFulfillmentPolicyId;
  return {
    sku,
    marketplaceId,
    format: "FIXED_PRICE",
    availableQuantity: Math.max(1, Number(product.stockQty || 1)),
    categoryId: String(product.ebayCategoryId || ""),
    merchantLocationKey: String(product.ebayInventoryLocationKey || config?.defaultInventoryLocationKey || ""),
    listingDescription: stripUnsafeHtml(String(product.ebayDescriptionHtml || buildCombayEbayDescription(product))),
    listingDuration: String(config?.defaultListingDuration || "GTC"),
    includeCatalogProductDetails: false,
    listingPolicies: {
      fulfillmentPolicyId: String(fulfillmentPolicyId || ""),
      paymentPolicyId: String(product.ebayPaymentPolicyId || ""),
      returnPolicyId: String(product.ebayReturnPolicyId || ""),
    },
    pricingSummary: {
      price: { currency: marketplaceCurrency(marketplaceId), value: moneyValue(product.price) },
    },
  };
}

async function logEbayPublishEvent(product: any, actionType: string, status: string, message: string, rawPayload?: any, errorMessage?: string | null, ebayOfferId?: string | null, ebayListingId?: string | null) {
  return prisma.ebaySyncLog.create({
    data: {
      productId: product?.id,
      sku: product?.sku,
      productTitle: product?.title,
      actionType,
      status,
      message,
      errorMessage: errorMessage || null,
      ebayOfferId: ebayOfferId || product?.ebayOfferId || null,
      ebayListingId: ebayListingId || product?.ebayListingId || null,
      rawPayload: rawPayload || undefined,
      finishedAt: new Date(),
    },
  }).catch(() => null);
}

function ebayListingUrl(listingId: string, marketplaceId?: string | null, environment?: string | null) {
  const id = String(listingId || "").trim();
  if (!id) return "";
  if (String(environment || "").toLowerCase() === "sandbox") {
    // Sandbox listings do not resolve on the live ebay.co.uk domain.
    // eBay's sandbox item view format is sandbox.ebay.com/itm/{listingId}.
    return `https://sandbox.ebay.com/itm/${encodeURIComponent(id)}`;
  }
  const marketplace = String(marketplaceId || MARKETPLACE).toUpperCase();
  if (marketplace === "EBAY_US") return `https://www.ebay.com/itm/${encodeURIComponent(id)}`;
  if (marketplace === "EBAY_DE") return `https://www.ebay.de/itm/${encodeURIComponent(id)}`;
  if (marketplace === "EBAY_FR") return `https://www.ebay.fr/itm/${encodeURIComponent(id)}`;
  if (marketplace === "EBAY_IT") return `https://www.ebay.it/itm/${encodeURIComponent(id)}`;
  if (marketplace === "EBAY_ES") return `https://www.ebay.es/itm/${encodeURIComponent(id)}`;
  if (marketplace === "EBAY_AU") return `https://www.ebay.com.au/itm/${encodeURIComponent(id)}`;
  if (marketplace === "EBAY_CA") return `https://www.ebay.ca/itm/${encodeURIComponent(id)}`;
  return `https://www.ebay.co.uk/itm/${encodeURIComponent(id)}`;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function offerPublicationSummary(offerDetails: any) {
  const listing = offerDetails?.listing || {};
  return {
    offerStatus: String(offerDetails?.status || "").toUpperCase(),
    listingId: String(listing?.listingId || "").trim(),
    listingStatus: String(listing?.listingStatus || "").toUpperCase(),
    listingOnHold: Boolean(listing?.listingOnHold),
    soldQuantity: listing?.soldQuantity,
    rawOffer: offerDetails,
  };
}

async function verifyPublishedEbayOffer(product: EbayProductRecord, offerId: string, marketplaceId: string, environment?: string | null) {
  let lastSummary: any = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const offerDetails = await ebayInventoryApiRequest(`/sell/inventory/v1/offer/${encodeURIComponent(offerId)}`, "GET", undefined, marketplaceId);
    const summary = offerPublicationSummary(offerDetails);
    lastSummary = summary;
    await logEbayPublishEvent(product, "EBAY_VERIFY_PUBLISHED_OFFER", summary.offerStatus === "PUBLISHED" && summary.listingId ? "SUCCESS" : "RUNNING", `Verified eBay offer publication state. Offer: ${summary.offerStatus || "UNKNOWN"}; listing: ${summary.listingStatus || "NO_LISTING"}.`, { attempt, offerId, marketplaceId, listingUrl: summary.listingId ? ebayListingUrl(summary.listingId, marketplaceId, environment) : "", ...summary }, null, offerId, summary.listingId || null);

    if (summary.offerStatus === "PUBLISHED" && summary.listingId && summary.listingStatus === "ACTIVE" && !summary.listingOnHold) {
      return { ...summary, listingUrl: ebayListingUrl(summary.listingId, marketplaceId, environment) };
    }
    if (attempt < 3) await delay(1500);
  }

  if (!lastSummary?.listingId) {
    throw new Error("eBay publish did not produce a verified listing container on the offer. The offer may still be unpublished or eBay has not created the public listing yet.");
  }
  if (lastSummary?.listingOnHold) {
    throw new Error(`eBay created listing ${lastSummary.listingId}, but the listing is on hold and will not be visible publicly until the eBay issue is resolved.`);
  }
  if (lastSummary?.offerStatus !== "PUBLISHED") {
    throw new Error(`eBay offer ${offerId} is ${lastSummary?.offerStatus || "UNKNOWN"}, not PUBLISHED. It will not show as a live eBay listing yet.`);
  }
  if (lastSummary?.listingStatus !== "ACTIVE") {
    throw new Error(`eBay listing ${lastSummary?.listingId} is ${lastSummary?.listingStatus || "UNKNOWN"}, not ACTIVE. It may not be visible on the public item page yet.`);
  }
  return { ...lastSummary, listingUrl: ebayListingUrl(lastSummary.listingId, marketplaceId, environment) };
}

export async function publishProductToEbay(productId: string, input: { confirmLivePublish?: boolean; triggeredBy?: string } = {}) {
  return withDatabase(async () => {
    await ensureEbayPublishingDefaults();
    if (!input.confirmLivePublish) throw new Error("Live eBay publish requires explicit confirmation.");
    const product = await getProductForEbay(productId);
    if (!product) throw new Error("Product not found.");
    const config = await prisma.ebaySyncConfig.findFirst({ orderBy: { updatedAt: "desc" } });
    const validation = livePublishValidation(product);
    if (!validation.valid) {
      await prisma.product.update({ where: { id: product.id }, data: { ebayPublishStatus: "VALIDATION_FAILED", ebayValidationErrorsJson: validation } }).catch(() => null);
      await logEbayPublishEvent(product, "LIVE_EBAY_PUBLISH_VALIDATION", "FAILED", "Live eBay publish blocked by validation.", validation, validation.errors.join(" "));
      throw new Error(`Live eBay publish blocked: ${validation.errors.join(" ")}`);
    }

    const sku = String(product.ebayInventoryItemSku || product.sku).trim();
    const existingDuplicate = await prisma.product.findFirst({
      where: { id: { not: product.id }, OR: [{ sku }, { ebayInventoryItemSku: sku }, { ebayListingId: { not: null }, ebayInventoryItemSku: sku }] },
      select: { id: true, sku: true, title: true, ebayListingId: true },
    }).catch(() => null);
    if (existingDuplicate) throw new Error(`Duplicate eBay SKU guard blocked publish. SKU ${sku} is already used by ${existingDuplicate.sku} / ${existingDuplicate.title}.`);

    let job: any = null;
    let offerId = product.ebayOfferId || "";
    let listingId = product.ebayListingId || "";
    const hadOfferIdAtStart = Boolean(String(offerId || "").trim());
    const hadListingIdAtStart = Boolean(String(listingId || "").trim());
    let offerCreatedThisRun = false;
    let verifiedPublication: any = null;
    const marketplaceId = product.ebayMarketplaceId || config?.marketplaceId || MARKETPLACE;
    const inventoryPayload = inventoryItemPayload(product);
    let offerRequestPayload = offerPayload(product, config, sku);

    try {
      job = await prisma.ebayPublishJob.create({
        data: {
          productId: product.id,
          sku,
          action: listingId ? "UPDATE_EXISTING_EBAY_LISTING" : "PUBLISH_NEW_EBAY_LISTING",
          status: "RUNNING",
          marketplaceId,
          attempts: 1,
          startedAt: new Date(),
          payload: { inventoryPayload, offerPayload: offerRequestPayload },
          queuedBy: input.triggeredBy || "admin",
        },
      });
      await prisma.product.update({ where: { id: product.id }, data: { ebayPublishStatus: listingId ? "UPDATE_PENDING" : "PUBLISHING", ebayLastError: null, ebayValidationErrorsJson: validation } });
      await logEbayPublishEvent(product, "LIVE_EBAY_PUBLISH_STARTED", "RUNNING", "Started controlled live eBay publish/update job.", { jobId: job.id, sku, marketplaceId });

      await ebayInventoryApiRequest(`/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, "PUT", inventoryPayload, marketplaceId);
      await logEbayPublishEvent(product, "EBAY_CREATE_OR_REPLACE_INVENTORY_ITEM", "SUCCESS", "eBay inventory item created/updated.", { sku, inventoryPayload });

      const liveLocationKey = await ensureLiveEbayInventoryLocationForOffer(product, config, marketplaceId);
      offerRequestPayload = { ...offerRequestPayload, merchantLocationKey: liveLocationKey };
      await logEbayPublishEvent(product, "EBAY_VERIFY_INVENTORY_LOCATION", "SUCCESS", `eBay inventory location verified for offer: ${liveLocationKey}.`, { merchantLocationKey: liveLocationKey, offerPayload: offerRequestPayload });

      let offerResponse: any = {};
      if (offerId) {
        offerResponse = await ebayInventoryApiRequest(`/sell/inventory/v1/offer/${encodeURIComponent(offerId)}`, "PUT", offerRequestPayload, marketplaceId);
        await logEbayPublishEvent(product, "EBAY_UPDATE_OFFER", "SUCCESS", "eBay offer updated.", { offerId, offerPayload: offerRequestPayload });
      } else {
        offerResponse = await ebayInventoryApiRequest("/sell/inventory/v1/offer", "POST", offerRequestPayload, marketplaceId);
        offerCreatedThisRun = true;
        offerId = String(offerResponse.offerId || offerResponse.id || "");
        if (!offerId) throw new Error("eBay created the inventory item but did not return an offer ID.");
        await logEbayPublishEvent(product, "EBAY_CREATE_OFFER", "SUCCESS", "eBay offer created. It still needs to be published before it appears as a live eBay listing.", { offerResponse, offerPayload: offerRequestPayload, hadListingIdAtStart }, null, offerId, listingId || null);
      }

      // Important: a stored listing ID is not proof that the offer is live.
      // Imported/legacy products can have an old listingId and a saved offerId while the
      // Inventory API offer itself is still UNPUBLISHED. In that case eBay will update
      // the offer successfully, but there will be no public listing until publishOffer
      // is called. Always inspect the offer state after create/update before deciding
      // whether to publish.
      let prePublishSummary: any = null;
      try {
        const prePublishOfferDetails = await ebayInventoryApiRequest(`/sell/inventory/v1/offer/${encodeURIComponent(offerId)}`, "GET", undefined, marketplaceId);
        prePublishSummary = offerPublicationSummary(prePublishOfferDetails);
        await logEbayPublishEvent(
          product,
          "EBAY_CHECK_OFFER_PUBLICATION_STATE",
          prePublishSummary.offerStatus === "PUBLISHED" && prePublishSummary.listingId && prePublishSummary.listingStatus === "ACTIVE" && !prePublishSummary.listingOnHold ? "SUCCESS" : "RUNNING",
          `Checked eBay offer before publish decision. Offer: ${prePublishSummary.offerStatus || "UNKNOWN"}; listing: ${prePublishSummary.listingStatus || "NO_LISTING"}.`,
          { offerId, marketplaceId, hadOfferIdAtStart, hadListingIdAtStart, offerCreatedThisRun, ...prePublishSummary },
          null,
          offerId,
          prePublishSummary.listingId || listingId || null,
        );
      } catch (stateError) {
        await logEbayPublishEvent(product, "EBAY_CHECK_OFFER_PUBLICATION_STATE", "RUNNING", "Could not read eBay offer state before publish decision, so Combay will attempt publishOffer safely.", { offerId, marketplaceId, error: stateError instanceof Error ? stateError.message : stateError }, null, offerId, listingId || null);
      }

      const offerAlreadyActive = Boolean(prePublishSummary?.offerStatus === "PUBLISHED" && prePublishSummary?.listingId && prePublishSummary?.listingStatus === "ACTIVE" && !prePublishSummary?.listingOnHold);
      const mustPublishOffer = !offerAlreadyActive;
      if (mustPublishOffer) {
        const publishResponse = await ebayInventoryApiRequest(`/sell/inventory/v1/offer/${encodeURIComponent(offerId)}/publish`, "POST", undefined, marketplaceId);
        const returnedListingId = String(publishResponse.listingId || publishResponse.listing?.listingId || "");
        if (returnedListingId) listingId = returnedListingId;
        await logEbayPublishEvent(
          product,
          "EBAY_PUBLISH_OFFER",
          "SUCCESS",
          "eBay accepted publishOffer. Combay will now verify the offer is PUBLISHED and the listing is ACTIVE before marking it live.",
          { publishResponse, prePublishSummary, hadOfferIdAtStart, hadListingIdAtStart, offerCreatedThisRun },
          null,
          offerId,
          listingId || null,
        );
      } else {
        listingId = prePublishSummary.listingId || listingId;
        await logEbayPublishEvent(product, "EBAY_UPDATE_LIVE_LISTING", "SUCCESS", "Existing eBay offer/listing is already published and was updated through Inventory API. Combay will now verify it is still ACTIVE before marking it live.", { offerId, listingId, prePublishSummary, hadOfferIdAtStart, hadListingIdAtStart }, null, offerId, listingId);
      }

      // Do not mark Combay as PUBLISHED merely because publishOffer returned an ID.
      // eBay's getOffer response is the safer source of truth: for published offers it
      // returns status=PUBLISHED and a listing container with listingStatus, listingId,
      // and listingOnHold. This prevents Combay from showing a public URL that 404s.
      verifiedPublication = await verifyPublishedEbayOffer(product, offerId, marketplaceId, config?.environment);
      listingId = verifiedPublication.listingId;

      const previousJson = {
        ebayListingId: product.ebayListingId,
        ebayOfferId: product.ebayOfferId,
        ebayPublishStatus: product.ebayPublishStatus,
        stockQty: product.stockQty,
        price: product.price,
      };
      const updated = await prisma.product.update({
        where: { id: product.id },
        data: {
          ebayInventoryItemSku: sku,
          ebayOfferId: offerId,
          ebayListingId: listingId,
          ebayMarketplaceId: marketplaceId,
          ebayPublishStatus: "PUBLISHED",
          ebaySkuLocked: true,
          ebayLastPushedAt: new Date(),
          ebayLastError: null,
          ebayValidationErrorsJson: validation,
        },
      });
      await prisma.ebayListingRevision.create({
        data: {
          productId: product.id,
          sku,
          action: listingId === product.ebayListingId ? "UPDATE_EXISTING_EBAY_LISTING" : "PUBLISH_NEW_EBAY_LISTING",
          previousJson,
          nextJson: { ebayListingId: listingId, ebayOfferId: offerId, marketplaceId, inventoryPayload, offerPayload: offerRequestPayload, verifiedPublication },
          reason: "Controlled live eBay publish/update from Combay admin.",
          createdBy: input.triggeredBy || "admin",
        },
      }).catch(() => null);
      await prisma.ebayPublishJob.update({ where: { id: job.id }, data: { status: "SUCCESS", finishedAt: new Date(), payload: { inventoryPayload, offerPayload: offerRequestPayload, offerId, listingId, verifiedPublication } } }).catch(() => null);
      await logEbayPublishEvent(updated, "LIVE_EBAY_PUBLISH_COMPLETE", "SUCCESS", mustPublishOffer ? "eBay offer published and verified as an ACTIVE listing." : "eBay listing updated and verified as ACTIVE.", { offerId, listingId, listingUrl: ebayListingUrl(listingId, marketplaceId, config?.environment), verifiedPublication, hadOfferIdAtStart, hadListingIdAtStart, offerCreatedThisRun }, null, offerId, listingId);
      return { product: updated, offerId, listingId, listingUrl: ebayListingUrl(listingId, marketplaceId, config?.environment), verifiedPublication, validation, jobId: job.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Live eBay publish failed.";
      const apiError = error instanceof EbayInventoryApiError ? error : null;
      const diagnosticPayload = apiError
        ? {
            endpoint: `${apiError.method} ${apiError.path}`,
            marketplaceId: apiError.marketplaceId,
            httpStatus: apiError.status,
            eBayResponse: apiError.responsePayload,
            requestHeaders: apiError.requestHeaders,
            requestPayload: apiError.requestPayload,
            offerId,
            listingId,
            note: "This raw diagnostic payload is stored for admin/debugging so the exact eBay rejection field can be identified.",
          }
        : { offerId, listingId };
      if (job?.id) await prisma.ebayPublishJob.update({ where: { id: job.id }, data: { status: "FAILED", errorMessage, finishedAt: new Date(), payload: diagnosticPayload } }).catch(() => null);
      await prisma.product.update({ where: { id: product.id }, data: { ebayPublishStatus: "SYNC_FAILED", ebayLastError: errorMessage } }).catch(() => null);
      await logEbayPublishEvent(product, "LIVE_EBAY_PUBLISH_FAILED", "FAILED", apiError ? `Live eBay publish/update failed at ${apiError.method} ${apiError.path}.` : "Live eBay publish/update failed.", diagnosticPayload, errorMessage, offerId || null, listingId || null);
      throw error;
    }
  });
}


export async function endEbayListingForProduct(productId: string, input: { confirmEndListing?: boolean; triggeredBy?: string } = {}) {
  return withDatabase(async () => {
    await ensureEbayPublishingDefaults();
    if (!input.confirmEndListing) throw new Error("Ending an eBay listing requires explicit confirmation.");
    const product = await getProductForEbay(productId);
    if (!product) throw new Error("Product not found.");
    const offerId = String(product.ebayOfferId || "").trim();
    const listingId = String(product.ebayListingId || "").trim();
    const marketplaceId = product.ebayMarketplaceId || MARKETPLACE;
    if (!offerId) throw new Error("This product does not have an eBay offer ID. End-listing cannot be safely called from Combay.");

    await logEbayPublishEvent(product, "LIVE_EBAY_END_STARTED", "RUNNING", "Started controlled eBay listing end/withdraw action.", { offerId, listingId, marketplaceId, triggeredBy: input.triggeredBy || "admin" }, null, offerId, listingId || null);
    try {
      const response = await ebayInventoryApiRequest(`/sell/inventory/v1/offer/${encodeURIComponent(offerId)}/withdraw`, "POST", undefined, marketplaceId);
      const previousJson = { ebayListingId: product.ebayListingId, ebayOfferId: product.ebayOfferId, ebayPublishStatus: product.ebayPublishStatus };
      const updated = await prisma.product.update({
        where: { id: product.id },
        data: {
          ebayPublishStatus: "ENDED",
          ebayLastPushedAt: new Date(),
          ebayLastError: null,
        },
      });
      await prisma.ebayListingRevision.create({
        data: {
          productId: product.id,
          sku: product.sku,
          action: "END_EBAY_LISTING",
          previousJson,
          nextJson: { ebayListingId: listingId, ebayOfferId: offerId, marketplaceId, withdrawResponse: response },
          reason: "Admin ended/withdrew the eBay listing from Combay. Product remains in Combay catalogue.",
          createdBy: input.triggeredBy || "admin",
        },
      }).catch(() => null);
      await logEbayPublishEvent(updated, "LIVE_EBAY_END_COMPLETE", "SUCCESS", "eBay listing ended/withdrawn successfully. The Combay product remains available for audit and possible relisting.", { offerId, listingId, withdrawResponse: response }, null, offerId, listingId || null);
      return { product: updated, offerId, listingId, response };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "eBay listing end failed.";
      await prisma.product.update({ where: { id: product.id }, data: { ebayPublishStatus: "SYNC_FAILED", ebayLastError: errorMessage } }).catch(() => null);
      await logEbayPublishEvent(product, "LIVE_EBAY_END_FAILED", "FAILED", "eBay listing end/withdraw action failed.", { offerId, listingId, error: errorMessage }, errorMessage, offerId, listingId || null);
      throw error;
    }
  });
}

export async function processNextApprovedEbayPublishJob() {
  return withDatabase(async () => {
    await ensureEbayPublishingDefaults();
    const job = await prisma.ebayPublishJob.findFirst({
      where: { status: { in: ["AWAITING_MANUAL_APPROVAL", "QUEUED"] }, action: { in: ["PUBLISH_NEW_EBAY_LISTING", "UPDATE_EXISTING_EBAY_LISTING"] } },
      orderBy: { queuedAt: "asc" },
    });
    if (!job) return { processed: false, message: "No approved eBay publish jobs are waiting." };
    const result = await publishProductToEbay(job.productId, { confirmLivePublish: true, triggeredBy: job.queuedBy || "admin" });
    await prisma.ebayPublishJob.update({ where: { id: job.id }, data: { status: "SUCCESS", finishedAt: new Date(), errorMessage: null } }).catch(() => null);
    return { processed: true, sourceJobId: job.id, result };
  });
}

export async function repairImportedEbayListings(limit = 100) {
  return withDatabase(async () => {
    await ensureEbayPublishingDefaults();
    const products = await prisma.product.findMany({
      where: { OR: [{ source: "ebay" }, { ebayItemId: { not: null } }, { rawEbayDescription: { contains: "Imported from active eBay listing", mode: "insensitive" } }] },
      include: { images: true, specs: true, variants: true, category: true },
      orderBy: { updatedAt: "asc" },
      take: Math.max(1, Math.min(500, Number(limit) || 100)),
    });
    let repaired = 0;
    let flagged = 0;
    const details: any[] = [];
    for (const product of products) {
      const data: any = {};
      const notes: string[] = [];
      if (!/^CBUK\d{5}$/i.test(product.sku)) {
        const newSku = await nextCombaySku();
        data.sku = newSku;
        data.ebayInventoryItemSku = product.sku;
        data.ebayPublishStatus = "MANUAL_REVIEW_REQUIRED";
        notes.push(`Generated Combay SKU ${newSku}; original eBay SKU preserved in ebayInventoryItemSku.`);
      } else if (!product.ebayInventoryItemSku) {
        data.ebayInventoryItemSku = product.sku;
        notes.push("Mapped eBay inventory SKU to existing Combay SKU.");
      }
      if (!product.ebayMarketplaceId) data.ebayMarketplaceId = MARKETPLACE;
      if (!product.ebayListingId && product.ebayItemId) data.ebayListingId = product.ebayItemId;
      if (!product.ebayDescriptionHtml || product.ebayDescriptionHtml.includes("Imported from active eBay listing")) {
        data.ebayDescriptionHtml = buildCombayEbayDescription(product);
        notes.push("Generated branded eBay description for placeholder/missing description.");
      }
      const condition = mapConditionToEbay(product);
      const repairedConditionEnum = normaliseEbayConditionEnum(product.ebayConditionEnum || condition.conditionEnum);
      if (!product.ebayConditionId || product.ebayConditionId === "3000") data.ebayConditionId = conditionIdForEnum(repairedConditionEnum);
      if (!product.ebayConditionEnum || product.ebayConditionEnum === "USED") data.ebayConditionEnum = repairedConditionEnum;
      if (Object.keys(data).length) {
        const updated = await prisma.product.update({ where: { id: product.id }, data });
        const validation = validateEbayProductRecord(updated);
        await prisma.product.update({ where: { id: product.id }, data: { ebayValidationErrorsJson: validation } });
        await prisma.ebaySyncLog.create({ data: { productId: product.id, sku: updated.sku, productTitle: updated.title, actionType: "REPAIR_IMPORTED_EBAY_LISTING", status: validation.valid ? "SUCCESS" : "MANUAL_REVIEW", message: notes.join(" "), rawPayload: { validation }, finishedAt: new Date() } });
        repaired += 1;
        if (!validation.valid) flagged += 1;
        details.push({ id: product.id, sku: updated.sku, title: updated.title, notes, validation });
      }
    }
    return { scanned: products.length, repaired, flagged, details };
  });
}

export async function createOrUpdateEbayTemplate(input: any) {
  return withDatabase(async () => {
    try {
      await ensureEbayPublishingDatabaseSchema();
      const html = stripUnsafeHtml(String(input.html || DEFAULT_EBAY_TEMPLATE));
      const unsafeErrors = validateEbaySafeHtml(html);
      if (unsafeErrors.length) throw new Error(unsafeErrors.join(" "));
      const isDefault = Boolean(input.isDefault);
      if (isDefault) await prisma.ebayDescriptionTemplate.updateMany({ data: { isDefault: false } });
      if (input.id) {
        return prisma.ebayDescriptionTemplate.update({ where: { id: input.id }, data: { name: input.name || "Combay eBay template", description: input.description || null, html, isDefault } });
      }
      return prisma.ebayDescriptionTemplate.create({ data: { name: input.name || "Combay eBay template", description: input.description || null, html, isDefault, isSystem: false } });
    } catch (error) {
      const schemaMessage = missingSchemaMessage(error);
      if (schemaMessage) throw new Error(schemaMessage);
      throw error;
    }
  });
}
