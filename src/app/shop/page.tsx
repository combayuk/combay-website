import type { Metadata } from "next";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import ShopClient from "@/components/shop/ShopClient";
import { getPublicPromotions, type PublicPromotion } from "@/lib/promotionDisplay";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop Industrial Equipment",
  description: "Browse tested industrial equipment by SKU, MPN, model, brand, manufacturer and category.",
};

type ShopPageProps = {
  searchParams?: {
    q?: string;
    category?: string;
  };
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const promotions: PublicPromotion[] = await getPublicPromotions("shop", 2);
  return (
    <main>
      <TopBar />
      <Navigation />
      <ShopClient initialQuery={searchParams?.q ?? ""} initialCategory={searchParams?.category ?? ""} promotions={promotions} />
      <Footer />
    </main>
  );
}
