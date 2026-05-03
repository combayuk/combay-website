import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
export const metadata = { title: "Returns Policy" };
export default function Page() {
  return (
    <main><TopBar /><Navigation />
    <section className="py-14 bg-white"><div className="max-w-3xl mx-auto px-4">
      <p className="section-label">Policies</p>
      <h1 className="page-heading text-4xl mb-6">Returns Policy</h1>
      <p className="text-gray-400 text-xs mb-8">Last updated: January 2025</p>
      <p className="text-gray-700 text-sm leading-relaxed mb-6">We offer a 30-day return to base guarantee on all purchases. To request a return, log in to your Customer Portal and click 'Request a Return' within 30 days of delivery. We issue a return label within 24–48 hours. Refunds are processed within 5–7 working days of receiving the return.</p>
      <p className="text-gray-500 text-sm">For the full policy or questions, contact us at <a href="mailto:info@combay.co.uk" className="text-accent">info@combay.co.uk</a>.</p>
    </div></section>
    <Footer /></main>
  );
}
