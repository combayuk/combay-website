import type { Metadata } from "next";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import CheckoutClient from "@/components/cart/CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout | Combay",
  description: "Enter delivery details and prepare payment for your Combay order.",
};

export default function CheckoutPage() {
  return (
    <main>
      <TopBar />
      <Navigation />
      <CheckoutClient />
      <Footer />
    </main>
  );
}
