"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ZoomIn, MessageSquare, FileText, Star, Phone, Mail } from "lucide-react";
import { formatPrice, CONDITIONS } from "@/lib/utils";
import Badge from "@/components/ui/Badge";

// Demo product data — replace with DB fetch
const DEMO_PRODUCT = {
  id: "1",
  title: "Siemens S7-400 PLC CPU 412-1",
  brand: "Siemens",
  manufacturer: "Siemens AG",
  model: "S7-400 CPU 412-1",
  mpn: "6ES7412-1XF04-0AB0",
  sku: "CBY-001",
  condition: "USED" as const,
  stockQty: 1,
  price: 1240,
  priceOnRequest: false,
  category: { name: "Automation & Control", slug: "automation-control" },
  description: `This Siemens S7-400 PLC CPU 412-1 (6ES7412-1XF04-0AB0) is in used, tested working condition. All core functions including power-on, communication ports, and I/O interfaces have been verified.

**What's included:**
- CPU module only
- No memory card included unless specified
- Tested and verified power-on operation

**Condition notes:**
Minor cosmetic wear consistent with industrial use. No physical damage to connectors or housing. Label intact and legible.

**Software compatibility:**
Compatible with STEP 7 V5.x and TIA Portal. Last tested under STEP 7 V5.6.`,

  productOverview: `The Siemens SIMATIC S7-400 is a high-performance PLC designed for demanding industrial automation tasks. The CPU 412-1 provides a powerful processing core suitable for medium to large-scale automation projects.

**Key specifications:**
- Work memory: 256 KB for program, 256 KB for data
- Load memory: Up to 8 MB (with memory card)
- Processing speed: 0.3 ms/1,000 binary instructions
- Communication: MPI (187.5 kbps)
- Integrated DP interface: No (external via CP)

**Typical applications:**
- Process automation in manufacturing
- Machine and plant control
- Building automation systems
- High-availability installations`,

  faqs: [
    { question: "Is this item tested before dispatch?", answer: "Yes. All used items are tested for core functionality. This CPU has been verified for power-on operation and basic communication. A brief test report is available on request." },
    { question: "What firmware/software version does this run?", answer: "Compatible with STEP 7 V5.x and TIA Portal. Please confirm your project software version before purchasing. We can advise on compatibility." },
    { question: "What is your return policy on this item?", answer: "You have 30 days from delivery to request a return. Items must be returned in the condition received. A return shipping label will be provided within 24–48 hours of your request." },
    { question: "Do you offer shipping internationally?", answer: "Yes. We ship worldwide. UK delivery takes 1–3 working days, EU 2–4 working days, and worldwide 5–8 working days. All shipments are tracked and insured." },
  ],

  images: [{ url: null, alt: "Siemens S7-400 CPU 412-1 Front" }, { url: null, alt: "Side view" }, { url: null, alt: "Connectors detail" }],
  documents: [{ name: "Siemens S7-400 CPU 412-1 Datasheet", url: "#", fileType: "PDF" }],

  addonSupport: true,
  addonWarranty: true,
  addonInstall: true,

  relatedProducts: [
    { id:"2", title:"Siemens S7-400 CPU 414-3", slug:"siemens-s7-400-cpu-414-3", brand:"Siemens", model:"6ES7414-3XM07", price:1850, condition:"USED" },
    { id:"3", title:"Siemens S7-400 Rack UR2",  slug:"siemens-s7-400-rack-ur2",  brand:"Siemens", model:"6ES7400-1JA01", price:420, condition:"USED" },
  ],
};

type TabKey = "description" | "overview" | "faq" | "documents";

export default function ProductPageContent({ slug }: { slug: string }) {
  const p = DEMO_PRODUCT;
  const [activeImg, setActiveImg] = useState(0);
  const [activeTab, setActiveTab] = useState<TabKey>("description");
  const [addonSupport, setAddonSupport] = useState(false);
  const [addonWarranty, setAddonWarranty] = useState(false);
  const [addonInstall, setAddonInstall] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const basePrice = p.price;
  let total = basePrice;
  if (addonSupport) total += basePrice * 0.10;
  if (addonWarranty) total += basePrice * 0.40;
  if (addonInstall) total += basePrice * 0.35;

  const cond = CONDITIONS[p.condition] || CONDITIONS.USED;

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-2.5">
          <nav className="flex items-center gap-1.5 text-xs text-gray-400">
            <Link href="/" className="hover:text-accent transition-colors">Home</Link>
            <span>/</span>
            <Link href="/shop" className="hover:text-accent transition-colors">Shop</Link>
            <span>/</span>
            <Link href={`/shop?category=${p.category.slug}`} className="hover:text-accent transition-colors">{p.category.name}</Link>
            <span>/</span>
            <span className="text-navy-900 truncate max-w-xs">{p.title}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-10 mb-10">
          {/* Left: Images */}
          <div>
            {/* Main image */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden aspect-square flex items-center justify-center mb-3 relative">
              <div className="text-8xl opacity-10">📦</div>
              <div className="absolute top-3 left-3">
                <span className={`text-xs font-display font-600 px-2.5 py-1 rounded border ${cond.color}`}>{cond.label}</span>
              </div>
              <button className="absolute top-3 right-3 bg-white border border-gray-200 rounded p-1.5 hover:border-accent transition-colors">
                <ZoomIn size={15} className="text-gray-500" />
              </button>
            </div>
            {/* Thumbnails */}
            <div className="flex gap-2">
              {p.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`w-16 h-16 bg-white border-2 rounded-lg flex items-center justify-center transition-colors ${activeImg === i ? "border-accent" : "border-gray-200 hover:border-gray-400"}`}
                >
                  <span className="text-xl opacity-20">📦</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Product Info */}
          <div>
            {/* Brand + Category */}
            <div className="flex items-center gap-2 mb-2">
              <Link href={`/manufacturers#${p.brand.toLowerCase()}`} className="font-mono text-xs text-accent hover:text-accent-dark transition-colors">{p.brand}</Link>
              <span className="text-gray-300">·</span>
              <Link href={`/shop?category=${p.category.slug}`} className="font-mono text-xs text-gray-400 hover:text-navy-900 transition-colors">{p.category.name}</Link>
            </div>

            <h1 className="font-display font-900 text-2xl lg:text-3xl text-navy-900 leading-tight mb-3">{p.title}</h1>

            {/* Specs row */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs mb-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
              {[
                { label: "Brand",     value: p.brand },
                { label: "Model",     value: p.model },
                { label: "MPN",       value: p.mpn },
                { label: "SKU",       value: p.sku },
                { label: "Condition", value: cond.label },
                { label: "Stock",     value: p.stockQty > 0 ? `${p.stockQty} available` : "Out of stock" },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <span className="text-gray-400 w-16 flex-shrink-0">{s.label}:</span>
                  <span className="font-display font-600 text-navy-900">{s.value}</span>
                </div>
              ))}
            </div>

            {/* Price */}
            <div className="mb-4">
              {p.priceOnRequest ? (
                <div className="font-display font-800 text-2xl text-navy-900">Price on Request</div>
              ) : (
                <>
                  <div className="font-display font-800 text-3xl text-accent">{formatPrice(total)}</div>
                  <div className="text-gray-400 text-xs mt-0.5">Excl. VAT · 30-day warranty included</div>
                </>
              )}
            </div>

            {/* Add-ons */}
            {(p.addonSupport || p.addonWarranty || p.addonInstall) && (
              <div className="border border-gray-200 rounded-lg p-3 mb-4 space-y-2">
                <p className="font-display font-700 text-navy-900 text-xs mb-1.5">Optional Add-ons</p>
                {p.addonSupport && (
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={addonSupport} onChange={e => setAddonSupport(e.target.checked)} className="mt-0.5 accent-yellow-500" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-display font-600 text-sm text-navy-900">2 Years Technical Support</span>
                        <span className="text-xs font-display font-700 text-accent">+{formatPrice(basePrice * 0.10)}</span>
                      </div>
                      <p className="text-gray-400 text-xs">Phone-based technical support and premium customer service for 2 years</p>
                    </div>
                  </label>
                )}
                {p.addonWarranty && (
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={addonWarranty} onChange={e => setAddonWarranty(e.target.checked)} className="mt-0.5 accent-yellow-500" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-display font-600 text-sm text-navy-900">2 Years Extended Warranty</span>
                        <span className="text-xs font-display font-700 text-accent">+{formatPrice(basePrice * 0.40)}</span>
                      </div>
                      <p className="text-gray-400 text-xs">Repair or replace parts for 2 years. CID charged additionally.</p>
                    </div>
                  </label>
                )}
                {p.addonInstall && (
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={addonInstall} onChange={e => setAddonInstall(e.target.checked)} className="mt-0.5 accent-yellow-500" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-display font-600 text-sm text-navy-900">Installation & Setup</span>
                        <span className="text-xs font-display font-700 text-accent">+{formatPrice(basePrice * 0.35)}</span>
                      </div>
                      <p className="text-gray-400 text-xs">Engineer pre-setup or on-site installation as per your requirements</p>
                    </div>
                  </label>
                )}
              </div>
            )}

            {/* CTAs */}
            <div className="flex flex-col gap-2 mb-4">
              <Link
                href={`/contact?type=quote&product=${p.sku}&title=${encodeURIComponent(p.title)}`}
                className="w-full bg-accent text-navy-900 font-display font-700 text-sm py-3 rounded-lg text-center hover:bg-accent-dark transition-colors"
              >
                Request a Quote
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={`/contact?type=question&product=${p.sku}`}
                  className="flex items-center justify-center gap-1.5 border border-gray-200 text-navy-900 font-display font-600 text-sm py-2.5 rounded-lg hover:border-navy-900 transition-colors"
                >
                  <MessageSquare size={14} /> Ask a Question
                </Link>
                <a
                  href="https://wa.me/447340383334"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 border border-[#25D366] text-[#25D366] font-display font-600 text-sm py-2.5 rounded-lg hover:bg-[#25D366] hover:text-white transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/></svg>
                  WhatsApp
                </a>
              </div>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
              {["✓ 30-day warranty", "✓ UK-based engineers", "✓ Free returns", "✓ Tracked shipping"].map(t => (
                <span key={t} className="flex items-center gap-1">{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-8">
          <div className="border-b border-gray-200 flex overflow-x-auto no-scrollbar">
            {([
              { key: "description", label: "Description" },
              { key: "overview",    label: "Product Overview" },
              { key: "faq",         label: "FAQ" },
              { key: "documents",   label: "Documents" },
            ] as { key: TabKey; label: string }[]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-3.5 font-display font-600 text-sm whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-accent text-accent bg-accent/5"
                    : "border-transparent text-gray-500 hover:text-navy-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === "description" && (
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
                {p.description}
              </div>
            )}

            {activeTab === "overview" && (
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
                {p.productOverview}
              </div>
            )}

            {activeTab === "faq" && (
              <div className="space-y-2">
                {p.faqs.map((faq, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-display font-600 text-sm text-navy-900 pr-4">{faq.question}</span>
                      <span className={`text-accent text-lg flex-shrink-0 transition-transform duration-200 ${faqOpen === i ? "rotate-45" : ""}`}>+</span>
                    </button>
                    {faqOpen === i && (
                      <div className="px-4 pb-4 pt-2 text-sm text-gray-600 leading-relaxed border-t border-gray-100">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === "documents" && (
              <div className="space-y-2">
                {p.documents.length > 0 ? p.documents.map((doc, i) => (
                  <a
                    key={i}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-3 hover:border-accent hover:bg-accent/5 transition-colors"
                  >
                    <FileText size={16} className="text-accent flex-shrink-0" />
                    <span className="font-display font-600 text-sm text-navy-900">{doc.name}</span>
                    <span className="ml-auto text-xs text-gray-400">{doc.fileType}</span>
                  </a>
                )) : (
                  <p className="text-gray-400 text-sm">No documents available for this product.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Have this unit to repair? */}
        <div className="bg-navy-900 text-white rounded-xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs tracking-widest uppercase text-accent mb-1">Need it repaired instead?</p>
              <h3 className="font-display font-700 text-lg">Have this unit and need it repaired?</h3>
              <p className="text-gray-300 text-sm mt-1">40% cheaper than manufacturer. Free collection. 60-day warranty.</p>
            </div>
            <Link href="/repair" className="flex-shrink-0 bg-accent text-navy-900 font-display font-700 px-5 py-2.5 rounded hover:bg-accent-dark transition-colors">
              Book a Repair →
            </Link>
          </div>
        </div>

        {/* Related Products */}
        {p.relatedProducts.length > 0 && (
          <div>
            <p className="font-mono text-xs tracking-widest uppercase text-accent mb-1">You may also like</p>
            <h2 className="font-display font-800 text-2xl text-navy-900 mb-4">Similar from {p.brand}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {p.relatedProducts.map(rp => (
                <Link key={rp.id} href={`/shop/${rp.slug}`} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-accent/50 hover:shadow-md transition-all">
                  <div className="h-24 bg-gray-50 rounded-lg flex items-center justify-center mb-3">
                    <span className="text-3xl opacity-20">📦</span>
                  </div>
                  <p className="font-mono text-xs text-gray-400 mb-0.5">{rp.brand}</p>
                  <h3 className="font-display font-700 text-sm text-navy-900 mb-1 line-clamp-2">{rp.title}</h3>
                  <p className="text-xs text-gray-400 mb-2">{rp.model}</p>
                  <div className="font-display font-700 text-accent">{formatPrice(rp.price)}</div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
