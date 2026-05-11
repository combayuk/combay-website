"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Eye, FileCode2, RefreshCw, Save, ShieldCheck, UploadCloud } from "lucide-react";

type Props = { productId?: string; currentSku?: string; title?: string };

type SelectOption = { id?: string; value?: string; name?: string; label?: string; isDefault?: boolean };

const FALLBACK_MARKETPLACES = [
  { value: "EBAY_GB", label: "United Kingdom (EBAY_GB)" },
  { value: "EBAY_US", label: "United States (EBAY_US)" },
  { value: "EBAY_IE", label: "Ireland (EBAY_IE)" },
  { value: "EBAY_DE", label: "Germany (EBAY_DE)" },
  { value: "EBAY_FR", label: "France (EBAY_FR)" },
  { value: "EBAY_IT", label: "Italy (EBAY_IT)" },
  { value: "EBAY_ES", label: "Spain (EBAY_ES)" },
  { value: "EBAY_AU", label: "Australia (EBAY_AU)" },
  { value: "EBAY_CA", label: "Canada (EBAY_CA)" },
];

type State = {
  product?: any;
  config?: any;
  templates?: any[];
  locations?: any[];
  logs?: any[];
  jobs?: any[];
  validation?: { valid: boolean; errors: string[]; warnings: string[] };
  options?: { marketplaceOptions?: SelectOption[]; paymentPolicies?: SelectOption[]; returnPolicies?: SelectOption[]; fulfillmentPolicies?: SelectOption[]; inventoryLocations?: SelectOption[] };
};

function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "green" | "amber" | "red" | "blue" }) {
  const classes = {
    slate: "bg-slate-50 text-slate-700 border-slate-200",
    green: "bg-green-50 text-green-700 border-green-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  }[tone];
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-900 whitespace-nowrap ${classes}`}>{children}</span>;
}


function SelectField({ label, value, onChange, options, placeholder = "Select option" }: { label: string; value: string; onChange: (value: string) => void; options: SelectOption[]; placeholder?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select value={value || ""} onChange={(e) => onChange(e.target.value)} className="input py-2 text-sm">
        <option value="">{placeholder}</option>
        {options.map((option) => {
          const optionValue = String(option.value || option.id || "");
          return <option key={optionValue} value={optionValue}>{option.label || option.name || optionValue}{option.isDefault ? " — default" : ""}</option>;
        })}
      </select>
    </label>
  );
}

function stringifySpecifics(value: any) {
  if (!value) return "";
  if (typeof value === "string") return value;
  try { return JSON.stringify(value, null, 2); } catch { return ""; }
}

function parseSpecifics(value: string) {
  if (!value.trim()) return null;
  try { return JSON.parse(value); } catch { return { _raw: value }; }
}

export default function EbayProductPublishingPanel({ productId, currentSku, title }: Props) {
  const [state, setState] = useState<State>({});
  const [form, setForm] = useState<any>({});
  const [specificsText, setSpecificsText] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  const canLoad = Boolean(productId && !String(productId).startsWith("prod-cbuk"));

  async function load() {
    if (!productId) return;
    setBusy("load");
    const response = await fetch(`/api/admin/ebay/publishing/product/${encodeURIComponent(productId)}`, { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    setBusy(null);
    if (!result.ok) {
      setMessage(result.error || "Could not load eBay publishing state. Save the product to the database first.");
      return;
    }
    setState(result);
    const product = result.product || {};
    const options = result.options || {};
    const nextForm = {
      ebayMarketplaceId: product.ebayMarketplaceId || result.config?.marketplaceId || "EBAY_GB",
      ebayCategoryId: product.ebayCategoryId || "",
      ebayCategoryName: product.ebayCategoryName || "",
      ebayListingId: product.ebayListingId || product.ebayItemId || "",
      ebayOfferId: product.ebayOfferId || "",
      ebayInventoryItemSku: product.ebayInventoryItemSku || product.sku || currentSku || "",
      ebayFulfillmentPolicyId: product.ebayFulfillmentPolicyId || result.config?.defaultFulfillmentPolicyId || product.shippingPolicy?.ebayFulfillmentPolicyId || options.fulfillmentPolicies?.find((item: any) => item.isDefault)?.id || options.fulfillmentPolicies?.[0]?.id || "",
      ebayPaymentPolicyId: product.ebayPaymentPolicyId || result.config?.defaultPaymentPolicyId || options.paymentPolicies?.find((item: any) => item.isDefault)?.id || options.paymentPolicies?.[0]?.id || "",
      ebayReturnPolicyId: product.ebayReturnPolicyId || result.config?.defaultReturnPolicyId || options.returnPolicies?.find((item: any) => item.isDefault)?.id || options.returnPolicies?.[0]?.id || "",
      ebayInventoryLocationKey: product.ebayInventoryLocationKey || result.config?.defaultInventoryLocationKey || options.inventoryLocations?.find((item: any) => item.isDefault)?.id || options.inventoryLocations?.[0]?.id || "",
      ebayDescriptionTemplateId: product.ebayDescriptionTemplateId || result.config?.defaultDescriptionTemplateId || result.templates?.find((template: any) => template.isDefault)?.id || "",
      ebayDescriptionHtml: product.ebayDescriptionHtml || "",
      ebaySourceOfTruth: product.ebaySourceOfTruth || "COMBAY",
      ebayExcludedFromSync: Boolean(product.ebayExcludedFromSync || product.syncExcluded),
      ebayPublishStatus: product.ebayPublishStatus || "NOT_LISTED",
    };
    setForm(nextForm);
    setSpecificsText(stringifySpecifics(product.ebaySpecificsJson));
  }

  useEffect(() => { load().catch(() => setMessage("Could not load eBay publishing state.")); }, [productId]);

  const validation = state.validation || state.product?.ebayValidationErrorsJson || { valid: false, errors: [], warnings: [] };
  const ready = Boolean(validation.valid);
  const optionState = state.options || {};
  const marketplaceOptions = optionState.marketplaceOptions?.length ? optionState.marketplaceOptions : FALLBACK_MARKETPLACES;
  const inventoryOptions = optionState.inventoryLocations || [];
  const paymentOptions = optionState.paymentPolicies || [];
  const returnOptions = optionState.returnPolicies || [];
  const fulfillmentOptions = optionState.fulfillmentPolicies || [];

  const recentJobs = useMemo(() => state.jobs || [], [state.jobs]);

  async function post(action: string, payload: any = {}) {
    if (!productId) return;
    setBusy(action);
    setMessage("");
    const response = await fetch(`/api/admin/ebay/publishing/product/${encodeURIComponent(productId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const result = await response.json().catch(() => ({}));
    setBusy(null);
    if (!result.ok) {
      setMessage(result.error || "eBay publishing action failed.");
      return;
    }
    if (action === "generate-description") setMessage("Branded eBay description generated. Review, validate and save the local eBay draft.");
    else if (action === "validate") setMessage(result.validation?.valid ? "Validation passed. You can queue for manual publish approval." : "Validation completed with issues. Resolve the listed errors before queueing.");
    else if (action === "queue-review") setMessage("Product queued for manual eBay publish approval. No live listing has been changed yet.");
    else setMessage("Local eBay draft saved.");
    await load();
  }

  function saveDraft() {
    post("save", {
      product: {
        ...form,
        ebaySpecificsJson: parseSpecifics(specificsText),
        ebayDescriptionHtml: form.ebayDescriptionHtml || "",
      },
    });
  }

  if (!productId) {
    return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Save the product first, then reopen it to prepare the eBay listing.</div>;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-widest text-gray-400">eBay Listing</p>
            <h2 className="truncate font-display text-xl font-900 text-navy-950">{title || state.product?.title || "Product eBay draft"}</h2>
            <p className="mt-1 text-xs text-gray-500">SKU: <span className="font-mono text-accent">{state.product?.sku || currentSku || "—"}</span> · Marketplace: {form.ebayMarketplaceId || "EBAY_GB"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={load} className="btn-secondary text-xs py-2"><RefreshCw size={14} /> Refresh</button>
            <Link href="/admin/ebay/publishing" className="btn-secondary text-xs py-2">Publishing settings</Link>
          </div>
        </div>
        {message && <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-800 text-amber-900">{message}</div>}
      </section>

      <section className="grid gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[10px] font-900 uppercase text-gray-400">Status</p><p className="mt-1 truncate text-sm font-900 text-navy-950">{state.product?.ebayPublishStatus || "NOT_LISTED"}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[10px] font-900 uppercase text-gray-400">Listing ID</p><p className="mt-1 truncate text-sm font-900 text-navy-950">{form.ebayListingId || "—"}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[10px] font-900 uppercase text-gray-400">Offer ID</p><p className="mt-1 truncate text-sm font-900 text-navy-950">{form.ebayOfferId || "—"}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[10px] font-900 uppercase text-gray-400">Validation</p><p className={`mt-1 text-sm font-900 ${ready ? "text-green-700" : "text-amber-700"}`}>{ready ? "Ready" : "Needs review"}</p></div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><h3 className="font-display text-lg font-900 text-navy-950">Listing mapping</h3><p className="mt-1 text-xs text-gray-500">Local eBay draft fields. These are saved to the product and used by the publish worker later.</p></div>{form.ebayExcludedFromSync && <Badge tone="red">Excluded from eBay</Badge>}</div>
        <div className="grid gap-3 lg:grid-cols-3">
          <SelectField label="Marketplace" value={form.ebayMarketplaceId || ""} onChange={(value) => setForm((c: any) => ({ ...c, ebayMarketplaceId: value }))} options={marketplaceOptions} />
          <label className="block"><span className="label">eBay SKU</span><input value={form.ebayInventoryItemSku || ""} onChange={(e) => setForm((c: any) => ({ ...c, ebayInventoryItemSku: e.target.value }))} className="input py-2 text-sm font-mono" /></label>
          <label className="block"><span className="label">Source of truth</span><select value={form.ebaySourceOfTruth || "COMBAY"} onChange={(e) => setForm((c: any) => ({ ...c, ebaySourceOfTruth: e.target.value }))} className="input py-2 text-sm"><option value="COMBAY">Combay controls listing</option><option value="EBAY">eBay controls listing</option><option value="MANUAL_REVIEW">Manual review</option></select></label>
          <label className="block"><span className="label">eBay category ID</span><input value={form.ebayCategoryId || ""} onChange={(e) => setForm((c: any) => ({ ...c, ebayCategoryId: e.target.value }))} className="input py-2 text-sm" placeholder="e.g. 181730" /></label>
          <label className="block"><span className="label">eBay category name</span><input value={form.ebayCategoryName || ""} onChange={(e) => setForm((c: any) => ({ ...c, ebayCategoryName: e.target.value }))} className="input py-2 text-sm" /></label>
          <SelectField label="Inventory location" value={form.ebayInventoryLocationKey || ""} onChange={(value) => setForm((c: any) => ({ ...c, ebayInventoryLocationKey: value }))} options={inventoryOptions} placeholder="No inventory location found" />
          <SelectField label="Fulfilment policy" value={form.ebayFulfillmentPolicyId || ""} onChange={(value) => setForm((c: any) => ({ ...c, ebayFulfillmentPolicyId: value }))} options={fulfillmentOptions} placeholder="No fulfilment policy found" />
          <SelectField label="Payment policy" value={form.ebayPaymentPolicyId || ""} onChange={(value) => setForm((c: any) => ({ ...c, ebayPaymentPolicyId: value }))} options={paymentOptions} placeholder="No payment policy found" />
          <SelectField label="Return policy" value={form.ebayReturnPolicyId || ""} onChange={(value) => setForm((c: any) => ({ ...c, ebayReturnPolicyId: value }))} options={returnOptions} placeholder="No return policy found" />
          <label className="block"><span className="label">Listing ID</span><input value={form.ebayListingId || ""} onChange={(e) => setForm((c: any) => ({ ...c, ebayListingId: e.target.value }))} className="input py-2 text-sm" /></label>
          <label className="block"><span className="label">Offer ID</span><input value={form.ebayOfferId || ""} onChange={(e) => setForm((c: any) => ({ ...c, ebayOfferId: e.target.value }))} className="input py-2 text-sm" /></label>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-900 text-navy-950 self-end"><input type="checkbox" checked={Boolean(form.ebayExcludedFromSync)} onChange={(e) => setForm((c: any) => ({ ...c, ebayExcludedFromSync: e.target.checked }))} /> Exclude from eBay sync/publish</label>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><h3 className="font-display text-lg font-900 text-navy-950">Branded eBay description</h3><p className="mt-1 text-xs text-gray-500">eBay-safe HTML using Combay navy/gold branding. No scripts, forms or interactive content.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => post("generate-description", { templateId: form.ebayDescriptionTemplateId })} className="btn-secondary text-xs py-2"><FileCode2 size={14} /> Generate</button><button type="button" onClick={() => setPreview((v) => !v)} className="btn-secondary text-xs py-2"><Eye size={14} /> {preview ? "Hide preview" : "Preview"}</button></div></div>
        <label className="block"><span className="label">Template</span><select value={form.ebayDescriptionTemplateId || ""} onChange={(e) => setForm((c: any) => ({ ...c, ebayDescriptionTemplateId: e.target.value }))} className="input py-2 text-sm"><option value="">System default</option>{(state.templates ?? []).map((template: any) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
        <textarea value={form.ebayDescriptionHtml || ""} onChange={(e) => setForm((c: any) => ({ ...c, ebayDescriptionHtml: e.target.value }))} className="input mt-3 min-h-[180px] font-mono text-xs" placeholder="Generate or paste eBay-safe HTML description." />
        {preview && <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="max-h-[420px] overflow-auto rounded-lg bg-white p-3" dangerouslySetInnerHTML={{ __html: form.ebayDescriptionHtml || "<p>No description generated yet.</p>" }} /></div>}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block"><span className="label">eBay item specifics / aspects JSON</span><textarea value={specificsText} onChange={(e) => setSpecificsText(e.target.value)} className="input min-h-[130px] font-mono text-xs" placeholder={`{"Brand":["Siemens"],"MPN":["6ES7..."]}`} /></label>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between"><h3 className="font-display text-lg font-900 text-navy-950">Validation</h3>{ready ? <Badge tone="green"><CheckCircle2 size={12} className="mr-1" />Ready</Badge> : <Badge tone="amber"><AlertTriangle size={12} className="mr-1" />Needs review</Badge>}</div>
          <div className="space-y-2">
            {(validation.errors || []).map((error: string, index: number) => <div key={`e-${index}`} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>)}
            {(validation.warnings || []).map((warning: string, index: number) => <div key={`w-${index}`} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{warning}</div>)}
            {!(validation.errors || []).length && !(validation.warnings || []).length && <p className="text-sm text-gray-500">No validation messages yet.</p>}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="font-display text-lg font-900 text-navy-950">Recent jobs</h3>
          <div className="mt-3 space-y-2">{recentJobs.map((job: any) => <div key={job.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"><div className="flex items-center justify-between gap-2"><span className="font-900 text-navy-950">{job.action}</span><Badge tone={job.status === "AWAITING_MANUAL_APPROVAL" ? "amber" : "slate"}>{job.status}</Badge></div><p className="mt-1 text-gray-500">{job.queuedAt ? new Date(job.queuedAt).toLocaleString("en-GB") : "—"}</p></div>)}{!recentJobs.length && <p className="text-sm text-gray-500">No eBay publish jobs yet.</p>}</div>
        </div>
      </section>

      <div className="sticky bottom-4 z-20 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-xs text-gray-500"><span className="font-900 text-navy-950">Live publish safety:</span> this phase saves drafts, validates, generates HTML and queues review; it does not silently alter live eBay listings.</div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={saveDraft} disabled={Boolean(busy)} className="btn-secondary text-xs py-2"><Save size={14} /> Save eBay draft</button>
          <button type="button" onClick={() => post("validate")} disabled={Boolean(busy)} className="btn-secondary text-xs py-2"><ShieldCheck size={14} /> Validate</button>
          <button type="button" onClick={() => post("queue-review")} disabled={Boolean(busy) || !ready} className="btn-primary text-xs py-2"><UploadCloud size={14} /> Queue publish review</button>
        </div>
      </div>
    </div>
  );
}
