"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, Archive, CheckCircle2, ClipboardCheck, ExternalLink, ImageIcon, PackageCheck, RefreshCw, Search, Sparkles, Tag, Truck } from "lucide-react";

type QualityRow = {
  id: string;
  sku: string;
  title: string;
  slug: string;
  status: string;
  source: string;
  brand: string;
  manufacturer: string;
  model: string;
  mpn: string;
  category: string;
  categorySlug: string;
  suggestedCategory: string;
  suggestedCategorySlug: string;
  price: number | null;
  priceOnRequest: boolean;
  stockQty: number;
  imageUrl: string | null;
  imageCount: number;
  specCount: number;
  documentCount: number;
  variantCount: number;
  shippingPolicyId: string | null;
  ebayLinked: boolean;
  ebayPublishStatus: string;
  ebayLastError: string;
  reviewedAt: string | null;
  reviewStatus: string | null;
  readiness: "Ready to sell" | "Needs review" | "Not launch-ready";
  score: number;
  issues: { code: string; label: string; severity: "high" | "medium" | "low"; detail: string }[];
};

type Report = {
  generatedAt: string;
  rows: QualityRow[];
  summary: Record<string, number>;
  filters: { q: string; status: string; issue: string; category: string; page: number; pageSize: number; total: number; totalPages: number };
  categories: { label: string; slug: string }[];
  shippingPolicies: { id: string; name: string; isDefault: boolean }[];
};

function scoreClass(score: number) {
  if (score >= 85) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (score >= 60) return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-red-200 bg-red-50 text-red-800";
}

function readinessClass(readiness: string) {
  if (readiness === "Ready to sell") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (readiness === "Needs review") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-red-200 bg-red-50 text-red-800";
}

function issueClass(severity: string) {
  if (severity === "high") return "border-red-200 bg-red-50 text-red-700";
  if (severity === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function dateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("en-GB") : "—";
}

function StatCard({ label, value, detail, icon }: { label: string; value: number | string; detail?: string; icon?: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-900 uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <span className="text-accent">{icon}</span>
      </div>
      <p className="mt-1 font-display text-xl font-900 text-navy-950">{value}</p>
      {detail ? <p className="mt-1 text-[11px] leading-4 text-slate-500">{detail}</p> : null}
    </div>
  );
}

export default function CatalogueQualityClient({ initialData }: { initialData: Report | null }) {
  const [data, setData] = useState<Report | null>(initialData);
  const [q, setQ] = useState(initialData?.filters.q || "");
  const [status, setStatus] = useState(initialData?.filters.status || "all");
  const [issue, setIssue] = useState(initialData?.filters.issue || "all");
  const [category, setCategory] = useState(initialData?.filters.category || "all");
  const [page, setPage] = useState(initialData?.filters.page || 1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(initialData ? "" : "Could not load catalogue quality data.");
  const [bulkCategory, setBulkCategory] = useState("military-surplus");
  const [bulkShipping, setBulkShipping] = useState(initialData?.shippingPolicies.find((policy) => policy.isDefault)?.id || initialData?.shippingPolicies[0]?.id || "");
  const [bulkValue, setBulkValue] = useState("");

  async function load(nextPage = page) {
    setBusy(true);
    const params = new URLSearchParams({ q, status, issue, category, page: String(nextPage), pageSize: "40" });
    const response = await fetch(`/api/admin/catalogue-quality?${params.toString()}`, { cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (json.ok && json.data) {
      setData(json.data);
      setPage(json.data.filters.page || nextPage);
      setSelectedIds((current) => current.filter((id) => json.data.rows.some((row: QualityRow) => row.id === id)));
      setMessage("Catalogue quality data refreshed.");
    } else {
      setMessage(json.error || "Could not load catalogue quality data.");
    }
    setBusy(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      load(1).catch(() => setMessage("Could not refresh catalogue quality data."));
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, issue, category]);

  const rows = data?.rows || [];
  const allVisibleSelected = rows.length > 0 && rows.every((row) => selectedIds.includes(row.id));
  const selectedRows = useMemo(() => rows.filter((row) => selectedIds.includes(row.id)), [rows, selectedIds]);

  function toggle(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleAll() {
    setSelectedIds((current) => allVisibleSelected ? current.filter((id) => !rows.some((row) => row.id === id)) : Array.from(new Set([...current, ...rows.map((row) => row.id)])));
  }

  async function runAction(action: string, extra: Record<string, unknown> = {}) {
    if (!selectedIds.length) {
      setMessage("Select at least one product first.");
      return;
    }
    const warning = action === "archive"
      ? `Archive ${selectedIds.length} selected product(s)? They will be hidden from the public catalogue.`
      : action === "assign-category"
        ? `Assign selected product(s) to the chosen category?`
        : action === "assign-shipping"
          ? `Assign selected product(s) to the chosen shipping policy?`
          : null;
    if (warning && !confirm(warning)) return;

    setBusy(true);
    setMessage("Applying catalogue quality action...");
    const response = await fetch("/api/admin/catalogue-quality/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds, action, ...extra }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.ok) {
      setMessage(json.error || "Catalogue quality action failed.");
      setBusy(false);
      return;
    }
    setMessage(`Action complete: ${json.result?.updated || 0} product(s) updated.`);
    setSelectedIds([]);
    await load(page);
    setBusy(false);
  }

  async function runActionForIds(ids: string[], action: string, extra: Record<string, unknown> = {}) {
    if (!ids.length) return;
    setBusy(true);
    setMessage("Applying catalogue quality action...");
    const response = await fetch("/api/admin/catalogue-quality/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, action, ...extra }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.ok) {
      setMessage(json.error || "Catalogue quality action failed.");
      setBusy(false);
      return;
    }
    setMessage(`Action complete: ${json.result?.updated || 0} product(s) updated.`);
    setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
    await load(page);
    setBusy(false);
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {message || "Catalogue quality data unavailable."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-900 uppercase tracking-[0.18em] text-accent">Catalogue launch readiness</p>
            <h1 className="mt-1 font-display text-2xl font-900 tracking-tight text-navy-950">Product data quality centre</h1>
            <p className="mt-1 max-w-4xl text-xs leading-5 text-slate-500">Find public products with missing images, weak descriptions, wrong categories, missing specs, missing shipping policies or eBay-import placeholder text. Use bulk actions to repair obvious issues before launch.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/products" className="btn-secondary py-2 text-xs"><ExternalLink size={14} /> Products</Link>
            <button onClick={() => load(page)} disabled={busy} className="btn-primary py-2 text-xs"><RefreshCw size={14} /> Refresh</button>
          </div>
        </div>
        {message ? <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-800 text-slate-600">{message}</p> : null}
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Scanned" value={data.summary.scanned || 0} detail="Filtered products checked" icon={<ClipboardCheck size={15} />} />
        <StatCard label="Ready" value={data.summary.ready || 0} detail="No launch blockers found" icon={<CheckCircle2 size={15} />} />
        <StatCard label="Not ready" value={data.summary.notLaunchReady || 0} detail="High priority issues" icon={<AlertTriangle size={15} />} />
        <StatCard label="Missing images" value={data.summary.missingImages || 0} detail="Needs main image" icon={<ImageIcon size={15} />} />
        <StatCard label="Missing specs" value={data.summary.missingSpecs || 0} detail="No structured specs" icon={<PackageCheck size={15} />} />
        <StatCard label="Missing shipping" value={data.summary.missingShipping || 0} detail="No policy/manual flag" icon={<Truck size={15} />} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_160px_220px_220px]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search SKU, title, brand, model, MPN..." className="input py-2 pl-9 text-sm" />
          </div>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="input py-2 text-sm">
            <option value="all">All status</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <select value={issue} onChange={(event) => setIssue(event.target.value)} className="input py-2 text-sm">
            <option value="all">All issues</option>
            <option value="not-ready">Not launch-ready</option>
            <option value="needs-review">Needs review</option>
            <option value="ready">Ready to sell</option>
            <option value="MISSING_IMAGE">Missing image</option>
            <option value="MISSING_DESCRIPTION">Missing description</option>
            <option value="PLACEHOLDER_EBAY_DESCRIPTION">eBay placeholder text</option>
            <option value="MISSING_SPECS">Missing specs</option>
            <option value="MISSING_SHIPPING">Missing shipping</option>
            <option value="CATEGORY_REVIEW">Category review</option>
            <option value="PUBLIC_INCOMPLETE">Public but incomplete</option>
          </select>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="input py-2 text-sm">
            <option value="all">All categories</option>
            {data.categories.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}
          </select>
        </div>
      </section>

      {selectedIds.length > 0 ? (
        <section className="sticky top-0 z-20 rounded-xl border border-navy-100 bg-navy-950 p-3 text-white shadow-lg">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <p className="text-xs font-900">{selectedIds.length} selected · {selectedRows.map((row) => row.sku).slice(0, 3).join(", ")}{selectedIds.length > 3 ? "..." : ""}</p>
            <div className="flex flex-wrap items-center gap-2">
              <select value={bulkCategory} onChange={(event) => setBulkCategory(event.target.value)} className="rounded-md border border-white/20 bg-white px-2 py-1.5 text-xs font-800 text-navy-950">
                {data.categories.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}
              </select>
              <button onClick={() => runAction("assign-category", { categorySlug: bulkCategory })} disabled={busy} className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-900 hover:bg-white/20"><Tag size={13} className="inline" /> Assign category</button>
              <select value={bulkShipping} onChange={(event) => setBulkShipping(event.target.value)} className="rounded-md border border-white/20 bg-white px-2 py-1.5 text-xs font-800 text-navy-950">
                {data.shippingPolicies.map((policy) => <option key={policy.id} value={policy.id}>{policy.name}{policy.isDefault ? " · default" : ""}</option>)}
              </select>
              <button onClick={() => runAction("assign-shipping", { shippingPolicyId: bulkShipping })} disabled={busy || !bulkShipping} className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-900 hover:bg-white/20">Assign shipping</button>
              <button onClick={() => runAction("generate-overview")} disabled={busy} className="rounded-md bg-accent px-3 py-1.5 text-xs font-900 text-navy-950 hover:bg-accent-dark"><Sparkles size={13} className="inline" /> Generate overview</button>
              <button onClick={() => runAction("clean-ebay-description")} disabled={busy} className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-900 hover:bg-white/20">Clean eBay text</button>
              <button onClick={() => runAction("mark-reviewed")} disabled={busy} className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-900 text-white hover:bg-emerald-600">Mark reviewed</button>
              <button onClick={() => runAction("archive")} disabled={busy} className="rounded-md bg-red-500 px-3 py-1.5 text-xs font-900 text-white hover:bg-red-600"><Archive size={13} className="inline" /> Archive</button>
              <button onClick={() => setSelectedIds([])} className="rounded-md border border-white/20 px-3 py-1.5 text-xs font-900 hover:bg-white/10">Clear</button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input value={bulkValue} onChange={(event) => setBulkValue(event.target.value)} placeholder="Brand/manufacturer value" className="rounded-md border border-white/20 bg-white px-2 py-1.5 text-xs font-800 text-navy-950" />
              <button onClick={() => runAction("set-brand", { value: bulkValue })} disabled={busy || !bulkValue.trim()} className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-900 hover:bg-white/20">Set brand</button>
              <button onClick={() => runAction("set-manufacturer", { value: bulkValue })} disabled={busy || !bulkValue.trim()} className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-900 hover:bg-white/20">Set manufacturer</button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-xs text-slate-500">
          <p>Showing page {data.filters.page} of {data.filters.totalPages} · {data.filters.total} product(s)</p>
          <p>Generated {dateTime(data.generatedAt)}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-[42px] px-3 py-2"><input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label="Select all visible" /></th>
                <th className="w-[34%] px-3 py-2">Product</th>
                <th className="w-[13%] px-3 py-2">Readiness</th>
                <th className="w-[17%] px-3 py-2">Category</th>
                <th className="w-[18%] px-3 py-2">Issue flags</th>
                <th className="w-[18%] px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length ? rows.map((row) => (
                <tr key={row.id} className={selectedIds.includes(row.id) ? "bg-blue-50/40" : "hover:bg-slate-50/70"}>
                  <td className="px-3 py-3 align-top"><input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggle(row.id)} aria-label={`Select ${row.sku}`} /></td>
                  <td className="px-3 py-3 align-top">
                    <div className="flex min-w-0 gap-2">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                        {row.imageUrl ? <img src={row.imageUrl} alt="" className="h-full w-full object-cover" /> : <ImageIcon size={17} className="text-slate-300" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-mono text-[11px] font-900 text-accent">{row.sku}</p>
                        <p className="truncate font-display text-sm font-900 text-navy-950">{row.title}</p>
                        <p className="truncate text-[11px] text-slate-400">{row.brand || row.manufacturer || "No brand"} · {row.model || row.mpn || "No model/MPN"}</p>
                        <p className="mt-1 text-[10px] text-slate-400">{row.status} · {row.source} · {row.stockQty} stock · {row.imageCount} img · {row.specCount} specs</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-900 ${readinessClass(row.readiness)}`}>{row.readiness}</span>
                    <p className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-900 ${scoreClass(row.score)}`}>{row.score}/100</p>
                    {row.reviewedAt ? <p className="mt-1 text-[10px] text-emerald-700">Reviewed {dateTime(row.reviewedAt)}</p> : null}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <p className="font-900 text-navy-950">{row.category}</p>
                    {row.suggestedCategory !== row.category ? <p className="mt-1 text-[11px] text-amber-700">Suggested: {row.suggestedCategory}</p> : <p className="mt-1 text-[11px] text-slate-400">Aligned</p>}
                    {row.shippingPolicyId ? <p className="mt-1 text-[10px] text-emerald-700">Shipping assigned</p> : <p className="mt-1 text-[10px] text-red-600">No shipping policy</p>}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="flex flex-wrap gap-1">
                      {row.issues.slice(0, 5).map((item) => <span key={`${row.id}-${item.code}`} title={item.detail} className={`rounded-full border px-2 py-0.5 text-[10px] font-900 ${issueClass(item.severity)}`}>{item.label}</span>)}
                      {row.issues.length > 5 ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-900 text-slate-500">+{row.issues.length - 5}</span> : null}
                    </div>
                    {row.ebayLinked ? <p className="mt-1 text-[10px] text-blue-700">eBay: {row.ebayPublishStatus}</p> : null}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Link href={`/admin/products/${row.id}`} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-900 text-slate-600 hover:bg-slate-50">Edit</Link>
                      <Link href={`/shop/${row.slug}`} target="_blank" className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-900 text-slate-600 hover:bg-slate-50">View</Link>
                      {row.suggestedCategorySlug && row.suggestedCategory !== row.category ? <button onClick={() => runActionForIds([row.id], "assign-category", { categorySlug: row.suggestedCategorySlug })} className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-900 text-amber-700 hover:bg-amber-100">Apply category</button> : null}
                    </div>
                  </td>
                </tr>
              )) : <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">No products match the selected quality filter.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 text-xs">
          <button onClick={() => { const next = Math.max(1, page - 1); setPage(next); load(next); }} disabled={busy || page <= 1} className="btn-secondary py-1.5 text-xs disabled:opacity-40">Previous</button>
          <span className="font-900 text-slate-500">Page {page} of {data.filters.totalPages}</span>
          <button onClick={() => { const next = Math.min(data.filters.totalPages, page + 1); setPage(next); load(next); }} disabled={busy || page >= data.filters.totalPages} className="btn-secondary py-1.5 text-xs disabled:opacity-40">Next</button>
        </div>
      </section>
    </div>
  );
}
