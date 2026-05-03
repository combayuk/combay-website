import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
export const metadata = { title: "Warranty Policy" };
export default function Page() {
  return (
    <main><TopBar /><Navigation />
    <section className="py-14 bg-white"><div className="max-w-3xl mx-auto px-4">
      <p className="section-label">Policies</p>
      <h1 className="page-heading text-4xl mb-6">Warranty Policy</h1>
      <p className="text-gray-400 text-xs mb-8">Last updated: January 2025</p>
      <p className="text-gray-700 text-sm leading-relaxed mb-6">All items sold carry a 30-day return to base warranty. Repaired items carry a 60-day checking warranty. Warranty covers faults arising during normal use. It does not cover customer-induced damage (CID), physical damage after delivery, or items listed as For Parts. Optional 2-year extended warranty available at +40% of item value.</p>
      <p className="text-gray-500 text-sm">For the full policy or questions, contact us at <a href="mailto:info@combay.co.uk" className="text-accent">info@combay.co.uk</a>.</p>
    </div></section>
    <Footer /></main>
  );
}
