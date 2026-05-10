import type { Metadata } from "next";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import ShopClient from "@/components/shop/ShopClient";
import { getPublicPromotions, type PublicPromotion } from "@/lib/promotionDisplay";
import { getSiteContent } from "@/lib/siteContent";
import VisualWidgetZone from "@/components/visual-cms/VisualWidgetZone";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop Industrial Equipment",
  description: "Browse tested industrial equipment by SKU, MPN, model, brand, manufacturer and category.",
};

type ShopPageProps = {
  searchParams?: {
    q?: string;
    category?: string;
    cat?: string;
  };
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const promotions: PublicPromotion[] = await getPublicPromotions("shop", 2);
  const content = await getSiteContent();
  return (
    <main>
      <TopBar />
      <Navigation />
      <VisualWidgetZone pageKey="shop" zone="top" allWidgets={content.visualWidgets} />
      <div data-system-protected="1" className="relative">
        <ShopClient initialQuery={searchParams?.q ?? ""} initialCategory={searchParams?.category ?? searchParams?.cat ?? ""} promotions={promotions} />
      </div>
      <VisualWidgetZone pageKey="shop" zone="beforeFooter" allWidgets={content.visualWidgets} />
      <Footer content={{ description: content.footer.description, backgroundImageUrl: content.footer.backgroundImageUrl, contact: content.contact }} />
    </main>
  );
}
