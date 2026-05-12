"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Copy, Download, Edit, Eye, Package, Plus, Search, Sparkles, Trash2, Upload } from "lucide-react";
import { CATEGORIES, CONDITION_LABELS, type CatalogProduct } from "@/lib/catalog";

type AdminProduct = CatalogProduct & {
  status?: "PUBLISHED" | "DRAFT" | "ARCHIVED";
  source?: string;
  updatedAt?: string;
  ebayListingId?: string;
  ebayItemId?: string;
  ebayOfferId?: string;
  ebayPublishStatus?: string;
  ebayMarketplaceId?: string;
};

function priceLabel(product: AdminProduct) {
  if (product.priceOnRequest || product.price === null) return "POA";
  return `£${product.price.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ebayUrl(product: AdminProduct) {
  const listingId = product.ebayListingId || product.ebayItemId || "";
  if (!listingId) return "";
  return product.ebayMarketplaceId === "EBAY_US" ? `https://www.ebay.com/itm/${listingId}` : `https://www.ebay.co.uk/itm/${listingId}`;
}


export default function AdminProducts() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const csvInputRef = useRef<HTMLInputElement>(null);

  async function loadProducts() {
    setLoading(true);
    const params = new URLSearchParams({ admin: "1", page: String(page), pageSize: "50" });
    if (search) params.set("q", search);
    if (category) params.set("category", category);
    if (status) params.set("status", status);
    const response = await fetch(`/api/products?${params.toString()}`, { cache: "no-store" });
    const result = await response.json();
    setProducts(result.products ?? []);
    setSelectedIds((current) => current.filter((id) => (result.products ?? []).some((product: AdminProduct) => product.id === id)));
    setTotal(Number(result.total ?? result.products?.length ?? 0));
    setTotalPages(Number(result.totalPages ?? 1));
    setCounts(result.counts ?? {});
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
  }, [search, category, status, page]);

  useEffect(() => { setPage(1); }, [search, category, status]);

  const filtered = useMemo(() => products, [products]);
  const selectedProducts = useMemo(() => products.filter((product) => selectedIds.includes(product.id)), [products, selectedIds]);
  const allVisibleSelected = filtered.length > 0 && filtered.every((product) => selectedIds.includes(product.id));

  function toggleSelected(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleAllVisible() {
    setSelectedIds((current) => allVisibleSelected
      ? current.filter((id) => !filtered.some((product) => product.id === id))
      : Array.from(new Set([...current, ...filtered.map((product) => product.id)])));
  }

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

  async function hardDeleteProduct(product: AdminProduct) {
    if (!confirm(`Fully delete ${product.sku} from the Combay website/admin catalogue? This does not end an eBay listing; use the separate eBay end action for marketplace listings. Products with order, invoice, or stock movement history will be blocked and archived instead.`)) return;
    const response = await fetch(`/api/products/${encodeURIComponent(product.id)}?mode=hard`, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      setMessage(result.error || result.reason || `Could not delete ${product.sku}.`);
      return;
    }
    if (result.result?.blocked) setMessage(`${product.sku} could not be fully deleted because it has order/invoice/stock history. It has been archived and marked delete-blocked.`);
    else setMessage(result.result?.message || `${product.sku} fully deleted from Combay.`);
    await loadProducts();
  }

  async function migrateSkus() {
    if (!confirm("Run historical SKU migration now? This will re-sequence existing products from CBUK00001 upwards by creation date and log every change. eBay-linked products will be flagged for SKU repair review rather than silently broken.")) return;
    setMessage("Running SKU migration…");
    const response = await fetch("/api/admin/products/sku-migration", { method: "POST" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      setMessage(result.error || "SKU migration failed.");
      return;
    }
    setMessage(`SKU migration complete: ${result.changedCount || 0} products changed. Next SKU: ${result.nextSku || "calculated on next product"}. eBay-linked products were logged for review.`);
    await loadProducts();
  }

  async function duplicateProduct(product: AdminProduct) {
    const payload = {
      ...product,
      id: undefined,
      sku: undefined,
      ebayListingId: undefined,
      ebayOfferId: undefined,
      ebayPublishStatus: "NOT_LISTED",
      title: `${product.title} copy`,
      slug: `${product.slug}-copy-${Date.now().toString(36)}`,
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
    setMessage(`${product.sku} duplicated. The server assigned the next safe CBUK SKU.`);
    await loadProducts();
  }

  async function endEbayListing(product: AdminProduct) {
    if (!product.ebayOfferId && !product.ebayListingId && !product.ebayItemId) return;
    if (!confirm(`End the eBay listing for ${product.sku}? This affects eBay only. The Combay product will remain in the catalogue and the action will be logged.`)) return;
    const response = await fetch(`/api/admin/ebay/publishing/product/${encodeURIComponent(product.id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "end-listing", confirmEndListing: true }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      setMessage(result.error || result.reason || `Could not end eBay listing for ${product.sku}.`);
      return;
    }
    setMessage(`eBay listing end/withdraw action completed for ${product.sku}.`);
    await loadProducts();
  }

  async function bulkAction(action: "archive" | "delete" | "restore" | "end-ebay") {
    if (!selectedIds.length) return;
    if (action === "end-ebay") {
      const targets = selectedProducts.filter((product) => product.ebayOfferId || product.ebayListingId || product.ebayItemId);
      if (!targets.length) {
        setMessage("No selected products have an eBay offer/listing to end.");
        return;
      }
      if (!confirm(`End eBay listings for ${targets.length} selected products? This affects eBay only and keeps Combay products.`)) return;
      let success = 0;
      let failed = 0;
      for (const product of targets) {
        const response = await fetch(`/api/admin/ebay/publishing/product/${encodeURIComponent(product.id)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "end-listing", confirmEndListing: true }),
        });
        if (response.ok) success += 1;
        else failed += 1;
      }
      setMessage(`Bulk eBay end complete: ${success} ended/requested, ${failed} failed.`);
      setSelectedIds([]);
      await loadProducts();
      return;
    }

    const label = action === "delete" ? "delete" : action === "restore" ? "restore" : "archive";
    if (!confirm(`You are about to ${label} ${selectedIds.length} products. Products with business records may be archived/protected instead of permanently deleted.`)) return;
    const response = await fetch("/api/products/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds, action }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      setMessage(result.error || result.reason || `Bulk ${label} failed.`);
      return;
    }
    setMessage(`Bulk ${label} complete: ${result.deleted || 0} deleted, ${result.archived || 0} archived, ${result.restored || 0} restored, ${result.skipped || 0} skipped, ${result.failed || 0} failed.${result.errors?.length ? ` ${result.errors.length} protected/error item(s).` : ""}`);
    setSelectedIds([]);
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
          <Link href="/admin/products/new" className="btn-primary text-xs py-1.5 px-3"><Plus size={13} /> Add product</Link>
          <button type="button" onClick={migrateSkus} className="btn-secondary text-xs py-1.5 px-3">Fix SKUs</button>
          <Link href="/admin/products/ai" className="btn-secondary text-xs py-1.5 px-3"><Sparkles size={13} /> AI</Link>
          <button type="button" onClick={() => csvInputRef.current?.click()} className="btn-secondary text-xs py-1.5 px-3"><Upload size={13} /> Upload CSV</button>
          <a href="/stock-list-template.csv" download className="btn-secondary text-xs py-1.5 px-3"><Download size={13} /> Template</a>
        </div>
      </div>

      {message && <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm">{message}</div>}

      {selectedIds.length > 0 && (
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-navy-100 bg-navy-950 px-4 py-2 text-xs text-white shadow-sm">
          <span className="font-900">{selectedIds.length} product{selectedIds.length === 1 ? "" : "s"} selected</span>
          <div className="flex flex-wrap items-center gap-2">
            {status === "ARCHIVED" ? <button type="button" onClick={() => bulkAction("restore")} className="rounded-md bg-green-500 px-3 py-1.5 font-900 text-white hover:bg-green-600">Restore</button> : <button type="button" onClick={() => bulkAction("archive")} className="rounded-md bg-white/10 px-3 py-1.5 font-900 hover:bg-white/20">Archive</button>}
            <button type="button" onClick={() => bulkAction("delete")} className="rounded-md bg-red-500 px-3 py-1.5 font-900 text-white hover:bg-red-600">Delete</button>
            <button type="button" onClick={() => bulkAction("end-ebay")} className="rounded-md bg-orange-400 px-3 py-1.5 font-900 text-navy-950 hover:bg-orange-300">End eBay listings</button>
            <button type="button" onClick={() => setSelectedIds([])} className="rounded-md border border-white/20 px-3 py-1.5 font-900 hover:bg-white/10">Clear selection</button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-slate-50 px-3 py-1.5 font-900 text-navy-950">{total.toLocaleString("en-GB")} total</span>
          <span className="rounded-full bg-green-50 px-3 py-1.5 font-900 text-green-700">{Number(counts.PUBLISHED || 0).toLocaleString("en-GB")} published</span>
          <span className="rounded-full bg-yellow-50 px-3 py-1.5 font-900 text-yellow-700">{Number(counts.DRAFT || 0).toLocaleString("en-GB")} draft</span>
          <span className="rounded-full bg-gray-50 px-3 py-1.5 font-900 text-gray-700">{Number(counts.ARCHIVED || 0).toLocaleString("en-GB")} archived</span>
          <span className="rounded-full bg-blue-50 px-3 py-1.5 font-900 text-blue-700">Page {page} of {totalPages}</span>
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
                <th className="w-[4%] px-3 py-2"><input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} aria-label="Select all visible products" /></th>
                <th className="w-[32%] px-3 py-2">Product</th>
                <th className="w-[16%] px-3 py-2">Category / Condition</th>
                <th className="w-[12%] px-3 py-2">Price / Stock</th>
                <th className="w-[14%] px-3 py-2">Status / Source</th>
                <th className="w-[22%] px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((product) => {
                const condition = CONDITION_LABELS[product.condition];
                return (
                  <tr key={product.id} className={`hover:bg-slate-50/70 ${selectedIds.includes(product.id) ? "bg-blue-50/40" : ""}`}>
                    <td className="px-3 py-3 align-top"><input type="checkbox" checked={selectedIds.includes(product.id)} onChange={() => toggleSelected(product.id)} aria-label={`Select ${product.sku}`} /></td>
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
                        <Link href={`/shop/${product.slug}`} target="_blank" className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-900 text-slate-600 hover:bg-slate-50" title="Preview website product"><Eye size={12} /><span className="sr-only">Website</span></Link>
                        {product.ebayListingId || product.ebayItemId ? (
                          <a href={ebayUrl(product)} target="_blank" rel="noreferrer" className="rounded-md border border-blue-200 px-2 py-1 text-[10px] font-900 text-blue-700 hover:bg-blue-50" title={product.ebayListingId ? "Preview active eBay listing" : "Preview imported eBay listing by original eBay item ID"}><Eye size={12} /> eBay</a>
                        ) : (
                          <span className="rounded-md border border-slate-100 px-2 py-1 text-[10px] font-900 text-slate-300" title="No eBay listing or imported eBay item ID"><Eye size={12} /> eBay</span>
                        )}
                        <Link href={`/admin/products/${product.id}`} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-900 text-slate-600 hover:bg-slate-50" title="Edit"><Edit size={12} /></Link>
                        <button onClick={() => duplicateProduct(product)} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-900 text-slate-600 hover:bg-slate-50" title="Duplicate"><Copy size={12} /></button>
                        <button onClick={() => endEbayListing(product)} disabled={!(product.ebayOfferId || product.ebayListingId || product.ebayItemId)} className="rounded-md border border-orange-200 px-2 py-1 text-[10px] font-900 text-orange-700 hover:bg-orange-50 disabled:opacity-35" title={String(product.ebayPublishStatus || "").toUpperCase() === "ENDED" ? "Already marked ended on Combay — click to refresh/confirm or relist from product editor" : product.ebayOfferId ? "End eBay listing by Inventory API offer" : "End/confirm imported eBay listing state"}><Trash2 size={12} /> {String(product.ebayPublishStatus || "").toUpperCase() === "ENDED" ? "Ended" : "eBay"}</button>
                        <button onClick={() => archiveProduct(product)} className="rounded-md border border-red-200 px-2 py-1 text-[11px] font-900 text-red-700 hover:bg-red-50" title="Archive Combay product"><Trash2 size={12} /></button>
                        <button onClick={() => hardDeleteProduct(product)} className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-[10px] font-900 text-red-800 hover:bg-red-100" title="Hard delete when safe">Delete</button>
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
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          <span>Showing {filtered.length} of {total.toLocaleString("en-GB")} products</span>
          <div className="flex items-center gap-2">
            <button className="rounded-md border border-slate-200 px-3 py-1.5 font-900 disabled:opacity-40" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
            <span className="font-900 text-navy-950">{page} / {totalPages}</span>
            <button className="rounded-md border border-slate-200 px-3 py-1.5 font-900 disabled:opacity-40" disabled={page >= totalPages || loading} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
