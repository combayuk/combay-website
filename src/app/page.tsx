import type { Metadata } from "next";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import HeroCarousel from "@/components/home/HeroCarousel";
import IndustryStrip from "@/components/home/IndustryStrip";
import ServiceTabs from "@/components/home/ServiceTabs";
import TrustSection from "@/components/home/TrustSection";
import FaqPreview from "@/components/home/FaqPreview";
import FinalCta from "@/components/home/FinalCta";
import PublicPromotionStrip from "@/components/promotions/PublicPromotionStrip";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Combay — Industrial Equipment Specialists",
  description: "Buy, repair or sell surplus industrial and commercial equipment. 10,000+ tested items, 30-day warranty, UK-based engineers. Serving every industry.",
};

export default function HomePage() {
  return (
    <main>
      <TopBar />
      <Navigation />
      <HeroCarousel />
      <PublicPromotionStrip placement="home" />
      <IndustryStrip />
      <ServiceTabs />
      <TrustSection />
      <FaqPreview />
      <FinalCta />
      <Footer />
    </main>
  );
}
