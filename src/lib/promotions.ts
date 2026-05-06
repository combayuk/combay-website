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
};

export type PromotionApplication = {
  ok: boolean;
  error?: string;
  code?: string;
  name?: string;
  type?: string;
  discount: number;
  shippingDiscount: number;
  subtotalAfterDiscount: number;
  vat: number;
  shipping: number;
  total: number;
};

function money(value: unknown) {
  const numberValue = Number(value ?? 0);
  if (!Number.isFinite(numberValue)) return 0;
  return Math.max(0, Number(numberValue.toFixed(2)));
}

function normaliseCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function publicPromotion(promotion: any) {
  return {
    id: promotion.id,
    name: promotion.name,
    code: promotion.code,
    type: promotion.type,
    value: money(promotion.value),
    description: promotion.description ?? "",
    isActive: Boolean(promotion.isActive),
    startsAt: promotion.startsAt ? promotion.startsAt.toISOString?.() ?? promotion.startsAt : null,
    endsAt: promotion.endsAt ? promotion.endsAt.toISOString?.() ?? promotion.endsAt : null,
    minOrderValue: money(promotion.minOrderValue),
    maxUses: promotion.maxUses ?? null,
    usedCount: promotion.usedCount ?? 0,
    showOnHomepage: Boolean(promotion.showOnHomepage),
    showOnShop: Boolean(promotion.showOnShop),
    bannerText: promotion.bannerText ?? "",
    displayPriority: promotion.displayPriority ?? 100,
    createdAt: promotion.createdAt ? promotion.createdAt.toISOString?.() ?? promotion.createdAt : null,
  };
}

export function isPromotionLive(promotion: any, now = new Date()) {
  if (!promotion?.isActive) return false;
  if (promotion.startsAt && new Date(promotion.startsAt) > now) return false;
  if (promotion.endsAt && new Date(promotion.endsAt) < now) return false;
  if (promotion.maxUses !== null && promotion.maxUses !== undefined && promotion.usedCount >= promotion.maxUses) return false;
  return true;
}

export function calculatePromotionTotals(promotion: any, subtotalRaw: number, shippingRaw = 0): PromotionApplication {
  const subtotal = money(subtotalRaw);
  const originalShipping = money(shippingRaw);
  const minOrderValue = money(promotion.minOrderValue);

  if (!isPromotionLive(promotion)) {
    return { ok: false, error: "This promotion is not currently active.", discount: 0, shippingDiscount: 0, subtotalAfterDiscount: subtotal, vat: money(subtotal * 0.2), shipping: originalShipping, total: money(subtotal * 1.2 + originalShipping) };
  }

  if (minOrderValue > 0 && subtotal < minOrderValue) {
    return { ok: false, error: `Minimum order value is £${minOrderValue.toFixed(2)} before VAT.`, discount: 0, shippingDiscount: 0, subtotalAfterDiscount: subtotal, vat: money(subtotal * 0.2), shipping: originalShipping, total: money(subtotal * 1.2 + originalShipping) };
  }

  let discount = 0;
  let shippingDiscount = 0;
  if (promotion.type === "PERCENTAGE") discount = Math.min(subtotal, subtotal * (money(promotion.value) / 100));
  if (promotion.type === "FIXED_AMOUNT") discount = Math.min(subtotal, money(promotion.value));
  if (promotion.type === "FREE_SHIPPING") shippingDiscount = originalShipping;

  discount = money(discount);
  shippingDiscount = money(shippingDiscount);
  const subtotalAfterDiscount = money(subtotal - discount);
  const vat = money(subtotalAfterDiscount * 0.2);
  const shipping = money(originalShipping - shippingDiscount);
  const total = money(subtotalAfterDiscount + vat + shipping);

  return {
    ok: true,
    code: promotion.code ?? undefined,
    name: promotion.name,
    type: promotion.type,
    discount,
    shippingDiscount,
    subtotalAfterDiscount,
    vat,
    shipping,
    total,
  };
}

export async function findPromotionByCode(code: string) {
  const normalised = normaliseCode(code);
  if (!normalised) return null;
  return prisma.promotion.findUnique({ where: { code: normalised } });
}

export function preparePromotionInput(input: PromotionInput) {
  const name = String(input.name || "").trim();
  const code = input.code ? normaliseCode(String(input.code)) : null;
  const type = input.type;
  const value = money(input.value);
  const minOrderValue = input.minOrderValue === null || input.minOrderValue === undefined || input.minOrderValue === 0 ? null : money(input.minOrderValue);
  const maxUses = input.maxUses === null || input.maxUses === undefined || Number(input.maxUses) <= 0 ? null : Math.floor(Number(input.maxUses));

  if (!name) throw new Error("Promotion name is required.");
  if (!code) throw new Error("Promotion code is required for checkout promotions.");
  if (!type || !["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING"].includes(type)) throw new Error("Invalid promotion type.");
  if (type !== "FREE_SHIPPING" && value <= 0) throw new Error("Promotion value must be greater than zero.");
  if (type === "PERCENTAGE" && value > 80) throw new Error("Percentage discount cannot exceed 80% from the admin screen.");

  return {
    name,
    code,
    type,
    value: type === "FREE_SHIPPING" ? 0 : value,
    description: input.description ? String(input.description).trim() : null,
    isActive: Boolean(input.isActive),
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
    minOrderValue,
    maxUses,
    showOnHomepage: Boolean(input.showOnHomepage),
    showOnShop: Boolean(input.showOnShop),
    bannerText: input.bannerText ? String(input.bannerText).trim() : null,
    displayPriority: input.displayPriority === null || input.displayPriority === undefined ? 100 : Math.max(0, Math.floor(Number(input.displayPriority) || 100)),
  };
}
