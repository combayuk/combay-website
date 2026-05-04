"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Copy, Download, Edit, Eye, Package, Plus, Search, Trash2 } from "lucide-react";
import { CATEGORIES, CONDITION_LABELS } from "@/lib/catalog";
import { deleteAdminProduct, duplicateAdminProduct, getAllAdminProducts, type AdminProduct } from "@/lib/adminCatalog";

function priceLabel(product: AdminProduct) {
  if (product.priceOnRequest || product.price === null) return "POA";
  return `£${product.price.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdminProducts() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const products = useMemo(() => getAllAdminProducts(), [refreshKey]);

  const filtered = products.filter((product) => {
    const haystack = [
      product.sku,
      product.title,
      product.brand,
      product.manufacturer,
      product.model,
      product.mpn,
      product.category,
      product.tags.join(" "),
    ].join(" ").toLowerCase();
    const matchesSearch = !search || haystack.includes(search.toLowerCase());
    const matchesCategory = !category || product.categorySlug === category;
    const matchesStatus = !status || product.status === status;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  function removeProduct(product: AdminProduct) {
    if (!confirm(`Archive/delete ${product.sku}?`)) return;
    deleteAdminProduct(product.id);
    setRefreshKey((key) => key + 1);
  }

  function duplicateProduct(product: AdminProduct) {
    duplicateAdminProduct(product.id);
    setRefreshKey((key) => key + 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display font-800 text-navy-950 text-2xl">Products</h1>
          <p className="text-gray-400 text-sm mt-0.5">Manage catalogue items, SKUs, stock status, documents and listing data.</p>
        </div>
        <div className="flex gap-2">
          <a href="/stock-list-template.csv" download className="btn-secondary text-sm py-2"><Download size={14} /> CSV Template</a>
          <Link href="/admin/products/new" className="btn-primary text-sm py-2"><Plus size={14} /> Add Product</Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-400">Total products</p>
          <p className="font-display font-800 text-2xl text-navy-950">{products.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-400">Published</p>
          <p className="font-display font-800 text-2xl text-green-700">{products.filter((product) => product.status === "PUBLISHED").length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-400">Low stock</p>
          <p className="font-display font-800 text-2xl text-yellow-700">{products.filter((product) => product.stockQty > 0 && product.stockQty <= 2).length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-400">POA items</p>
          <p className="font-display font-800 text-2xl text-navy-950">{products.filter((product) => product.priceOnRequest).length}</p>
        </div>
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
            <option value="">All statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Condition</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Source</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const condition = CONDITION_LABELS[product.condition];
                return (
                  <tr key={product.id}>
                    <td>
                      <div className="flex items-center gap-3 min-w-[300px]">
                        <div className="w-10 h-10 rounded-lg bg-surface border border-gray-200 flex items-center justify-center text-gray-300">
                          <Package size={17} />
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
                    <td>
                      <span className={`badge border text-xs ${product.status === "PUBLISHED" ? "text-green-700 bg-green-50 border-green-200" : product.status === "DRAFT" ? "text-yellow-700 bg-yellow-50 border-yellow-200" : "text-gray-600 bg-gray-50 border-gray-200"}`}>{product.status}</span>
                    </td>
                    <td className="text-xs text-gray-400 uppercase">{product.source}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Link href={`/shop/${product.slug}`} target="_blank" className="text-gray-400 hover:text-navy-900 transition-colors" title="Preview"><Eye size={14} /></Link>
                        <Link href={`/admin/products/${product.id}`} className="text-gray-400 hover:text-accent transition-colors" title="Edit"><Edit size={14} /></Link>
                        <button onClick={() => duplicateProduct(product)} className="text-gray-400 hover:text-navy-900 transition-colors" title="Duplicate"><Copy size={14} /></button>
                        <button onClick={() => removeProduct(product)} className="text-gray-400 hover:text-red-500 transition-colors" title="Archive/delete"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-10 text-center text-gray-400 text-sm">No products match that filter.</div>
        )}
      </div>
    </div>
  );
}
