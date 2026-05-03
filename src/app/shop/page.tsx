import type { Metadata } from "next";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import ShopClient from "@/components/shop/ShopClient";

export const metadata: Metadata = {
  title: "Shop Industrial Equipment",
  description: "Browse 10,000+ tested industrial and commercial equipment items. PLCs, test gear, lab instruments, drives, IT, displays and more. 30-day warranty.",
};

export default function ShopPage() {
  return (
    <main>
      <TopBar />
      <Navigation />
      <ShopClient />
      <Footer />
    </main>
  );
}
