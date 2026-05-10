import type { Metadata } from "next";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import CheckoutClient from "@/components/cart/CheckoutClient";
import { getSiteContent } from "@/lib/siteContent";
import VisualWidgetZone from "@/components/visual-cms/VisualWidgetZone";

export const metadata: Metadata = {
  title: "Checkout | Combay",
  description: "Enter delivery details and prepare payment for your Combay order.",
};

export default async function CheckoutPage() {
  const content = await getSiteContent();
  return (
    <main>
      <TopBar />
      <Navigation />
      <VisualWidgetZone pageKey="checkout" zone="top" allWidgets={content.visualWidgets} />
      <div data-system-protected="1" className="relative">
        <CheckoutClient />
      </div>
      <VisualWidgetZone pageKey="checkout" zone="beforeFooter" allWidgets={content.visualWidgets} />
      <Footer content={{ description: content.footer.description, backgroundImageUrl: content.footer.backgroundImageUrl, contact: content.contact }} />
    </main>
  );
}
