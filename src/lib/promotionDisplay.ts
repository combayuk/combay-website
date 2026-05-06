import { prisma } from "@/lib/db";
import { isPromotionLive, publicPromotion } from "@/lib/promotions";

export type PublicPromotion = ReturnType<typeof publicPromotion> & {
  bannerText?: string;
  displayPriority?: number;
};

function offerCopy(promotion: any) {
  if (promotion.bannerText) return promotion.bannerText;
  const code = promotion.code ? ` Use code ${promotion.code}.` : "";
  if (promotion.type === "PERCENTAGE") return `${Number(promotion.value).toFixed(0)}% off selected checkout orders.${code}`;
  if (promotion.type === "FIXED_AMOUNT") return `£${Number(promotion.value).toFixed(2)} off selected checkout orders.${code}`;
  return `Free shipping promotion available.${code}`;
}

export async function getPublicPromotions(placement: "home" | "shop", limit = 3): Promise<PublicPromotion[]> {
  try {
    const where = placement === "home" ? { showOnHomepage: true } : { showOnShop: true };
    const promotions = await prisma.promotion.findMany({
      where: { isActive: true, ...where },
      orderBy: [{ displayPriority: "asc" }, { createdAt: "desc" }],
      take: Math.max(limit * 3, 8),
    });
    return promotions
      .filter((promotion) => isPromotionLive(promotion))
      .slice(0, limit)
      .map((promotion) => ({
        ...publicPromotion(promotion),
        bannerText: offerCopy(promotion),
        displayPriority: promotion.displayPriority,
      }));
  } catch (error) {
    console.error("[public-promotions-failed]", error);
    return [];
  }
}

export function promotionOfferLabel(promotion: { type?: string; value?: number; code?: string | null }) {
  if (promotion.type === "PERCENTAGE") return `${Number(promotion.value || 0).toFixed(0)}% off`;
  if (promotion.type === "FIXED_AMOUNT") return `£${Number(promotion.value || 0).toFixed(2)} off`;
  if (promotion.type === "FREE_SHIPPING") return "Free shipping";
  return "Promotion";
}
