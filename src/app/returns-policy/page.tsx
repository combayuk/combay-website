import TopBar from "@/components/TopBar";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
export const metadata = { title: "Returns Policy — Combay" };
export default function ReturnsPage() {
  return (
    <main><TopBar /><Navigation />
    <section className="py-14 bg-white"><div className="max-w-3xl mx-auto px-4">
      <p className="font-mono text-xs tracking-widest uppercase text-accent mb-2">Legal</p>
      <h1 className="font-display font-900 text-4xl text-navy-900 mb-6">Returns Policy</h1>
      <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
        <p className="text-gray-400 text-xs">Last updated: January 2025</p>
        <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
          <strong className="font-display font-700 text-navy-900">30-day return to base guarantee</strong> on all purchases.
        </div>
        <h2 className="font-display font-700 text-navy-900 text-lg mt-6">How to Request a Return</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Log in to your Customer Portal</li>
          <li>Go to the Orders tab and find your order</li>
          <li>Click "Request a Return" (active for 30 days from delivery)</li>
          <li>We provide a return shipping label within 24–48 hours</li>
          <li>Attach the label and drop off or await collection</li>
        </ol>
        <h2 className="font-display font-700 text-navy-900 text-lg mt-6">Conditions</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Items must be returned in the same condition as received</li>
          <li>Must be requested within 30 days of confirmed delivery</li>
          <li>"For Parts / Not Working" items not eligible unless significantly misdescribed</li>
          <li>Customer-induced damage is not covered</li>
        </ul>
        <h2 className="font-display font-700 text-navy-900 text-lg mt-6">Refunds</h2>
        <p>Processed within 5–7 working days of receiving the return, to the original payment method.</p>
      </div>
    </div></section>
    <Footer /></main>
  );
}
