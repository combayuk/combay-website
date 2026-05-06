"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, ImagePlus, Plus, Save, Sparkles, Star, Trash2, Video } from "lucide-react";
import { CATEGORIES, type CatalogProduct, type ConditionCode } from "@/lib/catalog";
import { CONDITION_OPTIONS, createBlankAdminProduct, slugifyProductTitle, type AdminProduct, type AdminProductStatus } from "@/lib/adminCatalog";
import { generateProductContent } from "@/lib/productContentAssistant";

type Props = { mode: "new" | "edit"; productId?: string };
type Tab = "basic" | "content" | "images" | "logistics" | "variants" | "seo";
type ImageRow = { url: string; alt?: string | null; isPrimary?: boolean; sortOrder?: number };
type VariantRow = { id?: string; label: string; sku?: string | null; optionName?: string | null; optionValue?: string | null; price?: number | null; stockQty: number; sortOrder?: number };
const MAX_PRODUCT_IMAGES = 15;

function normaliseImages(product: any): ImageRow[] {
  const seen = new Set<string>();
  const rows: ImageRow[] = [];
  for (const image of product.images ?? []) {
    if (!image?.url || seen.has(image.url)) continue;
    seen.add(image.url);
    rows.push({ url: image.url, alt: image.alt ?? product.title ?? "Product image", isPrimary: Boolean(image.isPrimary), sortOrder: image.sortOrder ?? rows.length });
  }
  if (product.image && !seen.has(product.image)) rows.unshift({ url: product.image, alt: product.title ?? "Product image", isPrimary: true, sortOrder: 0 });
  const limited = rows.slice(0, MAX_PRODUCT_IMAGES).map((row, index) => ({ ...row, sortOrder: index }));
  if (limited.length && !limited.some((row) => row.isPrimary)) limited[0].isPrimary = true;
  return limited;
}
function cleanImages(rows: ImageRow[], title: string) {
  const filtered = rows.map((row) => ({ ...row, url: row.url.trim(), alt: row.alt?.trim() || title || "Product image" })).filter((row) => row.url).slice(0, MAX_PRODUCT_IMAGES);
  const primary = filtered.findIndex((row) => row.isPrimary);
  return filtered.map((row, index) => ({ ...row, isPrimary: primary >= 0 ? index === primary : index === 0, sortOrder: index }));
}
function normaliseVariants(variants: any[] = []): VariantRow[] {
  return variants.map((variant, index) => ({ id: variant.id, label: variant.label || `Variant ${index + 1}`, sku: variant.sku ?? "", optionName: variant.optionName ?? "", optionValue: variant.optionValue ?? "", price: variant.price === null || variant.price === undefined || variant.price === "" ? null : Number(variant.price), stockQty: Math.max(0, Math.floor(Number(variant.stockQty ?? 0))), sortOrder: variant.sortOrder ?? index }));
}
function cleanVariants(rows: VariantRow[]) {
  return rows.filter((row) => row.label.trim() || String(row.sku ?? "").trim() || String(row.optionValue ?? "").trim()).map((row, index) => {
    const optionName = row.optionName?.trim() || null;
    const optionValue = row.optionValue?.trim() || null;
    const label = row.label.trim() || [optionName, optionValue].filter(Boolean).join(": ") || row.sku?.trim() || `Variant ${index + 1}`;
    return { id: row.id, label, sku: row.sku?.trim() || null, optionName, optionValue, price: row.price === null || row.price === undefined || Number.isNaN(Number(row.price)) ? null : Number(row.price), stockQty: Math.max(0, Math.floor(Number(row.stockQty ?? 0))), sortOrder: index };
  });
}


function specsToText(specs: CatalogProduct["specs"] = []) {
  return specs.map((spec) => `${spec.label}: ${spec.value}`).join("\n");
}
function textToSpecs(text: string): CatalogProduct["specs"] {
  return text.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const [label, ...rest] = line.split(":");
    return { label: label.trim(), value: rest.join(":").trim() || "—" };
  });
}
function tagsToText(tags: string[] = []) { return tags.join(", "); }
function textToTags(text: string) { return text.split(",").map((tag) => tag.trim()).filter(Boolean); }
function docsToText(docs: CatalogProduct["documents"] = []) { return docs.map((doc) => `${doc.name}|${doc.url}|${doc.fileType}`).join("\n"); }

function variantsToText(variants: any[] = []) {
  return variants.map((variant) => `${variant.label || "Variant"}|${variant.sku || ""}|${variant.price ?? ""}|${variant.stockQty ?? 0}`).join("\n");
}
function textToVariants(text: string) {
  return text.split("\n").map((line) => line.trim()).filter(Boolean).map((line, index) => {
    const [label, sku, price, stockQty] = line.split("|");
    const labelText = label?.trim() || `Variant ${index + 1}`;
    const parts = labelText.split(":");
    return {
      label: labelText,
      sku: sku?.trim() || null,
      optionName: parts.length > 1 ? parts[0].trim() : null,
      optionValue: parts.length > 1 ? parts.slice(1).join(":").trim() : labelText,
      price: price?.trim() ? Number(price) : null,
      stockQty: Math.max(0, Math.floor(Number(stockQty || 0))),
      sortOrder: index,
    };
  });
}

function textToDocs(text: string): CatalogProduct["documents"] {
  return text.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const [name, url, fileType] = line.split("|");
    return { name: name?.trim() || "Document", url: url?.trim() || "#", fileType: fileType?.trim() || "PDF" };
  });
}

function dbProductToAdmin(product: any): AdminProduct {
  return {
    ...createBlankAdminProduct(),
    ...product,
    status: product.status ?? "DRAFT",
    source: product.source ?? "database",
    weightKg: product.weightKg ?? "",
    dimensionsCm: product.dimensionsCm ?? "",
    locationBin: product.locationBin ?? "",
    itemLocation: product.itemLocation ?? "United Kingdom",
    hsCode: product.hsCode ?? "",
    ebayItemId: product.ebayItemId ?? "",
    syncExcluded: Boolean(product.syncExcluded),
  };
}

export default function ProductEditor({ mode, productId }: Props) {
  const router = useRouter();
  const blank = useMemo(() => createBlankAdminProduct(), []);
  const [tab, setTab] = useState<Tab>("basic");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [product, setProduct] = useState<AdminProduct>(blank);
  const [specText, setSpecText] = useState("");
  const [docText, setDocText] = useState("");
  const [tagText, setTagText] = useState("");
  const [imageRows, setImageRows] = useState<ImageRow[]>(normaliseImages(blank));
  const [variantRows, setVariantRows] = useState<VariantRow[]>(normaliseVariants((blank as any).variants));

  useEffect(() => {
    if (mode !== "edit" || !productId) {
      setSpecText(specsToText(blank.specs));
      setDocText(docsToText(blank.documents));
      setTagText(tagsToText(blank.tags));
      setVariantRows(normaliseVariants((blank as any).variants));
      setImageRows(normaliseImages(blank));
      return;
    }

    fetch(`/api/products/${encodeURIComponent(productId)}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((result) => {
        if (!result.ok || !result.product) throw new Error(result.error || "Product not found");
        const loaded = dbProductToAdmin(result.product);
        setProduct(loaded);
        setSpecText(specsToText(loaded.specs));
        setDocText(docsToText(loaded.documents));
        setTagText(tagsToText(loaded.tags));
        setVariantRows(normaliseVariants((loaded as any).variants));
        setImageRows(normaliseImages(loaded));
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Could not load product."))
      .finally(() => setLoading(false));
  }, [mode, productId]);

  function update<K extends keyof AdminProduct>(key: K, value: AdminProduct[K]) {
    setProduct((current) => ({ ...current, [key]: value }));
  }

  function updateCategory(categoryLabel: string) {
    const category = CATEGORIES.find((item) => item.label === categoryLabel && item.slug) ?? CATEGORIES.find((item) => item.slug);
    setProduct((current) => ({ ...current, category: categoryLabel, categorySlug: category?.slug ?? slugifyProductTitle(categoryLabel, "category") }));
  }

  function updateImage(index: number, patch: Partial<ImageRow>) { setImageRows((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row)); }
  function addImageRow() { setImageRows((rows) => rows.length >= MAX_PRODUCT_IMAGES ? rows : [...rows, { url: "", alt: product.title, isPrimary: rows.length === 0, sortOrder: rows.length }]); }
  function deleteImageRow(index: number) { setImageRows((rows) => { const next = rows.filter((_, rowIndex) => rowIndex !== index).map((row, rowIndex) => ({ ...row, sortOrder: rowIndex })); if (next.length && !next.some((row) => row.isPrimary)) next[0].isPrimary = true; return next; }); }
  function makePrimaryImage(index: number) { setImageRows((rows) => rows.map((row, rowIndex) => ({ ...row, isPrimary: rowIndex === index }))); }
  function updateVariant(index: number, patch: Partial<VariantRow>) { setVariantRows((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row)); }
  function addVariantRow() { setVariantRows((rows) => [...rows, { label: `Variant ${rows.length + 1}`, sku: "", optionName: "", optionValue: "", price: null, stockQty: 0, sortOrder: rows.length }]); }
  function deleteVariantRow(index: number) { setVariantRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index).map((row, rowIndex) => ({ ...row, sortOrder: rowIndex }))); }

  function applyContentAssistant(scope: "overview" | "seo" | "all") {
    const suggestions = generateProductContent({
      title: product.title,
      sku: product.sku,
      brand: product.brand,
      manufacturer: product.manufacturer,
      model: product.model,
      mpn: product.mpn,
      category: product.category,
      condition: product.condition,
      description: product.description,
      productOverview: product.productOverview,
      itemLocation: (product as any).itemLocation,
      specs: textToSpecs(specText),
      tags: textToTags(tagText),
    });

    if (scope === "overview" || scope === "all") {
      setProduct((current) => ({
        ...current,
        description: scope === "all" || !current.description?.trim() ? suggestions.description : current.description,
        productOverview: suggestions.productOverview,
      }));
    }

    if (scope === "seo" || scope === "all") {
      setProduct((current) => ({
        ...current,
        seoTitle: suggestions.seoTitle,
        seoDescription: suggestions.seoDescription,
        seoKeywords: suggestions.tags.join(", "),
      } as AdminProduct));
      setTagText(suggestions.tags.join(", "));
    }

    setMessage(scope === "seo" ? "SEO suggestions generated. Review and save the product." : "Content suggestions generated. Review and save the product.");
  }

  async function uploadFile(file: File | null, folder: "products" | "docs") {
    if (!file) return;
    const form = new FormData();
    form.set("file", file);
    form.set("folder", folder);
    const response = await fetch("/api/uploads", { method: "POST", body: form });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      setMessage(result.error || "File upload is not fully configured yet. Use a URL for now.");
      return;
    }
    if (folder === "products") {
      if (file.type.startsWith("video/")) {
        update("videoUrl" as any, result.url as any);
      } else {
        setImageRows((rows) => rows.length >= MAX_PRODUCT_IMAGES ? rows : [...rows, { url: result.url, alt: product.title || file.name, isPrimary: rows.length === 0, sortOrder: rows.length }]);
      }
    } else setDocText((current) => `${current ? `${current}\n` : ""}${file.name}|${result.url}|${file.type || "Document"}`);
    setMessage(`Uploaded: ${result.url}`);
  }

  async function handleSave(status: AdminProductStatus = product.status) {
    if (!product.title.trim()) {
      alert("Product title is required before saving.");
      return;
    }
    setSaving(true);
    setMessage("");

    const preparedImages = cleanImages(imageRows, product.title);
    const preparedVariants = cleanVariants(variantRows);
    const payload: AdminProduct = {
      ...product,
      status,
      slug: product.slug || slugifyProductTitle(product.title, product.sku),
      image: preparedImages.find((image) => image.isPrimary)?.url || preparedImages[0]?.url || null,
      images: preparedImages,
      price: product.priceOnRequest ? null : product.price,
      stockQty: preparedVariants.length ? preparedVariants.reduce((sum, variant) => sum + variant.stockQty, 0) : product.stockQty,
      stockStatus: (preparedVariants.length ? preparedVariants.reduce((sum, variant) => sum + variant.stockQty, 0) : product.stockQty) <= 0 ? "OUT_OF_STOCK" : (preparedVariants.length ? preparedVariants.reduce((sum, variant) => sum + variant.stockQty, 0) : product.stockQty) <= 2 ? "LOW_STOCK" : "IN_STOCK",
      specs: textToSpecs(specText),
      documents: textToDocs(docText),
      tags: textToTags(tagText),
      variants: preparedVariants as any,
      source: product.source === "catalog" ? "admin" : product.source,
    };

    const endpoint = mode === "edit" && product.id ? `/api/products/${encodeURIComponent(product.id)}` : "/api/products";
    const method = mode === "edit" ? "PATCH" : "POST";
    const response = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok || !result.ok) {
      setMessage(result.error || result.reason || "Product could not be saved.");
      return;
    }

    const savedProduct = dbProductToAdmin(result.product);
    setProduct(savedProduct);
    setImageRows(normaliseImages(savedProduct));
    setVariantRows(normaliseVariants((savedProduct as any).variants));
    setSaved(true);
    setMessage("Product saved to PostgreSQL/Neon.");
    setTimeout(() => router.push("/admin/products"), 700);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "basic", label: "Basic info" },
    { id: "content", label: "Content & specs" },
    { id: "images", label: "Images & docs" },
    { id: "logistics", label: "Stock & logistics" },
    { id: "variants", label: "Variations" },
    { id: "seo", label: "SEO & tags" },
  ];

  if (loading) return <div className="bg-white border border-gray-200 rounded-xl p-8 text-sm text-gray-500">Loading product from database…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/products" className="text-gray-400 hover:text-navy-950 p-1"><ArrowLeft size={18} /></Link>
          <div>
            <h1 className="font-display font-800 text-navy-950 text-2xl">{mode === "new" ? "Add Product" : "Edit Product"}</h1>
            <p className="text-gray-400 text-xs mt-0.5 font-mono">SKU: {product.sku} · database-backed admin product</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button disabled={saving} onClick={() => handleSave("DRAFT")} className="btn-secondary text-sm py-2"><Save size={14} /> Save Draft</button>
          <button disabled={saving} onClick={() => handleSave("PUBLISHED")} className="btn-primary text-sm py-2">Publish Product →</button>
        </div>
      </div>

      {message && <div className={`${saved ? "bg-green-50 border-green-200 text-green-700" : "bg-yellow-50 border-yellow-200 text-yellow-900"} border rounded-xl px-4 py-3 text-sm font-display font-700`}>{message}</div>}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
        Phase 8: product edits now save to Neon/PostgreSQL. File upload API is VPS-ready, but Vercel cannot write directly to the VPS static folder unless a VPS upload receiver/local deployment is configured; image/document URL fields work now.
      </div>

      <div className="flex border-b border-gray-200 overflow-x-auto">
        {tabs.map((item) => (
          <button key={item.id} onClick={() => setTab(item.id)} className={`px-5 py-3 text-sm font-display font-700 whitespace-nowrap border-b-2 ${tab === item.id ? "border-accent text-accent" : "border-transparent text-gray-500 hover:text-navy-950"}`}>{item.label}</button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        {tab === "basic" && (
          <div className="grid lg:grid-cols-2 gap-5">
            <div><label className="label">SKU</label><input value={product.sku} onChange={(e) => update("sku", e.target.value)} className="input font-mono" /></div>
            <div><label className="label">Status</label><select value={product.status} onChange={(e) => update("status", e.target.value as AdminProductStatus)} className="input"><option value="PUBLISHED">Published</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option></select></div>
            <div className="lg:col-span-2"><label className="label">Product title *</label><input value={product.title} onChange={(e) => update("title", e.target.value)} className="input" placeholder="e.g. Siemens S7-400 CPU 412-2 PLC Module" /></div>
            <div><label className="label">Brand</label><input value={product.brand} onChange={(e) => update("brand", e.target.value)} className="input" /></div>
            <div><label className="label">Manufacturer</label><input value={product.manufacturer} onChange={(e) => update("manufacturer", e.target.value)} className="input" /></div>
            <div><label className="label">Model</label><input value={product.model} onChange={(e) => update("model", e.target.value)} className="input" /></div>
            <div><label className="label">MPN / Part number</label><input value={product.mpn} onChange={(e) => update("mpn", e.target.value)} className="input" /></div>
            <div><label className="label">Category</label><select value={product.category} onChange={(e) => updateCategory(e.target.value)} className="input">{product.category && !CATEGORIES.some((category) => category.label === product.category) && <option value={product.category}>{product.category}</option>}{CATEGORIES.filter((category) => category.slug).map((category) => <option key={category.slug} value={category.label}>{category.label}</option>)}</select></div>
            <div><label className="label">Condition</label><select value={product.condition} onChange={(e) => update("condition", e.target.value as ConditionCode)} className="input">{CONDITION_OPTIONS.map((condition) => <option key={condition.value} value={condition.value}>{condition.label}</option>)}</select></div>
          </div>
        )}

        {tab === "content" && (
          <div className="space-y-5">
            <div className="bg-surface border border-gray-200 rounded-xl p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-display font-800 text-navy-950">Product content assistant</h2>
                <p className="text-xs text-gray-500 mt-1">Creates concise procurement-style copy from title, brand, MPN, category and specifications. Review before saving.</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={() => applyContentAssistant("overview")} className="btn-secondary text-sm"><Sparkles size={14} /> Generate overview</button>
                <button type="button" onClick={() => applyContentAssistant("all")} className="btn-primary text-sm"><Sparkles size={14} /> Generate content + SEO</button>
              </div>
            </div>
            <div><label className="label">Short description</label><textarea value={product.description} onChange={(e) => update("description", e.target.value)} className="input min-h-[120px]" /></div>
            <div><label className="label">Product overview</label><textarea value={product.productOverview} onChange={(e) => update("productOverview", e.target.value)} className="input min-h-[180px]" /></div>
            <div><label className="label">Specifications table</label><p className="text-xs text-gray-400 mb-2">One per line: Label: Value</p><textarea value={specText} onChange={(e) => setSpecText(e.target.value)} className="input min-h-[160px] font-mono text-xs" placeholder={"Series: SIMATIC S7-400\nMPN: 6ES7412-2XJ05-0AB0"} /></div>
          </div>
        )}

        {tab === "images" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3"><div><h2 className="font-display font-800 text-navy-950">Product images</h2><p className="text-xs text-gray-500 mt-1">Add/edit/delete up to {MAX_PRODUCT_IMAGES} images. The primary image is used on shop cards.</p></div><button type="button" onClick={addImageRow} disabled={imageRows.length >= MAX_PRODUCT_IMAGES} className="btn-secondary text-sm"><Plus size={14} /> Add image</button></div>
            <div className="grid lg:grid-cols-2 gap-4">
              <label className="border border-dashed border-gray-300 rounded-xl p-5 bg-surface cursor-pointer hover:border-accent block"><ImagePlus className="text-gray-400 mb-2" size={22} /><p className="font-display font-700 text-sm text-navy-950">Upload product image</p><p className="text-xs text-gray-400 mt-1">JPG, PNG or WebP. Uploaded image is appended to the gallery.</p><input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => uploadFile(e.target.files?.[0] ?? null, "products")} /></label>
              <label className="border border-dashed border-gray-300 rounded-xl p-5 bg-surface cursor-pointer hover:border-accent block"><Video className="text-gray-400 mb-2" size={22} /><p className="font-display font-700 text-sm text-navy-950">Upload product video</p><p className="text-xs text-gray-400 mt-1">MP4/WebM/MOV. One product video is shown after the image gallery.</p><input type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e) => uploadFile(e.target.files?.[0] ?? null, "products")} /></label>
            </div>
            <div><label className="label">Product video URL</label><input value={(product as any).videoUrl ?? ""} onChange={(e) => update("videoUrl" as any, e.target.value as any)} className="input font-mono text-xs" placeholder="https://assets.combay.co.uk/products/product-video.mp4" /><p className="text-xs text-gray-400 mt-1">Optional. Use one video per item. Direct MP4/WebM/MOV URLs play inline on the product page.</p></div>
            <div className="overflow-x-auto border border-gray-200 rounded-xl"><table className="w-full text-sm"><thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide"><tr><th className="p-3 w-20">Preview</th><th className="p-3 min-w-[320px]">Image URL</th><th className="p-3 min-w-[180px]">Alt text</th><th className="p-3 w-24">Primary</th><th className="p-3 w-16"></th></tr></thead><tbody>{imageRows.map((row, index) => <tr key={`${row.url}-${index}`} className="border-t border-gray-100 align-top"><td className="p-3"><div className="w-14 h-14 border border-gray-200 rounded-lg bg-white flex items-center justify-center overflow-hidden">{row.url ? <img src={row.url} alt="" className="w-full h-full object-contain" /> : <span className="text-gray-200">📦</span>}</div></td><td className="p-3"><input value={row.url} onChange={(e) => updateImage(index, { url: e.target.value })} className="input font-mono text-xs" placeholder="https://assets.combay.co.uk/products/..." /></td><td className="p-3"><input value={row.alt ?? ""} onChange={(e) => updateImage(index, { alt: e.target.value })} className="input text-xs" /></td><td className="p-3"><button type="button" onClick={() => makePrimaryImage(index)} className={`inline-flex items-center gap-1 text-xs font-display font-700 ${row.isPrimary ? "text-accent" : "text-gray-400 hover:text-navy-950"}`}><Star size={14} fill={row.isPrimary ? "currentColor" : "none"} /> {row.isPrimary ? "Primary" : "Set"}</button></td><td className="p-3"><button type="button" onClick={() => deleteImageRow(index)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button></td></tr>)}{!imageRows.length && <tr><td colSpan={5} className="p-5 text-sm text-gray-500">No images yet. Add a URL row or upload an image.</td></tr>}</tbody></table></div>
            <div><label className="label">Documents</label><p className="text-xs text-gray-400 mb-2">One per line: Name|URL|File type</p><label className="inline-flex items-center gap-2 border border-dashed border-gray-300 rounded-xl px-4 py-3 bg-surface cursor-pointer hover:border-accent mb-3"><FileText className="text-gray-400" size={18} /><span className="font-display font-700 text-sm text-navy-950">Upload document</span><input type="file" accept="application/pdf" className="hidden" onChange={(e) => uploadFile(e.target.files?.[0] ?? null, "docs")} /></label><textarea value={docText} onChange={(e) => setDocText(e.target.value)} className="input min-h-[120px] font-mono text-xs" /></div>
          </div>
        )}

        {tab === "logistics" && <div className="grid lg:grid-cols-2 gap-5"><div><label className="label">Price excluding VAT</label><input type="number" value={product.price ?? ""} disabled={product.priceOnRequest} onChange={(e) => update("price", e.target.value ? Number(e.target.value) : null)} className="input" /></div><div><label className="label">Stock quantity</label><input type="number" value={product.stockQty} onChange={(e) => update("stockQty", Number(e.target.value || 0))} className="input" /></div><label className="flex items-center gap-2 text-sm font-display font-700 text-navy-900"><input type="checkbox" checked={product.priceOnRequest} onChange={(e) => update("priceOnRequest", e.target.checked)} /> Price on request / POA</label><label className="flex items-center gap-2 text-sm font-display font-700 text-navy-900"><input type="checkbox" checked={Boolean(product.syncExcluded)} onChange={(e) => update("syncExcluded", e.target.checked as any)} /> Exclude from eBay sync updates</label><div><label className="label">Warehouse location / bin</label><input value={product.locationBin ?? ""} onChange={(e) => update("locationBin", e.target.value)} className="input" placeholder="WH-A-03" /></div><div><label className="label">Public item location</label><input value={(product as any).itemLocation ?? "United Kingdom"} onChange={(e) => update("itemLocation" as any, e.target.value as any)} className="input" placeholder="United Kingdom" /><p className="text-xs text-gray-400 mt-1">Shown on the public product page below SKU/brand details.</p></div><div><label className="label">eBay item / listing ID</label><input value={(product as any).ebayItemId ?? ""} onChange={(e) => update("ebayItemId", e.target.value as any)} className="input" /></div><div><label className="label">Weight (kg)</label><input value={product.weightKg ?? ""} onChange={(e) => update("weightKg", e.target.value)} className="input" /></div><div><label className="label">Dimensions (cm)</label><input value={product.dimensionsCm ?? ""} onChange={(e) => update("dimensionsCm", e.target.value)} className="input" placeholder="40 x 30 x 20" /></div><div><label className="label">HS code</label><input value={product.hsCode ?? ""} onChange={(e) => update("hsCode", e.target.value)} className="input" /></div><div><label className="label">Lead time</label><input value={product.leadTime} onChange={(e) => update("leadTime", e.target.value)} className="input" /></div><div className="lg:col-span-2"><label className="label">Dispatch note</label><textarea value={product.dispatchNote} onChange={(e) => update("dispatchNote", e.target.value)} className="input min-h-[90px]" /></div><div className="lg:col-span-2"><label className="label">Warranty statement</label><textarea value={product.warranty} onChange={(e) => update("warranty", e.target.value)} className="input min-h-[90px]" /></div></div>}


        {tab === "variants" && (
          <div className="space-y-5">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">Use this for selectable options such as size, voltage, colour, length, connector or package. eBay synced variations populate here automatically where available.</div>
            <div className="flex justify-between items-center gap-3"><h2 className="font-display font-800 text-navy-950">Product variations</h2><button type="button" onClick={addVariantRow} className="btn-secondary text-sm"><Plus size={14} /> Add variation</button></div>
            <div className="overflow-x-auto border border-gray-200 rounded-xl"><table className="w-full text-sm"><thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide"><tr><th className="p-3 min-w-[220px]">Label</th><th className="p-3 min-w-[150px]">SKU</th><th className="p-3 min-w-[140px]">Option name</th><th className="p-3 min-w-[140px]">Option value</th><th className="p-3 w-28">Price</th><th className="p-3 w-24">Stock</th><th className="p-3 w-16"></th></tr></thead><tbody>{variantRows.map((row, index) => <tr key={row.id ?? index} className="border-t border-gray-100 align-top"><td className="p-3"><input value={row.label} onChange={(e) => updateVariant(index, { label: e.target.value })} className="input text-xs" placeholder="Size: 10cm" /></td><td className="p-3"><input value={row.sku ?? ""} onChange={(e) => updateVariant(index, { sku: e.target.value })} className="input font-mono text-xs" placeholder="SKU" /></td><td className="p-3"><input value={row.optionName ?? ""} onChange={(e) => updateVariant(index, { optionName: e.target.value })} className="input text-xs" placeholder="Size" /></td><td className="p-3"><input value={row.optionValue ?? ""} onChange={(e) => updateVariant(index, { optionValue: e.target.value })} className="input text-xs" placeholder="10cm" /></td><td className="p-3"><input type="number" value={row.price ?? ""} onChange={(e) => updateVariant(index, { price: e.target.value === "" ? null : Number(e.target.value) })} className="input text-xs" placeholder="0.00" /></td><td className="p-3"><input type="number" value={row.stockQty} onChange={(e) => updateVariant(index, { stockQty: Number(e.target.value || 0) })} className="input text-xs" /></td><td className="p-3"><button type="button" onClick={() => deleteVariantRow(index)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button></td></tr>)}{!variantRows.length && <tr><td colSpan={7} className="p-5 text-sm text-gray-500">No variations. Add a row if this product has selectable options.</td></tr>}</tbody></table></div>
          </div>
        )}

        {tab === "seo" && (
          <div className="space-y-5">
            <div className="bg-surface border border-gray-200 rounded-xl p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-display font-800 text-navy-950">SEO assistant</h2>
                <p className="text-xs text-gray-500 mt-1">Generates a compact title, meta description and search tags using the current product fields.</p>
              </div>
              <button type="button" onClick={() => applyContentAssistant("seo")} className="btn-secondary text-sm"><Sparkles size={14} /> Generate SEO</button>
            </div>
            <div><label className="label">Slug</label><input value={product.slug} onChange={(e) => update("slug", e.target.value)} className="input font-mono text-sm" /></div>
            <div><label className="label">SEO title</label><input value={(product as any).seoTitle ?? ""} onChange={(e) => update("seoTitle" as any, e.target.value as any)} className="input" placeholder="Short product title for search engines" /><p className="text-xs text-gray-400 mt-1">Aim for 50–68 characters.</p></div>
            <div><label className="label">SEO meta description</label><textarea value={(product as any).seoDescription ?? ""} onChange={(e) => update("seoDescription" as any, e.target.value as any)} className="input min-h-[90px]" placeholder="Concise search result description" /><p className="text-xs text-gray-400 mt-1">Aim for 140–155 characters.</p></div>
            <div><label className="label">Search tags</label><input value={tagText} onChange={(e) => setTagText(e.target.value)} className="input" placeholder="PLC, Siemens, 6ES7412" /></div>
            <div><label className="label">Admin notes</label><textarea value={product.adminNotes ?? ""} onChange={(e) => update("adminNotes", e.target.value)} className="input min-h-[120px]" /></div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center"><Link href="/admin/products" className="btn-secondary">Cancel</Link><div className="flex gap-2"><button disabled={saving} onClick={() => handleSave("DRAFT")} className="btn-secondary"><Save size={14} /> Save Draft</button><button disabled={saving} onClick={() => handleSave("PUBLISHED")} className="btn-primary">Save & Publish</button></div></div>
    </div>
  );
}
