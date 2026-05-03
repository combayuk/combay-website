import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
export const metadata = { title: "Shipping Policy" };
export default function Page() {
  return (
    <main><TopBar /><Navigation />
    <section className="py-14 bg-white"><div className="max-w-3xl mx-auto px-4">
      <p className="section-label">Policies</p>
      <h1 className="page-heading text-4xl mb-6">Shipping Policy</h1>
      <p className="text-gray-400 text-xs mb-8">Last updated: January 2025</p>
      <p className="text-gray-700 text-sm leading-relaxed mb-6">UK deliveries: 1–3 working days. EU: 2–4 working days. Worldwide: 5–8 working days. We ship to all destinations except countries under active UK or UN trade sanctions. Express delivery options are available at checkout. Free collection available for asset recovery and repair services.</p>
      <p className="text-gray-500 text-sm">For the full policy or questions, contact us at <a href="mailto:info@combay.co.uk" className="text-accent">info@combay.co.uk</a>.</p>
    </div></section>
    <Footer /></main>
  );
}
