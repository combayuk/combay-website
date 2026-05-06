import Link from "next/link";
import { Tag } from "lucide-react";
import { getPublicPromotions, promotionOfferLabel } from "@/lib/promotionDisplay";

export default async function PublicPromotionStrip({ placement = "home" }: { placement?: "home" | "shop" }) {
  const promotions = await getPublicPromotions(placement, placement === "home" ? 3 : 2);
  if (promotions.length === 0) return null;

  return (
    <section className={placement === "home" ? "bg-white border-y border-gray-200" : "bg-amber-50 border-b border-amber-200"}>
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-navy-950"><Tag size={17} /></span>
            <div>
              <p className="font-display font-800 text-navy-950 text-sm">Current Combay offers</p>
              <p className="text-xs text-gray-500">Apply the code at checkout where eligible.</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2 flex-1">
            {promotions.map((promotion) => (
              <div key={promotion.id} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display font-800 text-navy-950 text-sm">{promotionOfferLabel(promotion)}</p>
                    <p className="text-xs text-gray-700 mt-0.5">{promotion.bannerText || promotion.description || promotion.name}</p>
                    {promotion.minOrderValue ? <p className="text-[11px] text-gray-500 mt-1">Minimum order £{Number(promotion.minOrderValue).toFixed(2)} before VAT.</p> : null}
                  </div>
                  {promotion.code ? <span className="font-mono text-xs font-800 tracking-wide bg-white border border-amber-300 text-navy-950 rounded-md px-2 py-1 whitespace-nowrap">{promotion.code}</span> : null}
                </div>
              </div>
            ))}
          </div>
          <Link href="/shop" className="btn-secondary text-sm flex-shrink-0">Shop offers</Link>
        </div>
      </div>
    </section>
  );
}
