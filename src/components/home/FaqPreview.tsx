"use client";
import { useState } from "react";
import Link from "next/link";

const faqs = [
  { q:"What is your delivery time for UK orders?",    a:"UK deliveries typically take 1–3 working days. EU: 2–4 days. Worldwide: 5–8 days. Express options available." },
  { q:"Do all items come with a warranty?",           a:"Yes. Every item sold carries a 30-day return to base warranty. Repaired items carry a 60-day checking warranty." },
  { q:"Can you collect same day?",                    a:"For asset recovery, we often collect the same day or next day depending on location. Contact us to confirm availability." },
  { q:"Do you ship internationally?",                 a:"Yes — we ship worldwide, excluding countries under active UK/UN trade sanctions." },
  { q:"What happens if you cannot repair my item?",   a:"If we cannot repair it, we offer a free replacement (if we have stock) or a full refund of all repair charges. Return shipping is borne by us." },
];

export default function FaqPreview() {
  const [open, setOpen] = useState<number|null>(null);
  return (
    <section className="py-16 bg-gray-50 border-t border-gray-200">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="section-label">Support</p>
            <h2 className="section-heading text-3xl">Frequently asked questions.</h2>
          </div>
          <Link href="/faq" className="text-accent font-display font-600 text-sm hover:text-accent-dark whitespace-nowrap ml-4">View all FAQs →</Link>
        </div>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <button onClick={() => setOpen(open===i?null:i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors">
                <span className="font-display font-600 text-navy-900 text-sm pr-4">{faq.q}</span>
                <span className={`text-accent text-lg flex-shrink-0 transition-transform duration-200 ${open===i?"rotate-45":""}`}>+</span>
              </button>
              {open===i && (
                <div className="px-5 pb-4 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-3 animate-fade-up">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
