"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Plus, Trash2 } from "lucide-react";

type Faq = { question: string; answer: string };

export default function NewProductPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"basic"|"content"|"seo"|"addons">("basic");
  const [faqs, setFaqs] = useState<Faq[]>([{ question: "", answer: "" }]);
  const [aiLoading, setAiLoading] = useState<string|null>(null);
  const [saved, setSaved] = useState(false);

  async function generateAI(field: string) {
    setAiLoading(field);
    await new Promise(r => setTimeout(r, 1500));
    setAiLoading(null);
  }

  async function handleSave(status: "DRAFT"|"PUBLISHED") {
    setSaved(true);
    setTimeout(() => router.push("/admin/products"), 800);
  }

  const TABS = ["basic","content","seo","addons"] as const;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-800 text-navy-900 text-2xl">New Product</h1>
          <p className="text-gray-400 text-sm mt-0.5">Fill in all fields before publishing.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleSave("DRAFT")}   className="btn-secondary text-sm">Save Draft</button>
          <button onClick={() => handleSave("PUBLISHED")} className="btn-primary text-sm">Publish →</button>
        </div>
      </div>

      {saved && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">✅ Saved successfully</div>}

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-gray-200 mb-6">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-3 font-display font-600 text-sm border-b-2 capitalize transition-colors ${
              tab===t ? "border-accent text-accent" : "border-transparent text-gray-500 hover:text-navy-900"}`}>
            {t === "seo" ? "SEO" : t === "addons" ? "Add-ons" : t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">

        {/* BASIC */}
        {tab === "basic" && (
          <div className="space-y-5 max-w-2xl">
            <h2 className="font-display font-700 text-navy-900 mb-4">Basic Information</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2"><label className="label">Product Title *</label><input className="input" placeholder="e.g. Siemens S7-400 PLC CPU 412-2 Module"/></div>
              <div><label className="label">Brand</label><input className="input" placeholder="e.g. Siemens"/></div>
              <div><label className="label">Manufacturer</label><input className="input" placeholder="e.g. Siemens AG"/></div>
              <div><label className="label">Model</label><input className="input" placeholder="e.g. CPU 412-2"/></div>
              <div><label className="label">MPN / Part Number</label><input className="input" placeholder="e.g. 6ES7412-2XJ05-0AB0"/></div>
              <div><label className="label">SKU *</label><input className="input" placeholder="Auto-generated or enter manually"/></div>
              <div>
                <label className="label">Category *</label>
                <select className="select">
                  <option value="">Select category...</option>
                  {["Lab & Scientific","Automation & Control","Test & Detection","IT & Networking","Display & AV","Oil & Gas","Audio & Broadcast","Manufacturing"].map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Condition *</label>
                <select className="select">
                  <option value="NEW">New</option>
                  <option value="NEW_OPEN_BOX">New (Open Box)</option>
                  <option value="USED" selected>Used</option>
                  <option value="FOR_PARTS">For Parts / Not Working</option>
                </select>
              </div>
              <div>
                <label className="label">Price (£)</label>
                <input type="number" className="input" placeholder="0.00" step="0.01" min="0"/>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <input type="checkbox" id="por" className="accent-accent"/>
                <label htmlFor="por" className="font-display font-600 text-sm text-navy-900 cursor-pointer">Price on Request</label>
              </div>
              <div>
                <label className="label">Stock Quantity</label>
                <input type="number" className="input" defaultValue={1} min={0}/>
              </div>
              <div>
                <label className="label">Manufacturer URL</label>
                <input type="url" className="input" placeholder="https://siemens.com/..."/>
              </div>
            </div>
          </div>
        )}

        {/* CONTENT */}
        {tab === "content" && (
          <div className="space-y-6 max-w-3xl">
            <h2 className="font-display font-700 text-navy-900 mb-4">Product Content</h2>

            <div>
              <label className="label">Description (admin-written)</label>
              <p className="text-xs text-gray-400 mb-2">Describe the item&apos;s condition, what&apos;s included, tested functions, and any notes.</p>
              <textarea className="textarea" rows={6} placeholder="This item is in fully tested, operational used condition..."/>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <label className="label mb-0">Product Overview</label>
                  <p className="text-xs text-gray-400">Manufacturer-sourced or AI-generated technical overview visible to customers.</p>
                </div>
                <button onClick={() => generateAI("overview")} disabled={aiLoading==="overview"}
                  className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 font-display font-600 text-xs px-3 py-2 rounded hover:bg-purple-100 transition-colors">
                  <Sparkles size={12}/>{aiLoading==="overview" ? "Generating..." : "AI Generate"}
                </button>
              </div>
              <textarea className="textarea" rows={8} placeholder="Enter manufacturer description or click AI Generate..."/>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <label className="label mb-0">FAQs</label>
                  <p className="text-xs text-gray-400">Customer-facing FAQs about this specific product.</p>
                </div>
                <button onClick={() => generateAI("faqs")} disabled={aiLoading==="faqs"}
                  className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 font-display font-600 text-xs px-3 py-2 rounded hover:bg-purple-100 transition-colors">
                  <Sparkles size={12}/>{aiLoading==="faqs" ? "Generating..." : "AI Generate FAQs"}
                </button>
              </div>
              <div className="space-y-3">
                {faqs.map((faq,i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-gray-400">FAQ {i+1}</span>
                      <button onClick={() => setFaqs(f => f.filter((_,j) => j!==i))} className="text-red-400 hover:text-red-600"><Trash2 size={13}/></button>
                    </div>
                    <input className="input text-sm" placeholder="Question..." value={faq.question} onChange={e => setFaqs(f => f.map((x,j)=>j===i?{...x,question:e.target.value}:x))}/>
                    <textarea className="textarea text-sm" rows={2} placeholder="Answer..." value={faq.answer} onChange={e => setFaqs(f => f.map((x,j)=>j===i?{...x,answer:e.target.value}:x))}/>
                  </div>
                ))}
                <button onClick={() => setFaqs(f => [...f,{question:"",answer:""}])}
                  className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-dark font-600 transition-colors">
                  <Plus size={14}/> Add FAQ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SEO */}
        {tab === "seo" && (
          <div className="space-y-5 max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-700 text-navy-900">SEO Settings</h2>
              <button onClick={() => generateAI("seo")} disabled={aiLoading==="seo"}
                className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 font-display font-600 text-xs px-3 py-2 rounded hover:bg-purple-100 transition-colors">
                <Sparkles size={12}/>{aiLoading==="seo" ? "Generating..." : "AI Generate SEO"}
              </button>
            </div>
            <div><label className="label">SEO Title</label><input className="input" placeholder="Product title for search engines (max 60 chars)"/></div>
            <div><label className="label">Meta Description</label><textarea className="textarea" rows={3} placeholder="Brief description for search results (max 160 chars)"/></div>
            <div><label className="label">URL Slug</label>
              <div className="flex items-center">
                <span className="bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg px-3 py-2.5 text-xs text-gray-400 font-mono">/shop/</span>
                <input className="input rounded-l-none" placeholder="product-slug"/>
              </div>
            </div>
            <div><label className="label">Keywords / Tags</label><input className="input" placeholder="PLC, Siemens, S7-400, automation (comma separated)"/></div>
          </div>
        )}

        {/* ADD-ONS */}
        {tab === "addons" && (
          <div className="max-w-xl space-y-5">
            <h2 className="font-display font-700 text-navy-900 mb-4">Product Add-ons</h2>
            <p className="text-gray-500 text-sm">Enable add-ons that customers can optionally purchase alongside this product.</p>
            {[
              { id:"support",  label:"2-Year Technical Support", pct:"+10% of item price", desc:"Phone-based technical support and priority customer service for 2 years." },
              { id:"warranty", label:"2-Year Extended Warranty",  pct:"+40% of item price", desc:"Repair or replace parts for 2 years. Customer-induced damage charged separately." },
              { id:"install",  label:"Installation & Setup",      pct:"+35% of item price", desc:"Engineers pre-configure the instrument and/or visit your site for installation." },
            ].map(a => (
              <div key={a.id} className="flex items-start gap-4 border border-gray-200 rounded-xl p-5">
                <input type="checkbox" id={a.id} className="mt-0.5 accent-accent"/>
                <label htmlFor={a.id} className="cursor-pointer flex-1">
                  <p className="font-display font-700 text-navy-900 text-sm">{a.label} <span className="text-accent">{a.pct}</span></p>
                  <p className="text-gray-400 text-xs mt-1">{a.desc}</p>
                </label>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Bottom save bar */}
      <div className="flex items-center justify-between mt-6 pt-5 border-t border-gray-200">
        <button onClick={() => router.push("/admin/products")} className="text-sm text-gray-400 hover:text-navy-900 transition-colors">← Back to Products</button>
        <div className="flex gap-2">
          <button onClick={() => handleSave("DRAFT")}    className="btn-secondary text-sm">Save as Draft</button>
          <button onClick={() => handleSave("PUBLISHED")} className="btn-primary text-sm">Publish Product →</button>
        </div>
      </div>
    </div>
  );
}
