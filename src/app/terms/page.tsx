import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
export const metadata = { title: "Terms & Conditions" };
export default function Page() {
  return (
    <main><TopBar /><Navigation />
    <section className="py-14 bg-white"><div className="max-w-3xl mx-auto px-4">
      <p className="section-label">Policies</p>
      <h1 className="page-heading text-4xl mb-6">Terms &amp; Conditions</h1>
      <p className="text-gray-400 text-xs mb-8">Last updated: January 2025</p>
      <p className="text-gray-700 text-sm leading-relaxed mb-6">These terms govern your use of Combay's website and services. By placing an order, you agree to be bound by these terms. Combay Ltd is registered in England and Wales. All orders require 100% payment in advance. Items carry a 30-day warranty. Disputes are subject to English law.</p>
      <p className="text-gray-500 text-sm">For the full policy or questions, contact us at <a href="mailto:info@combay.co.uk" className="text-accent">info@combay.co.uk</a>.</p>
    </div></section>
    <Footer /></main>
  );
}
