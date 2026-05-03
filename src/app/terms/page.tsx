import TopBar from "@/components/TopBar";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
export const metadata = { title: "Terms & Conditions — Combay" };
export default function TermsPage() {
  return (
    <main><TopBar /><Navigation />
    <section className="py-14 bg-white"><div className="max-w-3xl mx-auto px-4">
      <p className="font-mono text-xs tracking-widest uppercase text-accent mb-2">Legal</p>
      <h1 className="font-display font-900 text-4xl text-navy-900 mb-6">Terms &amp; Conditions</h1>
      <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
        <p className="text-gray-400 text-xs">Last updated: January 2025</p>
        <h2 className="font-display font-700 text-navy-900 text-lg mt-6">1. General</h2>
        <p>These terms govern your use of Combay's website and services. By placing an order or using our services, you agree to be bound by these terms. Combay Ltd is registered in England and Wales.</p>
        <h2 className="font-display font-700 text-navy-900 text-lg mt-6">2. Orders &amp; Payment</h2>
        <p>All orders require 100% payment in advance prior to dispatch. We reserve the right to cancel any order at our discretion. Prices are in GBP and exclusive of VAT unless stated.</p>
        <h2 className="font-display font-700 text-navy-900 text-lg mt-6">3. Warranty</h2>
        <p>All items carry a 30-day return to base warranty. Repaired items carry a 60-day checking warranty. Warranty does not cover customer-induced damage. See our Warranty Policy for full details.</p>
        <h2 className="font-display font-700 text-navy-900 text-lg mt-6">4. Returns</h2>
        <p>Returns must be requested within 30 days of delivery. See our Returns Policy for the full procedure.</p>
        <h2 className="font-display font-700 text-navy-900 text-lg mt-6">5. Liability</h2>
        <p>Combay's liability shall not exceed the purchase price of the item. We are not liable for consequential losses from equipment downtime or failure.</p>
        <h2 className="font-display font-700 text-navy-900 text-lg mt-6">6. Governing Law</h2>
        <p>These terms are governed by English law. Disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
        <p className="text-gray-400 text-xs mt-8">Questions: info@combay.co.uk</p>
      </div>
    </div></section>
    <Footer /></main>
  );
}
