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
import GoogleReviewsBadge from "@/components/reviews/GoogleReviewsBadge";
import PublicPromotionStrip from "@/components/promotions/PublicPromotionStrip";
import { getSiteContent, isSectionHidden } from "@/lib/siteContent";
import VisualWidgetZone from "@/components/visual-cms/VisualWidgetZone";

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
      <VisualWidgetZone pageKey="home" zone="top" allWidgets={content.visualWidgets} />
      {!isSectionHidden(content, "home", "hero") && <HeroCarousel slides={content.heroSlides} />}
      <VisualWidgetZone pageKey="home" zone="afterHero" allWidgets={content.visualWidgets} />
      {!isSectionHidden(content, "home", "promotionStrip") && <PublicPromotionStrip placement="home" />}
      <VisualWidgetZone pageKey="home" zone="afterPromotion" allWidgets={content.visualWidgets} />
      {!isSectionHidden(content, "home", "industryStrip") && <IndustryStrip categories={content.categories} />}
      <VisualWidgetZone pageKey="home" zone="afterIndustry" allWidgets={content.visualWidgets} />
      {!isSectionHidden(content, "home", "serviceCards") && <ServiceTabs content={content.pages.home} />}
      <VisualWidgetZone pageKey="home" zone="afterServices" allWidgets={content.visualWidgets} />
      {!isSectionHidden(content, "home", "trust") && <TrustSection content={content.trust} />}
      <GoogleReviewsBadge />
      <VisualWidgetZone pageKey="home" zone="afterTrust" allWidgets={content.visualWidgets} />
      {!isSectionHidden(content, "home", "faqPreview") && <FaqPreview items={content.faq.previewItems} />}
      <VisualWidgetZone pageKey="home" zone="afterFaq" allWidgets={content.visualWidgets} />
      {!isSectionHidden(content, "home", "finalCta") && <FinalCta content={content.finalCta} />}
      <VisualWidgetZone pageKey="home" zone="beforeFooter" allWidgets={content.visualWidgets} />
      <Footer content={{ description: content.footer.description, backgroundImageUrl: content.footer.backgroundImageUrl, contact: content.contact }} />
    </main>
  );
}
