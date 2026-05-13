import type { Metadata } from "next";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import ProductDetail from "@/components/shop/ProductDetail";
import { getProductByIdFromRepository } from "@/lib/productRepository";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const result = await getProductByIdFromRepository(params.slug);
  const product = result.product as any;
  if (!product) {
    return {
      title: "Product Details",
      description: "View product details, specifications, FAQs and request a quote.",
    };
  }

  const description = String(product.seoDescription || product.productOverview || product.description || "Industrial equipment supplied by Combay.").replace(/\s+/g, " ").trim();
  return {
    title: product.seoTitle || product.title,
    description: description.slice(0, 160),
    openGraph: {
      title: product.seoTitle || product.title,
      description: description.slice(0, 160),
      images: product.image ? [{ url: product.image }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const result = await getProductByIdFromRepository(params.slug);

  return (
    <main>
      <TopBar />
      <Navigation />
      <ProductDetail slug={params.slug} initialProduct={result.product} />
      <Footer />
    </main>
  );
}
