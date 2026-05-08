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
import { getSiteContent, isSectionHidden } from "@/lib/siteContent";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Combay — Industrial Equipment Specialists",
  description: "Buy, repair or sell surplus industrial and commercial equipment. 10,000+ tested items, 30-day warranty, UK-based engineers. Serving every industry.",
};

export default async function HomePage() {
  const content = await getSiteContent();
  return (
    <main>
      <TopBar />
      <Navigation />
      {!isSectionHidden(content, "home", "hero") && <HeroCarousel slides={content.heroSlides} />}
      {!isSectionHidden(content, "home", "promotionStrip") && <PublicPromotionStrip placement="home" />}
      {!isSectionHidden(content, "home", "industryStrip") && <IndustryStrip />}
      {!isSectionHidden(content, "home", "serviceCards") && <ServiceTabs content={content.pages.home} />}
      {!isSectionHidden(content, "home", "trust") && <TrustSection content={content.trust} />}
      {!isSectionHidden(content, "home", "faqPreview") && <FaqPreview items={content.faq.previewItems} />}
      {!isSectionHidden(content, "home", "finalCta") && <FinalCta content={content.finalCta} />}
      <Footer content={{ description: content.footer.description, backgroundImageUrl: content.footer.backgroundImageUrl, contact: content.contact }} />
    </main>
  );
}
