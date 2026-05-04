import type { Metadata } from "next";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import CartClient from "@/components/cart/CartClient";

export const metadata: Metadata = {
  title: "Cart | Combay",
  description: "Review your Combay cart before checkout.",
};

export default function CartPage() {
  return (
    <main>
      <TopBar />
      <Navigation />
      <CartClient />
      <Footer />
    </main>
  );
}
