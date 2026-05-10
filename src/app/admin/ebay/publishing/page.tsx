"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileCode2, PackageCheck, RefreshCw, Save, Wrench } from "lucide-react";

type SettingsPayload = {
  config?: any;
  templates?: any[];
  locations?: any[];
  logs?: any[];
  jobs?: any[];
};

function StatusBadge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "green" | "amber" | "red" | "blue" }) {
  const classes = {
    slate: "bg-slate-50 text-slate-700 border-slate-200",
    green: "bg-green-50 text-green-700 border-green-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  }[tone];
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-900 whitespace-nowrap ${classes}`}>{children}</span>;
}

export default function EbayPublishingPage() {
  const [payload, setPayload] = useState<SettingsPayload>({});
  const [form, setForm] = useState<any>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [repairing, setRepairing] = useState(false);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/ebay/publishing/settings", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (result.ok) {
      setPayload(result);
      setForm({
        marketplaceId: result.config?.marketplaceId || "EBAY_GB",
        defaultInventoryLocationKey: result.config?.defaultInventoryLocationKey || result.locations?.[0]?.key || "",
        defaultPaymentPolicyId: result.config?.defaultPaymentPolicyId || "",
        defaultReturnPolicyId: result.config?.defaultReturnPolicyId || "",
        defaultFulfillmentPolicyId: result.config?.defaultFulfillmentPolicyId || "",
        defaultListingDuration: result.config?.defaultListingDuration || "GTC",
        defaultSkuPrefix: result.config?.defaultSkuPrefix || "CBUK",
        defaultDescriptionTemplateId: result.config?.defaultDescriptionTemplateId || result.templates?.[0]?.id || "",
        autoGenerateSku: result.config?.autoGenerateSku !== false,
        autoPublishToEbay: Boolean(result.config?.autoPublishToEbay),
        manualApprovalBeforePublish: result.config?.manualApprovalBeforePublish !== false,
      });
    } else setMessage(result.error || "Could not load eBay publishing settings.");
    setLoading(false);
  }

  useEffect(() => { load().catch(() => setMessage("Could not load eBay publishing settings.")); }, []);

  const stats = useMemo(() => {
    const logs = payload.logs ?? [];
    const jobs = payload.jobs ?? [];
    return {
      templates: payload.templates?.length ?? 0,
      locations: payload.locations?.length ?? 0,
      failedLogs: logs.filter((log: any) => String(log.status).includes("FAILED")).length,
      pendingJobs: jobs.filter((job: any) => ["QUEUED", "AWAITING_MANUAL_APPROVAL"].includes(String(job.status))).length,
    };
  }, [payload]);

  async function save() {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/admin/ebay/publishing/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const result = await response.json().catch(() => ({}));
    setSaving(false);
    if (!result.ok) {
      setMessage(result.error || "Could not save eBay publishing settings.");
      return;
    }
    setMessage("eBay publishing defaults saved.");
    await load();
  }

  async function repairImported() {
    setRepairing(true);
    setMessage("Repairing imported eBay listings in a safe local batch. Live eBay listings are not overwritten by this step.");
    const response = await fetch("/api/admin/ebay/publishing/repair-imported", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limit: 100 }) });
    const result = await response.json().catch(() => ({}));
    setRepairing(false);
    if (!result.ok) {
      setMessage(result.error || "Could not repair imported listings.");
      return;
    }
    setMessage(`Repair complete. Scanned ${result.scanned || 0}; repaired ${result.repaired || 0}; ${result.flagged || 0} need manual review.`);
    await load();
  }

  if (loading) return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-gray-500">Loading eBay publishing foundation…</div>;

  return (
    <div className="admin-page space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-gray-400">eBay outbound publishing</p>
            <h1 className="font-display text-2xl font-900 text-navy-950">Publishing foundation</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500">Prepare Combay products for eBay with SKU control, policy defaults, branded HTML descriptions, validation, draft state, approval jobs and logs. Live publish remains blocked until the product validates and the dedicated eBay publish worker is enabled.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={load} className="btn-secondary text-xs py-2"><RefreshCw size={14} /> Refresh</button>
            <button onClick={save} disabled={saving} className="btn-primary text-xs py-2"><Save size={14} /> {saving ? "Saving…" : "Save defaults"}</button>
          </div>
        </div>
      </section>

      {message && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-700 text-amber-900">{message}</div>}

      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[11px] font-900 uppercase text-gray-400">Templates</p><p className="mt-1 text-xl font-900 text-navy-950">{stats.templates}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[11px] font-900 uppercase text-gray-400">Inventory locations</p><p className="mt-1 text-xl font-900 text-navy-950">{stats.locations}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[11px] font-900 uppercase text-gray-400">Approval jobs</p><p className="mt-1 text-xl font-900 text-navy-950">{stats.pendingJobs}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[11px] font-900 uppercase text-gray-400">Failed logs</p><p className="mt-1 text-xl font-900 text-navy-950">{stats.failedLogs}</p></div>
      </section>

      <section className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><h2 className="font-display text-lg font-900 text-navy-950">Default publishing controls</h2><p className="mt-1 text-xs text-gray-500">These defaults are used by the product editor eBay tab and future live publish worker.</p></div>
              <StatusBadge tone="blue">Marketplace {form.marketplaceId || "EBAY_GB"}</StatusBadge>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              <label className="block"><span className="label">Marketplace</span><input value={form.marketplaceId || ""} onChange={(e) => setForm((c: any) => ({ ...c, marketplaceId: e.target.value }))} className="input py-2 text-sm" /></label>
              <label className="block"><span className="label">SKU prefix</span><input value={form.defaultSkuPrefix || ""} onChange={(e) => setForm((c: any) => ({ ...c, defaultSkuPrefix: e.target.value }))} className="input py-2 text-sm font-mono" /></label>
              <label className="block"><span className="label">Listing duration</span><input value={form.defaultListingDuration || ""} onChange={(e) => setForm((c: any) => ({ ...c, defaultListingDuration: e.target.value }))} className="input py-2 text-sm" /></label>
              <label className="block"><span className="label">Inventory location</span><select value={form.defaultInventoryLocationKey || ""} onChange={(e) => setForm((c: any) => ({ ...c, defaultInventoryLocationKey: e.target.value }))} className="input py-2 text-sm"><option value="">Select location</option>{(payload.locations ?? []).map((loc: any) => <option key={loc.id} value={loc.key}>{loc.name} ({loc.key})</option>)}</select></label>
              <label className="block"><span className="label">Payment policy ID</span><input value={form.defaultPaymentPolicyId || ""} onChange={(e) => setForm((c: any) => ({ ...c, defaultPaymentPolicyId: e.target.value }))} className="input py-2 text-sm" /></label>
              <label className="block"><span className="label">Return policy ID</span><input value={form.defaultReturnPolicyId || ""} onChange={(e) => setForm((c: any) => ({ ...c, defaultReturnPolicyId: e.target.value }))} className="input py-2 text-sm" /></label>
              <label className="block"><span className="label">Fulfilment policy ID</span><input value={form.defaultFulfillmentPolicyId || ""} onChange={(e) => setForm((c: any) => ({ ...c, defaultFulfillmentPolicyId: e.target.value }))} className="input py-2 text-sm" /></label>
              <label className="block lg:col-span-2"><span className="label">Default eBay HTML template</span><select value={form.defaultDescriptionTemplateId || ""} onChange={(e) => setForm((c: any) => ({ ...c, defaultDescriptionTemplateId: e.target.value }))} className="input py-2 text-sm"><option value="">System default</option>{(payload.templates ?? []).map((template: any) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-3">
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-800 text-navy-950"><input type="checkbox" checked={form.autoGenerateSku !== false} onChange={(e) => setForm((c: any) => ({ ...c, autoGenerateSku: e.target.checked }))} /> Auto-generate SKU</label>
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-800 text-navy-950"><input type="checkbox" checked={form.manualApprovalBeforePublish !== false} onChange={(e) => setForm((c: any) => ({ ...c, manualApprovalBeforePublish: e.target.checked }))} /> Manual approval before publish</label>
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-800 text-navy-950"><input type="checkbox" checked={Boolean(form.autoPublishToEbay)} onChange={(e) => setForm((c: any) => ({ ...c, autoPublishToEbay: e.target.checked }))} /> Auto-publish off by default</label>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div><h2 className="font-display text-lg font-900 text-navy-950">Imported listing repair</h2><p className="mt-1 text-xs text-gray-500">Safely repairs local Combay records imported from eBay: SKU mapping, branded description fallback, listing ID mapping and validation logs. It does not silently overwrite live eBay listings.</p></div>
              <button onClick={repairImported} disabled={repairing} className="btn-secondary text-xs py-2"><Wrench size={14} /> {repairing ? "Repairing…" : "Repair imported eBay listings"}</button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-lg font-900 text-navy-950">Recent publishing logs</h2><StatusBadge>{payload.logs?.length || 0} shown</StatusBadge></div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[780px] text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-gray-400"><tr><th className="px-3 py-2">Action</th><th className="px-3 py-2">SKU</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Message</th><th className="px-3 py-2">Date</th></tr></thead>
                <tbody>{(payload.logs ?? []).map((log: any) => <tr key={log.id} className="border-t border-slate-100"><td className="px-3 py-2 font-900 text-navy-950 whitespace-nowrap">{log.actionType}</td><td className="px-3 py-2 font-mono whitespace-nowrap">{log.sku || "—"}</td><td className="px-3 py-2"><StatusBadge tone={String(log.status).includes("SUCCESS") ? "green" : String(log.status).includes("FAILED") ? "red" : "amber"}>{log.status}</StatusBadge></td><td className="max-w-[360px] px-3 py-2 text-gray-500 truncate">{log.message || log.errorMessage || "—"}</td><td className="px-3 py-2 whitespace-nowrap text-gray-400">{log.startedAt ? new Date(log.startedAt).toLocaleString("en-GB") : "—"}</td></tr>)}{!(payload.logs ?? []).length && <tr><td colSpan={5} className="px-3 py-5 text-center text-gray-500">No publishing logs yet.</td></tr>}</tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2"><PackageCheck size={18} className="text-accent" /><h2 className="font-display text-lg font-900 text-navy-950">Product workflow</h2></div>
            <ol className="mt-3 space-y-2 text-xs leading-5 text-gray-600">
              <li>1. Open a product in <Link href="/admin/products" className="font-900 text-navy-950 underline">Products</Link>.</li>
              <li>2. Use the new <strong>eBay Listing</strong> tab.</li>
              <li>3. Fill category, policy and mapping fields.</li>
              <li>4. Generate the branded eBay description.</li>
              <li>5. Validate and save local eBay draft.</li>
              <li>6. Queue for manual publish approval when valid.</li>
            </ol>
          </section>

          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-amber-900"><AlertTriangle size={17} /><h2 className="font-display text-sm font-900">Live publish safety</h2></div>
            <p className="mt-2 text-xs leading-5 text-amber-900">This phase prepares products and creates approval jobs. It does not silently push live listings. Live eBay publish should be enabled only after category/aspect/policy fetch and inventory-location verification are complete.</p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2"><FileCode2 size={17} className="text-accent" /><h2 className="font-display text-sm font-900 text-navy-950">Templates</h2></div>
            <div className="mt-3 space-y-2">{(payload.templates ?? []).map((template: any) => <div key={template.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-900 text-navy-950">{template.name}</p>{template.isDefault && <StatusBadge tone="green">Default</StatusBadge>}</div><p className="mt-1 truncate text-[11px] text-gray-500">{template.description || "Combay eBay-safe HTML template"}</p></div>)}</div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2"><CheckCircle2 size={17} className="text-green-600" /><h2 className="font-display text-sm font-900 text-navy-950">Foundation added</h2></div>
            <div className="mt-3 flex flex-wrap gap-1.5"><StatusBadge>SKU governance</StatusBadge><StatusBadge>Validation</StatusBadge><StatusBadge>Drafts</StatusBadge><StatusBadge>Logs</StatusBadge><StatusBadge>HTML builder</StatusBadge><StatusBadge>Approval jobs</StatusBadge></div>
          </section>
        </aside>
      </section>
    </div>
  );
}
