"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  AlignLeft,
  BookOpen,
  Clipboard,
  FileText,
  HelpCircle,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Video,
  X,
} from "lucide-react";
import { CONDITION_LABELS, type CatalogProduct, type ProductVariantOption } from "@/lib/catalog";
import { addCartItem } from "@/lib/cart";

type Tab = "description" | "overview" | "specs" | "documents";
type EnquiryType = "quote" | "question" | null;

export default function ProductDetail({ slug, initialProduct = null }: { slug: string; initialProduct?: CatalogProduct | null }) {
  const [product, setProduct] = useState<CatalogProduct | null>(initialProduct);
  const [loading, setLoading] = useState(!initialProduct);

  useEffect(() => {
    if (initialProduct) {
      setProduct(initialProduct);
      setLoading(false);
      return;
    }

    fetch(`/api/products/${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((result) => setProduct(result.product ?? null))
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug, initialProduct]);

  if (loading) return <ProductLoading />;
  if (!product) return <ProductNotFound />;
  return <ProductDetailView product={product} />;
}

function ProductDetailView({ product }: { product: CatalogProduct }) {
  const [tab, setTab] = useState<Tab>("description");
  const [modal, setModal] = useState<EnquiryType>(null);
  const [formSent, setFormSent] = useState<{ type: "quote" | "question"; reference: string; emailMessage: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [copied, setCopied] = useState(false);
  const variants = product.variants ?? [];
  const [selectedVariantId, setSelectedVariantId] = useState<string>(variants[0]?.id ?? "");
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) ?? null;
  const availableQty = selectedVariant ? selectedVariant.stockQty : product.stockQty;
  const [qty, setQty] = useState(1);
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
    const cleanQty = Math.max(1, Math.floor(Number(form.quantity || qty || 1)));
    const variantNote = selectedVariant ? `Selected variation: ${selectedVariant.label}${selectedVariant.sku ? ` (${selectedVariant.sku})` : ""}. ` : "";

    try {
      const response = await fetch(type === "quote" ? "/api/quotes" : "/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          quantity: cleanQty,
          subject: type === "question" ? "Product question" : undefined,
          message: `${variantNote}${form.message}`,
          type,
          product: {
            id: product.id,
            sku: product.sku,
            title: product.title,
            slug: product.slug,
            price: activePrice,
            variantSku: selectedVariant?.sku,
            variantLabel: selectedVariant?.label,
          },
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
    setTimeout(() => {
      setModal(null);
      setFormSent(null);
    }, 3200);
  }

  function addToCart() {
    addCartItem(product, qty, selectedVariant);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  function copySku() {
    navigator.clipboard?.writeText(selectedVariant?.sku || product.sku).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  }

  const condition = CONDITION_LABELS[product.condition];
  const formattedPrice = product.priceOnRequest || activePrice === null ? "Price on request" : `£${Number(activePrice).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const canBuy = !product.priceOnRequest && activePrice !== null && availableQty > 0 && qty <= availableQty;
  const stockLabel = availableQty > 0 ? `In stock (${availableQty})` : "Out of stock";
  const tabs: [Tab, string, ReactNode][] = [
    ["description", "Description", <AlignLeft key="description" size={13} />],
    ["overview", "Overview", <BookOpen key="overview" size={13} />],
    ["specs", "Specifications", <HelpCircle key="specs" size={13} />],
    ["documents", "Documents", <FileText key="documents" size={13} />],
  ];

  return (
    <div className="bg-white">
      <div className="border-b border-gray-100 py-3">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 text-xs text-gray-400">
          <Link href="/" className="hover:text-navy-950">Home</Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-navy-950">Shop</Link>
          <span>/</span>
          <Link href={`/shop?category=${product.categorySlug}`} className="hover:text-navy-950">{product.category}</Link>
          <span>/</span>
          <span className="max-w-xs truncate font-display font-800 text-navy-950">{product.sku}</span>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-5 lg:py-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-start">
          <div className="min-w-0">
            <ProductGallery product={product} />
          </div>

          <aside className="min-w-0 lg:sticky lg:top-24">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Link href={`/shop?category=${product.categorySlug}`} className="font-mono text-[10px] uppercase tracking-widest text-accent hover:text-accent-dark">{product.category}</Link>
              {product.subcategory ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-900 text-slate-600">{product.subcategory}</span> : null}
              <span className={`badge border ${condition.color}`}>{condition.label}</span>
              <span className={`badge border ${availableQty > 0 ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>{stockLabel}</span>
            </div>

            <h1 className="mb-3 font-display text-2xl font-900 leading-tight text-navy-950 lg:text-3xl">{product.title}</h1>

            <div className="mb-4 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs sm:grid-cols-2">
              <DetailLine label="SKU" value={product.sku} />
              <DetailLine label="Brand / Manufacturer" value={product.brand || product.manufacturer || "—"} />
              <DetailLine label="MPN" value={product.mpn || product.model || "—"} />
              <DetailLine label="Model" value={product.model || "—"} />
              <DetailLine label="Location" value={(product as any).itemLocation || "United Kingdom"} />
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-2xl font-900 text-navy-950">{formattedPrice}</p>
                  <p className="mt-1 text-[11px] text-gray-400">Excl. VAT where applicable · business invoice available</p>
                </div>
                <button type="button" onClick={copySku} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-[11px] font-900 text-slate-600 hover:bg-slate-50">
                  <Clipboard size={12} /> {copied ? "Copied" : "Copy SKU"}
                </button>
              </div>

              <div className="mb-4 grid grid-cols-3 gap-2">
                <InfoPill icon={<ShieldCheck size={14} />} title="Warranty" detail={shortText(product.warranty, 34) || "30-day RTB"} />
                <InfoPill icon={<Truck size={14} />} title="Shipping" detail={(product as any).shipping?.manualQuoteRequired ? "Quote required" : ((product as any).shipping?.cost !== null && (product as any).shipping?.cost !== undefined ? `From £${Number((product as any).shipping.cost).toFixed(2)}` : "Confirm")} />
                <InfoPill icon={<PackageCheck size={14} />} title="Condition" detail={condition.label} />
              </div>

              {variants.length > 0 ? (
                <div className="mb-4">
                  <label className="label text-xs">Choose variation</label>
                  <select value={selectedVariantId} onChange={(event) => { setSelectedVariantId(event.target.value); setQty(1); }} className="input py-2 text-sm">
                    <option value="" disabled>Select variation</option>
                    {variants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.label}{variant.sku ? ` — ${variant.sku}` : ""} · Stock {variant.stockQty}{variant.price !== null && variant.price !== undefined ? ` · £${Number(variant.price).toFixed(2)}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="mb-4">
                <label className="label text-xs">Quantity</label>
                <div className="inline-flex items-center overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <button type="button" onClick={() => setQty((current) => Math.max(1, current - 1))} className="p-2 hover:bg-gray-50"><Minus size={14} /></button>
                  <input type="number" min={1} max={Math.max(1, availableQty)} value={qty} onChange={(event) => setQty(Math.min(Math.max(1, availableQty), Math.max(1, Math.floor(Number(event.target.value || 1)))))} className="w-16 text-center text-sm font-display font-800 outline-none" />
                  <button type="button" onClick={() => setQty((current) => Math.min(Math.max(1, availableQty), current + 1))} disabled={qty >= availableQty} className="p-2 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"><Plus size={14} /></button>
                </div>
                {qty > availableQty ? <p className="mt-1 text-xs text-red-600">Only {availableQty} available for the selected option.</p> : null}
              </div>

              <div className="mb-4 space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-gray-600">
                <p><span className="font-display font-900 text-navy-950">Shipping:</span> {(product as any).shipping?.publicLabel || "Shipping calculated at checkout"}</p>
                <p><span className="font-display font-900 text-navy-950">Lead time:</span> {product.leadTime}</p>
                <p><span className="font-display font-900 text-navy-950">Condition note:</span> {condition.description}</p>
              </div>

              <div className="grid gap-2">
                {canBuy ? (
                  <button onClick={addToCart} className="btn-primary w-full py-2.5 text-sm">
                    <ShoppingCart size={15} /> {added ? "Added — view cart" : "Buy now / Add to cart"}
                  </button>
                ) : null}
                <button onClick={() => setModal("quote")} className={canBuy ? "btn-secondary w-full py-2.5 text-sm" : "btn-primary w-full py-2.5 text-sm"}>Request quote →</button>
                <button onClick={() => setModal("question")} className="btn-secondary w-full py-2 text-xs">Ask a technical question</button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {["Serial recorded", "Business invoice", "Packed for courier", "Quote reference issued"].map((text) => (
                <span key={text} className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-800 text-gray-600">{text}</span>
              ))}
            </div>
          </aside>
        </div>

        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0">
            <div className="mb-4 flex gap-1 overflow-x-auto border-b border-gray-200">
              {tabs.map(([value, label, icon]) => (
                <button key={value} onClick={() => setTab(value)} className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-display font-900 transition-colors ${tab === value ? "border-accent text-navy-950" : "border-transparent text-gray-400 hover:text-navy-950"}`}>
                  {icon}{label}
                </button>
              ))}
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              {tab === "description" ? <TextBlock text={product.description} /> : null}
              {tab === "overview" ? <TextBlock text={product.productOverview} /> : null}
              {tab === "specs" ? <SpecsTable product={product} /> : null}
              {tab === "documents" ? <Documents product={product} /> : null}
            </div>
          </section>

          <aside className="h-fit rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h2 className="mb-2 font-display text-base font-900 text-navy-950">Procurement support</h2>
            <p className="mb-4 text-sm leading-6 text-gray-600">For quote-led purchases, include the SKU, selected variation, destination country and delivery urgency. We will confirm availability, shipping, VAT position and documentation before invoicing.</p>
            <div className="mb-4 space-y-2 text-xs text-gray-600">
              <p><span className="font-900 text-navy-950">SKU:</span> {product.sku}</p>
              <p><span className="font-900 text-navy-950">Category:</span> {product.category}</p>
              <p><span className="font-900 text-navy-950">Warranty:</span> {product.warranty}</p>
            </div>
            <button onClick={() => setModal("quote")} className="btn-primary w-full py-2 text-xs">Request quote for {product.sku}</button>
          </aside>
        </div>
      </main>

      {modal ? <EnquiryDrawer product={product} type={modal} loading={loading} formSent={formSent} initialQty={qty} selectedVariant={selectedVariant} onClose={() => setModal(null)} onSubmit={(form) => sendForm(modal, form)} /> : null}
    </div>
  );
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

  return (
    <div>
      <div
        className={`relative mb-3 flex aspect-[4/3] select-none items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-surface ${active?.type === "image" && active.image?.url ? zoomStep === 2 ? "cursor-zoom-out" : "cursor-zoom-in" : ""}`}
        onClick={active?.type === "image" && active.image?.url ? cycleZoom : undefined}
        onMouseMove={moveZoomOrigin}
        title={active?.type === "image" && active.image?.url ? "Click to zoom: 125%, 150%, reset" : undefined}
      >
        {active?.type === "image" && active.image?.url ? <img src={active.image.url} alt={active.image.alt ?? product.title} draggable={false} style={{ transform: `scale(${zoomScale})`, transformOrigin }} className="h-full w-full object-contain p-4 transition-transform duration-150 ease-out pointer-events-none" /> : null}
        {active?.type === "video" ? <video src={active.url} controls playsInline className="h-full w-full bg-black object-contain" /> : null}
        {!active ? <div className="select-none text-[7rem] text-gray-200">📦</div> : null}
        {active?.type === "image" && active.image?.url && zoomStep > 0 ? <div className="pointer-events-none absolute bottom-3 right-3 rounded-lg border border-gray-200 bg-white/95 px-2.5 py-1.5 text-[11px] font-display font-800 text-gray-600 shadow-sm">{zoomStep === 1 ? "125%" : "150%"}</div> : null}
      </div>
      {media.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {media.map((item, index) => (
            <button key={item.type === "image" ? `${item.image.url}-${index}` : `video-${index}`} onClick={() => setActiveIndex(index)} className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border bg-surface transition-colors hover:border-gray-400 ${activeIndex === index ? "border-accent" : "border-gray-200"}`}>
              {item.type === "image" ? <img src={item.image.url} alt={item.image.alt ?? product.title} className="h-full w-full object-contain p-1" /> : <span className="flex flex-col items-center gap-0.5 text-[10px] font-display font-800 text-navy-900"><Video size={18} /> Video</span>}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function InfoPill({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return <div className="rounded-xl border border-gray-200 bg-white p-2.5"><div className="mb-1 text-accent">{icon}</div><p className="font-display text-xs font-900 text-navy-950">{title}</p><p className="truncate text-[11px] text-gray-500">{detail}</p></div>;
}

function DetailLine({ label, value }: { label: string; value: ReactNode }) {
  return <div className="flex min-w-0 gap-1.5"><span className="shrink-0 text-gray-400">{label}:</span><span className="min-w-0 truncate font-display font-800 text-navy-950">{value || "—"}</span></div>;
}

function TextBlock({ text }: { text: string }) {
  return <div className="whitespace-pre-line text-sm leading-7 text-gray-600">{text || "No description has been added yet."}</div>;
}

function SpecsTable({ product }: { product: CatalogProduct }) {
  if (!product.specs.length) return <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-500">No specifications have been added yet.</div>;
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      {product.specs.map((spec, index) => (
        <div key={`${spec.label}-${index}`} className={`grid grid-cols-1 text-sm sm:grid-cols-[190px_minmax(0,1fr)] ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
          <div className="border-b border-gray-200 px-3 py-2 font-display font-900 text-navy-950 sm:border-b-0 sm:border-r">{spec.label}</div>
          <div className="break-words px-3 py-2 text-gray-600">{spec.value}</div>
        </div>
      ))}
    </div>
  );
}

function Documents({ product }: { product: CatalogProduct }) {
  if (!product.documents.length) return <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-500">No documents uploaded.</div>;
  return (
    <div className="space-y-2">
      {product.documents.map((document) => (
        <a key={document.name} href={document.url} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3 transition-colors hover:border-accent">
          <div className="flex min-w-0 items-center gap-3">
            <FileText size={18} className="shrink-0 text-accent" />
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-900 text-navy-950">{document.name}</p>
              <p className="text-xs text-gray-400">{document.fileType}</p>
            </div>
          </div>
          <span className="shrink-0 text-xs font-display font-900 text-accent">Open</span>
        </a>
      ))}
    </div>
  );
}

function EnquiryDrawer({
  product,
  type,
  loading,
  formSent,
  initialQty,
  selectedVariant,
  onClose,
  onSubmit,
}: {
  product: CatalogProduct;
  type: "quote" | "question";
  loading: boolean;
  formSent: { type: "quote" | "question"; reference: string; emailMessage: string } | null;
  initialQty: number;
  selectedVariant: ProductVariantOption | null;
  onClose: () => void;
  onSubmit: (form: { name: string; email: string; phone?: string; country?: string; message: string; quantity?: number }) => void;
}) {
  const isQuote = type === "quote";
  const [form, setForm] = useState({ name: "", email: "", phone: "", country: "", quantity: initialQty, message: "" });

  return (
    <div className="fixed inset-0 z-50 bg-black/60">
      <aside className="absolute right-0 top-0 h-full w-full max-w-[560px] overflow-y-auto bg-white shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 z-20 text-gray-400 hover:text-gray-700"><X size={20} /></button>
        {formSent ? (
          <div className="px-6 py-20 text-center">
            <div className="mb-3 text-3xl">✓</div>
            <h3 className="mb-1 font-display text-lg font-900 text-navy-950">Request received</h3>
            <p className="mb-2 text-sm text-gray-500">Reference: {formSent.reference}</p>
            <p className="text-xs text-gray-400">{formSent.emailMessage}</p>
          </div>
        ) : (
          <form onSubmit={(event) => { event.preventDefault(); onSubmit(form); }} className="space-y-4 p-5">
            <div className="border-b border-gray-200 pb-4 pr-8">
              <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-accent">{product.sku}{selectedVariant?.sku ? ` / ${selectedVariant.sku}` : ""}</p>
              <h3 className="font-display text-xl font-900 text-navy-950">{isQuote ? "Request a quote" : "Ask a technical question"}</h3>
              <p className="mt-1 text-sm text-gray-500">{product.title}</p>
              {selectedVariant ? <p className="mt-1 text-xs text-gray-500">Variation: {selectedVariant.label}</p> : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input required className="input py-2 text-sm" placeholder="Your name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              <input required type="email" className="input py-2 text-sm" placeholder="Email address" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              <input className="input py-2 text-sm" placeholder="Phone number (optional)" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              <input required className="input py-2 text-sm" placeholder="Country" value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} />
            </div>
            <input required type="number" min={1} className="input py-2 text-sm" placeholder="Quantity" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: Math.max(1, Math.floor(Number(event.target.value || 1))) })} />
            <textarea required className="input min-h-[130px] py-2 text-sm" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder={isQuote ? "Delivery location, urgency, shipping requirements, VAT/company details or any specific documentation needed..." : "What would you like to know about this item?"} />
            <button disabled={loading} type="submit" className="btn-primary w-full py-2.5 text-sm">{loading ? "Submitting..." : isQuote ? "Submit quote request" : "Submit question"}</button>
            <p className="text-center text-[11px] text-gray-400">Combay will respond by email using the details provided.</p>
          </form>
        )}
      </aside>
    </div>
  );
}

function ProductLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_430px]">
        <div className="h-[420px] animate-pulse rounded-2xl bg-slate-100" />
        <div className="space-y-3">
          <div className="h-8 w-3/4 animate-pulse rounded bg-slate-100" />
          <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

function ProductNotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="mb-2 font-display text-2xl font-900 text-navy-950">Product not found</h1>
      <p className="mb-5 text-sm text-gray-500">This item may have been sold, archived or imported under a different SKU.</p>
      <Link href="/shop" className="btn-primary">Back to inventory</Link>
    </div>
  );
}

function shortText(value: string | undefined, max = 42) {
  const clean = String(value || "").trim();
  if (!clean) return "";
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}
