import TopBar from "@/components/TopBar";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
export const metadata = { title: "Payment Policy — Combay" };
export default function PaymentPage() {
  return (
    <main><TopBar /><Navigation />
    <section className="py-14 bg-white"><div className="max-w-3xl mx-auto px-4">
      <p className="font-mono text-xs tracking-widest uppercase text-accent mb-2">Legal</p>
      <h1 className="font-display font-900 text-4xl text-navy-900 mb-6">Payment Policy</h1>
      <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
        <p className="text-gray-400 text-xs">Last updated: January 2025</p>
        <div className="bg-navy-900 text-white rounded-lg p-4">
          <strong className="font-display font-700">100% advanced payment required</strong> prior to dispatch on all orders.
        </div>
        <h2 className="font-display font-700 text-navy-900 text-lg mt-6">Accepted Methods</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Bank transfer (BACS / CHAPS)</li>
          <li>Credit / Debit card</li>
          <li>PayPal (where available)</li>
          <li>Cash (in-person collection only)</li>
        </ul>
        <h2 className="font-display font-700 text-navy-900 text-lg mt-6">Credit Accounts</h2>
        <p>Available to businesses with a proven purchasing history. Contact info@combay.co.uk to apply.</p>
        <h2 className="font-display font-700 text-navy-900 text-lg mt-6">Procurement Procedures</h2>
        <p>We accommodate internal procurement processes including PO requirements. Email info@combay.co.uk and our team will work with your procedures.</p>
        <h2 className="font-display font-700 text-navy-900 text-lg mt-6">Repair Payments</h2>
        <p>Payment required upon acceptance of the repair quote, prior to collection. Full refund issued if repair cannot be completed.</p>
        <h2 className="font-display font-700 text-navy-900 text-lg mt-6">Asset Recovery Payments</h2>
        <p>UK: paid on-site before goods leave. International: paid within 24 hours of arrival inspection.</p>
      </div>
    </div></section>
    <Footer /></main>
  );
}
