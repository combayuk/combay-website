"use client";
import { useState } from "react";
import TopBar from "@/components/TopBar";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const faqs = {
  sales: [
    {
      q: "Where is your site?",
      a: "We are based in Chelmsford, Essex. Whilst physical visits are only by appointment, we will soon be opening our walk-in site.",
    },
    {
      q: "What are your delivery times?",
      a: "Delivery time varies depending on destination. On average, UK deliveries take 1–3 working days, 2–4 working days for the EU, and 5–8 working days worldwide.",
    },
    {
      q: "How do I report a problem with my order?",
      a: "In your account, click on the Orders tab. You will see options to 'Request a Return' (if you need to return) or 'Report a Problem' (if your order hasn't arrived or there's another issue).",
    },
    {
      q: "If my item arrives damaged, will I get a refund?",
      a: "We offer a 30-day return to base guarantee on all purchases. Click on 'Request a Return' in the Orders tab in your account dashboard. We will provide a return shipping label within 24–48 hours.",
    },
    {
      q: "Can you ship prior to payment?",
      a: "Our policy is strictly 100% advanced payment prior to shipment. We offer a credit system to businesses with a good purchasing history — please contact us to discuss.",
    },
    {
      q: "I want to order as a company but we have an internal procurement procedure.",
      a: "We respect company policies and are here to help you make your purchase. Simply email us at info@combay.co.uk detailing your procurement procedure and our sales team will stay proactive in ensuring all steps are adhered to.",
    },
  ],
  repairs: [
    {
      q: "After receiving my item back, it developed another fault. Is it covered under the 60-day repair warranty?",
      a: "We will rebook your item for collection to inspect the fault and any linkage to the previous repair. We will provide a free diagnosis and offer free repair if there's reasonable justification. If the fault is independent of our work, we will send you a repair quote.",
    },
    {
      q: "Do you offer calibration of test equipment?",
      a: "Yes. We have the tools and expertise to calibrate a wide range of goods including detectors, safety analysers, ground bond testers, and more. Simply detail your requirements in the repair request form and we will confirm if we can calibrate your item.",
    },
    {
      q: "How long does a repair take?",
      a: "Repair time depends on fault complexity and parts availability. It can take anywhere from 3–21 working days. We will provide an estimated timeline in the repair quote we send upon inspection.",
    },
    {
      q: "Can I pay for the repair after receiving the item?",
      a: "We do not offer post-paid services. However, if you find your item is still faulty after repair, we will inspect and attempt repair again free of charge. If we still cannot repair it, we will offer a full refund of the charges paid.",
    },
    {
      q: "What happens if you can't repair my equipment?",
      a: "If we are unable to repair for any reason, we will offer a free replacement (if we have the stock) or a full refund on your repair charges. Collection and return shipping is borne by us.",
    },
  ],
  assetRecovery: [
    {
      q: "How much stock can you pick up?",
      a: "We are able to clear entire warehouses — such as in the event of liquidation or administration — and also pick up a few surplus items from your home or garage. Email procurement@combay.co.uk with details of what you have.",
    },
    {
      q: "How will I get paid?",
      a: "For UK collections, we usually pay upon visiting your site. Payment methods include cash, bank transfer, or most other methods. For international clients, we arrange free pickup via courier, inspect goods on arrival, and disburse payment within 24 hours of inspection.",
    },
    {
      q: "How soon can you collect?",
      a: "We are able to collect within 48–72 hours of quote finalisation, though this can vary depending on your location and available staff or couriers.",
    },
    {
      q: "Do I need a stock list ready?",
      a: "No. A few photos of what you have is sufficient to get started. We can also arrange a free visit to assess the goods ourselves.",
    },
    {
      q: "Can I trade in my stock against a purchase?",
      a: "Yes. If you have stock to sell and you're also interested in items from our catalogue, we deduct the fair value of your goods from your total purchase value. We drop and collect the same day.",
    },
  ],
};

const tabLabels = [
  { key: "sales", label: "Sales" },
  { key: "repairs", label: "Repairs" },
  { key: "assetRecovery", label: "Asset Recovery" },
];

function Accordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="font-display font-600 text-navy-900 text-sm pr-4">{item.q}</span>
            <span className={`text-accent text-lg flex-shrink-0 transition-transform duration-200 ${open === i ? "rotate-45" : ""}`}>+</span>
          </button>
          {open === i && (
            <div className="px-5 pb-4 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-3">
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function FAQPage() {
  const [activeTab, setActiveTab] = useState("sales");

  return (
    <main>
      <TopBar />
      <Navigation />

      <section className="py-14 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <p className="font-mono text-xs tracking-widest uppercase text-accent mb-2">Support</p>
          <h1 className="font-display font-900 text-4xl text-navy-900 mb-2">Frequently Asked Questions</h1>
          <p className="text-gray-500 mb-8">Can't find your answer? Email us at <a href="mailto:info@combay.co.uk" className="text-accent hover:text-accent-dark">info@combay.co.uk</a></p>

          {/* Tabs */}
          <div className="flex gap-2 mb-8">
            {tabLabels.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`font-display font-600 text-sm px-5 py-2.5 rounded-lg border transition-all ${
                  activeTab === t.key
                    ? "bg-navy-900 text-white border-navy-900"
                    : "bg-white text-navy-800 border-gray-200 hover:border-navy-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <Accordion items={faqs[activeTab as keyof typeof faqs]} />
        </div>
      </section>

      <Footer />
    </main>
  );
}
