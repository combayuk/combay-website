"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { FaqItem } from "@/lib/siteContent";

export default function FaqPreview({ items = [] }: { items?: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [visualCms, setVisualCms] = useState(false);
  useEffect(() => {
    setVisualCms(new URLSearchParams(window.location.search).get("vcms") === "1");
  }, []);
  const faqs = items.length ? items : [];
  if (!faqs.length) return null;
  return (
    <section className="py-16 bg-gray-50 border-t border-gray-200" data-vcms-collection="faq.previewItems">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="section-label">Support</p>
            <h2 className="section-heading text-3xl">Frequently asked questions.</h2>
          </div>
          <Link href="/faq" className="text-accent font-display font-600 text-sm hover:text-accent-dark whitespace-nowrap ml-4">View all FAQs →</Link>
        </div>
        <div className="space-y-2">
          {faqs.map((faq, i) => {
            const expanded = visualCms || open === i;
            return (
              <div key={`${faq.question}-${i}`} data-vcms-item="faq.previewItems" data-vcms-index={i} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50">
                  <span className="font-display font-600 text-navy-900 text-sm pr-4">{faq.question}</span>
                  <span className={`text-accent text-lg flex-shrink-0 ${expanded ? "rotate-45" : ""}`}>+</span>
                </button>
                {expanded && (
                  <div className="px-5 pb-4 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-3">
                    {visualCms ? <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-gray-400">Answer</p> : null}
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
