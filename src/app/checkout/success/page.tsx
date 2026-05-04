import type { Metadata } from "next";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import CheckoutSuccessClient from "@/components/cart/CheckoutSuccessClient";

export const metadata: Metadata = {
  title: "Payment successful | Combay",
  description: "Your Combay payment has been received.",
};

export default function CheckoutSuccessPage() {
  return (
    <main>
      <TopBar />
      <Navigation />
      <CheckoutSuccessClient />
      <Footer />
    </main>
  );
}
