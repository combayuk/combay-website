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

function OfferCard({ promotion, compact = false }: { promotion: PromotionCardData; compact?: boolean }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${compact ? "border-white/15 bg-white/10 text-white" : "border-amber-200 bg-amber-50"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`font-display font-800 text-sm ${compact ? "text-white" : "text-navy-950"}`}>{promotionOfferLabel(promotion)}</p>
          <p className={`text-xs mt-0.5 ${compact ? "text-white/75" : "text-gray-700"}`}>{promotion.bannerText || promotion.description || promotion.name}</p>
          {promotion.minOrderValue ? <p className={`text-[11px] mt-1 ${compact ? "text-white/55" : "text-gray-500"}`}>Minimum order £{Number(promotion.minOrderValue).toFixed(2)} before VAT.</p> : null}
        </div>
        {promotion.code ? <PromotionCodeCopyButton code={promotion.code} compact /> : null}
      </div>
    </div>
  );
}

export default function PublicPromotionCards({ promotions, compact = false }: { promotions: PromotionCardData[]; compact?: boolean }) {
  if (!promotions.length) return null;
  return <>{promotions.map((promotion) => <OfferCard key={promotion.id} promotion={promotion} compact={compact} />)}</>;
}
