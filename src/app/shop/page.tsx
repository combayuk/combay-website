import type { Metadata } from "next";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import ShopClient from "@/components/shop/ShopClient";
import PublicPromotionStrip from "@/components/promotions/PublicPromotionStrip";

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

export default function ShopPage({ searchParams }: ShopPageProps) {
  return (
    <main>
      <TopBar />
      <Navigation />
      <PublicPromotionStrip placement="shop" />
      <ShopClient initialQuery={searchParams?.q ?? ""} initialCategory={searchParams?.category ?? ""} />
      <Footer />
    </main>
  );
}
