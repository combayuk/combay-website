import type { Metadata } from "next";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import ShopClient from "@/components/shop/ShopClient";
import ShopVisualWidgetZoneClient from "@/components/shop/ShopVisualWidgetZoneClient";

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

export default function ShopPage({ searchParams }: ShopPageProps) {
  const query = searchParams?.q ?? "";
  const category = searchParams?.category ?? searchParams?.cat ?? "";
  const condition = searchParams?.condition ?? "";
  const minRaw = searchParams?.min ?? searchParams?.priceMin ?? "";
  const maxRaw = searchParams?.max ?? searchParams?.priceMax ?? "";
  const page = Math.max(1, Number(searchParams?.page || 1));
  const pageSize = Math.min(48, Math.max(12, Number(searchParams?.pageSize || 24)));

  // Phase 27L.1: keep /shop shell-first. Do not block the route on products,
  // promotions or CMS reads. The catalogue and shop widgets hydrate through
  // lightweight APIs once the user has already landed on the page.
  return (
    <main>
      <TopBar />
      <Navigation />
      <ShopVisualWidgetZoneClient zone="top" />
      <div data-system-protected="1" className="relative">
        <ShopClient
          initialQuery={query}
          initialCategory={category}
          initialCondition={condition}
          initialPriceMin={minRaw}
          initialPriceMax={maxRaw}
          initialProducts={[]}
          initialSource="shell"
          initialTotal={0}
          initialPage={page}
          initialPageSize={pageSize}
          initialTotalPages={1}
          deferInitialLoad={false}
        />
      </div>
      <ShopVisualWidgetZoneClient zone="beforeFooter" />
      <Footer />
    </main>
  );
}
