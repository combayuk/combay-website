"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Plus, Trash2, Upload, Link2, X, ArrowLeft } from "lucide-react";

// Auto-generate SKU: CBUK00001, CBUK00002...
let skuCounter = 1;
const generateSKU = () => `CBUK${String(skuCounter++).padStart(5,"0")}`;

type Faq = { q: string; a: string };
type Tab = "basic"|"content"|"images"|"seo"|"addons";

export default function NewProductPage() {
  const router     = useRouter();
  const fileRef    = useRef<HTMLInputElement>(null);
  const docRef     = useRef<HTMLInputElement>(null);

  const [tab,      setTab]      = useState<Tab>("basic");
  const [sku]                   = useState(() => generateSKU());
  const [faqs,     setFaqs]     = useState<Faq[]>([{q:"",a:""}]);
  const [images,   setImages]   = useState<string[]>([]);
  const [aiLoading,setAiLoading]= useState<string|null>(null);
  const [saved,    setSaved]    = useState(false);
  const [mfgUrl,   setMfgUrl]   = useState("");

  const [form, setForm] = useState({
    title:"", brand:"", manufacturer:"", model:"", mpn:"",
    category:"", condition:"USED", price:"", stock:"1",
    description:"", overview:"", seoTitle:"", seoDesc:"", seoSlug:"", keywords:"",
    addonSupport:false, addonWarranty:false, addonInstall:false,
    priceOnRequest:false,
  });

  const f = (k: keyof typeof form, v: any) => setForm(p=>({...p,[k]:v}));

  async function aiGenerate(field: string) {
    setAiLoading(field);
    await new Promise(r=>setTimeout(r,1400));
    if (field==="overview" && form.title) {
      f("overview", `[AI-generated overview for "${form.title}"]\n\nThis section would be populated by calling the Anthropic API with your product title, manufacturer link, and description. Set ANTHROPIC_API_KEY in your environment to enable.\n\nThe AI would fetch the manufacturer's product page, extract specifications, and produce a structured overview formatted for your customers.`);
    }
    if (field==="faqs" && form.title) {
      setFaqs([
        {q:`Is the ${form.title} compatible with standard industrial systems?`, a:"Yes — please provide your existing system details and we'll confirm compatibility before purchase."},
        {q:`What warranty comes with this ${form.brand || "product"}?`, a:"All Combay purchases include a 30-day return to base warranty. Optional 2-year extended warranty available at +40% of item value."},
        {q:"How long does delivery take?", a:"UK: 1–3 working days. EU: 2–4 days. Worldwide: 5–8 days. Express available at checkout."},
        {q:"Can I return this item if it doesn't meet my needs?", a:"Yes — return within 30 days of delivery via your Customer Portal. Item must be in original condition."},
      ]);
    }
    if (field==="seo" && form.title) {
      f("seoTitle",    `${form.title}${form.brand?` | ${form.brand}`:""} — Buy Used Industrial Equipment | Combay`);
      f("seoDesc",     `Buy a tested ${form.title}${form.model?` (${form.model})`:""}. 30-day warranty. UK-based. Fast dispatch. Combay industrial equipment specialists.`);
      f("seoSlug",     form.title.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,""));
      f("keywords",    `${form.brand} ${form.model} ${form.title} used industrial equipment buy UK`);
    }
    setAiLoading(null);
  }

  function handleImageDrop(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const newImgs = Array.from(e.target.files).map(f => URL.createObjectURL(f));
    setImages(p=>[...p,...newImgs]);
  }

  async function handleSave(status: "DRAFT"|"PUBLISHED") {
    setSaved(true);
    setTimeout(()=>router.push("/admin/products"), 900);
  }

  const TABS: {id:Tab;label:string}[] = [
    {id:"basic",   label:"Basic Info"},
    {id:"content", label:"Content"},
    {id:"images",  label:"Images & Docs"},
    {id:"seo",     label:"SEO"},
    {id:"addons",  label:"Add-ons"},
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={()=>router.push("/admin/products")} className="text-gray-400 hover:text-navy-950 transition-colors p-1">
            <ArrowLeft size={18}/>
          </button>
          <div>
            <h1 className="font-display font-800 text-navy-950 text-2xl">New Product</h1>
            <p className="text-gray-400 text-xs mt-0.5 font-mono">SKU: {sku} (auto-generated)</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>handleSave("DRAFT")}     className="btn-secondary text-sm py-2">Save Draft</button>
          <button onClick={()=>handleSave("PUBLISHED")} className="btn-primary  text-sm py-2">Publish →</button>
        </div>
      </div>

      {saved && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 font-display font-600">
          ✓ Product saved successfully
        </div>
      )}

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto no-scrollbar">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`px-5 py-3 font-display font-600 text-sm whitespace-nowrap border-b-2 transition-colors ${
              tab===t.id ? "border-accent text-accent" : "border-transparent text-gray-500 hover:text-navy-950"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">

        {/* ─── BASIC INFO ─── */}
        {tab==="basic" && (
          <div className="max-w-2xl space-y-5">
            <div>
              <label className="label">SKU <span className="text-gray-400 font-mono text-xs">(auto-generated, read-only)</span></label>
              <input readOnly value={sku} className="input bg-surface text-gray-400 cursor-not-allowed font-mono text-sm"/>
            </div>
            <div><label className="label">Product Title *</label>
              <input className="input" value={form.title} onChange={e=>f("title",e.target.value)} placeholder="e.g. Siemens S7-400 PLC CPU 412-2 Module"/></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className="label">Brand</label>
                <input className="input" value={form.brand} onChange={e=>f("brand",e.target.value)} placeholder="e.g. Siemens"/></div>
              <div><label className="label">Manufacturer</label>
                <input className="input" value={form.manufacturer} onChange={e=>f("manufacturer",e.target.value)} placeholder="e.g. Siemens AG"/></div>
              <div><label className="label">Model</label>
                <input className="input" value={form.model} onChange={e=>f("model",e.target.value)} placeholder="e.g. CPU 412-2"/></div>
              <div><label className="label">MPN / Part Number</label>
                <input className="input" value={form.mpn} onChange={e=>f("mpn",e.target.value)} placeholder="e.g. 6ES7412-2XJ05-0AB0"/></div>
              <div><label className="label">Category *</label>
                <select className="select" value={form.category} onChange={e=>f("category",e.target.value)}>
                  <option value="">Select category...</option>
                  {["Lab & Scientific","Automation & Control","Test & Detection","IT & Networking","Display & AV","Oil & Gas","Audio & Broadcast","Manufacturing"].map(c=>(
                    <option key={c}>{c}</option>
                  ))}
                </select></div>
              <div><label className="label">Condition *</label>
                <select className="select" value={form.condition} onChange={e=>f("condition",e.target.value)}>
                  <option value="NEW">New</option>
                  <option value="NEW_OPEN_BOX">New (Open Box)</option>
                  <option value="USED">Used</option>
                  <option value="FOR_PARTS">For Parts / Not Working</option>
                </select></div>
              <div><label className="label">Price (£)</label>
                <input type="number" className="input" value={form.price} onChange={e=>f("price",e.target.value)} placeholder="0.00" step="0.01" min="0" disabled={form.priceOnRequest}/></div>
              <div><label className="label">Stock Qty</label>
                <input type="number" className="input" value={form.stock} onChange={e=>f("stock",e.target.value)} min="0"/></div>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="por" checked={form.priceOnRequest} onChange={e=>f("priceOnRequest",e.target.checked)} className="accent-accent w-4 h-4"/>
              <label htmlFor="por" className="font-display font-600 text-sm text-navy-950 cursor-pointer">Price on Request (hides price, shows enquiry button)</label>
            </div>
            <div>
              <label className="label">Manufacturer Product URL</label>
              <div className="flex gap-2">
                <input className="input" value={mfgUrl} onChange={e=>setMfgUrl(e.target.value)} placeholder="https://siemens.com/product/..."/>
                <button onClick={()=>aiGenerate("overview")} className="flex-shrink-0 flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-display font-600 px-3 rounded-lg hover:bg-purple-100 transition-colors">
                  <Link2 size={12}/> Fetch
                </button>
              </div>
              <p className="text-gray-400 text-xs mt-1">AI will fetch this URL to generate the Product Overview automatically.</p>
            </div>
          </div>
        )}

        {/* ─── CONTENT ─── */}
        {tab==="content" && (
          <div className="max-w-3xl space-y-6">
            <div>
              <label className="label">Description (admin-written)</label>
              <p className="text-gray-400 text-xs mb-2">Describe condition, what&apos;s included, tested functions, any notes. Shown in the Description tab on the product page.</p>
              <textarea className="textarea" rows={7} value={form.description} onChange={e=>f("description",e.target.value)}
                placeholder="This unit is in fully tested used condition. All core functions verified..."/>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <label className="label mb-0">Product Overview</label>
                  <p className="text-gray-400 text-xs">Technical overview shown to customers in the Product Overview tab.</p>
                </div>
                <button onClick={()=>aiGenerate("overview")} disabled={aiLoading==="overview"}
                  className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 font-display font-600 text-xs px-3 py-2 rounded-lg hover:bg-purple-100 transition-colors flex-shrink-0">
                  <Sparkles size={11}/> {aiLoading==="overview"?"Generating...":"AI Generate"}
                </button>
              </div>
              <textarea className="textarea font-mono text-xs" rows={10} value={form.overview} onChange={e=>f("overview",e.target.value)}
                placeholder="Enter manufacturer description or click AI Generate..."/>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <label className="label mb-0">Product FAQs</label>
                  <p className="text-gray-400 text-xs">Shown in the FAQ tab on the product page.</p>
                </div>
                <button onClick={()=>aiGenerate("faqs")} disabled={aiLoading==="faqs"}
                  className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 font-display font-600 text-xs px-3 py-2 rounded-lg hover:bg-purple-100 transition-colors flex-shrink-0">
                  <Sparkles size={11}/> {aiLoading==="faqs"?"Generating...":"AI Generate FAQs"}
                </button>
              </div>
              <div className="space-y-3">
                {faqs.map((faq,i)=>(
                  <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-gray-400 text-xs">FAQ {i+1}</span>
                      <button onClick={()=>setFaqs(f=>f.filter((_,j)=>j!==i))} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={12}/></button>
                    </div>
                    <input className="input text-sm" placeholder="Question..." value={faq.q} onChange={e=>setFaqs(f=>f.map((x,j)=>j===i?{...x,q:e.target.value}:x))}/>
                    <textarea className="textarea text-sm" rows={2} placeholder="Answer..." value={faq.a} onChange={e=>setFaqs(f=>f.map((x,j)=>j===i?{...x,a:e.target.value}:x))}/>
                  </div>
                ))}
                <button onClick={()=>setFaqs(f=>[...f,{q:"",a:""}])}
                  className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-dark font-display font-600 transition-colors">
                  <Plus size={14}/> Add FAQ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── IMAGES & DOCS ─── */}
        {tab==="images" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <label className="label">Product Images</label>
              <p className="text-gray-400 text-xs mb-3">Upload product photos. First image becomes the main image. Drag to reorder (coming soon).</p>
              <div
                onClick={()=>fileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-all">
                <Upload size={24} className="mx-auto mb-2 text-gray-300"/>
                <p className="font-display font-600 text-sm text-gray-600">Click to upload images</p>
                <p className="text-gray-400 text-xs mt-1">JPG, PNG, WebP — max 10MB each</p>
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageDrop}/>
              </div>
              {images.length > 0 && (
                <div className="grid grid-cols-4 gap-3 mt-3">
                  {images.map((img,i)=>(
                    <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200">
                      <img src={img} alt="" className="w-full h-full object-cover"/>
                      <button onClick={()=>setImages(im=>im.filter((_,j)=>j!==i))}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={10}/>
                      </button>
                      {i===0 && <span className="absolute bottom-1 left-1 text-[9px] bg-accent text-navy-950 font-display font-700 px-1.5 py-0.5 rounded">MAIN</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="label">Catalogue / Documents</label>
              <p className="text-gray-400 text-xs mb-3">Upload manuals, datasheets, certificates. Shown in the Documents tab on the product page.</p>
              <div onClick={()=>docRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-all">
                <p className="font-display font-600 text-sm text-gray-600">Click to upload documents</p>
                <p className="text-gray-400 text-xs mt-1">PDF, DOCX, XLSX — max 25MB each</p>
                <input ref={docRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" multiple className="hidden"/>
              </div>
            </div>
          </div>
        )}

        {/* ─── SEO ─── */}
        {tab==="seo" && (
          <div className="max-w-2xl space-y-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display font-700 text-navy-950">SEO Settings</h2>
              <button onClick={()=>aiGenerate("seo")} disabled={aiLoading==="seo"}
                className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 font-display font-600 text-xs px-3 py-2 rounded-lg hover:bg-purple-100 transition-colors">
                <Sparkles size={11}/> {aiLoading==="seo"?"Generating...":"AI Generate SEO"}
              </button>
            </div>
            <div><label className="label">SEO Title <span className="text-gray-400 font-mono text-xs">({form.seoTitle.length}/60 chars)</span></label>
              <input className="input" value={form.seoTitle} onChange={e=>f("seoTitle",e.target.value)} placeholder="Product name | Brand | Combay"/></div>
            <div><label className="label">Meta Description <span className="text-gray-400 font-mono text-xs">({form.seoDesc.length}/160 chars)</span></label>
              <textarea className="textarea" rows={3} value={form.seoDesc} onChange={e=>f("seoDesc",e.target.value)} placeholder="Brief description for search results..."/></div>
            <div>
              <label className="label">URL Slug</label>
              <div className="flex items-center">
                <span className="bg-surface border border-r-0 border-gray-200 rounded-l-lg px-3 py-2.5 text-xs text-gray-400 font-mono">/shop/</span>
                <input className="input rounded-l-none" value={form.seoSlug} onChange={e=>f("seoSlug",e.target.value)} placeholder="product-url-slug"/>
              </div>
            </div>
            <div><label className="label">Keywords / Tags</label>
              <input className="input" value={form.keywords} onChange={e=>f("keywords",e.target.value)} placeholder="PLC, Siemens, S7-400, automation (comma separated)"/></div>
            {(form.seoTitle||form.seoDesc) && (
              <div className="bg-surface border border-gray-200 rounded-xl p-4">
                <p className="font-mono text-[10px] text-gray-400 mb-2 uppercase tracking-wider">Search Preview</p>
                <p className="text-blue-600 text-sm font-display font-600 hover:underline cursor-pointer">{form.seoTitle||form.title}</p>
                <p className="font-mono text-[10px] text-green-600 mb-1">combay.co.uk/shop/{form.seoSlug||"product-slug"}</p>
                <p className="text-gray-600 text-xs">{form.seoDesc||"No description set."}</p>
              </div>
            )}
          </div>
        )}

        {/* ─── ADD-ONS ─── */}
        {tab==="addons" && (
          <div className="max-w-xl space-y-4">
            <p className="text-gray-500 text-sm mb-5">Enable add-ons customers can purchase alongside this product. Pricing is calculated as a percentage of the item price.</p>
            {[
              {key:"addonSupport" as const, label:"2-Year Technical Support", pct:"+10% of item price",
                desc:"Phone-based technical support and priority customer service for 2 years."},
              {key:"addonWarranty" as const, label:"2-Year Extended Warranty",  pct:"+40% of item price",
                desc:"Repair or replace parts for 2 years. Customer-induced damage charged separately."},
              {key:"addonInstall"  as const, label:"Installation & Setup",      pct:"+35% of item price",
                desc:"Our engineers configure and install the equipment to your specifications, on-site if required."},
            ].map(a=>(
              <label key={a.key} className="flex items-start gap-4 border border-gray-200 rounded-xl p-5 cursor-pointer hover:border-accent/40 hover:bg-surface transition-all">
                <input type="checkbox" checked={form[a.key] as boolean} onChange={e=>f(a.key,e.target.checked)} className="mt-0.5 w-4 h-4 accent-accent flex-shrink-0"/>
                <div>
                  <p className="font-display font-700 text-navy-950 text-sm">{a.label} <span className="text-accent">{a.pct}</span></p>
                  <p className="text-gray-400 text-xs mt-1">{a.desc}</p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-200">
        <button onClick={()=>router.push("/admin/products")} className="text-sm text-gray-400 hover:text-navy-950 flex items-center gap-1 transition-colors">
          <ArrowLeft size={14}/> Back to Products
        </button>
        <div className="flex gap-2">
          <button onClick={()=>handleSave("DRAFT")}     className="btn-secondary text-sm">Save as Draft</button>
          <button onClick={()=>handleSave("PUBLISHED")} className="btn-primary  text-sm">Publish Product →</button>
        </div>
      </div>
    </div>
  );
}
