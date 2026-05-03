import type { Metadata } from "next";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import PortalClient from "@/components/portal/PortalClient";

export const metadata: Metadata = {
  title: "Customer Portal",
  description: "Manage your orders, returns, tracking and account settings.",
};

export default function PortalPage() {
  return (
    <main>
      <TopBar />
      <Navigation />
      <PortalClient />
      <Footer />
    </main>
  );
}
