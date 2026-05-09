"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { FaqItem } from "@/lib/siteContent";

const FALLBACK_TABS = [
  { key: "general", label: "General" },
  { key: "buying", label: "Buying from Combay" },
  { key: "repairing", label: "Repairing with Combay" },
  { key: "selling", label: "Selling to Combay" },
];

function inferTab(question: string) {
  const q = question.toLowerCase();
  if (q.includes("repair")) return "repairing";
  if (q.includes("sell") || q.includes("surplus") || q.includes("stock list")) return "selling";
  if (q.includes("buy") || q.includes("purchase") || q.includes("warranty") || q.includes("delivery")) return "buying";
  return "general";
}

export default function FaqPreview({ items = [] }: { items?: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const [tab, setTab] = useState("general");
  const [visualCms, setVisualCms] = useState(false);
  useEffect(() => setVisualCms(new URLSearchParams(window.location.search).get("vcms") === "1"), []);
  const grouped = useMemo(() => {
    const result: Record<string, FaqItem[]> = { general: [], buying: [], repairing: [], selling: [] };
    (items || []).forEach((item) => result[inferTab(item.question)].push(item));
    if (!Object.values(result).some((arr) => arr.length)) return result;
    return result;
  }, [items]);
  const activeItems = grouped[tab]?.length ? grouped[tab] : items.slice(0, 3);
  if (!items.length) return null;
  return (
    <section className="section-pad border-y border-slate-200 bg-[#F4F6F8]" data-vcms-collection="faq.previewItems">
      <div className="site-shell">
        <div className="mx-auto max-w-4xl">
          <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="section-label">Support</p>
              <h2 className="section-heading mt-2 text-3xl lg:text-4xl">Frequently asked questions.</h2>
            </div>
            <Link href="/faq" className="hidden text-sm font-900 text-[#C9872F] transition-colors hover:text-[#2D4F7A] sm:block">View all FAQs →</Link>
          </div>
          <div className="mb-5 flex flex-wrap gap-2">
            {FALLBACK_TABS.map((t) => <button key={t.key} type="button" onClick={() => { setTab(t.key); setOpen(0); }} className={`rounded-full border px-4 py-2 text-xs font-900 ${tab === t.key ? "border-[#2D4F7A] bg-[#2D4F7A] text-white" : "border-slate-200 bg-white text-[#2D4F7A] hover:border-[#E8A44A]"}`}>{t.label}</button>)}
          </div>
          <div className="space-y-3">
            {activeItems.map((faq, index) => {
              const expanded = visualCms || open === index;
              return (
                <div key={`${faq.question}-${index}`} data-vcms-item="faq.previewItems" data-vcms-index={index} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <button onClick={() => setOpen(open === index ? null : index)} className="flex w-full items-center justify-between gap-5 px-5 py-4 text-left transition-colors hover:bg-slate-50">
                    <span className="font-display text-base font-900 text-[#2D4F7A]">{faq.question}</span>
                    <ChevronDown size={18} className={`flex-shrink-0 text-[#C9872F] transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </button>
                  {expanded && <div className="border-t border-slate-100 px-5 py-4 text-sm leading-7 text-slate-600">{visualCms ? <p className="mb-1 font-mono text-[10px] font-800 uppercase tracking-widest text-slate-400">Answer</p> : null}<p>{faq.answer}</p></div>}
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
