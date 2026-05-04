"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ZoomIn, FileText, HelpCircle, BookOpen, AlignLeft, X, ShieldCheck, Truck, PackageCheck } from "lucide-react";
import { CONDITION_LABELS, getProductBySlug, type CatalogProduct } from "@/lib/catalog";

type Tab = "description" | "overview" | "specs" | "documents";

type EnquiryType = "quote" | "question" | null;

export default function ProductDetail({ slug }: { slug: string }) {
  const product = getProductBySlug(slug);
  const [tab, setTab] = useState<Tab>("description");
  const [zoom, setZoom] = useState(false);
  const [modal, setModal] = useState<EnquiryType>(null);
  const [formSent, setFormSent] = useState<EnquiryType>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("quote") === "1") setModal("quote");
  }, []);

  if (!product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display font-800 text-2xl text-navy-950 mb-2">Product not found</h1>
        <p className="text-gray-500 text-sm mb-5">This item may have been sold, archived or imported under a different SKU.</p>
        <Link href="/shop" className="btn-primary">Back to inventory</Link>
      </div>
    );
  }

  async function sendForm(type: "quote" | "question") {
    setLoading(true);
    const reference = `CB-${type.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    try {
      await fetch(type === "quote" ? "/api/quotes" : "/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          reference,
          product: {
            id: product.id,
            sku: product.sku,
            title: product.title,
            slug: product.slug,
          },
          source: "product-detail",
        }),
      });
    } catch {
      // The placeholder API is intentionally non-blocking in Phase 2.
    }
    setLoading(false);
    setFormSent(type);
    setTimeout(() => {
      setModal(null);
      setFormSent(null);
    }, 2500);
  }

  const condition = CONDITION_LABELS[product.condition];
  const formattedPrice = product.priceOnRequest || product.price === null
    ? "Price on request"
    : `£${product.price.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const tabs: [Tab, string, ReactNode][] = [
    ["description", "Description", <AlignLeft key="description" size={13} />],
    ["overview", "Overview", <BookOpen key="overview" size={13} />],
    ["specs", "Specifications", <HelpCircle key="specs" size={13} />],
    ["documents", "Documents", <FileText key="documents" size={13} />],
  ];

  return (
    <div className="bg-white">
      <div className="border-b border-gray-100 py-3">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-2 text-xs text-gray-400 flex-wrap">
          <Link href="/" className="hover:text-navy-950">Home</Link><span>/</span>
          <Link href="/shop" className="hover:text-navy-950">Shop</Link><span>/</span>
          <Link href={`/shop?category=${product.categorySlug}`} className="hover:text-navy-950">{product.category}</Link><span>/</span>
          <span className="text-navy-950 font-display font-600 truncate max-w-xs">{product.sku}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-10 mb-10">
          <ProductGallery product={product} onZoom={() => setZoom(true)} />

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Link href={`/shop?category=${product.categorySlug}`} className="font-mono text-[10px] text-accent tracking-widest uppercase hover:text-accent-dark">{product.category}</Link>
              <span className={`badge border ${condition.color}`}>{condition.label}</span>
              {product.stockQty > 0 ? (
                <span className="badge text-green-700 bg-green-50 border-green-200">In stock ({product.stockQty})</span>
              ) : (
                <span className="badge text-red-700 bg-red-50 border-red-200">Out of stock</span>
              )}
            </div>

            <h1 className="font-display font-800 text-2xl lg:text-3xl text-navy-950 leading-tight mb-3">{product.title}</h1>

            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs mb-5">
              {[
                ["SKU", product.sku],
                ["Brand", product.brand],
                ["Manufacturer", product.manufacturer],
                ["Model", product.model],
                ["MPN", product.mpn],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-1.5">
                  <span className="text-gray-400">{label}:</span>
                  <span className="text-navy-950 font-display font-600">{value}</span>
                </div>
              ))}
            </div>

            <div className="bg-surface border border-gray-200 rounded-2xl p-5 mb-5">
              <p className="font-display font-800 text-3xl text-navy-950 mb-1">{formattedPrice}</p>
              <p className="text-gray-400 text-xs mb-4">Excl. VAT · {product.warranty}</p>

              <div className="grid sm:grid-cols-3 gap-2 mb-5">
                <InfoPill icon={<ShieldCheck size={14} />} title="Warranty" detail="30-day RTB" />
                <InfoPill icon={<Truck size={14} />} title="Dispatch" detail={product.stockQty > 0 ? "Ready to ship" : "Confirm first"} />
                <InfoPill icon={<PackageCheck size={14} />} title="Condition" detail={condition.label} />
              </div>

              <div className="text-sm text-gray-600 space-y-2 mb-5">
                <p><span className="font-display font-700 text-navy-900">Lead time:</span> {product.leadTime}</p>
                <p><span className="font-display font-700 text-navy-900">Condition note:</span> {condition.description}</p>
              </div>

              <div className="flex flex-col gap-2">
                {!product.priceOnRequest && product.price !== null && product.stockQty > 0 && (
                  <button className="btn-secondary w-full py-3 text-base" disabled title="Cart/checkout is Phase 3">
                    Buy Now — Phase 3 checkout
                  </button>
                )}
                <button onClick={() => setModal("quote")} className="btn-primary w-full py-3 text-base">Request a Quote →</button>
                <button onClick={() => setModal("question")} className="btn-secondary w-full py-2.5">Ask a Question</button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {["30-day warranty", "Serial recorded", "UK dispatch", "Quote reference issued"].map((text) => (
                <span key={text} className="badge bg-gray-50 text-gray-600 border-gray-200">{text}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-8">
          <div>
            <div className="border-b border-gray-200 flex gap-1 overflow-x-auto mb-6">
              {tabs.map(([value, label, icon]) => (
                <button
                  key={value}
                  onClick={() => setTab(value)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-display font-600 border-b-2 transition-colors whitespace-nowrap ${tab === value ? "border-accent text-navy-950" : "border-transparent text-gray-400 hover:text-navy-950"}`}
                >
                  {icon}{label}
                </button>
              ))}
            </div>

            {tab === "description" && <TextBlock text={product.description} />}
            {tab === "overview" && <TextBlock text={product.productOverview} />}
            {tab === "specs" && <SpecsTable product={product} />}
            {tab === "documents" && <Documents product={product} />}
          </div>

          <aside className="bg-gray-50 border border-gray-200 rounded-2xl p-5 h-fit">
            <h2 className="font-display font-800 text-lg text-navy-950 mb-3">Procurement note</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">For business buyers, quote requests should carry the product SKU and exact MPN so our team can confirm availability, shipping, VAT position and any required documentation.</p>
            <button onClick={() => setModal("quote")} className="btn-primary w-full">Request quote for {product.sku}</button>
          </aside>
        </div>
      </div>

      {zoom && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4" onClick={() => setZoom(false)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white"><X size={24} /></button>
          <div className="bg-white rounded-2xl w-full max-w-2xl aspect-square flex items-center justify-center">
            <div className="text-gray-200 text-[10rem]">📦</div>
          </div>
        </div>
      )}

      {modal && (
        <EnquiryModal
          product={product}
          type={modal}
          loading={loading}
          formSent={formSent}
          onClose={() => setModal(null)}
          onSubmit={() => sendForm(modal)}
        />
      )}
    </div>
  );
}

function ProductGallery({ product, onZoom }: { product: CatalogProduct; onZoom: () => void }) {
  return (
    <div>
      <div className="bg-surface border border-gray-200 rounded-2xl aspect-square flex items-center justify-center relative overflow-hidden group cursor-zoom-in mb-3" onClick={onZoom}>
        {product.image ? <img src={product.image} alt={product.title} className="object-contain w-full h-full p-6" /> : <div className="text-gray-200 text-[7rem] select-none">📦</div>}
        <div className="absolute bottom-3 right-3 bg-white/90 border border-gray-200 rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
          <ZoomIn size={13} className="text-gray-500" />
          <span className="text-[10px] text-gray-500 font-display font-600">Zoom</span>
        </div>
      </div>
      <div className="flex gap-2">
        {[0, 1, 2].map((item) => (
          <button key={item} className="w-16 h-16 bg-surface border border-gray-200 rounded-xl flex items-center justify-center hover:border-gray-400 transition-colors">
            <span className="text-gray-300 text-xl">📦</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function InfoPill({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <div className="border border-gray-200 bg-white rounded-xl p-3">
      <div className="text-accent mb-1">{icon}</div>
      <p className="font-display font-700 text-xs text-navy-950">{title}</p>
      <p className="text-[11px] text-gray-500">{detail}</p>
    </div>
  );
}

function TextBlock({ text }: { text: string }) {
  return <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-line leading-relaxed">{text}</div>;
}

function SpecsTable({ product }: { product: CatalogProduct }) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {product.specs.map((spec, index) => (
        <div key={spec.label} className={`grid grid-cols-[160px_1fr] text-sm ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
          <div className="px-4 py-3 font-display font-700 text-navy-950 border-r border-gray-200">{spec.label}</div>
          <div className="px-4 py-3 text-gray-600">{spec.value}</div>
        </div>
      ))}
    </div>
  );
}

function Documents({ product }: { product: CatalogProduct }) {
  return (
    <div className="space-y-3">
      {product.documents.map((document) => (
        <a key={document.name} href={document.url} className="flex items-center justify-between border border-gray-200 rounded-xl p-4 hover:border-accent transition-colors">
          <div className="flex items-center gap-3">
            <FileText size={18} className="text-accent" />
            <div>
              <p className="font-display font-700 text-sm text-navy-950">{document.name}</p>
              <p className="text-xs text-gray-400">{document.fileType}</p>
            </div>
          </div>
          <span className="text-xs text-accent font-display font-700">Open</span>
        </a>
      ))}
    </div>
  );
}

function EnquiryModal({
  product,
  type,
  loading,
  formSent,
  onClose,
  onSubmit,
}: {
  product: CatalogProduct;
  type: "quote" | "question";
  loading: boolean;
  formSent: EnquiryType;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const isQuote = type === "quote";
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X size={20} /></button>
        {formSent ? (
          <div className="text-center py-8">
            <div className="text-3xl mb-3">✓</div>
            <h3 className="font-display font-800 text-lg text-navy-950 mb-1">Request received</h3>
            <p className="text-sm text-gray-500">A reference has been generated and the request has been passed to the current Phase 2 API endpoint.</p>
          </div>
        ) : (
          <form onSubmit={(event) => { event.preventDefault(); onSubmit(); }} className="space-y-4">
            <div>
              <p className="font-mono text-[10px] text-accent tracking-widest uppercase mb-1">{product.sku}</p>
              <h3 className="font-display font-800 text-xl text-navy-950">{isQuote ? "Request a quote" : "Ask a question"}</h3>
              <p className="text-sm text-gray-500 mt-1">{product.title}</p>
            </div>
            <input required className="input" placeholder="Your name" />
            <input required type="email" className="input" placeholder="Email address" />
            <input className="input" placeholder="Phone number (optional)" />
            <textarea required className="input min-h-[120px]" placeholder={isQuote ? "Quantity required, delivery location, urgency or any specific requirements..." : "What would you like to know about this item?"} />
            <button disabled={loading} type="submit" className="btn-primary w-full py-3">{loading ? "Submitting..." : isQuote ? "Submit quote request" : "Submit question"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
