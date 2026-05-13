import type { Metadata } from "next";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import ShopClient from "@/components/shop/ShopClient";
import { getPublicPromotions, type PublicPromotion } from "@/lib/promotionDisplay";
import { getSiteContent } from "@/lib/siteContent";
import VisualWidgetZone from "@/components/visual-cms/VisualWidgetZone";
import { getProductsFromRepository } from "@/lib/productRepository";

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
    condition?: string;
    min?: string;
    max?: string;
    priceMin?: string;
    priceMax?: string;
    page?: string;
    pageSize?: string;
  };
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const query = searchParams?.q ?? "";
  const category = searchParams?.category ?? searchParams?.cat ?? "";
  const condition = searchParams?.condition ?? "";
  const minRaw = searchParams?.min ?? searchParams?.priceMin ?? "";
  const maxRaw = searchParams?.max ?? searchParams?.priceMax ?? "";
  const min = minRaw ? Number(minRaw) : null;
  const max = maxRaw ? Number(maxRaw) : null;
  const page = Math.max(1, Number(searchParams?.page || 1));
  const pageSize = Math.min(48, Math.max(12, Number(searchParams?.pageSize || 24)));

  const [promotions, content, initialInventory] = await Promise.all([
    getPublicPromotions("shop", 2),
    getSiteContent(),
    getProductsFromRepository({
      query,
      category,
      condition,
      priceMin: Number.isFinite(min) ? min : null,
      priceMax: Number.isFinite(max) ? max : null,
      page,
      pageSize,
    }),
  ]) as [PublicPromotion[], Awaited<ReturnType<typeof getSiteContent>>, Awaited<ReturnType<typeof getProductsFromRepository>>];

  return (
    <main>
      <TopBar />
      <Navigation />
      <VisualWidgetZone pageKey="shop" zone="top" allWidgets={content.visualWidgets} />
      <div data-system-protected="1" className="relative">
        <ShopClient
          initialQuery={query}
          initialCategory={category}
          initialCondition={condition}
          initialPriceMin={minRaw}
          initialPriceMax={maxRaw}
          initialProducts={initialInventory.products}
          initialCategories={initialInventory.categories}
          initialSource={initialInventory.source}
          initialTotal={initialInventory.total}
          initialPage={initialInventory.page}
          initialPageSize={initialInventory.pageSize}
          initialTotalPages={initialInventory.totalPages}
          promotions={promotions}
        />
      </div>
      <VisualWidgetZone pageKey="shop" zone="beforeFooter" allWidgets={content.visualWidgets} />
      <Footer content={{ description: content.footer.description, backgroundImageUrl: content.footer.backgroundImageUrl, contact: content.contact }} />
    </main>
  );
}
