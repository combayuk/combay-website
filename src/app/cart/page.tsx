import type { Metadata } from "next";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import CartClient from "@/components/cart/CartClient";
import { getSiteContent } from "@/lib/siteContent";
import VisualWidgetZone from "@/components/visual-cms/VisualWidgetZone";

export const metadata: Metadata = {
  title: "Cart | Combay",
  description: "Review your Combay cart before checkout.",
};

export default async function CartPage() {
  const content = await getSiteContent();
  return (
    <main>
      <TopBar />
      <Navigation />
      <VisualWidgetZone pageKey="cart" zone="top" allWidgets={content.visualWidgets} />
      <div data-system-protected="1" className="relative">
        <CartClient />
      </div>
      <VisualWidgetZone pageKey="cart" zone="beforeFooter" allWidgets={content.visualWidgets} />
      <Footer content={{ description: content.footer.description, backgroundImageUrl: content.footer.backgroundImageUrl, contact: content.contact }} />
    </main>
  );
}
