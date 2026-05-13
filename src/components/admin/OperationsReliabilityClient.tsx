"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, ExternalLink, RefreshCw, ShieldAlert, ShieldCheck, Tag, WifiOff } from "lucide-react";

type Dashboard = any;

function money(value: unknown) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(value || 0));
}

function dateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("en-GB") : "—";
}

function toneClass(tone?: string) {
  if (tone === "ok") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (tone === "bad") return "border-red-200 bg-red-50 text-red-800";
  if (tone === "warn") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function severityClass(severity?: string) {
  if (severity === "high") return "bg-red-50 text-red-700 border-red-200";
  if (severity === "medium") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function StatCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[10px] font-900 uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 font-display text-xl font-900 text-navy-950">{value}</p>
      {detail ? <p className="mt-1 text-[11px] leading-4 text-slate-500">{detail}</p> : null}
    </div>
  );
}

export default function OperationsReliabilityClient({ initialData }: { initialData: Dashboard }) {
  const [data, setData] = useState<Dashboard>(initialData);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [openOrder, setOpenOrder] = useState<string | null>(null);

  const stats = useMemo(() => {
    const orderRows = data.ebayOrders?.rows || [];
    const categoryRows = data.categories?.rows || [];
    const inventoryIssues = data.inventory?.issues || [];
    return {
      ebayOrders: orderRows.length,
      unmatchedOrders: orderRows.filter((row: any) => row.tone === "bad" || row.tone === "warn").length,
      inventoryIssues: inventoryIssues.length,
      highInventoryIssues: inventoryIssues.filter((row: any) => row.severity === "high").length,
      categoryIssues: categoryRows.length,
      healthProblems: (data.health || []).filter((row: any) => row.tone === "bad" || row.tone === "warn").length,
    };
  }, [data]);

  async function refresh() {
    setBusy("refresh");
    setMessage("Refreshing operational diagnostics...");
    const res = await fetch("/api/operations/reliability", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (json.ok && json.data) {
      setData(json.data);
      setMessage("Diagnostics refreshed.");
    } else {
      setMessage(json.error || "Could not refresh diagnostics.");
    }
    setBusy(null);
  }

  async function recheckEbayOrders() {
    setBusy("ebay-orders");
    setMessage("Rechecking eBay orders for the last 30 days. Do not run another order sync until this finishes.");
    const res = await fetch("/api/operations/ebay-order-recheck", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days: 30, limit: 100 }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) {
      setMessage(json.error || json.message || "eBay order recheck failed.");
      setBusy(null);
      return;
    }
    setMessage(json.message || "eBay orders rechecked.");
    await refresh();
    setBusy(null);
  }

  async function applyCategory(productId: string, targetSlug: string) {
    setBusy(`cat-${productId}`);
    setMessage("Applying category suggestion...");
    const res = await fetch("/api/operations/category-audit/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, targetSlug }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) {
      setMessage(json.error || "Could not update category.");
      setBusy(null);
      return;
    }
    setMessage(`Updated ${json.result?.sku || "product"} to ${json.result?.categoryName || "selected category"}.`);
    await refresh();
    setBusy(null);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-900 uppercase tracking-[0.18em] text-accent">Operational reliability</p>
            <h1 className="mt-1 font-display text-2xl font-900 tracking-tight text-navy-950">Stock, eBay and launch diagnostics</h1>
            <p className="mt-1 max-w-4xl text-xs leading-5 text-slate-500">Use this page to verify eBay order stock deductions, catch inventory mismatch risks, confirm the deployed build, and repair obvious category errors before customers find them.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={refresh} disabled={Boolean(busy)} className="btn-secondary py-2 text-xs"><RefreshCw size={14} /> Refresh diagnostics</button>
            <button onClick={recheckEbayOrders} disabled={Boolean(busy)} className="btn-primary py-2 text-xs"><RefreshCw size={14} /> Recheck last 30 days eBay orders</button>
          </div>
        </div>
        {message ? <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-800 text-slate-600">{message}</p> : null}
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Health warnings" value={stats.healthProblems} detail="Config/build/provider checks" />
        <StatCard label="eBay orders reviewed" value={stats.ebayOrders} detail="Last 30 days imported in Combay" />
        <StatCard label="Order issues" value={stats.unmatchedOrders} detail="Unmatched/no movement/cancel checks" />
        <StatCard label="Inventory risks" value={stats.inventoryIssues} detail={`${stats.highInventoryIssues} high priority`} />
        <StatCard label="Category repairs" value={stats.categoryIssues} detail="Suggested taxonomy fixes" />
        <StatCard label="Generated" value={dateTime(data.generatedAt).split(",")[0] || "Now"} detail={dateTime(data.generatedAt)} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2"><Database size={17} className="text-accent" /><h2 className="font-display text-base font-900 text-navy-950">System health and deployment check</h2></div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {(data.health || []).map((check: any) => (
            <div key={check.label} className={`rounded-xl border p-3 ${toneClass(check.tone)}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-900 uppercase tracking-wide opacity-70">{check.label}</p>
                {check.tone === "ok" ? <CheckCircle2 size={15} /> : check.tone === "bad" ? <WifiOff size={15} /> : <AlertTriangle size={15} />}
              </div>
              <p className="mt-1 font-900">{check.status}</p>
              <p className="mt-1 text-[11px] leading-4 opacity-80">{check.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-base font-900 text-navy-950">eBay order and stock reconciliation</h2>
            <p className="text-xs text-slate-500">Latest sync: {dateTime(data.ebayOrders?.latestSync?.finishedAt || data.ebayOrders?.latestSync?.startedAt)} · {data.ebayOrders?.latestSync?.status || "No completed order sync yet"}</p>
          </div>
          <Link href="/admin/ebay" className="inline-flex items-center gap-1 text-xs font-900 text-accent hover:underline">Open eBay console <ExternalLink size={13} /></Link>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr><th className="px-3 py-2">Order</th><th className="px-3 py-2">Customer</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Items</th><th className="px-3 py-2">Stock log</th><th className="px-3 py-2">Total</th><th className="px-3 py-2">Date</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data.ebayOrders?.rows || []).length ? (data.ebayOrders.rows || []).map((row: any) => (
                <tr key={row.id} className="align-top">
                  <td className="px-3 py-2"><button onClick={() => setOpenOrder(openOrder === row.id ? null : row.id)} className="font-900 text-navy-950 hover:underline">{row.orderNumber}</button><p className="text-[10px] text-slate-400">{row.externalOrderId || "—"}</p>{openOrder === row.id ? <div className="mt-2 space-y-1">{row.items.map((item: any) => <div key={item.id} className="rounded border border-slate-100 bg-slate-50 px-2 py-1"><p className="font-800 text-slate-700">{item.sku}{item.variationSku ? ` / ${item.variationSku}` : ""}</p><p className="text-[10px] text-slate-500">{item.title} · Qty {item.quantity} · {item.matched ? "matched" : "not matched"}</p></div>)}</div> : null}</td>
                  <td className="px-3 py-2 text-slate-600">{row.customerName}</td>
                  <td className="px-3 py-2"><span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-900 ${toneClass(row.tone)}`}>{row.state}</span><p className="mt-1 text-[10px] text-slate-400">{row.paymentStatus} · {row.status}</p></td>
                  <td className="px-3 py-2 text-slate-600">{row.matchedItems}/{row.itemCount} matched{row.unmatchedItems ? <p className="text-red-600">{row.unmatchedItems} unmatched</p> : null}</td>
                  <td className="px-3 py-2 text-slate-600">{row.stockMovements} sale movements{row.restockMovements ? <p>{row.restockMovements} restock</p> : null}</td>
                  <td className="px-3 py-2 font-900 text-navy-950">{money(row.total)}</td>
                  <td className="px-3 py-2 text-slate-500">{dateTime(row.createdAt)}</td>
                </tr>
              )) : <tr><td colSpan={7} className="px-3 py-4 text-center text-slate-500">No imported eBay orders found for the last {data.ebayOrders?.days || 30} days.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2"><ShieldAlert size={17} className="text-accent" /><h2 className="font-display text-base font-900 text-navy-950">Inventory mismatch audit</h2></div>
        <p className="mb-3 text-xs text-slate-500">Checks eBay-linked products, variation stock mismatches, failed/queued stock update jobs and local out-of-stock items that may still need marketplace attention.</p>
        <div className="space-y-2">
          {(data.inventory?.issues || []).length ? data.inventory.issues.map((issue: any) => (
            <div key={issue.key} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2 py-0.5 text-[10px] font-900 ${severityClass(issue.severity)}`}>{issue.severity || "review"}</span><p className="font-900 text-navy-950">{issue.type}</p></div>
                <p className="mt-1 truncate text-xs text-slate-600">{issue.sku} · {issue.title}</p>
                <p className="text-[11px] text-slate-500">{issue.detail}</p>
              </div>
              <div className="flex shrink-0 gap-2">{issue.slug ? <Link href={`/shop/${issue.slug}`} target="_blank" className="btn-secondary py-1.5 text-[11px]">View product</Link> : null}{issue.productId ? <Link href={`/admin/products/${issue.productId}`} className="btn-primary py-1.5 text-[11px]">Open admin</Link> : null}</div>
            </div>
          )) : <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs font-800 text-emerald-800"><ShieldCheck size={15} className="mr-1 inline" /> No immediate eBay inventory mismatch risks detected from stored Combay data.</div>}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2"><Tag size={17} className="text-accent" /><h2 className="font-display text-base font-900 text-navy-950">Category classification audit</h2></div>
        <p className="mb-3 text-xs text-slate-500">Finds products that appear to sit in the wrong public taxonomy. This is designed for obvious cases such as military uniform products not being under Military & Surplus.</p>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2">Product</th><th className="px-3 py-2">Current</th><th className="px-3 py-2">Suggested</th><th className="px-3 py-2">Reason</th><th className="px-3 py-2">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {(data.categories?.rows || []).length ? data.categories.rows.map((row: any) => (
                <tr key={row.productId}>
                  <td className="px-3 py-2"><p className="font-900 text-navy-950">{row.sku}</p><p className="max-w-md truncate text-slate-600">{row.title}</p></td>
                  <td className="px-3 py-2 text-slate-600">{row.currentCategory}</td>
                  <td className="px-3 py-2 font-900 text-navy-950">{row.suggestedCategory}</td>
                  <td className="px-3 py-2 text-slate-500">{row.reason}</td>
                  <td className="px-3 py-2"><button disabled={busy === `cat-${row.productId}`} onClick={() => applyCategory(row.productId, row.suggestedCategorySlug)} className="btn-primary py-1.5 text-[11px]">Apply suggestion</button></td>
                </tr>
              )) : <tr><td colSpan={5} className="px-3 py-4 text-center text-slate-500">No obvious classification issues detected in the scanned products.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
