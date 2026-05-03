"use client";
import { useState } from "react";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import Link from "next/link";

const FAQS = {
  sales: [
    { q:"Where are you located?", a:"We are based in Chelmsford, Essex. Physical visits are by appointment only. We are working towards opening a walk-in site." },
    { q:"What are your delivery times?", a:"UK: 1–3 working days. EU: 2–4 working days. Worldwide: 5–8 working days. Express options available at checkout." },
    { q:"How do I report a problem with my order?", a:"Log in to your Customer Portal, go to Orders, and click 'Report a Problem'. Our team will respond within 24 hours." },
    { q:"If my item arrives damaged, will I get a refund?", a:"Yes. We offer a 30-day return to base guarantee. Go to your Orders in the Customer Portal and click 'Request a Return'. We'll send a return label within 24–48 hours." },
    { q:"Can you ship before payment?", a:"Our policy is 100% advance payment prior to dispatch. We offer credit accounts to businesses with a good purchasing history — contact us to discuss." },
    { q:"I have a company procurement procedure — can you work with it?", a:"Yes. Email info@combay.co.uk with your procedure and our sales team will ensure all steps are completed correctly." },
    { q:"Do you ship internationally?", a:"Yes — we ship worldwide, except countries under active UK or UN trade sanctions." },
  ],
  repairs: [
    { q:"My item developed a fault after being returned from repair — is it covered?", a:"We will rebook collection, inspect the fault, and determine linkage to our previous work. If there is reasonable justification, we repair free of charge. If the fault is unrelated, we quote separately." },
    { q:"Do you offer calibration?", a:"Yes. We calibrate a wide range of equipment including multimeters, oscilloscopes, pressure gauges, ground bond testers, and safety analysers. Detail your requirement in the request form." },
    { q:"How long does a repair take?", a:"Between 3–21 working days depending on fault complexity and parts availability. We provide an estimated timeline in your quote." },
    { q:"Can I pay after receiving the repaired item?", a:"No — payment is required before collection. If we cannot repair the item, we issue a full refund." },
    { q:"What if you cannot repair it?", a:"We offer a free replacement (if suitable stock exists) or a full refund. Collection and return shipping is borne by us." },
  ],
  assetRecovery: [
    { q:"How much stock can you collect?", a:"From single surplus items to full warehouse clearances including liquidation and administration events. Email procurement@combay.co.uk." },
    { q:"How will I be paid?", a:"UK: payment on site before goods leave, by cash or bank transfer. International: payment within 24 hours of arrival inspection at our site." },
    { q:"How quickly can you collect?", a:"Typically 48–72 hours after quote acceptance. Timing may vary by location." },
    { q:"Do I need a stock list ready?", a:"No. A few photos is sufficient. We can also arrange a free visit to assess in person." },
    { q:"Can I trade surplus stock against a purchase?", a:"Yes. We deduct fair value from your purchase total. We drop and collect on the same visit." },
  ],
};

const TABS = [
  { key:"sales",         label:"Sales" },
  { key:"repairs",       label:"Repairs" },
  { key:"assetRecovery", label:"Asset Recovery" },
];

function Accordion({ items }: { items:{q:string;a:string}[] }) {
  const [open, setOpen] = useState<number|null>(null);
  return (
    <div className="space-y-2">
      {items.map((item,i) => (
        <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
          <button onClick={() => setOpen(open===i?null:i)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors">
            <span className="font-display font-600 text-navy-900 text-sm pr-4">{item.q}</span>
            <span className={`text-accent text-xl flex-shrink-0 transition-transform duration-200 ${open===i?"rotate-45":""}`}>+</span>
          </button>
          {open===i && (
            <div className="px-5 pb-4 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-3">{item.a}</div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function FaqPage() {
  const [tab, setTab] = useState("sales");
  return (
    <main>
      <TopBar />
      <Navigation />
      <section className="py-14 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <p className="section-label">Support</p>
          <h1 className="page-heading text-4xl mb-2">Frequently Asked Questions</h1>
          <p className="text-gray-500 mb-8 text-sm">
            Can&apos;t find what you need? Email <a href="mailto:info@combay.co.uk" className="text-accent hover:text-accent-dark">info@combay.co.uk</a> and we&apos;ll respond within 24 hours.
          </p>
          <div className="flex flex-wrap gap-2 mb-8">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`font-display font-600 text-sm px-5 py-2.5 rounded-lg border transition-all ${
                  tab===t.key ? "bg-navy-900 text-white border-navy-900" : "bg-white text-navy-800 border-gray-200 hover:border-navy-900"}`}>
                {t.label}
              </button>
            ))}
          </div>
          <Accordion items={FAQS[tab as keyof typeof FAQS]}/>
          <div className="mt-10 bg-gray-50 border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <p className="font-display font-700 text-navy-900 text-sm mb-1">Still have questions?</p>
              <p className="text-gray-500 text-xs">Our team responds within 24 hours.</p>
            </div>
            <Link href="/contact" className="btn-primary flex-shrink-0 whitespace-nowrap">Contact Us →</Link>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
