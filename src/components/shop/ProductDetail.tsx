"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { FileText, HelpCircle, BookOpen, AlignLeft, X, ShieldCheck, Truck, PackageCheck, ShoppingCart, Minus, Plus, Video } from "lucide-react";
import { CONDITION_LABELS, type CatalogProduct, type ProductVariantOption } from "@/lib/catalog";
import { addCartItem } from "@/lib/cart";

type Tab = "description" | "overview" | "specs" | "documents";
type EnquiryType = "quote" | "question" | null;

export default function ProductDetail({ slug }: { slug: string }) {
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/products/${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((result) => setProduct(result.product ?? null))
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-20 text-center text-sm text-gray-500">Loading product…</div>;
  if (!product) return <div className="max-w-3xl mx-auto px-4 py-20 text-center"><h1 className="font-display font-800 text-2xl text-navy-950 mb-2">Product not found</h1><p className="text-gray-500 text-sm mb-5">This item may have been sold, archived or imported under a different SKU.</p><Link href="/shop" className="btn-primary">Back to inventory</Link></div>;
  return <ProductDetailView product={product} />;
}

function ProductDetailView({ product }: { product: CatalogProduct }) {
  const [tab, setTab] = useState<Tab>("description");
  const [modal, setModal] = useState<EnquiryType>(null);
  const [formSent, setFormSent] = useState<{ type: "quote" | "question"; reference: string; emailMessage: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(1);
  const variants = product.variants ?? [];
  const [selectedVariantId, setSelectedVariantId] = useState<string>(variants[0]?.id ?? "");
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) ?? null;
  const availableQty = selectedVariant ? selectedVariant.stockQty : product.stockQty;
  const activePrice = selectedVariant?.price !== null && selectedVariant?.price !== undefined ? Number(selectedVariant.price) : product.price;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("quote") === "1") setModal("quote");
  }, []);

  useEffect(() => {
    setSelectedVariantId((product.variants ?? [])[0]?.id ?? "");
    setQty(1);
  }, [product.id]);

  async function sendForm(type: "quote" | "question", form: { name: string; email: string; phone?: string; country?: string; message: string; quantity?: number }) {
    setLoading(true);
    const variantNote = selectedVariant ? `Selected variation: ${selectedVariant.label}${selectedVariant.sku ? ` (${selectedVariant.sku})` : ""}. ` : "";
    try {
      const response = await fetch(type === "quote" ? "/api/quotes" : "/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          quantity: Math.max(1, Math.floor(Number(form.quantity || qty || 1))),
          message: `${variantNote}${form.message}`,
          type,
          product: { id: product.id, sku: product.sku, title: product.title, slug: product.slug, price: activePrice, variantSku: selectedVariant?.sku, variantLabel: selectedVariant?.label },
          selectedVariant,
          source: "product-detail",
        }),
      });
      const result = await response.json();
      setFormSent({ type, reference: result.reference || "REQUEST-RECEIVED", emailMessage: result.email?.message || "Request logged." });
    } catch {
      setFormSent({ type, reference: "REQUEST-RECEIVED", emailMessage: "Request captured in the browser but the API did not return a confirmation." });
    }
    setLoading(false);
    setTimeout(() => { setModal(null); setFormSent(null); }, 3200);
  }

  function addToCart() {
    addCartItem(product, qty, selectedVariant);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  const condition = CONDITION_LABELS[product.condition];
  const formattedPrice = product.priceOnRequest || activePrice === null ? "Price on request" : `£${Number(activePrice).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const canBuy = !product.priceOnRequest && activePrice !== null && availableQty > 0 && qty <= availableQty;
  const tabs: [Tab, string, ReactNode][] = [["description", "Description", <AlignLeft key="description" size={13} />], ["overview", "Overview", <BookOpen key="overview" size={13} />], ["specs", "Specifications", <HelpCircle key="specs" size={13} />], ["documents", "Documents", <FileText key="documents" size={13} />]];

  return <div className="bg-white"><div className="border-b border-gray-100 py-3"><div className="max-w-7xl mx-auto px-4 flex items-center gap-2 text-xs text-gray-400 flex-wrap"><Link href="/" className="hover:text-navy-950">Home</Link><span>/</span><Link href="/shop" className="hover:text-navy-950">Shop</Link><span>/</span><Link href={`/shop?category=${product.categorySlug}`} className="hover:text-navy-950">{product.category}</Link><span>/</span><span className="text-navy-950 font-display font-600 truncate max-w-xs">{product.sku}</span></div></div><div className="max-w-7xl mx-auto px-4 py-6"><div className="grid lg:grid-cols-[minmax(0,1fr)_470px] gap-6 mb-8"><ProductGallery product={product} /><div><div className="flex flex-wrap items-center gap-2 mb-3"><Link href={`/shop?category=${product.categorySlug}`} className="font-mono text-[10px] text-accent tracking-widest uppercase hover:text-accent-dark">{product.category}</Link><span className={`badge border ${condition.color}`}>{condition.label}</span>{availableQty > 0 ? <span className="badge text-green-700 bg-green-50 border-green-200">In stock ({availableQty})</span> : <span className="badge text-red-700 bg-red-50 border-red-200">Out of stock</span>}</div><h1 className="font-display font-900 text-2xl lg:text-3xl text-navy-950 leading-tight mb-3">{product.title}</h1><div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs mb-4">{[["SKU", product.sku], ["Brand", product.brand], ["Manufacturer", product.manufacturer], ["Model", product.model], ["MPN", product.mpn], ["Item location", (product as any).itemLocation || "United Kingdom"]].map(([label, value]) => <div key={label} className="flex min-w-0 gap-1.5"><span className="text-gray-400">{label}:</span><span className="min-w-0 truncate text-navy-950 font-display font-700">{value}</span></div>)}</div><div className="bg-surface border border-gray-200 rounded-xl p-4 mb-4 shadow-sm"><p className="font-display font-900 text-2xl text-navy-950 mb-1">{formattedPrice}</p><p className="text-gray-400 text-xs mb-4">Excl. VAT · {product.warranty}</p><div className="grid sm:grid-cols-3 gap-2 mb-4"><InfoPill icon={<ShieldCheck size={14} />} title="Warranty" detail="30-day RTB" /><InfoPill icon={<Truck size={14} />} title="Dispatch" detail={availableQty > 0 ? "Ready to ship" : "Confirm first"} /><InfoPill icon={<PackageCheck size={14} />} title="Condition" detail={condition.label} /></div>{variants.length > 0 && <div className="mb-4"><label className="label">Choose variation</label><select value={selectedVariantId} onChange={(e) => { setSelectedVariantId(e.target.value); setQty(1); }} className="input py-2 text-sm"><option value="" disabled>Select variation</option>{variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}{variant.sku ? ` — ${variant.sku}` : ""} · Stock {variant.stockQty}{variant.price !== null && variant.price !== undefined ? ` · £${Number(variant.price).toFixed(2)}` : ""}</option>)}</select></div>}<div className="mb-4"><label className="label">Quantity</label><div className="inline-flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white"><button type="button" onClick={() => setQty((current) => Math.max(1, current - 1))} className="p-2 hover:bg-gray-50"><Minus size={14} /></button><input type="number" min={1} max={Math.max(1, availableQty)} value={qty} onChange={(e) => setQty(Math.min(Math.max(1, availableQty), Math.max(1, Math.floor(Number(e.target.value || 1)))))} className="w-16 text-center text-sm font-display font-700 outline-none" /><button type="button" onClick={() => setQty((current) => Math.min(Math.max(1, availableQty), current + 1))} disabled={qty >= availableQty} className="p-2 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"><Plus size={14} /></button></div>{qty > availableQty && <p className="text-xs text-red-600 mt-1">Only {availableQty} available for the selected option.</p>}</div><div className="text-sm text-gray-600 space-y-1.5 mb-4"><p><span className="font-display font-700 text-navy-900">Lead time:</span> {product.leadTime}</p><p><span className="font-display font-700 text-navy-900">Condition note:</span> {condition.description}</p></div><div className="flex flex-col gap-2">{canBuy && <button onClick={addToCart} className="btn-secondary w-full py-2.5 text-sm"><ShoppingCart size={16} /> {added ? "Added — view cart" : "Add to Cart"}</button>}<button onClick={() => setModal("quote")} className="btn-primary w-full py-2.5 text-sm">Request a Quote →</button><button onClick={() => setModal("question")} className="btn-secondary w-full py-2 text-xs">Ask a Question</button></div></div><div className="flex flex-wrap gap-1.5">{["30-day warranty", "Serial recorded", "UK dispatch", "Quote reference issued"].map((text) => <span key={text} className="badge bg-gray-50 text-gray-600 border-gray-200">{text}</span>)}</div></div></div><div className="grid lg:grid-cols-[1fr_320px] gap-8"><div><div className="border-b border-gray-200 flex gap-1 overflow-x-auto mb-6">{tabs.map(([value, label, icon]) => <button key={value} onClick={() => setTab(value)} className={`flex items-center gap-1.5 px-4 py-3 text-sm font-display font-600 border-b-2 transition-colors whitespace-nowrap ${tab === value ? "border-accent text-navy-950" : "border-transparent text-gray-400 hover:text-navy-950"}`}>{icon}{label}</button>)}</div>{tab === "description" && <TextBlock text={product.description} />}{tab === "overview" && <TextBlock text={product.productOverview} />}{tab === "specs" && <SpecsTable product={product} />}{tab === "documents" && <Documents product={product} />}</div><aside className="bg-gray-50 border border-gray-200 rounded-2xl p-5 h-fit"><h2 className="font-display font-800 text-lg text-navy-950 mb-3">Procurement note</h2><p className="text-sm text-gray-600 leading-relaxed mb-4">For business buyers, quote requests should carry the product SKU, selected variation and exact MPN so our team can confirm availability, shipping, VAT position and documentation.</p><button onClick={() => setModal("quote")} className="btn-primary w-full">Request quote for {product.sku}</button></aside></div></div>{modal && <EnquiryModal product={product} type={modal} loading={loading} formSent={formSent} initialQty={qty} selectedVariant={selectedVariant} onClose={() => setModal(null)} onSubmit={(form) => sendForm(modal, form)} />}</div>;
}

function ProductGallery({ product }: { product: CatalogProduct }) {
  const images = product.images?.length ? product.images.slice(0, 15) : product.image ? [{ url: product.image, alt: product.title, isPrimary: true, sortOrder: 0 }] : [];
  const hasVideo = Boolean((product as any).videoUrl);
  const media = [
    ...images.map((image, index) => ({ type: "image" as const, image, index })),
    ...(hasVideo ? [{ type: "video" as const, url: String((product as any).videoUrl), index: images.length }] : []),
  ];
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomStep, setZoomStep] = useState<0 | 1 | 2>(0);
  const [transformOrigin, setTransformOrigin] = useState("50% 50%");
  const active = media[activeIndex] ?? media[0];
  const zoomScale = zoomStep === 0 ? 1 : zoomStep === 1 ? 1.25 : 1.5;

  useEffect(() => { setActiveIndex(0); setZoomStep(0); setTransformOrigin("50% 50%"); }, [product.id]);
  useEffect(() => { setZoomStep(0); setTransformOrigin("50% 50%"); }, [activeIndex]);

  function cycleZoom() {
    if (active?.type !== "image") return;
    setZoomStep((current) => current === 0 ? 1 : current === 1 ? 2 : 0);
    if (zoomStep === 2) setTransformOrigin("50% 50%");
  }

  function moveZoomOrigin(event: MouseEvent<HTMLDivElement>) {
    if (zoomScale <= 1 || active?.type !== "image") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    setTransformOrigin(`${Math.min(100, Math.max(0, x)).toFixed(1)}% ${Math.min(100, Math.max(0, y)).toFixed(1)}%`);
  }

  return <div>
    <div
      className={`bg-surface border border-gray-200 rounded-2xl aspect-square flex items-center justify-center relative overflow-hidden mb-3 select-none ${active?.type === "image" && active.image?.url ? zoomStep === 2 ? "cursor-zoom-out" : "cursor-zoom-in" : ""}`}
      onClick={active?.type === "image" && active.image?.url ? cycleZoom : undefined}
      onMouseMove={moveZoomOrigin}
      title={active?.type === "image" && active.image?.url ? "Click to zoom: 125%, 150%, reset" : undefined}
    >
      {active?.type === "image" && active.image?.url ? <img src={active.image.url} alt={active.image.alt ?? product.title} draggable={false} style={{ transform: `scale(${zoomScale})`, transformOrigin }} className="object-contain w-full h-full p-6 transition-transform duration-150 ease-out pointer-events-none" /> : null}
      {active?.type === "video" ? <video src={active.url} controls playsInline className="w-full h-full object-contain bg-black" /> : null}
      {!active && <div className="text-gray-200 text-[7rem] select-none">📦</div>}
      {active?.type === "image" && active.image?.url && zoomStep > 0 && <div className="absolute bottom-3 right-3 bg-white/95 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-600 shadow-sm pointer-events-none font-display font-700">{zoomStep === 1 ? "125%" : "150%"}</div>}
    </div>
    <div className="flex gap-2 flex-wrap">{media.map((item, index) => <button key={item.type === "image" ? `${item.image.url}-${index}` : `video-${index}`} onClick={() => setActiveIndex(index)} className={`w-16 h-16 bg-surface border rounded-xl flex items-center justify-center hover:border-gray-400 transition-colors overflow-hidden ${activeIndex === index ? "border-accent" : "border-gray-200"}`}>{item.type === "image" ? <img src={item.image.url} alt={item.image.alt ?? product.title} className="object-contain w-full h-full p-1" /> : <span className="flex flex-col items-center gap-0.5 text-[10px] font-display font-700 text-navy-900"><Video size={18} /> Video</span>}</button>)}</div>
  </div>;
}
function InfoPill({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) { return <div className="border border-gray-200 bg-white rounded-xl p-3"><div className="text-accent mb-1">{icon}</div><p className="font-display font-700 text-xs text-navy-950">{title}</p><p className="text-[11px] text-gray-500">{detail}</p></div>; }
function TextBlock({ text }: { text: string }) { return <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-line leading-relaxed">{text}</div>; }
function SpecsTable({ product }: { product: CatalogProduct }) { return <div className="border border-gray-200 rounded-xl overflow-hidden">{product.specs.length ? product.specs.map((spec, index) => <div key={`${spec.label}-${index}`} className={`grid grid-cols-[160px_1fr] text-sm ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}><div className="px-4 py-3 font-display font-700 text-navy-950 border-r border-gray-200">{spec.label}</div><div className="px-4 py-3 text-gray-600">{spec.value}</div></div>) : <div className="p-5 text-sm text-gray-500">No specifications have been added yet.</div>}</div>; }
function Documents({ product }: { product: CatalogProduct }) { return <div className="space-y-3">{product.documents.length ? product.documents.map((document) => <a key={document.name} href={document.url} className="flex items-center justify-between border border-gray-200 rounded-xl p-4 hover:border-accent transition-colors"><div className="flex items-center gap-3"><FileText size={18} className="text-accent" /><div><p className="font-display font-700 text-sm text-navy-950">{document.name}</p><p className="text-xs text-gray-400">{document.fileType}</p></div></div><span className="text-xs text-accent font-display font-700">Open</span></a>) : <div className="p-5 border border-gray-200 rounded-xl text-sm text-gray-500">No documents uploaded.</div>}</div>; }
function EnquiryModal({ product, type, loading, formSent, initialQty, selectedVariant, onClose, onSubmit }: { product: CatalogProduct; type: "quote" | "question"; loading: boolean; formSent: { type: "quote" | "question"; reference: string; emailMessage: string } | null; initialQty: number; selectedVariant: ProductVariantOption | null; onClose: () => void; onSubmit: (form: { name: string; email: string; phone?: string; country?: string; message: string; quantity?: number }) => void }) { const isQuote = type === "quote"; const [form, setForm] = useState({ name: "", email: "", phone: "", country: "", quantity: initialQty, message: "" }); return <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 relative"><button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X size={20} /></button>{formSent ? <div className="text-center py-8"><div className="text-3xl mb-3">✓</div><h3 className="font-display font-800 text-lg text-navy-950 mb-1">Request received</h3><p className="text-sm text-gray-500 mb-2">Reference: {formSent.reference}</p><p className="text-xs text-gray-400">{formSent.emailMessage}</p></div> : <form onSubmit={(event) => { event.preventDefault(); onSubmit(form); }} className="space-y-4"><div><p className="font-mono text-[10px] text-accent tracking-widest uppercase mb-1">{product.sku}{selectedVariant?.sku ? ` / ${selectedVariant.sku}` : ""}</p><h3 className="font-display font-800 text-xl text-navy-950">{isQuote ? "Request a quote" : "Ask a question"}</h3><p className="text-sm text-gray-500 mt-1">{product.title}</p>{selectedVariant && <p className="text-xs text-gray-500 mt-1">Variation: {selectedVariant.label}</p>}</div><input required className="input py-2 text-sm" placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><input required type="email" className="input py-2 text-sm" placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /><input className="input py-2 text-sm" placeholder="Phone number (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /><input required className="input py-2 text-sm" placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /><input required type="number" min={1} className="input py-2 text-sm" placeholder="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Math.max(1, Math.floor(Number(e.target.value || 1))) })} /><textarea required className="input min-h-[120px]" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder={isQuote ? "Delivery location, urgency or any specific requirements..." : "What would you like to know about this item?"} /><button disabled={loading} type="submit" className="btn-primary w-full py-3">{loading ? "Submitting..." : isQuote ? "Submit quote request" : "Submit question"}</button></form>}</div></div>; }
