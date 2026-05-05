"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, ImagePlus, Link2, Save, Upload } from "lucide-react";
import { CATEGORIES, type CatalogProduct, type ConditionCode } from "@/lib/catalog";
import { CONDITION_OPTIONS, createBlankAdminProduct, slugifyProductTitle, type AdminProduct, type AdminProductStatus } from "@/lib/adminCatalog";

type Props = { mode: "new" | "edit"; productId?: string };
type Tab = "basic" | "content" | "images" | "logistics" | "seo";

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
  const [mainImageSource, setMainImageSource] = useState("");

  useEffect(() => {
    if (mode !== "edit" || !productId) {
      setSpecText(specsToText(blank.specs));
      setDocText(docsToText(blank.documents));
      setTagText(tagsToText(blank.tags));
      setMainImageSource(blank.image ?? "");
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
        setMainImageSource(loaded.image ?? "");
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
    if (folder === "products") setMainImageSource(result.url);
    else setDocText((current) => `${current ? `${current}\n` : ""}${file.name}|${result.url}|${file.type || "Document"}`);
    setMessage(`Uploaded: ${result.url}`);
  }

  async function handleSave(status: AdminProductStatus = product.status) {
    if (!product.title.trim()) {
      alert("Product title is required before saving.");
      return;
    }
    setSaving(true);
    setMessage("");

    const payload: AdminProduct = {
      ...product,
      status,
      slug: product.slug || slugifyProductTitle(product.title, product.sku),
      image: mainImageSource || null,
      price: product.priceOnRequest ? null : product.price,
      stockStatus: product.stockQty <= 0 ? "OUT_OF_STOCK" : product.stockQty <= 2 ? "LOW_STOCK" : "IN_STOCK",
      specs: textToSpecs(specText),
      documents: textToDocs(docText),
      tags: textToTags(tagText),
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
    setSaved(true);
    setMessage("Product saved to PostgreSQL/Neon.");
    setTimeout(() => router.push("/admin/products"), 700);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "basic", label: "Basic info" },
    { id: "content", label: "Content & specs" },
    { id: "images", label: "Images & docs" },
    { id: "logistics", label: "Stock & logistics" },
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
            <div><label className="label">Category</label><select value={product.category} onChange={(e) => updateCategory(e.target.value)} className="input">{CATEGORIES.filter((category) => category.slug).map((category) => <option key={category.slug} value={category.label}>{category.label}</option>)}</select></div>
            <div><label className="label">Condition</label><select value={product.condition} onChange={(e) => update("condition", e.target.value as ConditionCode)} className="input">{CONDITION_OPTIONS.map((condition) => <option key={condition.value} value={condition.value}>{condition.label}</option>)}</select></div>
          </div>
        )}

        {tab === "content" && <div className="space-y-5"><div><label className="label">Short description</label><textarea value={product.description} onChange={(e) => update("description", e.target.value)} className="input min-h-[120px]" /></div><div><label className="label">Product overview</label><textarea value={product.productOverview} onChange={(e) => update("productOverview", e.target.value)} className="input min-h-[160px]" /></div><div><label className="label">Specifications table</label><p className="text-xs text-gray-400 mb-2">One per line: Label: Value</p><textarea value={specText} onChange={(e) => setSpecText(e.target.value)} className="input min-h-[160px] font-mono text-xs" placeholder="Series: SIMATIC S7-400\nMPN: 6ES7412-2XJ05-0AB0" /></div></div>}

        {tab === "images" && (
          <div className="space-y-5">
            <div><label className="label">Main image URL</label><div className="flex gap-2"><input value={mainImageSource} onChange={(e) => setMainImageSource(e.target.value)} className="input" placeholder="https://assets.combay.co.uk/products/..." /><button type="button" className="btn-secondary whitespace-nowrap"><Link2 size={14} /> Use URL</button></div></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="border border-dashed border-gray-300 rounded-xl p-5 bg-surface cursor-pointer hover:border-accent"><ImagePlus className="text-gray-400 mb-2" size={22} /><p className="font-display font-700 text-sm text-navy-950">Upload main image</p><p className="text-xs text-gray-400 mt-1">Uses /api/uploads when a VPS upload receiver/local directory is configured.</p><input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => uploadFile(e.target.files?.[0] ?? null, "products")} /></label>
              <label className="border border-dashed border-gray-300 rounded-xl p-5 bg-surface cursor-pointer hover:border-accent"><FileText className="text-gray-400 mb-2" size={22} /><p className="font-display font-700 text-sm text-navy-950">Upload document</p><p className="text-xs text-gray-400 mt-1">PDF/manual/catalogue upload endpoint.</p><input type="file" accept="application/pdf" className="hidden" onChange={(e) => uploadFile(e.target.files?.[0] ?? null, "docs")} /></label>
            </div>
            <div><label className="label">Documents</label><p className="text-xs text-gray-400 mb-2">One per line: Name|URL|File type</p><textarea value={docText} onChange={(e) => setDocText(e.target.value)} className="input min-h-[120px] font-mono text-xs" /></div>
          </div>
        )}

        {tab === "logistics" && <div className="grid lg:grid-cols-2 gap-5"><div><label className="label">Price excluding VAT</label><input type="number" value={product.price ?? ""} disabled={product.priceOnRequest} onChange={(e) => update("price", e.target.value ? Number(e.target.value) : null)} className="input" /></div><div><label className="label">Stock quantity</label><input type="number" value={product.stockQty} onChange={(e) => update("stockQty", Number(e.target.value || 0))} className="input" /></div><label className="flex items-center gap-2 text-sm font-display font-700 text-navy-900"><input type="checkbox" checked={product.priceOnRequest} onChange={(e) => update("priceOnRequest", e.target.checked)} /> Price on request / POA</label><label className="flex items-center gap-2 text-sm font-display font-700 text-navy-900"><input type="checkbox" checked={Boolean(product.syncExcluded)} onChange={(e) => update("syncExcluded", e.target.checked as any)} /> Exclude from eBay sync updates</label><div><label className="label">Location / bin</label><input value={product.locationBin ?? ""} onChange={(e) => update("locationBin", e.target.value)} className="input" placeholder="WH-A-03" /></div><div><label className="label">eBay item / listing ID</label><input value={(product as any).ebayItemId ?? ""} onChange={(e) => update("ebayItemId", e.target.value as any)} className="input" /></div><div><label className="label">Weight (kg)</label><input value={product.weightKg ?? ""} onChange={(e) => update("weightKg", e.target.value)} className="input" /></div><div><label className="label">Dimensions (cm)</label><input value={product.dimensionsCm ?? ""} onChange={(e) => update("dimensionsCm", e.target.value)} className="input" placeholder="40 x 30 x 20" /></div><div><label className="label">HS code</label><input value={product.hsCode ?? ""} onChange={(e) => update("hsCode", e.target.value)} className="input" /></div><div><label className="label">Lead time</label><input value={product.leadTime} onChange={(e) => update("leadTime", e.target.value)} className="input" /></div><div className="lg:col-span-2"><label className="label">Dispatch note</label><textarea value={product.dispatchNote} onChange={(e) => update("dispatchNote", e.target.value)} className="input min-h-[90px]" /></div><div className="lg:col-span-2"><label className="label">Warranty statement</label><textarea value={product.warranty} onChange={(e) => update("warranty", e.target.value)} className="input min-h-[90px]" /></div></div>}

        {tab === "seo" && <div className="space-y-5"><div><label className="label">Slug</label><input value={product.slug} onChange={(e) => update("slug", e.target.value)} className="input font-mono text-sm" /></div><div><label className="label">Search tags</label><input value={tagText} onChange={(e) => setTagText(e.target.value)} className="input" placeholder="PLC, Siemens, 6ES7412" /></div><div><label className="label">Admin notes</label><textarea value={product.adminNotes ?? ""} onChange={(e) => update("adminNotes", e.target.value)} className="input min-h-[120px]" /></div></div>}
      </div>

      <div className="flex justify-between items-center"><Link href="/admin/products" className="btn-secondary">Cancel</Link><div className="flex gap-2"><button disabled={saving} onClick={() => handleSave("DRAFT")} className="btn-secondary"><Save size={14} /> Save Draft</button><button disabled={saving} onClick={() => handleSave("PUBLISHED")} className="btn-primary">Save & Publish</button></div></div>
    </div>
  );
}
