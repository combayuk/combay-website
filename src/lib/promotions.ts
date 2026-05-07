import { prisma } from "@/lib/db";

export type PromotionInput = {
  name: string;
  code?: string | null;
  type: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";
  value: number;
  description?: string | null;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  minOrderValue?: number | null;
  maxUses?: number | null;
  showOnHomepage?: boolean;
  showOnShop?: boolean;
  bannerText?: string | null;
  displayPriority?: number | null;
  includeProductIds?: string[];
  excludeProductIds?: string[];
  includeCategorySlugs?: string[];
  excludeCategorySlugs?: string[];
  includeBrands?: string[];
  excludeBrands?: string[];
};

export type PromotionApplication = { ok: boolean; error?: string; code?: string; name?: string; type?: string; discount: number; shippingDiscount: number; subtotalAfterDiscount: number; vat: number; shipping: number; total: number; };
type Candidate = { id?: string | null; productId?: string | null; categorySlug?: string | null; category?: string | null; brand?: string | null; manufacturer?: string | null };

function money(value: unknown) { const numberValue = Number(value ?? 0); if (!Number.isFinite(numberValue)) return 0; return Math.max(0, Number(numberValue.toFixed(2))); }
function normaliseCode(code: string) { return code.trim().toUpperCase().replace(/\s+/g, ""); }
function text(value: unknown) { return String(value ?? "").trim(); }
function slug(value: unknown) { return text(value).toLowerCase(); }
function uniqueStrings(values?: unknown[]) { return Array.isArray(values) ? Array.from(new Set(values.map(text).filter(Boolean))) : []; }
function uniqueSlugs(values?: unknown[]) { return Array.isArray(values) ? Array.from(new Set(values.map(slug).filter(Boolean))) : []; }

export function publicPromotion(promotion: any) {
  return {
    id: promotion.id, name: promotion.name, code: promotion.code, type: promotion.type, value: money(promotion.value), description: promotion.description ?? "", isActive: Boolean(promotion.isActive),
    startsAt: promotion.startsAt ? promotion.startsAt.toISOString?.() ?? promotion.startsAt : null,
    endsAt: promotion.endsAt ? promotion.endsAt.toISOString?.() ?? promotion.endsAt : null,
    minOrderValue: money(promotion.minOrderValue), maxUses: promotion.maxUses ?? null, usedCount: promotion.usedCount ?? 0,
    showOnHomepage: Boolean(promotion.showOnHomepage), showOnShop: Boolean(promotion.showOnShop), bannerText: promotion.bannerText ?? "", displayPriority: promotion.displayPriority ?? 100,
    includeProductIds: Array.isArray(promotion.productTargets) ? promotion.productTargets.filter((target: any) => target.mode === "INCLUDE").map((target: any) => target.productId) : [],
    excludeProductIds: Array.isArray(promotion.productTargets) ? promotion.productTargets.filter((target: any) => target.mode === "EXCLUDE").map((target: any) => target.productId) : [],
    includeCategorySlugs: Array.isArray(promotion.includeCategorySlugs) ? promotion.includeCategorySlugs : [],
    excludeCategorySlugs: Array.isArray(promotion.excludeCategorySlugs) ? promotion.excludeCategorySlugs : [],
    includeBrands: Array.isArray(promotion.includeBrands) ? promotion.includeBrands : [],
    excludeBrands: Array.isArray(promotion.excludeBrands) ? promotion.excludeBrands : [],
    productTargets: Array.isArray(promotion.productTargets) ? promotion.productTargets : [],
    createdAt: promotion.createdAt ? promotion.createdAt.toISOString?.() ?? promotion.createdAt : null,
  };
}

export function isPromotionLive(promotion: any, now = new Date()) { if (!promotion?.isActive) return false; if (promotion.startsAt && new Date(promotion.startsAt) > now) return false; if (promotion.endsAt && new Date(promotion.endsAt) < now) return false; if (promotion.maxUses !== null && promotion.maxUses !== undefined && promotion.usedCount >= promotion.maxUses) return false; return true; }

export function calculatePromotionTotals(promotion: any, subtotalRaw: number, shippingRaw = 0): PromotionApplication {
  const subtotal = money(subtotalRaw); const originalShipping = money(shippingRaw); const minOrderValue = money(promotion.minOrderValue);
  if (!isPromotionLive(promotion)) return { ok: false, error: "This promotion is not currently active.", discount: 0, shippingDiscount: 0, subtotalAfterDiscount: subtotal, vat: money(subtotal * 0.2), shipping: originalShipping, total: money(subtotal * 1.2 + originalShipping) };
  if (minOrderValue > 0 && subtotal < minOrderValue) return { ok: false, error: `Minimum order value is £${minOrderValue.toFixed(2)} before VAT.`, discount: 0, shippingDiscount: 0, subtotalAfterDiscount: subtotal, vat: money(subtotal * 0.2), shipping: originalShipping, total: money(subtotal * 1.2 + originalShipping) };
  let discount = 0; let shippingDiscount = 0;
  if (promotion.type === "PERCENTAGE") discount = Math.min(subtotal, subtotal * (money(promotion.value) / 100));
  if (promotion.type === "FIXED_AMOUNT") discount = Math.min(subtotal, money(promotion.value));
  if (promotion.type === "FREE_SHIPPING") shippingDiscount = originalShipping;
  discount = money(discount); shippingDiscount = money(shippingDiscount);
  const subtotalAfterDiscount = money(subtotal - discount); const vat = money(subtotalAfterDiscount * 0.2); const shipping = money(originalShipping - shippingDiscount); const total = money(subtotalAfterDiscount + vat + shipping);
  return { ok: true, code: promotion.code ?? undefined, name: promotion.name, type: promotion.type, discount, shippingDiscount, subtotalAfterDiscount, vat, shipping, total };
}

function candidates(input: Array<string | Candidate>) { return input.map((item) => typeof item === "string" ? { id: item, productId: item, categorySlug: "", brand: "", manufacturer: "" } : { id: text(item.id || item.productId), productId: text(item.productId || item.id), categorySlug: slug(item.categorySlug || item.category), brand: text(item.brand), manufacturer: text(item.manufacturer) }).filter((item) => item.id || item.productId || item.categorySlug || item.brand || item.manufacturer); }
function brandMatch(item: ReturnType<typeof candidates>[number], brands: Set<string>) { const b = text(item.brand).toLowerCase(); const m = text(item.manufacturer).toLowerCase(); return Boolean((b && brands.has(b)) || (m && brands.has(m))); }

export function checkPromotionProductTargets(promotion: any, products: Array<string | Candidate>) {
  const targets = Array.isArray(promotion?.productTargets) ? promotion.productTargets : [];
  const includeProductIds = new Set(targets.filter((target: any) => target.mode === "INCLUDE").map((target: any) => String(target.productId)));
  const excludeProductIds = new Set(targets.filter((target: any) => target.mode === "EXCLUDE").map((target: any) => String(target.productId)));
  const includeCategorySlugs = new Set(uniqueSlugs(promotion?.includeCategorySlugs));
  const excludeCategorySlugs = new Set(uniqueSlugs(promotion?.excludeCategorySlugs));
  const includeBrands = new Set(uniqueStrings(promotion?.includeBrands).map((brand) => brand.toLowerCase()));
  const excludeBrands = new Set(uniqueStrings(promotion?.excludeBrands).map((brand) => brand.toLowerCase()));
  const items = candidates(products);
  if (items.some((item) => excludeProductIds.has(item.productId || item.id))) return { ok: false, error: "This promotion does not apply to one or more items in your cart." };
  if (items.some((item) => item.categorySlug && excludeCategorySlugs.has(item.categorySlug))) return { ok: false, error: "This promotion excludes one or more product categories in your cart." };
  if (items.some((item) => brandMatch(item, excludeBrands))) return { ok: false, error: "This promotion excludes one or more brands in your cart." };
  const hasIncludeRules = includeProductIds.size > 0 || includeCategorySlugs.size > 0 || includeBrands.size > 0;
  if (!hasIncludeRules) return { ok: true };
  const hasIncludedItem = items.some((item) => includeProductIds.has(item.productId || item.id) || (item.categorySlug && includeCategorySlugs.has(item.categorySlug)) || brandMatch(item, includeBrands));
  if (!hasIncludedItem) return { ok: false, error: "This promotion only applies to selected products, categories or brands." };
  return { ok: true };
}

export async function findPromotionByCode(code: string) { const normalised = normaliseCode(code); if (!normalised) return null; return prisma.promotion.findUnique({ where: { code: normalised }, include: { productTargets: true } }); }
export async function replacePromotionTargets(promotionId: string, includeProductIds: string[] = [], excludeProductIds: string[] = []) { const include = Array.from(new Set(includeProductIds.map(String).filter(Boolean))); const exclude = Array.from(new Set(excludeProductIds.map(String).filter(Boolean))).filter((id) => !include.includes(id)); await prisma.promotionProductTarget.deleteMany({ where: { promotionId } }); if (include.length + exclude.length) await prisma.promotionProductTarget.createMany({ data: [...include.map((productId) => ({ promotionId, productId, mode: "INCLUDE" })), ...exclude.map((productId) => ({ promotionId, productId, mode: "EXCLUDE" }))], skipDuplicates: true }); }

export function preparePromotionInput(input: PromotionInput) {
  const name = String(input.name || "").trim(); const code = input.code ? normaliseCode(String(input.code)) : null; const type = input.type; const value = money(input.value);
  const minOrderValue = input.minOrderValue === null || input.minOrderValue === undefined || input.minOrderValue === 0 ? null : money(input.minOrderValue);
  const maxUses = input.maxUses === null || input.maxUses === undefined || Number(input.maxUses) <= 0 ? null : Math.floor(Number(input.maxUses));
  const includeCategorySlugs = uniqueSlugs(input.includeCategorySlugs); const excludeCategorySlugs = uniqueSlugs(input.excludeCategorySlugs).filter((item) => !includeCategorySlugs.includes(item));
  const includeBrands = uniqueStrings(input.includeBrands); const includeBrandSet = new Set(includeBrands.map((item) => item.toLowerCase())); const excludeBrands = uniqueStrings(input.excludeBrands).filter((item) => !includeBrandSet.has(item.toLowerCase()));
  if (!name) throw new Error("Promotion name is required."); if (!code) throw new Error("Promotion code is required for checkout promotions."); if (!type || !["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING"].includes(type)) throw new Error("Invalid promotion type."); if (type !== "FREE_SHIPPING" && value <= 0) throw new Error("Promotion value must be greater than zero."); if (type === "PERCENTAGE" && value > 80) throw new Error("Percentage discount cannot exceed 80% from the admin screen.");
  return { name, code, type, value: type === "FREE_SHIPPING" ? 0 : value, description: input.description ? String(input.description).trim() : null, isActive: Boolean(input.isActive), startsAt: input.startsAt ? new Date(input.startsAt) : null, endsAt: input.endsAt ? new Date(input.endsAt) : null, minOrderValue, maxUses, showOnHomepage: Boolean(input.showOnHomepage), showOnShop: Boolean(input.showOnShop), bannerText: input.bannerText ? String(input.bannerText).trim() : null, displayPriority: input.displayPriority === null || input.displayPriority === undefined ? 100 : Math.max(0, Math.floor(Number(input.displayPriority) || 100)), includeCategorySlugs, excludeCategorySlugs, includeBrands, excludeBrands };
}
