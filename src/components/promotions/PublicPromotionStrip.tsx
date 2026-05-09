import Link from "next/link";
import { Tag } from "lucide-react";
import { getPublicPromotions } from "@/lib/promotionDisplay";
import PublicPromotionCards from "@/components/promotions/PublicPromotionCards";

export default async function PublicPromotionStrip({ placement = "home" }: { placement?: "home" | "shop" }) {
  const promotions = await getPublicPromotions(placement, placement === "home" ? 3 : 2);
  if (promotions.length === 0) return null;

  const home = placement === "home";
  return (
    <section data-vcms-collection={home ? "home.promotionStrip" : undefined} className={home ? "border-y border-[#E6C06E]/50 bg-[#FFF8E8]" : "border-b border-[#E6C06E]/60 bg-[#FFF8E8]"}>
      <div className="site-shell py-5">
        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_auto] lg:items-center">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#E8A44A] text-[#2D4F7A]"><Tag size={18} /></span>
            <div>
              <p className="font-display text-sm font-900 text-[#2D4F7A]">Current Combay offers</p>
              <p className="text-xs leading-5 text-slate-600">Copy eligible codes and apply at checkout.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <PublicPromotionCards promotions={promotions} />
          </div>
          <Link href="/shop" className="btn-secondary justify-self-start whitespace-nowrap lg:justify-self-end">Shop offers</Link>
        </div>
      </div>
    </section>
  );
}
