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
    ...(options.inventoryLocations || []).map((location) => prisma.ebayInventoryLocation.upsert({ where: { key: location.id }, create: { key: location.id, name: location.name || location.id, countryCode: location.raw?.location?.address?.country || location.raw?.countryCode || "GB", isDefault: Boolean(location.isDefault), isActive: true }, update: { name: location.name || location.id, isDefault: Boolean(location.isDefault), isActive: true } }).catch(() => null)),
  ]);
}

function pickDefault(options: EbayOption[], current?: string | null) {
  if (current && options.some((item) => item.id === current)) return current;
  return options.find((item) => item.isDefault)?.id || options[0]?.id || current || "";
}

const DEFAULT_EBAY_TEMPLATE = `<div style="font-family: Arial, sans-serif; font-size: 14px; color: #222; line-height: 1.5; max-width: 900px; margin: 0 auto; border: 1px solid #e5e7eb; background: #ffffff;">
  <div style="background: #2D4F7A; padding: 18px 22px; color: #ffffff;">
    <h1 style="margin: 0; font-size: 22px; line-height: 1.3;">{{productTitle}}</h1>
    <p style="margin: 6px 0 0; color: #f4f4f4;">Industrial equipment supplied by Combay Limited</p>
  </div>
  <div style="height: 4px; background: #E8A44A;"></div>
  <div style="padding: 22px;">
    <h2 style="color: #2D4F7A; font-size: 18px; margin-top: 0;">Product Overview</h2>
    <p>{{overview}}</p>
    <h2 style="color: #2D4F7A; font-size: 18px;">Key Details</h2>
    {{keyDetailsTable}}
    <h2 style="color: #2D4F7A; font-size: 18px;">Description</h2>
    <p>{{description}}</p>
    <h2 style="color: #2D4F7A; font-size: 18px;">Technical Specifications</h2>
    {{specificationsTable}}
    <h2 style="color: #2D4F7A; font-size: 18px;">Condition & Testing</h2>
    <p>{{conditionDescription}}</p>
    <h2 style="color: #2D4F7A; font-size: 18px;">What Is Included</h2>
    <p>{{includedItems}}</p>
    <h2 style="color: #2D4F7A; font-size: 18px;">Shipping & Returns</h2>
    <p>{{shippingSummary}}</p>
    <div style="margin-top: 24px; padding: 14px; background: #f8fafc; border-left: 4px solid #E8A44A;">
      <strong>About Combay Limited</strong>
      <p style="margin-bottom: 0;">Combay Limited supplies industrial automation, electrical, laboratory, and technical equipment to businesses, engineers, resellers, and procurement teams.</p>
    </div>
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
  const template = await prisma.ebayDescriptionTemplate.findFirst({ where: { isDefault: true } });
  const defaultTemplate = template || await prisma.ebayDescriptionTemplate.create({
    data: {
      name: "Combay default eBay template",
      description: "Professional eBay-safe Combay branded listing template.",
      html: DEFAULT_EBAY_TEMPLATE,
      isDefault: true,
      isSystem: true,
    },
  });

  const location = await prisma.ebayInventoryLocation.findFirst({ where: { isDefault: true } });
  const defaultLocation = location || await prisma.ebayInventoryLocation.create({
    data: {
      key: "COMBAY-UK-MAIN",
      name: "Combay UK dispatch location",
      countryCode: "GB",
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
        prisma.ebaySyncLog.findMany({ orderBy: { startedAt: "desc" }, take: 25 }),
        prisma.ebayPublishJob.findMany({ orderBy: { queuedAt: "desc" }, take: 25 }),
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
      const payload = {
        marketplaceId,
        defaultInventoryLocationKey: input.defaultInventoryLocationKey || null,
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

export function mapConditionToEbay(product: EbayProductRecord) {
  const condition = String(product.condition || "USED").toUpperCase();
  if (condition === "NEW") return { conditionEnum: "NEW", conditionId: "1000", note: defaultConditionNote(product) };
  if (condition === "NEW_OPEN_BOX") return { conditionEnum: "NEW_OTHER", conditionId: "1500", note: defaultConditionNote(product) };
  if (condition === "FOR_PARTS") return { conditionEnum: "FOR_PARTS_OR_NOT_WORKING", conditionId: "7000", note: defaultConditionNote(product) };
  return { conditionEnum: "USED", conditionId: "3000", note: defaultConditionNote(product) };
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
  if (!product.ebayCategoryId) errors.push("eBay category ID is required.");
  if (!product.ebayFulfillmentPolicyId && !product.shippingPolicy?.ebayFulfillmentPolicyId) warnings.push("No eBay fulfilment policy is mapped yet. Select one before live publish.");
  if (!product.ebayPaymentPolicyId) warnings.push("No eBay payment policy is selected yet.");
  if (!product.ebayReturnPolicyId) warnings.push("No eBay return policy is selected yet.");
  if (!product.ebayInventoryLocationKey) warnings.push("No eBay inventory location is selected yet.");
  if (product.shippingManualQuoteRequired || product.shippingCollectionOnly || product.shippingPolicy?.manualQuoteRequired) warnings.push("Product uses manual quote/collection-only shipping. Use freight/collection policy mapping before live eBay publish.");
  errors.push(...imageValidation(product.images || []));

  const html = String(product.ebayDescriptionHtml || "");
  if (!html.trim()) warnings.push("Branded eBay HTML description has not been generated yet.");
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
    const logs = await prisma.ebaySyncLog.findMany({ where: { productId: product.id }, orderBy: { startedAt: "desc" }, take: 20 });
    const jobs = await prisma.ebayPublishJob.findMany({ where: { productId: product.id }, orderBy: { queuedAt: "desc" }, take: 10 });
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
      ebayConditionId: input.ebayConditionId || condition.conditionId,
      ebayConditionEnum: input.ebayConditionEnum || condition.conditionEnum,
      ebayFulfillmentPolicyId: input.ebayFulfillmentPolicyId || null,
      ebayPaymentPolicyId: input.ebayPaymentPolicyId || null,
      ebayReturnPolicyId: input.ebayReturnPolicyId || null,
      ebayInventoryLocationKey: input.ebayInventoryLocationKey || null,
      ebayDescriptionTemplateId: input.ebayDescriptionTemplateId || null,
      ebayDescriptionHtml: stripUnsafeHtml(input.ebayDescriptionHtml || product.ebayDescriptionHtml || ""),
      ebaySpecificsJson: input.ebaySpecificsJson || product.ebaySpecificsJson || null,
      ebaySourceOfTruth: input.ebaySourceOfTruth || "COMBAY",
      ebayExcludedFromSync: Boolean(input.ebayExcludedFromSync),
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
        ebayConditionId: product.ebayConditionId || mapConditionToEbay(product).conditionId,
        ebayConditionEnum: product.ebayConditionEnum || mapConditionToEbay(product).conditionEnum,
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
      if (!product.ebayConditionId) data.ebayConditionId = condition.conditionId;
      if (!product.ebayConditionEnum) data.ebayConditionEnum = condition.conditionEnum;
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
