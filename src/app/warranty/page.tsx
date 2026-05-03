import TopBar from "@/components/TopBar";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
export const metadata = { title: "Warranty Policy — Combay" };
export default function WarrantyPage() {
  return (
    <main><TopBar /><Navigation />
    <section className="py-14 bg-white"><div className="max-w-3xl mx-auto px-4">
      <p className="font-mono text-xs tracking-widest uppercase text-accent mb-2">Legal</p>
      <h1 className="font-display font-900 text-4xl text-navy-900 mb-6">Warranty Policy</h1>
      <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
        <p className="text-gray-400 text-xs">Last updated: January 2025</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="font-display font-800 text-2xl text-green-700 mb-1">30 Days</div>
            <div className="font-display font-700 text-navy-900 text-sm">All Purchases</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="font-display font-800 text-2xl text-blue-700 mb-1">60 Days</div>
            <div className="font-display font-700 text-navy-900 text-sm">All Repairs</div>
          </div>
        </div>
        <h2 className="font-display font-700 text-navy-900 text-lg mt-6">What Is Covered</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Faults arising during normal use within the warranty period</li>
          <li>Items that do not match their listing description</li>
          <li>For repairs: re-occurrence of the same repaired fault</li>
        </ul>
        <h2 className="font-display font-700 text-navy-900 text-lg mt-6">What Is Not Covered</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Customer-induced damage (CID)</li>
          <li>Physical damage after delivery</li>
          <li>"For Parts or Not Working" items (unless significantly misdescribed)</li>
          <li>Normal wear and tear</li>
        </ul>
        <h2 className="font-display font-700 text-navy-900 text-lg mt-6">Optional Extended Warranty</h2>
        <p>Add a 2-year warranty at checkout for an additional 40% of the product value. Covers repair or replacement of parts. CID charged additionally.</p>
      </div>
    </div></section>
    <Footer /></main>
  );
}
