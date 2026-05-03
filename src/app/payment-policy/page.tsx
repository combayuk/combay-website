import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
export const metadata = { title: "Payment Policy" };
export default function Page() {
  return (
    <main><TopBar /><Navigation />
    <section className="py-14 bg-white"><div className="max-w-3xl mx-auto px-4">
      <p className="section-label">Policies</p>
      <h1 className="page-heading text-4xl mb-6">Payment Policy</h1>
      <p className="text-gray-400 text-xs mb-8">Last updated: January 2025</p>
      <p className="text-gray-700 text-sm leading-relaxed mb-6">100% payment is required in advance prior to dispatch on all orders. Accepted methods: bank transfer (BACS/CHAPS), credit/debit card, PayPal (where available), and cash (in-person collection only). Credit accounts are available to businesses with a proven purchasing history. Contact info@combay.co.uk to apply.</p>
      <p className="text-gray-500 text-sm">For the full policy or questions, contact us at <a href="mailto:info@combay.co.uk" className="text-accent">info@combay.co.uk</a>.</p>
    </div></section>
    <Footer /></main>
  );
}
