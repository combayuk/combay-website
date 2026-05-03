import TopBar from "@/components/TopBar";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
export const metadata = { title: "Privacy Policy — Combay" };
export default function PrivacyPage() {
  return (
    <main><TopBar /><Navigation />
    <section className="py-14 bg-white"><div className="max-w-3xl mx-auto px-4">
      <p className="font-mono text-xs tracking-widest uppercase text-accent mb-2">Legal</p>
      <h1 className="font-display font-900 text-4xl text-navy-900 mb-6">Privacy Policy</h1>
      <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
        <p className="text-gray-400 text-xs">Last updated: January 2025</p>
        <h2 className="font-display font-700 text-navy-900 text-lg mt-6">1. Data We Collect</h2>
        <p>We collect personal data you provide when registering, placing orders, or contacting us — including name, email, phone, company name, and delivery address.</p>
        <h2 className="font-display font-700 text-navy-900 text-lg mt-6">2. How We Use Your Data</h2>
        <p>Your data is used to process orders, provide customer support, send order updates, and (with consent) marketing communications. We do not sell your data to third parties.</p>
        <h2 className="font-display font-700 text-navy-900 text-lg mt-6">3. Cookies</h2>
        <p>We use essential cookies to operate the website and optional analytics cookies to improve performance. You can manage preferences at any time.</p>
        <h2 className="font-display font-700 text-navy-900 text-lg mt-6">4. Data Retention</h2>
        <p>We retain data as long as necessary to fulfil the purposes it was collected for, including legal and accounting requirements.</p>
        <h2 className="font-display font-700 text-navy-900 text-lg mt-6">5. Your Rights (GDPR)</h2>
        <p>You have the right to access, rectify, or erase your personal data. Contact info@combay.co.uk to exercise these rights.</p>
        <p className="text-gray-400 text-xs mt-8">Questions: info@combay.co.uk</p>
      </div>
    </div></section>
    <Footer /></main>
  );
}
