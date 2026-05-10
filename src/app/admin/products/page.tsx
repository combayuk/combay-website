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
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display font-900 text-navy-950 text-2xl">Products</h1>
          <p className="text-gray-500 text-xs mt-0.5">Database-backed product management. Products now save to Neon/PostgreSQL.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => handleCsvUpload(event.target.files?.[0] ?? null)} />
          <button type="button" onClick={() => csvInputRef.current?.click()} className="btn-secondary text-xs py-2"><Upload size={14} /> Upload CSV</button>
          <a href="/stock-list-template.csv" download className="btn-secondary text-xs py-2"><Download size={14} /> CSV Template</a>
          <Link href="/admin/products/ai" className="btn-secondary text-xs py-2"><Sparkles size={14} /> Product AI</Link>
          <Link href="/admin/products/new" className="btn-primary text-xs py-2"><Plus size={14} /> Add Product</Link>
        </div>
      </div>

      {message && <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm">{message}</div>}

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-slate-50 px-3 py-1.5 font-900 text-navy-950">{products.length} loaded</span>
          <span className="rounded-full bg-green-50 px-3 py-1.5 font-900 text-green-700">{products.filter((p) => p.status === "PUBLISHED").length} published</span>
          <span className="rounded-full bg-yellow-50 px-3 py-1.5 font-900 text-yellow-700">{products.filter((p) => p.status === "DRAFT").length} draft</span>
          <span className="rounded-full bg-gray-50 px-3 py-1.5 font-900 text-gray-700">{products.filter((p) => p.status === "ARCHIVED").length} archived</span>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 grid md:grid-cols-[1fr_220px_170px] gap-2">
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

        <div className="overflow-hidden">
          <table className="w-full table-fixed text-xs">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="w-[38%] px-3 py-2">Product</th>
                <th className="w-[17%] px-3 py-2">Category / Condition</th>
                <th className="w-[13%] px-3 py-2">Price / Stock</th>
                <th className="w-[14%] px-3 py-2">Status / Source</th>
                <th className="w-[18%] px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((product) => {
                const condition = CONDITION_LABELS[product.condition];
                return (
                  <tr key={product.id} className="hover:bg-slate-50/70">
                    <td className="px-3 py-3 align-top">
                      <div className="flex min-w-0 items-start gap-2">
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-surface border border-gray-200 flex items-center justify-center text-gray-300 overflow-hidden">
                          {product.image ? <img src={product.image} alt="" className="w-full h-full object-cover" /> : <Package size={17} />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-mono text-[11px] text-accent tracking-wide break-all">{product.sku}</p>
                          <p className="truncate font-display font-800 text-navy-950 text-sm">{product.title || "Untitled product"}</p>
                          <p className="truncate text-[11px] text-gray-400">{product.brand || "—"} · {product.mpn || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <p className="truncate text-xs text-gray-500">{product.category || "—"}</p>
                      <span className={`mt-1 inline-flex max-w-full rounded-full border px-2 py-1 text-[10px] font-900 ${condition.color}`}><span className="truncate">{condition.label}</span></span>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <p className="font-display font-900 text-navy-950">{priceLabel(product)}</p>
                      <p className={`mt-1 text-xs font-900 ${product.stockQty <= 0 ? "text-red-600" : product.stockQty <= 2 ? "text-yellow-700" : "text-green-700"}`}>{product.stockQty} in stock</p>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <span className={`inline-flex max-w-full rounded-full border px-2 py-1 text-[10px] font-900 ${product.status === "PUBLISHED" ? "text-green-700 bg-green-50 border-green-200" : product.status === "DRAFT" ? "text-yellow-700 bg-yellow-50 border-yellow-200" : "text-gray-600 bg-gray-50 border-gray-200"}`}><span className="truncate">{product.status}</span></span>
                      <p className="mt-1 truncate text-[11px] uppercase text-gray-400">{product.source || "—"}</p>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Link href={`/shop/${product.slug}`} target="_blank" className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-900 text-slate-600 hover:bg-slate-50" title="Preview"><Eye size={12} /></Link>
                        <Link href={`/admin/products/${product.id}`} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-900 text-slate-600 hover:bg-slate-50" title="Edit"><Edit size={12} /></Link>
                        <button onClick={() => duplicateProduct(product)} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-900 text-slate-600 hover:bg-slate-50" title="Duplicate"><Copy size={12} /></button>
                        <button onClick={() => archiveProduct(product)} className="rounded-md border border-red-200 px-2 py-1 text-[11px] font-900 text-red-700 hover:bg-red-50" title="Archive"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>        </div>

        {loading && <div className="p-10 text-center text-gray-400 text-sm">Loading products…</div>}
        {!loading && filtered.length === 0 && <div className="p-10 text-center text-gray-400 text-sm">No products match that filter.</div>}
      </div>
    </div>
  );
}
