import type { Metadata } from "next";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import PortalClient from "@/components/portal/PortalClient";

export const metadata: Metadata = { title: "Tracking — Combay Portal" };

export default function TrackingPage() {
  return (
    <main>
      <TopBar />
      <Navigation />
      <PortalClient initialSection="tracking" />
      <Footer />
    </main>
  );
}
