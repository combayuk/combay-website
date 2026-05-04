import type { Metadata } from "next";
import { Suspense } from "react";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import ContactForm from "@/components/forms/ContactForm";

export const metadata: Metadata = {
  title: "Contact Combay",
  description: "Get in touch with Combay. Enquiries, quotes, repairs, asset recovery. We respond within 24 hours.",
};

export default function ContactPage() {
  return (
    <main>
      <TopBar />
      <Navigation />

      <section className="bg-navy-950 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-mono text-[10px] tracking-widest uppercase text-accent mb-2">Contact</p>
          <h1 className="font-display font-800 text-4xl mb-2">Get in touch.</h1>
          <p className="text-white/60 text-sm">We respond to all enquiries within 24 hours.</p>
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12">

            {/* Left — info + map */}
            <div>
              <div className="space-y-4 mb-8">
                {[
                  {icon:"✉",label:"Sales",    val:"info@combay.co.uk",          href:"mailto:info@combay.co.uk"},
                  {icon:"✉",label:"Repairs",  val:"service@combay.co.uk",       href:"mailto:service@combay.co.uk"},
                  {icon:"✉",label:"Procurement",val:"procurement@combay.co.uk",href:"mailto:procurement@combay.co.uk"},
                  {icon:"☎",label:"Phone",    val:"+44 7340 383334",             href:"tel:+447340383334"},
                  {icon:"⌖",label:"Location", val:"Chelmsford, Essex, UK",       href:"#map"},
                ].map(c=>(
                  <a key={c.label} href={c.href} className="flex items-start gap-4 group">
                    <div className="w-9 h-9 bg-surface border border-gray-200 rounded-lg flex items-center justify-center text-sm flex-shrink-0 group-hover:border-accent transition-colors">{c.icon}</div>
                    <div>
                      <p className="font-display font-700 text-navy-950 text-sm">{c.label}</p>
                      <p className="text-gray-500 text-sm group-hover:text-accent transition-colors">{c.val}</p>
                    </div>
                  </a>
                ))}
              </div>

              <div className="bg-surface border border-gray-200 rounded-xl p-4 mb-6">
                <p className="font-display font-700 text-navy-950 text-sm mb-1">Business Hours</p>
                <p className="text-gray-500 text-xs leading-relaxed">Monday–Friday: 9:00am–5:30pm GMT<br/>Enquiries outside hours are answered the next working day.</p>
              </div>

              {/* Google Map */}
              <div id="map" className="rounded-2xl overflow-hidden border border-gray-200 shadow-card">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d79876.47!2d0.4736!3d51.7343!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47d8945a6c3d53ad%3A0xe3a6e3d6c09c82d9!2sChelmsford%2C%20UK!5e0!3m2!1sen!2suk!4v1"
                  width="100%" height="280" style={{border:0}} allowFullScreen loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Combay location — Chelmsford, Essex"
                />
              </div>
            </div>

            {/* Right — form */}
            <div>
              <h2 className="font-display font-700 text-navy-950 text-xl mb-6">Send us a message</h2>
              <Suspense fallback={<div className="text-gray-400 text-sm">Loading form...</div>}>
                <ContactForm />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
