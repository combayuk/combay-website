"use client";
import { useState } from "react";
import Link from "next/link";
import { ZoomIn, FileText, HelpCircle, BookOpen, AlignLeft, X, Search } from "lucide-react";

const DEMO = {
  title:"Siemens S7-400 PLC CPU 412-2 Module", brand:"Siemens", manufacturer:"Siemens AG",
  model:"CPU 412-2", mpn:"6ES7412-2XJ05-0AB0", sku:"CBUK00001", condition:"USED",
  price:1240, priceOnRequest:false, stockQty:2,
  category:{name:"Automation & Control",slug:"automation-control"},
  description:`This Siemens S7-400 CPU 412-2 is in fully tested, operational used condition. All core functions including power-on, I/O communication and program execution have been verified.\n\nIncluded:\n• 1x Siemens S7-400 CPU 412-2 (6ES7412-2XJ05-0AB0)\n• 4MB memory card\n• Combay 30-day return to base warranty\n\nHardware: v6 | Firmware: V7.0`,
  productOverview:`The Siemens SIMATIC S7-400 CPU 412-2 is a high-performance PLC for process-critical automation.\n\nKey specifications:\n- Work memory: 144KB (72KB code / 72KB data)\n- Cycle time: 0.05ms per 1K instructions\n- I/O: 131,072 digital / 8,192 analogue channels\n- Comms: MPI 187.5kbit/s, PROFIBUS DP 12Mbit/s`,
  faqs:[
    {q:"Is this compatible with my existing S7-400 rack?", a:"Yes — all S7-400 CPUs mount on the standard universal rack."},
    {q:"Which software is required?",                     a:"SIMATIC STEP 7 v5.5+. Not natively compatible with TIA Portal without migration."},
    {q:"What warranty is included?",                       a:"30-day return to base. Optional 2-year extended warranty at +40% of item value."},
    {q:"How long is delivery?",                           a:"UK: 1–3 working days. Express available."},
  ],
  documents:[
    {name:"S7-400 System Manual",   url:"#", fileType:"PDF"},
    {name:"CPU 412-2 Hardware Guide",url:"#", fileType:"PDF"},
  ],
  addonSupport:true, addonWarranty:true, addonInstall:false,
  tags:["PLC","Siemens","S7-400","Automation"],
};

type Tab="description"|"overview"|"faq"|"documents";

export default function ProductDetail({ slug }: { slug: string }) {
  const p = DEMO;
  const [tab,    setTab]    = useState<Tab>("description");
  const [imgIdx, setImgIdx] = useState(0);
  const [zoom,   setZoom]   = useState(false);
  const [addons, setAddons] = useState({support:false,warranty:false,install:false});
  const [quoteModal, setQuoteModal] = useState(false);
  const [questionModal, setQuestionModal] = useState(false);
  const [formSent, setFormSent] = useState<"quote"|"question"|null>(null);
  const [loading, setLoading] = useState(false);

  const addonTotal = (addons.support&&p.addonSupport?p.price*0.10:0)
                   + (addons.warranty&&p.addonWarranty?p.price*0.40:0)
                   + (addons.install&&p.addonInstall?p.price*0.35:0);
  const total = p.price + addonTotal;
  const fmt   = (n:number) => `£${n.toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2})}`;

  const COND: Record<string,{label:string;color:string}> = {
    NEW:{label:"New",color:"text-green-700 bg-green-50 border-green-200"},
    NEW_OPEN_BOX:{label:"New (Open Box)",color:"text-blue-700 bg-blue-50 border-blue-200"},
    USED:{label:"Used",color:"text-yellow-700 bg-yellow-50 border-yellow-200"},
    FOR_PARTS:{label:"For Parts",color:"text-red-700 bg-red-50 border-red-200"},
  };
  const cond = COND[p.condition] ?? {label:p.condition,color:"text-gray-700 bg-gray-50 border-gray-200"};

  async function sendForm(type:"quote"|"question") {
    setLoading(true);
    await new Promise(r=>setTimeout(r,800));
    setLoading(false);
    setFormSent(type);
    setTimeout(()=>{setQuoteModal(false);setQuestionModal(false);setFormSent(null);},2500);
  }

  const TABS:[Tab,string,React.ReactNode][] = [
    ["description","Description",<AlignLeft size={13}/>],
    ["overview","Product Overview",<BookOpen size={13}/>],
    ["faq","FAQ",<HelpCircle size={13}/>],
    ["documents","Documents",<FileText size={13}/>],
  ];

  return (
    <div className="bg-white">
      {/* Breadcrumb */}
      <div className="border-b border-gray-100 py-3">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-2 text-xs text-gray-400 flex-wrap">
          <Link href="/" className="hover:text-navy-950">Home</Link><span>/</span>
          <Link href="/shop" className="hover:text-navy-950">Shop</Link><span>/</span>
          <Link href={`/shop?category=${p.category.slug}`} className="hover:text-navy-950">{p.category.name}</Link><span>/</span>
          <span className="text-navy-950 font-display font-600 truncate max-w-xs">{p.title}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-10 mb-10">

          {/* Gallery */}
          <div>
            <div className="bg-surface border border-gray-200 rounded-2xl aspect-square flex items-center justify-center relative overflow-hidden group cursor-zoom-in mb-3"
              onClick={()=>setZoom(true)}>
              <div className="text-gray-200 text-[7rem] select-none">📦</div>
              <div className="absolute bottom-3 right-3 bg-white/90 border border-gray-200 rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                <ZoomIn size={13} className="text-gray-500"/>
                <span className="text-[10px] text-gray-500 font-display font-600">Zoom</span>
              </div>
            </div>
            <div className="flex gap-2">
              {[0,1,2].map(i=>(
                <button key={i} onClick={()=>setImgIdx(i)}
                  className={`w-16 h-16 bg-surface border rounded-xl flex items-center justify-center transition-colors ${imgIdx===i?"border-accent shadow-accent":"border-gray-200 hover:border-gray-400"}`}>
                  <span className="text-gray-300 text-xl">📦</span>
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Link href={`/shop?category=${p.category.slug}`} className="font-mono text-[10px] text-accent tracking-widest uppercase hover:text-accent-dark">{p.category.name}</Link>
              <span className={`badge border ${cond.color}`}>{cond.label}</span>
              {p.stockQty>0
                ? <span className="badge text-green-700 bg-green-50 border-green-200">In Stock ({p.stockQty})</span>
                : <span className="badge text-red-700 bg-red-50 border-red-200">Out of Stock</span>}
            </div>

            <h1 className="font-display font-800 text-2xl lg:text-3xl text-navy-950 leading-tight mb-3">{p.title}</h1>

            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs mb-5">
              {[["Brand",p.brand],["Manufacturer",p.manufacturer],["Model",p.model],["MPN",p.mpn],["SKU",p.sku]]
                .filter(([,v])=>v).map(([k,v])=>(
                <div key={k} className="flex gap-1.5">
                  <span className="text-gray-400">{k}:</span>
                  <span className="text-navy-950 font-display font-600">{v}</span>
                </div>
              ))}
            </div>

            {/* Price box */}
            <div className="bg-surface border border-gray-200 rounded-2xl p-5 mb-5">
              {p.priceOnRequest
                ? <p className="font-display font-700 text-xl text-navy-950 mb-1">Price on Request</p>
                : <div className="mb-1">
                    <span className="font-display font-800 text-3xl text-navy-950">{fmt(total)}</span>
                    {addonTotal>0 && <span className="text-gray-400 text-sm ml-2">incl. add-ons</span>}
                  </div>
              }
              <p className="text-gray-400 text-xs mb-4">Excl. VAT · 100% advance payment required</p>

              {(p.addonSupport||p.addonWarranty||p.addonInstall) && (
                <div className="border-t border-gray-200 pt-4 space-y-2.5 mb-4">
                  <p className="font-display font-700 text-xs text-gray-500 uppercase tracking-wider">Optional Add-ons</p>
                  {p.addonSupport && (
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={addons.support} onChange={e=>setAddons(a=>({...a,support:e.target.checked}))} className="mt-0.5 w-4 h-4 accent-accent"/>
                      <div>
                        <p className="font-display font-600 text-sm text-navy-950">2-Year Technical Support <span className="text-accent">+{fmt(p.price*0.10)}</span></p>
                        <p className="text-xs text-gray-400">Phone support and priority service for 2 years.</p>
                      </div>
                    </label>
                  )}
                  {p.addonWarranty && (
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={addons.warranty} onChange={e=>setAddons(a=>({...a,warranty:e.target.checked}))} className="mt-0.5 w-4 h-4 accent-accent"/>
                      <div>
                        <p className="font-display font-600 text-sm text-navy-950">2-Year Extended Warranty <span className="text-accent">+{fmt(p.price*0.40)}</span></p>
                        <p className="text-xs text-gray-400">Repair or replace parts for 2 years.</p>
                      </div>
                    </label>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <button onClick={()=>setQuoteModal(true)} className="btn-primary w-full py-3 text-base">Request a Quote →</button>
                <button onClick={()=>setQuestionModal(true)} className="btn-secondary w-full py-2.5">Ask a Question</button>
              </div>
            </div>

            {/* Trust pills */}
            <div className="flex flex-wrap gap-2">
              {["30-Day Warranty","Free UK Delivery £250+","Expert Support","Genuine Stock"].map(t=>(
                <span key={t} className="text-xs text-gray-500 bg-surface border border-gray-200 rounded-full px-3 py-1 font-display font-600">✓ {t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs — STRICT 4 only */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden mb-8">
          <div className="flex border-b border-gray-200 bg-surface overflow-x-auto no-scrollbar">
            {TABS.map(([id,label,icon])=>(
              <button key={id} onClick={()=>setTab(id)}
                className={`flex items-center gap-1.5 px-5 py-3.5 font-display font-600 text-sm whitespace-nowrap border-b-2 transition-colors ${
                  tab===id ? "border-accent text-accent bg-white" : "border-transparent text-gray-500 hover:text-navy-950"}`}>
                {icon}{label}
              </button>
            ))}
          </div>
          <div className="p-6 lg:p-8">
            {tab==="description" && <div className="max-w-3xl text-gray-700 text-sm leading-relaxed whitespace-pre-line">{p.description}</div>}
            {tab==="overview"    && <div className="max-w-3xl text-gray-700 text-sm leading-relaxed whitespace-pre-line">{p.productOverview}</div>}
            {tab==="faq"         && (
              <div className="max-w-2xl space-y-2">
                {p.faqs.map((f,i)=>(
                  <details key={i} className="border border-gray-200 rounded-xl">
                    <summary className="px-4 py-3 font-display font-600 text-sm text-navy-950 cursor-pointer list-none flex items-center justify-between">
                      {f.q}<span className="text-accent text-lg ml-2">+</span>
                    </summary>
                    <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">{f.a}</div>
                  </details>
                ))}
              </div>
            )}
            {tab==="documents"   && (
              <div className="max-w-xl">
                {p.documents.length===0
                  ? <p className="text-gray-400 text-sm">No documents available.</p>
                  : <div className="space-y-2">
                      {p.documents.map((doc,i)=>(
                        <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 hover:border-accent hover:bg-accent/5 transition-colors group">
                          <FileText size={16} className="text-accent flex-shrink-0"/>
                          <span className="font-display font-600 text-sm text-navy-950 group-hover:text-accent flex-1">{doc.name}</span>
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{doc.fileType}</span>
                        </a>
                      ))}
                    </div>
                }
              </div>
            )}
          </div>
        </div>

        {/* Repair CTA */}
        <div className="bg-navy-50 border border-navy-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="font-display font-700 text-navy-950 mb-1">Have this unit but it needs repair?</p>
            <p className="text-gray-500 text-sm">Book with Combay — 40% below manufacturer quotes, free collection, 60-day warranty.</p>
          </div>
          <Link href="/repair" className="btn-secondary flex-shrink-0">Book a Repair →</Link>
        </div>
      </div>

      {/* ── ZOOM MODAL ── */}
      {zoom && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={()=>setZoom(false)}>
          <button className="absolute top-4 right-4 text-white hover:text-accent transition-colors"><X size={24}/></button>
          <div className="relative w-full max-w-3xl aspect-square bg-surface rounded-2xl flex items-center justify-center"
            onClick={e=>e.stopPropagation()}>
            <div className="text-gray-300 text-[8rem]">📦</div>
            <p className="absolute bottom-4 left-0 right-0 text-center text-white/40 text-xs font-display font-600">
              360° view available when multiple photos are uploaded
            </p>
          </div>
        </div>
      )}

      {/* ── QUOTE MODAL ── */}
      {quoteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-up">
            {formSent==="quote" ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-3">✅</div>
                <h3 className="font-display font-700 text-navy-950 text-lg mb-2">Quote request sent</h3>
                <p className="text-gray-500 text-sm">We&apos;ll get back to you within 24 hours.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-700 text-navy-950 text-lg">Request a Quote</h3>
                  <button onClick={()=>setQuoteModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
                </div>
                <p className="text-xs text-gray-400 bg-surface rounded-lg px-3 py-2 font-mono mb-4">Re: {p.title} (SKU: {p.sku})</p>
                {addons.warranty || addons.support ? (
                  <div className="bg-accent/10 border border-accent/20 rounded-lg px-3 py-2 mb-4 text-xs text-navy-950">
                    Total with add-ons: <strong>{fmt(total)}</strong>
                  </div>
                ) : null}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="label text-xs">Name *</label><input className="input text-sm" placeholder="Full name"/></div>
                    <div><label className="label text-xs">Email *</label><input type="email" className="input text-sm" placeholder="you@company.com"/></div>
                  </div>
                  <div><label className="label text-xs">Company</label><input className="input text-sm" placeholder="Optional"/></div>
                  <div><label className="label text-xs">Phone</label><input type="tel" className="input text-sm" placeholder="+44..."/></div>
                  <div>
                    <label className="label text-xs">Quantity</label>
                    <input type="number" className="input text-sm" defaultValue={1} min={1}/>
                  </div>
                  <div><label className="label text-xs">Additional Message</label>
                    <textarea className="textarea text-sm" rows={3} placeholder="Any specific requirements, delivery notes, or questions..."/></div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={()=>sendForm("quote")} disabled={loading} className="btn-primary flex-1 py-2.5">
                    {loading?"Sending...":"Send Quote Request →"}
                  </button>
                  <button onClick={()=>setQuoteModal(false)} className="btn-secondary">Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── ASK A QUESTION MODAL ── */}
      {questionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-up">
            {formSent==="question" ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-3">✅</div>
                <h3 className="font-display font-700 text-navy-950 text-lg mb-2">Message sent</h3>
                <p className="text-gray-500 text-sm">We&apos;ll reply within 24 hours.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-700 text-navy-950 text-lg">Ask a Question</h3>
                  <button onClick={()=>setQuestionModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
                </div>
                <p className="text-xs text-gray-400 bg-surface rounded-lg px-3 py-2 font-mono mb-4">Re: {p.title} (SKU: {p.sku})</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="label text-xs">Name *</label><input className="input text-sm"/></div>
                    <div><label className="label text-xs">Email *</label><input type="email" className="input text-sm"/></div>
                  </div>
                  <div><label className="label text-xs">Company</label><input className="input text-sm" placeholder="Optional"/></div>
                  <div><label className="label text-xs">Your Question *</label>
                    <textarea className="textarea text-sm" rows={4} placeholder="Ask about compatibility, condition, availability..."/></div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={()=>sendForm("question")} disabled={loading} className="btn-primary flex-1 py-2.5">
                    {loading?"Sending...":"Send Question →"}
                  </button>
                  <button onClick={()=>setQuestionModal(false)} className="btn-secondary">Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
