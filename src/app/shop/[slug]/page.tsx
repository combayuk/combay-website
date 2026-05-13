import type { Metadata } from "next";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import ProductDetail from "@/components/shop/ProductDetail";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Product Details",
  description: "View product details, specifications, shipping information and request a quote from Combay.",
};

export default function ProductPage({ params }: { params: { slug: string } }) {
  return (
    <main>
      <TopBar />
      <Navigation />
      <ProductDetail slug={params.slug} />
      <Footer />
    </main>
  );
}
