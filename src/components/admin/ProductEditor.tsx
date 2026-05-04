"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, ImagePlus, Link2, Plus, Save, Trash2 } from "lucide-react";
import { CATEGORIES, type CatalogProduct } from "@/lib/catalog";
import {
  CONDITION_OPTIONS,
  createBlankAdminProduct,
  slugifyProductTitle,
  upsertAdminProduct,
  type AdminProduct,
  type AdminProductStatus,
} from "@/lib/adminCatalog";

type Props = {
  mode: "new" | "edit";
  initialProduct?: AdminProduct;
};

type Tab = "basic" | "content" | "images" | "logistics" | "seo";

function specsToText(specs: CatalogProduct["specs"]) {
  return specs.map((spec) => `${spec.label}: ${spec.value}`).join("\n");
}

function textToSpecs(text: string): CatalogProduct["specs"] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split(":");
      return { label: label.trim(), value: rest.join(":").trim() || "—" };
    });
}

function tagsToText(tags: string[]) {
  return tags.join(", ");
}

function textToTags(text: string) {
  return text
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function docsToText(docs: CatalogProduct["documents"]) {
  return docs.map((doc) => `${doc.name}|${doc.url}|${doc.fileType}`).join("\n");
}

function textToDocs(text: string): CatalogProduct["documents"] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, url, fileType] = line.split("|");
      return { name: name?.trim() || "Document", url: url?.trim() || "#", fileType: fileType?.trim() || "PDF" };
    });
}

export default function ProductEditor({ mode, initialProduct }: Props) {
  const router = useRouter();
  const startingProduct = useMemo(() => initialProduct ?? createBlankAdminProduct(), [initialProduct]);
  const [tab, setTab] = useState<Tab>("basic");
  const [saved, setSaved] = useState(false);
  const [product, setProduct] = useState<AdminProduct>(startingProduct);
  const [specText, setSpecText] = useState(specsToText(startingProduct.specs));
  const [docText, setDocText] = useState(docsToText(startingProduct.documents));
  const [tagText, setTagText] = useState(tagsToText(startingProduct.tags));
  const [mainImageSource, setMainImageSource] = useState(startingProduct.image ?? "");

  function update<K extends keyof AdminProduct>(key: K, value: AdminProduct[K]) {
    setProduct((current) => ({ ...current, [key]: value }));
  }

  function updateCategory(categoryLabel: string) {
    const category = CATEGORIES.find((item) => item.label === categoryLabel && item.slug) ?? CATEGORIES.find((item) => item.slug);
    setProduct((current) => ({
      ...current,
      category: categoryLabel,
      categorySlug: category?.slug ?? slugifyProductTitle(categoryLabel, "category"),
    }));
  }

  function handleSave(status: AdminProductStatus = product.status) {
    if (!product.title.trim()) {
      alert("Product title is required before saving.");
      return;
    }

    const next: AdminProduct = {
      ...product,
      status,
      slug: product.slug || slugifyProductTitle(product.title, product.sku),
      image: mainImageSource || null,
      price: product.priceOnRequest ? null : product.price,
      stockStatus: product.stockQty <= 0 ? "OUT_OF_STOCK" : product.stockQty <= 2 ? "LOW_STOCK" : "IN_STOCK",
      specs: textToSpecs(specText),
      documents: textToDocs(docText),
      tags: textToTags(tagText),
    };

    upsertAdminProduct(next);
    setProduct(next);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      router.push("/admin/products");
    }, 650);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "basic", label: "Basic info" },
    { id: "content", label: "Content & specs" },
    { id: "images", label: "Images & docs" },
    { id: "logistics", label: "Stock & logistics" },
    { id: "seo", label: "SEO & tags" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/products" className="text-gray-400 hover:text-navy-950 p-1">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="font-display font-800 text-navy-950 text-2xl">{mode === "new" ? "Add Product" : "Edit Product"}</h1>
            <p className="text-gray-400 text-xs mt-0.5 font-mono">SKU: {product.sku} · {product.source === "catalog" ? "catalog baseline" : "admin managed"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleSave("DRAFT")} className="btn-secondary text-sm py-2"><Save size={14} /> Save Draft</button>
          <button onClick={() => handleSave("PUBLISHED")} className="btn-primary text-sm py-2">Publish Product →</button>
        </div>
      </div>

      {saved && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm font-display font-700">✓ Product saved to preview inventory</div>}

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-900">
        Phase 6 admin editor uses browser preview persistence until Phase 7 PostgreSQL/Prisma persistence is connected. The form structure and fields are production-shaped and ready for DB wiring.
      </div>

      <div className="flex border-b border-gray-200 overflow-x-auto">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`px-5 py-3 text-sm font-display font-700 whitespace-nowrap border-b-2 ${tab === item.id ? "border-accent text-accent" : "border-transparent text-gray-500 hover:text-navy-950"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        {tab === "basic" && (
          <div className="grid lg:grid-cols-2 gap-5">
            <div>
              <label className="label">SKU</label>
              <input readOnly value={product.sku} className="input bg-surface font-mono text-gray-500" />
            </div>
            <div>
              <label className="label">Status</label>
              <select value={product.status} onChange={(e) => update("status", e.target.value as AdminProductStatus)} className="input">
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className="label">Product title *</label>
              <input value={product.title} onChange={(e) => update("title", e.target.value)} className="input" placeholder="e.g. Siemens S7-400 CPU 412-2 PLC Module" />
            </div>
            <div><label className="label">Brand</label><input value={product.brand} onChange={(e) => update("brand", e.target.value)} className="input" /></div>
            <div><label className="label">Manufacturer</label><input value={product.manufacturer} onChange={(e) => update("manufacturer", e.target.value)} className="input" /></div>
            <div><label className="label">Model</label><input value={product.model} onChange={(e) => update("model", e.target.value)} className="input" /></div>
            <div><label className="label">MPN / Part number</label><input value={product.mpn} onChange={(e) => update("mpn", e.target.value)} className="input" /></div>
            <div>
              <label className="label">Category</label>
              <select value={product.category} onChange={(e) => updateCategory(e.target.value)} className="input">
                {CATEGORIES.filter((category) => category.slug).map((category) => <option key={category.slug} value={category.label}>{category.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Condition</label>
              <select value={product.condition} onChange={(e) => update("condition", e.target.value as AdminProduct["condition"])} className="input">
                {CONDITION_OPTIONS.map((condition) => <option key={condition.value} value={condition.value}>{condition.label}</option>)}
              </select>
            </div>
          </div>
        )}

        {tab === "content" && (
          <div className="space-y-5">
            <div>
              <label className="label">Short description</label>
              <textarea value={product.description} onChange={(e) => update("description", e.target.value)} className="input min-h-[120px]" />
            </div>
            <div>
              <label className="label">Product overview</label>
              <textarea value={product.productOverview} onChange={(e) => update("productOverview", e.target.value)} className="input min-h-[160px]" />
            </div>
            <div>
              <label className="label">Specifications table</label>
              <p className="text-xs text-gray-400 mb-2">One per line: Label: Value</p>
              <textarea value={specText} onChange={(e) => setSpecText(e.target.value)} className="input min-h-[160px] font-mono text-xs" placeholder="Series: SIMATIC S7-400\nMPN: 6ES7412-2XJ05-0AB0" />
            </div>
          </div>
        )}

        {tab === "images" && (
          <div className="space-y-5">
            <div>
              <label className="label">Main image URL</label>
              <div className="flex gap-2">
                <input value={mainImageSource} onChange={(e) => setMainImageSource(e.target.value)} className="input" placeholder="https://... or /uploads/products/..." />
                <button type="button" className="btn-secondary whitespace-nowrap"><Link2 size={14} /> Use URL</button>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="border border-dashed border-gray-300 rounded-xl p-5 bg-surface">
                <ImagePlus className="text-gray-400 mb-2" size={22} />
                <p className="font-display font-700 text-sm text-navy-950">Gallery upload placeholder</p>
                <p className="text-xs text-gray-400 mt-1">File upload endpoint will be wired in Phase 7/8. Current phase accepts image URLs.</p>
              </div>
              <div className="border border-dashed border-gray-300 rounded-xl p-5 bg-surface">
                <FileText className="text-gray-400 mb-2" size={22} />
                <p className="font-display font-700 text-sm text-navy-950">Catalogue/document upload placeholder</p>
                <p className="text-xs text-gray-400 mt-1">Use document lines below until upload API is connected.</p>
              </div>
            </div>
            <div>
              <label className="label">Documents</label>
              <p className="text-xs text-gray-400 mb-2">One per line: Name|URL|File type</p>
              <textarea value={docText} onChange={(e) => setDocText(e.target.value)} className="input min-h-[120px] font-mono text-xs" />
            </div>
          </div>
        )}

        {tab === "logistics" && (
          <div className="grid lg:grid-cols-2 gap-5">
            <div>
              <label className="label">Price excluding VAT</label>
              <input type="number" value={product.price ?? ""} disabled={product.priceOnRequest} onChange={(e) => update("price", e.target.value ? Number(e.target.value) : null)} className="input" />
            </div>
            <div>
              <label className="label">Stock quantity</label>
              <input type="number" value={product.stockQty} onChange={(e) => update("stockQty", Number(e.target.value || 0))} className="input" />
            </div>
            <label className="flex items-center gap-2 text-sm font-display font-700 text-navy-900">
              <input type="checkbox" checked={product.priceOnRequest} onChange={(e) => update("priceOnRequest", e.target.checked)} /> Price on request / POA
            </label>
            <div>
              <label className="label">Location / bin</label>
              <input value={product.locationBin ?? ""} onChange={(e) => update("locationBin", e.target.value)} className="input" placeholder="WH-A-03" />
            </div>
            <div><label className="label">Weight (kg)</label><input value={product.weightKg ?? ""} onChange={(e) => update("weightKg", e.target.value)} className="input" /></div>
            <div><label className="label">Dimensions (cm)</label><input value={product.dimensionsCm ?? ""} onChange={(e) => update("dimensionsCm", e.target.value)} className="input" placeholder="40 x 30 x 20" /></div>
            <div><label className="label">HS code</label><input value={product.hsCode ?? ""} onChange={(e) => update("hsCode", e.target.value)} className="input" /></div>
            <div><label className="label">Lead time</label><input value={product.leadTime} onChange={(e) => update("leadTime", e.target.value)} className="input" /></div>
            <div className="lg:col-span-2"><label className="label">Dispatch note</label><textarea value={product.dispatchNote} onChange={(e) => update("dispatchNote", e.target.value)} className="input min-h-[90px]" /></div>
            <div className="lg:col-span-2"><label className="label">Warranty statement</label><textarea value={product.warranty} onChange={(e) => update("warranty", e.target.value)} className="input min-h-[90px]" /></div>
          </div>
        )}

        {tab === "seo" && (
          <div className="space-y-5">
            <div><label className="label">Slug</label><input value={product.slug} onChange={(e) => update("slug", e.target.value)} className="input font-mono text-sm" /></div>
            <div><label className="label">Search tags</label><input value={tagText} onChange={(e) => setTagText(e.target.value)} className="input" placeholder="PLC, Siemens, 6ES7412" /></div>
            <div><label className="label">Admin notes</label><textarea value={product.adminNotes ?? ""} onChange={(e) => update("adminNotes", e.target.value)} className="input min-h-[120px]" /></div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <Link href="/admin/products" className="btn-secondary">Cancel</Link>
        <div className="flex gap-2">
          <button onClick={() => handleSave("DRAFT")} className="btn-secondary"><Save size={14} /> Save Draft</button>
          <button onClick={() => handleSave("PUBLISHED")} className="btn-primary">Save & Publish</button>
        </div>
      </div>
    </div>
  );
}
