"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { FaqItem } from "@/lib/siteContent";

export default function FaqPreview({ items = [] }: { items?: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const [visualCms, setVisualCms] = useState(false);
  useEffect(() => setVisualCms(new URLSearchParams(window.location.search).get("vcms") === "1"), []);
  const faqs = items.length ? items : [];
  if (!faqs.length) return null;
  return (
    <section className="section-pad border-y border-slate-200 bg-[#F4F6F8]" data-vcms-collection="faq.previewItems">
      <div className="site-shell">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-end justify-between gap-5">
            <div>
              <p className="section-label">Support</p>
              <h2 className="section-heading mt-2 text-3xl lg:text-4xl">Frequently asked questions.</h2>
            </div>
            <Link href="/faq" className="hidden text-sm font-900 text-[#B87908] transition-colors hover:text-[#06101F] sm:block">View all FAQs →</Link>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const expanded = visualCms || open === index;
              return (
                <div key={`${faq.question}-${index}`} data-vcms-item="faq.previewItems" data-vcms-index={index} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <button onClick={() => setOpen(open === index ? null : index)} className="flex w-full items-center justify-between gap-5 px-5 py-4 text-left transition-colors hover:bg-slate-50">
                    <span className="font-display text-base font-900 text-[#06101F]">{faq.question}</span>
                    <ChevronDown size={18} className={`flex-shrink-0 text-[#B87908] transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </button>
                  {expanded && (
                    <div className="border-t border-slate-100 px-5 py-4 text-sm leading-7 text-slate-600">
                      {visualCms ? <p className="mb-1 font-mono text-[10px] font-800 uppercase tracking-widest text-slate-400">Answer</p> : null}
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <Link href="/faq" className="btn-secondary mt-6 sm:hidden">View all FAQs</Link>
        </div>
      </div>
    </section>
  );
}
