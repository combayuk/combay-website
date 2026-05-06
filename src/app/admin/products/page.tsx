"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Copy, Download, Edit, Eye, Package, Plus, Search, Sparkles, Trash2, Upload } from "lucide-react";
import { CATEGORIES, CONDITION_LABELS, type CatalogProduct } from "@/lib/catalog";

type AdminProduct = CatalogProduct & {
  status?: "PUBLISHED" | "DRAFT" | "ARCHIVED";
  source?: string;
  updatedAt?: string;
};

function priceLabel(product: AdminProduct) {
  if (product.priceOnRequest || product.price === null) return "POA";
  return `£${product.price.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function nextSku(products: AdminProduct[]) {
  const max = products.reduce((highest, product) => {
    const match = product.sku.match(/^CBUK(\d{5})$/i);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `CBUK${String(max + 1).padStart(5, "0")}`;
}

export default function AdminProducts() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const csvInputRef = useRef<HTMLInputElement>(null);

  async function loadProducts() {
    setLoading(true);
    const params = new URLSearchParams({ admin: "1" });
    if (search) params.set("q", search);
    if (category) params.set("category", category);
    if (status) params.set("status", status);
    const response = await fetch(`/api/products?${params.toString()}`, { cache: "no-store" });
    const result = await response.json();
    setProducts(result.products ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts().catch(() => {
        setMessage("Could not load products from API.");
        setLoading(false);
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [search, category, status]);

  const filtered = useMemo(() => products, [products]);

  async function archiveProduct(product: AdminProduct) {
    if (!confirm(`Archive ${product.sku}? It will be hidden from the active shop but kept in the database.`)) return;
    const response = await fetch(`/api/products/${encodeURIComponent(product.id)}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      setMessage(result.error || result.reason || `Could not archive ${product.sku}.`);
      return;
    }
    setMessage(`${product.sku} archived. Use the Archived status filter to view it.`);
    await loadProducts();
  }

  async function duplicateProduct(product: AdminProduct) {
    const sku = nextSku(products);
    const payload = {
      ...product,
      id: undefined,
      sku,
      title: `${product.title} copy`,
      slug: `${product.slug}-copy-${sku.toLowerCase()}`,
      status: "DRAFT",
      source: "admin",
    };
    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      setMessage(result.error || result.reason || `Could not duplicate ${product.sku}.`);
      return;
    }
    setMessage(`${product.sku} duplicated as ${sku}.`);
    await loadProducts();
  }

  async function handleCsvUpload(file: File | null) {
    if (!file) return;
    const csv = await file.text();
    const response = await fetch("/api/products/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv }),
    });
    const result = await response.json().catch(() => ({}));
    const errors = result.errors?.length ? ` Errors: ${result.errors.join(" ")}` : "";
    setMessage(`CSV import complete: ${result.imported ?? 0} imported, ${result.updated ?? 0} updated.${errors}`);
    if (csvInputRef.current) csvInputRef.current.value = "";
    await loadProducts();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display font-800 text-navy-950 text-2xl">Products</h1>
          <p className="text-gray-400 text-sm mt-0.5">Database-backed product management. Products now save to Neon/PostgreSQL.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => handleCsvUpload(event.target.files?.[0] ?? null)} />
          <button type="button" onClick={() => csvInputRef.current?.click()} className="btn-secondary text-sm py-2"><Upload size={14} /> Upload CSV</button>
          <a href="/stock-list-template.csv" download className="btn-secondary text-sm py-2"><Download size={14} /> CSV Template</a>
          <Link href="/admin/products/ai" className="btn-secondary text-sm py-2"><Sparkles size={14} /> Product AI</Link>
          <Link href="/admin/products/new" className="btn-primary text-sm py-2"><Plus size={14} /> Add Product</Link>
        </div>
      </div>

      {message && <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm">{message}</div>}

      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4"><p className="text-xs text-gray-400">Loaded</p><p className="font-display font-800 text-2xl text-navy-950">{products.length}</p></div>
        <div className="bg-white border border-gray-200 rounded-xl p-4"><p className="text-xs text-gray-400">Published</p><p className="font-display font-800 text-2xl text-green-700">{products.filter((p) => p.status === "PUBLISHED").length}</p></div>
        <div className="bg-white border border-gray-200 rounded-xl p-4"><p className="text-xs text-gray-400">Draft</p><p className="font-display font-800 text-2xl text-yellow-700">{products.filter((p) => p.status === "DRAFT").length}</p></div>
        <div className="bg-white border border-gray-200 rounded-xl p-4"><p className="text-xs text-gray-400">Archived</p><p className="font-display font-800 text-2xl text-gray-700">{products.filter((p) => p.status === "ARCHIVED").length}</p></div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 grid md:grid-cols-[1fr_220px_170px] gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search SKU, MPN, brand, title..." className="input pl-9 py-2 text-sm" />
          </div>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="input py-2 text-sm">
            <option value="">All categories</option>
            {CATEGORIES.filter((item) => item.slug).map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="input py-2 text-sm">
            <option value="">Published / Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full admin-table">
            <thead><tr><th>Product</th><th>Category</th><th>Condition</th><th>Price</th><th>Stock</th><th>Status</th><th>Source</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map((product) => {
                const condition = CONDITION_LABELS[product.condition];
                return (
                  <tr key={product.id}>
                    <td>
                      <div className="flex items-center gap-3 min-w-[320px]">
                        <div className="w-10 h-10 rounded-lg bg-surface border border-gray-200 flex items-center justify-center text-gray-300 overflow-hidden">
                          {product.image ? <img src={product.image} alt="" className="w-full h-full object-cover" /> : <Package size={17} />}
                        </div>
                        <div>
                          <p className="font-mono text-[11px] text-accent tracking-wide">{product.sku}</p>
                          <p className="font-display font-700 text-navy-950 text-sm line-clamp-1">{product.title || "Untitled product"}</p>
                          <p className="text-xs text-gray-400">{product.brand} · {product.mpn}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-xs text-gray-500 whitespace-nowrap">{product.category}</td>
                    <td><span className={`badge border text-xs ${condition.color}`}>{condition.label}</span></td>
                    <td className="font-display font-700 whitespace-nowrap">{priceLabel(product)}</td>
                    <td className={`font-display font-700 ${product.stockQty <= 0 ? "text-red-600" : product.stockQty <= 2 ? "text-yellow-700" : "text-green-700"}`}>{product.stockQty}</td>
                    <td><span className={`badge border text-xs ${product.status === "PUBLISHED" ? "text-green-700 bg-green-50 border-green-200" : product.status === "DRAFT" ? "text-yellow-700 bg-yellow-50 border-yellow-200" : "text-gray-600 bg-gray-50 border-gray-200"}`}>{product.status}</span></td>
                    <td className="text-xs text-gray-400 uppercase">{product.source}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Link href={`/shop/${product.slug}`} target="_blank" className="text-gray-400 hover:text-navy-900 transition-colors" title="Preview"><Eye size={14} /></Link>
                        <Link href={`/admin/products/${product.id}`} className="text-gray-400 hover:text-accent transition-colors" title="Edit"><Edit size={14} /></Link>
                        <button onClick={() => duplicateProduct(product)} className="text-gray-400 hover:text-navy-900 transition-colors" title="Duplicate"><Copy size={14} /></button>
                        <button onClick={() => archiveProduct(product)} className="text-gray-400 hover:text-red-500 transition-colors" title="Archive"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {loading && <div className="p-10 text-center text-gray-400 text-sm">Loading products…</div>}
        {!loading && filtered.length === 0 && <div className="p-10 text-center text-gray-400 text-sm">No products match that filter.</div>}
      </div>
    </div>
  );
}
