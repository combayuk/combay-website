import { prisma, withDatabase } from "@/lib/db";
import { shippingZoneForCountryCode, normaliseCountryCode } from "@/lib/countries";

export type ShippingZoneSeed = {
  name: string;
  sortOrder: number;
  countries: string[];
};

export type ShippingRateSeed = {
  zone: string;
  cost: number | null;
  deliveryMinDays: number | null;
  deliveryMaxDays: number | null;
  manualQuoteRequired?: boolean;
};

export type ShippingPolicySeed = {
  name: string;
  description: string;
  maxWeightKg: number | null;
  packagingType: string;
  manualQuoteRequired?: boolean;
  collectionOnly?: boolean;
  isDefault?: boolean;
  rates: ShippingRateSeed[];
};

export type ProductShippingSummary = {
  policyId?: string | null;
  policyName: string;
  zoneName: string;
  cost: number | null;
  currency: string;
  dispatchMinDays: number | null;
  dispatchMaxDays: number | null;
  deliveryMinDays: number | null;
  deliveryMaxDays: number | null;
  manualQuoteRequired: boolean;
  collectionOnly: boolean;
  inheritedFromPolicy: boolean;
  overrideUsed: boolean;
  calculationMethod: string;
  publicLabel: string;
};

export type CartShippingResult = ProductShippingSummary & {
  lineSummaries: Array<ProductShippingSummary & { sku: string; quantity: number }>;
};

export const DEFAULT_DISPATCH_MIN_DAYS = 2;
export const DEFAULT_DISPATCH_MAX_DAYS = 2;

export const DEFAULT_SHIPPING_ZONES: ShippingZoneSeed[] = [
  { name: "UK", sortOrder: 10, countries: ["United Kingdom", "UK", "GB", "Great Britain", "England", "Scotland", "Wales", "Northern Ireland"] },
  { name: "Europe", sortOrder: 20, countries: ["Ireland", "France", "Germany", "Spain", "Italy", "Netherlands", "Belgium", "Poland", "Portugal", "Sweden", "Norway", "Denmark", "Finland", "Switzerland", "Austria"] },
  { name: "Worldwide", sortOrder: 30, countries: ["United States", "USA", "Canada", "Australia", "New Zealand", "UAE", "Saudi Arabia", "Qatar", "India", "Pakistan", "Singapore", "Japan"] },
];

export const DEFAULT_SHIPPING_POLICIES: ShippingPolicySeed[] = [
  {
    name: "Letter / Large Packing Bag",
    description: "Small components and light industrial spares packed in a reinforced letter, padded mailer or large packing bag.",
    maxWeightKg: 2,
    packagingType: "Letter / large packing bag",
    isDefault: true,
    rates: [
      { zone: "UK", cost: 2.99, deliveryMinDays: 2, deliveryMaxDays: 3 },
      { zone: "Europe", cost: 11.99, deliveryMinDays: 3, deliveryMaxDays: 5 },
      { zone: "Worldwide", cost: 19.99, deliveryMinDays: 6, deliveryMaxDays: 8 },
    ],
  },
  {
    name: "Shoebox",
    description: "Small boxed automation, electrical and test accessories up to 5kg.",
    maxWeightKg: 5,
    packagingType: "Shoebox",
    rates: [
      { zone: "UK", cost: 7.99, deliveryMinDays: 2, deliveryMaxDays: 3 },
      { zone: "Europe", cost: 22.99, deliveryMinDays: 3, deliveryMaxDays: 5 },
      { zone: "Worldwide", cost: 49.99, deliveryMinDays: 6, deliveryMaxDays: 8 },
    ],
  },
  {
    name: "Medium Sized Box",
    description: "Medium parcel tier for industrial parts, modules and boxed units up to 15kg.",
    maxWeightKg: 15,
    packagingType: "Medium sized box",
    rates: [
      { zone: "UK", cost: 19.99, deliveryMinDays: 2, deliveryMaxDays: 3 },
      { zone: "Europe", cost: 49.99, deliveryMinDays: 3, deliveryMaxDays: 5 },
      { zone: "Worldwide", cost: 89.99, deliveryMinDays: 6, deliveryMaxDays: 8 },
    ],
  },
  {
    name: "Medium-Large Box",
    description: "Larger boxed equipment up to 25kg where reinforced packaging is normally required.",
    maxWeightKg: 25,
    packagingType: "Medium-large box",
    rates: [
      { zone: "UK", cost: 25.99, deliveryMinDays: 2, deliveryMaxDays: 3 },
      { zone: "Europe", cost: 67.99, deliveryMinDays: 3, deliveryMaxDays: 5 },
      { zone: "Worldwide", cost: 119.99, deliveryMinDays: 6, deliveryMaxDays: 8 },
    ],
  },
  {
    name: "Large Heavy Box",
    description: "Heavy boxed industrial stock up to 50kg. Use manual quote if packaging, export or tail-lift delivery is uncertain.",
    maxWeightKg: 50,
    packagingType: "Large heavy box",
    rates: [
      { zone: "UK", cost: 49.99, deliveryMinDays: 2, deliveryMaxDays: 3 },
      { zone: "Europe", cost: 139.99, deliveryMinDays: 3, deliveryMaxDays: 5 },
      { zone: "Worldwide", cost: 279.99, deliveryMinDays: 6, deliveryMaxDays: 8 },
    ],
  },
  {
    name: "Pallet",
    description: "Palletised freight for larger industrial equipment. Confirm access requirements before dispatch.",
    maxWeightKg: null,
    packagingType: "Pallet",
    rates: [
      { zone: "UK", cost: 129.99, deliveryMinDays: 2, deliveryMaxDays: 3 },
      { zone: "Europe", cost: 279.99, deliveryMinDays: 3, deliveryMaxDays: 5 },
      { zone: "Worldwide", cost: 749.99, deliveryMinDays: 6, deliveryMaxDays: 8 },
    ],
  },
  {
    name: "Heavy / Specialist Order",
    description: "Oversized, irregular, crated, freight, specialist handling or export-sensitive equipment. Manual shipping quote required.",
    maxWeightKg: null,
    packagingType: "Specialist / freight",
    manualQuoteRequired: true,
    rates: [
      { zone: "UK", cost: null, deliveryMinDays: null, deliveryMaxDays: null, manualQuoteRequired: true },
      { zone: "Europe", cost: null, deliveryMinDays: null, deliveryMaxDays: null, manualQuoteRequired: true },
      { zone: "Worldwide", cost: null, deliveryMinDays: null, deliveryMaxDays: null, manualQuoteRequired: true },
    ],
  },
];

function money(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "Shipping quote required";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(value));
}

export function destinationZoneForCountry(country?: string | null, countryCode?: string | null) {
  const selectedCode = normaliseCountryCode(countryCode || country);
  if (selectedCode) return shippingZoneForCountryCode(selectedCode);

  const cleaned = String(country || "United Kingdom").trim().toLowerCase();
  if (!cleaned) return "UK";
  for (const zone of DEFAULT_SHIPPING_ZONES) {
    if (zone.countries.some((candidate) => candidate.toLowerCase() === cleaned)) return zone.name;
  }
  return cleaned.includes("united kingdom") || cleaned === "gb" || cleaned === "uk" ? "UK" : "Worldwide";
}

export function daysLabel(min?: number | null, max?: number | null) {
  if (!min && !max) return "Manual quote required";
  if (min && max && min !== max) return `${min}–${max} working days`;
  return `${min || max} working days`;
}

function rateSummary(policy: any, zoneName = "UK", override?: any): ProductShippingSummary {
  const rates = policy?.rates ?? [];
  const defaultRate = rates.find((rate: any) => rate.zone?.name === zoneName) ?? rates.find((rate: any) => rate.zone?.name === "UK") ?? rates[0] ?? null;
  const overrides = override?.zoneOverridesJson && typeof override.zoneOverridesJson === "object" ? override.zoneOverridesJson as Record<string, any> : {};
  const zoneOverride = overrides[zoneName] || null;
  const cost = zoneOverride?.cost !== undefined && zoneOverride?.cost !== "" ? Number(zoneOverride.cost) : defaultRate?.cost === null || defaultRate?.cost === undefined ? null : Number(defaultRate.cost);
  const manualQuoteRequired = Boolean(policy?.manualQuoteRequired || defaultRate?.manualQuoteRequired || override?.manualQuoteRequired || zoneOverride?.manualQuoteRequired);
  const collectionOnly = Boolean(policy?.collectionOnly || override?.collectionOnly || zoneOverride?.collectionOnly);
  const dispatchMinDays = zoneOverride?.dispatchMinDays !== undefined ? Number(zoneOverride.dispatchMinDays) : defaultRate?.dispatchMinDays ?? DEFAULT_DISPATCH_MIN_DAYS;
  const dispatchMaxDays = zoneOverride?.dispatchMaxDays !== undefined ? Number(zoneOverride.dispatchMaxDays) : defaultRate?.dispatchMaxDays ?? DEFAULT_DISPATCH_MAX_DAYS;
  const deliveryMinDays = zoneOverride?.deliveryMinDays !== undefined ? Number(zoneOverride.deliveryMinDays) : defaultRate?.deliveryMinDays ?? null;
  const deliveryMaxDays = zoneOverride?.deliveryMaxDays !== undefined ? Number(zoneOverride.deliveryMaxDays) : defaultRate?.deliveryMaxDays ?? null;
  const policyName = policy?.name || "Default shipping policy";
  const publicLabel = manualQuoteRequired || collectionOnly
    ? collectionOnly ? "Collection only / manual shipping confirmation" : "Shipping quote required"
    : `Shipping ${money(cost)} · Dispatch ${daysLabel(dispatchMinDays, dispatchMaxDays)} · Delivery ${daysLabel(deliveryMinDays, deliveryMaxDays)}`;

  return {
    policyId: policy?.id ?? null,
    policyName,
    zoneName,
    cost: manualQuoteRequired || collectionOnly ? null : cost,
    currency: defaultRate?.currency || "GBP",
    dispatchMinDays,
    dispatchMaxDays,
    deliveryMinDays,
    deliveryMaxDays,
    manualQuoteRequired,
    collectionOnly,
    inheritedFromPolicy: !zoneOverride,
    overrideUsed: Boolean(zoneOverride || override?.manualQuoteRequired || override?.collectionOnly),
    calculationMethod: "highest_applicable_item_shipping",
    publicLabel,
  };
}

export function defaultPolicySummary(zoneName = "UK"): ProductShippingSummary {
  const seed = DEFAULT_SHIPPING_POLICIES.find((policy) => policy.isDefault) ?? DEFAULT_SHIPPING_POLICIES[0];
  const rate = seed.rates.find((item) => item.zone === zoneName) ?? seed.rates.find((item) => item.zone === "UK") ?? seed.rates[0];
  return {
    policyId: null,
    policyName: seed.name,
    zoneName,
    cost: rate.manualQuoteRequired ? null : rate.cost,
    currency: "GBP",
    dispatchMinDays: DEFAULT_DISPATCH_MIN_DAYS,
    dispatchMaxDays: DEFAULT_DISPATCH_MAX_DAYS,
    deliveryMinDays: rate.deliveryMinDays,
    deliveryMaxDays: rate.deliveryMaxDays,
    manualQuoteRequired: Boolean(seed.manualQuoteRequired || rate.manualQuoteRequired),
    collectionOnly: Boolean(seed.collectionOnly),
    inheritedFromPolicy: true,
    overrideUsed: false,
    calculationMethod: "default_policy_fallback",
    publicLabel: rate.manualQuoteRequired ? "Shipping quote required" : `Shipping ${money(rate.cost)} · Dispatch ${daysLabel(DEFAULT_DISPATCH_MIN_DAYS, DEFAULT_DISPATCH_MAX_DAYS)} · Delivery ${daysLabel(rate.deliveryMinDays, rate.deliveryMaxDays)}`,
  };
}

export function buildProductShippingSummary(product: any, country = "United Kingdom", countryCode?: string | null): ProductShippingSummary {
  const zoneName = destinationZoneForCountry(country, countryCode);
  const override = Array.isArray(product?.shippingOverrides) ? product.shippingOverrides[0] : product?.shippingOverride;
  const policy = product?.shippingPolicy;
  if (!policy) return defaultPolicySummary(zoneName);
  const summary = rateSummary(policy, zoneName, override);
  if (product?.shippingManualQuoteRequired) summary.manualQuoteRequired = true;
  if (product?.shippingCollectionOnly) summary.collectionOnly = true;
  if (zoneName === "UK" && product?.shippingUkAllowed === false) summary.manualQuoteRequired = true;
  if (zoneName === "Europe" && product?.shippingEuropeAllowed === false) summary.manualQuoteRequired = true;
  if (zoneName === "Worldwide" && product?.shippingWorldwideAllowed === false) summary.manualQuoteRequired = true;
  if (summary.manualQuoteRequired || summary.collectionOnly) {
    summary.cost = null;
    summary.publicLabel = summary.collectionOnly ? "Collection only / manual shipping confirmation" : "Shipping quote required";
  }
  return summary;
}

export async function ensureDefaultShippingSetup() {
  return withDatabase(async () => {
    const zoneByName = new Map<string, any>();
    for (const zone of DEFAULT_SHIPPING_ZONES) {
      const existingZone = await prisma.shippingZone.findUnique({ where: { name: zone.name } });
      const saved = existingZone ?? await prisma.shippingZone.create({
        data: { name: zone.name, countriesJson: zone.countries, sortOrder: zone.sortOrder, isActive: true },
      });
      zoneByName.set(zone.name, saved);
    }

    for (const policy of DEFAULT_SHIPPING_POLICIES) {
      let saved = await prisma.shippingPolicy.findUnique({ where: { name: policy.name } });
      if (!saved) {
        saved = await prisma.shippingPolicy.create({
          data: {
            name: policy.name,
            description: policy.description,
            maxWeightKg: policy.maxWeightKg,
            packagingType: policy.packagingType,
            manualQuoteRequired: Boolean(policy.manualQuoteRequired),
            collectionOnly: Boolean(policy.collectionOnly),
            isDefault: Boolean(policy.isDefault),
            isActive: true,
            ebayMarketplaceId: "EBAY_GB",
            ebayMappingStatus: "UNMAPPED",
            ebayFreightRequired: Boolean(policy.manualQuoteRequired || policy.name.toLowerCase().includes("pallet") || policy.name.toLowerCase().includes("specialist")),
          },
        });
      }

      for (const rate of policy.rates) {
        const zone = zoneByName.get(rate.zone);
        if (!zone) continue;
        const existingRate = await prisma.shippingPolicyRate.findUnique({
          where: { shippingPolicyId_shippingZoneId: { shippingPolicyId: saved.id, shippingZoneId: zone.id } },
        });
        if (existingRate) continue;
        await prisma.shippingPolicyRate.create({
          data: {
            shippingPolicyId: saved.id,
            shippingZoneId: zone.id,
            cost: rate.cost,
            currency: "GBP",
            dispatchMinDays: DEFAULT_DISPATCH_MIN_DAYS,
            dispatchMaxDays: DEFAULT_DISPATCH_MAX_DAYS,
            deliveryMinDays: rate.deliveryMinDays,
            deliveryMaxDays: rate.deliveryMaxDays,
            manualQuoteRequired: Boolean(policy.manualQuoteRequired || rate.manualQuoteRequired),
            isActive: true,
          },
        });
      }
    }

    return true;
  });
}

export async function listShippingPolicies() {
  await ensureDefaultShippingSetup();
  const result = await withDatabase(async () => {
    const [policies, zones] = await Promise.all([
      prisma.shippingPolicy.findMany({ include: { rates: { include: { zone: true }, orderBy: { createdAt: "asc" } } }, orderBy: [{ isDefault: "desc" }, { name: "asc" }] }),
      prisma.shippingZone.findMany({ orderBy: { sortOrder: "asc" } }),
    ]);
    return { policies, zones };
  });

  if (result.ok) return { source: "database", ...result.data };
  return {
    source: "fallback",
    zones: DEFAULT_SHIPPING_ZONES.map((zone, index) => ({ id: zone.name, name: zone.name, countriesJson: zone.countries, isActive: true, sortOrder: index })),
    policies: DEFAULT_SHIPPING_POLICIES.map((policy, index) => ({
      id: policy.name,
      ...policy,
      isActive: true,
      isDefault: Boolean(policy.isDefault),
      rates: policy.rates.map((rate, rateIndex) => ({
        id: `${policy.name}-${rate.zone}`,
        cost: rate.cost,
        currency: "GBP",
        dispatchMinDays: DEFAULT_DISPATCH_MIN_DAYS,
        dispatchMaxDays: DEFAULT_DISPATCH_MAX_DAYS,
        deliveryMinDays: rate.deliveryMinDays,
        deliveryMaxDays: rate.deliveryMaxDays,
        manualQuoteRequired: Boolean(rate.manualQuoteRequired || policy.manualQuoteRequired),
        isActive: true,
        zone: { id: rate.zone, name: rate.zone, sortOrder: rateIndex },
      })),
      sortOrder: index,
    })),
  };
}

export async function calculateOrderShipping(lines: Array<{ sku: string; quantity: number; product?: any }>, country = "United Kingdom", countryCode?: string | null): Promise<CartShippingResult> {
  const zoneName = destinationZoneForCountry(country, countryCode);
  const requestedSkus = lines.map((line) => line.sku).filter(Boolean);
  const dbResult = await withDatabase(async () => {
    const products = await prisma.product.findMany({
      where: { sku: { in: requestedSkus } },
      include: { shippingPolicy: { include: { rates: { include: { zone: true } } } }, shippingOverrides: true },
    });
    return products;
  });

  const productBySku = new Map<string, any>();
  if (dbResult.ok) dbResult.data.forEach((product: any) => productBySku.set(product.sku, product));

  const lineSummaries = lines.map((line) => {
    const product = productBySku.get(line.sku) ?? line.product ?? null;
    const summary = product ? buildProductShippingSummary(product, country, countryCode) : defaultPolicySummary(zoneName);
    return { ...summary, sku: line.sku, quantity: Math.max(1, Number(line.quantity || 1)) };
  });

  const manual = lineSummaries.find((summary) => summary.manualQuoteRequired || summary.collectionOnly || summary.cost === null);
  if (manual) {
    return { ...manual, cost: null, manualQuoteRequired: true, lineSummaries, calculationMethod: "manual_quote_if_any_item_requires_quote" };
  }

  const highest = lineSummaries.reduce((best, current) => Number(current.cost || 0) > Number(best.cost || 0) ? current : best, lineSummaries[0] ?? defaultPolicySummary(zoneName));
  return { ...highest, lineSummaries, calculationMethod: "highest_applicable_item_shipping" };
}

export function snapshotFromShipping(shipping: CartShippingResult) {
  return {
    shippingPolicyName: shipping.policyName,
    shippingZoneName: shipping.zoneName,
    shippingCost: shipping.cost,
    currency: shipping.currency,
    dispatchMinDays: shipping.dispatchMinDays,
    dispatchMaxDays: shipping.dispatchMaxDays,
    deliveryMinDays: shipping.deliveryMinDays,
    deliveryMaxDays: shipping.deliveryMaxDays,
    manualQuoteRequired: shipping.manualQuoteRequired,
    collectionOnly: shipping.collectionOnly,
    calculationMethod: shipping.calculationMethod,
    detailsJson: shipping.lineSummaries,
  };
}
