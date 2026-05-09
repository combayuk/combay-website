import PromotionCodeCopyButton from "@/components/promotions/PromotionCodeCopyButton";

export type PromotionCardData = {
  id: string;
  name?: string;
  code?: string | null;
  type?: string;
  value?: number;
  description?: string;
  bannerText?: string;
  minOrderValue?: number | null;
};

function promotionOfferLabel(promotion: { type?: string; value?: number }) {
  if (promotion.type === "PERCENTAGE") return `${Number(promotion.value || 0).toFixed(0)}% off`;
  if (promotion.type === "FIXED_AMOUNT") return `£${Number(promotion.value || 0).toFixed(2)} off`;
  if (promotion.type === "FREE_SHIPPING") return "Free shipping";
  return "Promotion";
}

function OfferCard({ promotion, compact = false, index = 0 }: { promotion: PromotionCardData; compact?: boolean; index?: number }) {
  return (
    <div data-vcms-item="home.promotionStrip" data-vcms-index={index} className={compact ? "rounded-lg border border-white/15 bg-white/10 p-3 text-white" : "rounded-xl border border-[#E6C06E]/60 bg-[#FFF8E8] p-4 shadow-sm"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={compact ? "font-display text-sm font-900 text-white" : "font-display text-base font-900 text-[#2D4F7A]"}>{promotionOfferLabel(promotion)}</p>
          <p className={compact ? "mt-1 line-clamp-2 text-xs text-white/70" : "mt-1 line-clamp-2 text-sm leading-6 text-slate-700"}>{promotion.bannerText || promotion.description || promotion.name}</p>
          {promotion.minOrderValue ? <p className={compact ? "mt-1 text-[10px] text-white/50" : "mt-2 text-xs text-slate-500"}>Minimum order £{Number(promotion.minOrderValue).toFixed(2)}</p> : null}
        </div>
        {promotion.code ? <PromotionCodeCopyButton code={promotion.code} compact={compact} /> : null}
      </div>
    </div>
  );
}

export default function PublicPromotionCards({ promotions, compact = false }: { promotions: PromotionCardData[]; compact?: boolean }) {
  return <>{promotions.map((promotion, index) => <OfferCard key={promotion.id} promotion={promotion} compact={compact} index={index} />)}</>;
}
