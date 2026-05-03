import type { Metadata } from "next";
import { Suspense } from "react";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import ContactForm from "@/components/forms/ContactForm";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Combay. Enquiries, quotes, repairs, asset recovery — we respond within 24 hours.",
};

export default function ContactPage() {
  return (
    <main>
      <TopBar />
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <p className="section-label">Contact</p>
            <h1 className="page-heading text-4xl mb-4">Get in touch.</h1>
            <p className="text-gray-500 mb-8 leading-relaxed">We respond to all enquiries within 24 hours. For urgent requirements, call or WhatsApp directly.</p>
            <div className="space-y-5">
              {[
                { icon:"✉", label:"General Sales", val:"info@combay.co.uk",            href:"mailto:info@combay.co.uk" },
                { icon:"✉", label:"Repair Service",val:"service@combay.co.uk",          href:"mailto:service@combay.co.uk" },
                { icon:"✉", label:"Asset Recovery",val:"procurement@combay.co.uk",       href:"mailto:procurement@combay.co.uk" },
                { icon:"☎", label:"Phone / WhatsApp",val:"+44 7340 383334",              href:"tel:+447340383334" },
                { icon:"⌖", label:"Location",      val:"Chelmsford, Essex, UK",          href:"#" },
              ].map(c => (
                <a key={c.label} href={c.href} className="flex items-start gap-4 group">
                  <div className="w-9 h-9 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center text-sm flex-shrink-0 group-hover:border-accent transition-colors">{c.icon}</div>
                  <div>
                    <p className="font-display font-700 text-navy-900 text-sm">{c.label}</p>
                    <p className="text-gray-500 text-sm group-hover:text-accent transition-colors">{c.val}</p>
                  </div>
                </a>
              ))}
            </div>
            <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-5">
              <p className="font-display font-700 text-navy-900 text-sm mb-1">Business Hours</p>
              <p className="text-gray-500 text-xs leading-relaxed">Monday – Friday: 9:00am – 5:30pm GMT<br/>Enquiries submitted outside hours are responded to the next working day.</p>
            </div>
          </div>
          <div>
            <h2 className="font-display font-700 text-navy-900 text-xl mb-6">Send us a message</h2>
            <Suspense fallback={<div className="text-gray-400 text-sm">Loading form...</div>}>
              <ContactForm />
            </Suspense>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
