"use client";
import { useState } from "react";
import Link from "next/link";
import { ZoomIn, FileText, HelpCircle, BookOpen, AlignLeft } from "lucide-react";

const DEMO = {
  title: "Siemens S7-400 PLC CPU 412-2 Module",
  brand: "Siemens", manufacturer: "Siemens AG", model: "CPU 412-2",
  mpn: "6ES7412-2XJ05-0AB0", sku: "CB10001", condition: "USED",
  price: 1240, priceOnRequest: false, stockQty: 2,
  category: { name: "Automation & Control", slug: "automation-control" },
  description: `This Siemens S7-400 CPU 412-2 is in fully tested, operational used condition. All core functions including power-on, I/O communication, and program execution have been verified. The unit shows normal cosmetic wear consistent with industrial use.\n\nWhat's included:\n• 1x Siemens S7-400 CPU 412-2 module (6ES7412-2XJ05-0AB0)\n• 4MB memory card\n• 30-day Combay return to base warranty\n\nHardware version: 6 | Firmware: V7.0 | Memory card: 4MB included`,
  productOverview: `The Siemens SIMATIC S7-400 is a high-performance PLC designed for demanding process-critical automation. The CPU 412-2 offers fast cycle times, extensive I/O capacity, and robust communication.\n\nKey specifications:\n- Work memory: 144KB (72KB code / 72KB data)\n- Processing: 0.05ms per 1K instructions\n- I/O: Up to 131,072 digital / 8,192 analogue channels\n- Comms: MPI 187.5kbit/s, PROFIBUS DP 12Mbit/s\n\nWidely deployed in automotive, energy, chemical, and pharmaceutical industries.`,
  faqs: [
    { q: "Is this compatible with my S7-400 rack?", a: "Yes — all S7-400 CPUs mount on the standard universal rack. Ensure your PS module rating meets the combined current draw." },
    { q: "Does this work with TIA Portal?", a: "This CPU requires SIMATIC STEP 7 v5.5+. It is not natively compatible with TIA Portal without a migration project." },
    { q: "What warranty is included?", a: "30-day return to base warranty. Optional 2-year extended warranty available at +40% of item value." },
    { q: "How long is delivery?", a: "UK: dispatch 1–2 working days, delivery 1–3 days. Express available at checkout." },
  ],
  documents: [
    { name: "Siemens S7-400 System Manual", url: "#", fileType: "PDF" },
    { name: "CPU 412-2 Hardware Description", url: "#", fileType: "PDF" },
  ],
  addonSupport: true, addonWarranty: true, addonInstall: false,
  tags: ["PLC", "Siemens", "S7-400", "Automation"],
};

const COND_BADGE: Record<string, { label: string; color: string }> = {
  NEW:          { label: "New",           color: "text-green-700 bg-green-50 border-green-200" },
  NEW_OPEN_BOX: { label: "New (Open Box)",color: "text-blue-700 bg-blue-50 border-blue-200" },
  USED:         { label: "Used",          color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
  FOR_PARTS:    { label: "For Parts",     color: "text-red-700 bg-red-50 border-red-200" },
};

type Tab = "description" | "overview" | "faq" | "documents";

export default function ProductDetail({ slug }: { slug: string }) {
  const p = DEMO;
  const cond = COND_BADGE[p.condition] ?? { label: p.condition, color: "text-gray-700 bg-gray-50 border-gray-200" };
  const [tab,  setTab]  = useState<Tab>("description");
  const [imgIdx, setImgIdx] = useState(0);
  const [addons, setAddons] = useState({ support: false, warranty: false, install: false });
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [enquirySent, setEnquirySent] = useState(false);

  const addonCost = (addons.support  && p.addonSupport  ? p.price * 0.10 : 0)
                  + (addons.warranty && p.addonWarranty ? p.price * 0.40 : 0)
                  + (addons.install  && p.addonInstall  ? p.price * 0.35 : 0);
  const total = p.price + addonCost;
  const fmt = (n: number) => `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "description", label: "Description",      icon: <AlignLeft size={14}/> },
    { id: "overview",    label: "Product Overview",  icon: <BookOpen size={14}/> },
    { id: "faq",         label: "FAQ",               icon: <HelpCircle size={14}/> },
    { id: "documents",   label: "Documents",         icon: <FileText size={14}/> },
  ];

  return (
    <div className="bg-white">
      {/* Breadcrumb */}
      <div className="border-b border-gray-100 py-3">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-2 text-xs text-gray-400 flex-wrap">
          <Link href="/" className="hover:text-navy-900">Home</Link><span>/</span>
          <Link href="/shop" className="hover:text-navy-900">Shop</Link><span>/</span>
          <Link href={`/shop?category=${p.category.slug}`} className="hover:text-navy-900">{p.category.name}</Link><span>/</span>
          <span className="text-navy-900 font-600 truncate max-w-xs">{p.title}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-10 mb-12">

          {/* ── Gallery ── */}
          <div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl aspect-square flex items-center justify-center relative overflow-hidden mb-3 group cursor-zoom-in">
              <div className="text-gray-300 text-8xl select-none">📦</div>
              <div className="absolute top-2 right-2 bg-white border border-gray-200 rounded p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <ZoomIn size={14} className="text-gray-500"/>
              </div>
            </div>
            <div className="flex gap-2">
              {[0, 1, 2].map(i => (
                <button key={i} onClick={() => setImgIdx(i)}
                  className={`w-16 h-16 bg-gray-50 border rounded-lg flex items-center justify-center transition-colors ${imgIdx === i ? "border-accent" : "border-gray-200 hover:border-gray-400"}`}>
                  <span className="text-gray-300 text-xl">📦</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Info panel ── */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Link href={`/shop?category=${p.category.slug}`} className="font-mono text-xs text-accent tracking-widest uppercase hover:text-accent-dark">
                {p.category.name}
              </Link>
              <span className={`badge border ${cond.color}`}>{cond.label}</span>
              {p.stockQty > 0
                ? <span className="badge text-green-700 bg-green-50 border-green-200">In Stock ({p.stockQty})</span>
                : <span className="badge text-red-700 bg-red-50 border-red-200">Out of Stock</span>}
            </div>

            <h1 className="font-display font-800 text-2xl lg:text-3xl text-navy-900 leading-tight mb-3">{p.title}</h1>

            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-5">
              {[["Brand", p.brand], ["Manufacturer", p.manufacturer], ["Model", p.model], ["MPN", p.mpn], ["SKU", p.sku]].map(([k,v]) => v ? (
                <div key={k} className="flex items-center gap-1.5">
                  <span className="text-gray-400 text-xs">{k}:</span>
                  <span className="text-navy-900 font-display font-600 text-xs">{v}</span>
                </div>
              ) : null)}
            </div>

            {/* Price box */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-5">
              {p.priceOnRequest ? (
                <p className="font-display font-700 text-xl text-navy-900 mb-1">Price on Request</p>
              ) : (
                <div className="mb-1">
                  <span className="font-display font-900 text-3xl text-navy-900">{fmt(total)}</span>
                  {addonCost > 0 && <span className="text-gray-400 text-sm ml-2">incl. add-ons</span>}
                </div>
              )}
              <p className="text-gray-400 text-xs mb-4">Excl. VAT · 100% payment required prior to dispatch</p>

              {/* Add-ons */}
              {(p.addonSupport || p.addonWarranty || p.addonInstall) && (
                <div className="border-t border-gray-200 pt-4 space-y-2.5">
                  <p className="font-display font-700 text-xs text-gray-500 uppercase tracking-wider">Optional Add-ons</p>
                  {p.addonSupport && (
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={addons.support} onChange={e => setAddons(a => ({...a, support: e.target.checked}))}
                        className="mt-0.5 accent-accent"/>
                      <div>
                        <p className="font-display font-600 text-sm text-navy-900">2-Year Technical Support <span className="text-accent">+{fmt(p.price*0.10)}</span></p>
                        <p className="text-xs text-gray-400">Phone-based technical support and priority customer service for 2 years.</p>
                      </div>
                    </label>
                  )}
                  {p.addonWarranty && (
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={addons.warranty} onChange={e => setAddons(a => ({...a, warranty: e.target.checked}))}
                        className="mt-0.5 accent-accent"/>
                      <div>
                        <p className="font-display font-600 text-sm text-navy-900">2-Year Extended Warranty <span className="text-accent">+{fmt(p.price*0.40)}</span></p>
                        <p className="text-xs text-gray-400">Repair or replace parts for 2 years. CID charged additionally.</p>
                      </div>
                    </label>
                  )}
                  {p.addonInstall && (
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={addons.install} onChange={e => setAddons(a => ({...a, install: e.target.checked}))}
                        className="mt-0.5 accent-accent"/>
                      <div>
                        <p className="font-display font-600 text-sm text-navy-900">Installation & Setup <span className="text-accent">+{fmt(p.price*0.35)}</span></p>
                        <p className="text-xs text-gray-400">Engineers configure and set up equipment to your requirements.</p>
                      </div>
                    </label>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2 mt-5">
                {p.priceOnRequest ? (
                  <button onClick={() => setShowEnquiry(true)} className="btn-primary w-full justify-center py-3">Request a Quote →</button>
                ) : (
                  <Link href={`/contact?type=quote&product=${p.sku}&price=${total}`} className="btn-primary w-full justify-center py-3">Request a Quote →</Link>
                )}
                <button onClick={() => setShowEnquiry(true)} className="btn-secondary w-full justify-center py-2.5">Ask a Question</button>
              </div>
            </div>

            {/* Trust pills */}
            <div className="flex flex-wrap gap-2">
              {["30-Day Warranty", "Free UK Delivery £250+", "Expert Support", "Genuine Stock"].map(t => (
                <span key={t} className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-2.5 py-1 font-display font-600">✓ {t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tabs ── STRICT: Description / Product Overview / FAQ / Documents only */}
        <div className="border border-gray-200 rounded-xl overflow-hidden mb-10">
          <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto no-scrollbar">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-5 py-3.5 font-display font-600 text-sm whitespace-nowrap border-b-2 transition-colors ${
                  tab === t.id ? "border-accent text-accent bg-white" : "border-transparent text-gray-500 hover:text-navy-900"}`}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
          <div className="p-6 lg:p-8">
            {tab === "description" && (
              <div className="max-w-3xl">
                <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{p.description}</div>
              </div>
            )}
            {tab === "overview" && (
              <div className="max-w-3xl">
                <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{p.productOverview}</div>
              </div>
            )}
            {tab === "faq" && (
              <div className="max-w-2xl space-y-3">
                {p.faqs.map((faq, i) => (
                  <details key={i} className="border border-gray-200 rounded-lg">
                    <summary className="px-4 py-3 font-display font-600 text-sm text-navy-900 cursor-pointer list-none flex items-center justify-between">
                      {faq.q}<span className="text-accent text-lg ml-3">+</span>
                    </summary>
                    <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">{faq.a}</div>
                  </details>
                ))}
              </div>
            )}
            {tab === "documents" && (
              <div className="max-w-xl">
                {p.documents.length === 0 ? (
                  <p className="text-gray-400 text-sm">No documents available for this product.</p>
                ) : (
                  <div className="space-y-2">
                    {p.documents.map((doc, i) => (
                      <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-3 hover:border-accent hover:bg-accent/5 transition-colors group">
                        <FileText size={16} className="text-accent flex-shrink-0"/>
                        <span className="font-display font-600 text-sm text-navy-900 group-hover:text-accent flex-1">{doc.name}</span>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{doc.fileType}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Have this unit to repair? */}
        <div className="bg-navy-50 border border-navy-200 rounded-xl p-6 mb-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="font-display font-700 text-navy-900 mb-1">Have this unit but it needs repair?</p>
            <p className="text-gray-600 text-sm">Book a repair with Combay — 40% lower than manufacturer quotes, free collection, 60-day warranty.</p>
          </div>
          <Link href="/repair" className="btn-secondary flex-shrink-0 whitespace-nowrap">Book a Repair →</Link>
        </div>
      </div>

      {/* Ask a Question modal */}
      {showEnquiry && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            {enquirySent ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-3">✅</div>
                <h3 className="font-display font-700 text-navy-900 text-lg mb-2">Message sent</h3>
                <p className="text-gray-500 text-sm mb-4">We'll get back to you within 24 hours.</p>
                <button onClick={() => { setShowEnquiry(false); setEnquirySent(false); }} className="btn-primary">Close</button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-display font-700 text-navy-900 text-lg">Ask a Question</h3>
                  <button onClick={() => setShowEnquiry(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>
                <p className="text-xs text-gray-400 bg-gray-50 rounded px-3 py-2 mb-4 font-mono">Re: {p.title} (SKU: {p.sku})</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="label">Name *</label><input className="input" placeholder="Your name"/></div>
                    <div><label className="label">Email *</label><input className="input" type="email" placeholder="you@company.com"/></div>
                  </div>
                  <div><label className="label">Company</label><input className="input" placeholder="Optional"/></div>
                  <div><label className="label">Your Question *</label><textarea className="textarea" rows={4} placeholder="Ask about compatibility, availability, condition details..."/></div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={() => setEnquirySent(true)} className="btn-primary flex-1 justify-center">Send Question →</button>
                  <button onClick={() => setShowEnquiry(false)} className="btn-secondary">Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
