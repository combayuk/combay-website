import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/mailer";
import type { AutomationTrigger } from "@/lib/emailAutomations";

export type MarketingPreferencePayload = {
  newStockEmails?: boolean;
  promotionEmails?: boolean;
  monthlyEmails?: boolean;
  seasonalEmails?: boolean;
  orderFollowupEmails?: boolean;
  allMarketingEmails?: boolean;
  categories?: string[];
  consentSource?: string;
};

export const CATEGORY_INTERESTS = [
  "Lab & Scientific",
  "Automation & Control",
  "Test & Detection",
  "IT & Networking",
  "Display & AV",
  "Oil & Gas",
  "Audio & Broadcast",
  "Manufacturing",
];

export function automationConsentCategory(trigger: string) {
  if (trigger.startsWith("MONTHLY_")) return "monthly";
  if (["NEW_YEAR", "SUMMER", "EASTER", "CHRISTMAS", "BOXING_DAY"].includes(trigger)) return "seasonal";
  if (["FIRST_ORDER_COMPLETED", "ORDER_COMPLETED"].includes(trigger)) return "order-followup";
  if (trigger === "NEW_SIGNUP") return "transactional";
  return "marketing";
}

export function isMarketingAutomation(trigger: string) {
  return ["monthly", "seasonal", "marketing"].includes(automationConsentCategory(trigger));
}

export function defaultMarketingPrefs() {
  return {
    newStockEmails: true,
    promotionEmails: true,
    monthlyEmails: true,
    seasonalEmails: true,
    orderFollowupEmails: true,
    allMarketingEmails: true,
    categories: [] as string[],
    unsubscribedAt: null as Date | null,
  };
}

export async function ensureMarketingPrefs(userId: string, source = "system") {
  const existing = await prisma.marketingPrefs.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.marketingPrefs.create({
    data: {
      userId,
      ...defaultMarketingPrefs(),
      consentSource: source,
      consentUpdatedAt: new Date(),
    },
  });
}

export async function updateMarketingPrefs(userId: string, payload: MarketingPreferencePayload) {
  const categories = Array.isArray(payload.categories)
    ? payload.categories.filter((item) => CATEGORY_INTERESTS.includes(String(item))).slice(0, 12)
    : undefined;
  const allMarketingEmails = payload.allMarketingEmails !== undefined ? Boolean(payload.allMarketingEmails) : undefined;
  const data: any = {
    ...(payload.newStockEmails !== undefined ? { newStockEmails: Boolean(payload.newStockEmails) } : {}),
    ...(payload.promotionEmails !== undefined ? { promotionEmails: Boolean(payload.promotionEmails) } : {}),
    ...(payload.monthlyEmails !== undefined ? { monthlyEmails: Boolean(payload.monthlyEmails) } : {}),
    ...(payload.seasonalEmails !== undefined ? { seasonalEmails: Boolean(payload.seasonalEmails) } : {}),
    ...(payload.orderFollowupEmails !== undefined ? { orderFollowupEmails: Boolean(payload.orderFollowupEmails) } : {}),
    ...(allMarketingEmails !== undefined ? { allMarketingEmails } : {}),
    ...(categories !== undefined ? { categories } : {}),
    consentSource: payload.consentSource || "customer-portal",
    consentUpdatedAt: new Date(),
  };

  if (allMarketingEmails === false) {
    data.newStockEmails = false;
    data.promotionEmails = false;
    data.monthlyEmails = false;
    data.seasonalEmails = false;
    data.unsubscribedAt = new Date();
  } else if (allMarketingEmails === true) {
    data.unsubscribedAt = null;
  }

  return prisma.marketingPrefs.upsert({
    where: { userId },
    create: { userId, ...defaultMarketingPrefs(), ...data },
    update: data,
  });
}

export function publicMarketingPrefs(prefs: any) {
  const merged = { ...defaultMarketingPrefs(), ...(prefs || {}) };
  return {
    newStockEmails: Boolean(merged.newStockEmails),
    promotionEmails: Boolean(merged.promotionEmails),
    monthlyEmails: Boolean(merged.monthlyEmails),
    seasonalEmails: Boolean(merged.seasonalEmails),
    orderFollowupEmails: Boolean(merged.orderFollowupEmails),
    allMarketingEmails: Boolean(merged.allMarketingEmails) && !merged.unsubscribedAt,
    categories: Array.isArray(merged.categories) ? merged.categories : [],
    unsubscribedAt: merged.unsubscribedAt?.toISOString?.() || merged.unsubscribedAt || null,
    consentSource: merged.consentSource || "",
    consentUpdatedAt: merged.consentUpdatedAt?.toISOString?.() || merged.consentUpdatedAt || null,
  };
}

export function unsubscribeUrl(token: string, trigger?: string) {
  const base = siteUrl().replace(/\/$/, "");
  const suffix = trigger ? `?token=${encodeURIComponent(token)}&trigger=${encodeURIComponent(trigger)}` : `?token=${encodeURIComponent(token)}`;
  return `${base}/unsubscribe${suffix}`;
}

export async function canSendAutomationToUser(trigger: AutomationTrigger, user: any) {
  const category = automationConsentCategory(trigger);
  if (category === "transactional") return { ok: true, reason: "Transactional account email." };

  const prefs = user?.marketingPrefs || (user?.id ? await ensureMarketingPrefs(user.id) : null);
  if (!prefs) return { ok: true, reason: "No preference record available." };
  if (prefs.unsubscribedAt || prefs.allMarketingEmails === false) return { ok: false, reason: "Customer unsubscribed from marketing emails." };
  if (category === "monthly" && prefs.monthlyEmails === false) return { ok: false, reason: "Customer opted out of monthly campaigns." };
  if (category === "seasonal" && prefs.seasonalEmails === false) return { ok: false, reason: "Customer opted out of seasonal campaigns." };
  if (category === "order-followup" && prefs.orderFollowupEmails === false) return { ok: false, reason: "Customer opted out of order follow-up emails." };
  if (category === "marketing" && prefs.promotionEmails === false) return { ok: false, reason: "Customer opted out of promotional emails." };
  return { ok: true, reason: "Marketing consent active." };
}
