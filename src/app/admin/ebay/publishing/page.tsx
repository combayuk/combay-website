"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileCode2, PackageCheck, PlayCircle, Plus, RefreshCw, Save, Wrench } from "lucide-react";

type Option = { id?: string; value?: string; name?: string; label?: string; isDefault?: boolean; raw?: any };

type SettingsPayload = {
  schemaReady?: boolean;
  schemaMessage?: string;
  config?: any;
  templates?: any[];
  locations?: any[];
  logs?: any[];
  jobs?: any[];
  options?: {
    marketplaceOptions?: Option[];
    listingDurationOptions?: Option[];
    paymentPolicies?: Option[];
    returnPolicies?: Option[];
    fulfillmentPolicies?: Option[];
    inventoryLocations?: Option[];
    fetchedFromEbay?: boolean;
    fetchMessage?: string;
  };
};

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

const FALLBACK_DURATIONS = [
  { value: "GTC", label: "Good 'Til Cancelled" },
  { value: "DAYS_30", label: "30 days" },
  { value: "DAYS_10", label: "10 days" },
  { value: "DAYS_7", label: "7 days" },
  { value: "DAYS_5", label: "5 days" },
  { value: "DAYS_3", label: "3 days" },
];

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

function SelectField({ label, value, onChange, options, placeholder = "Select option", disabled = false }: { label: string; value: string; onChange: (value: string) => void; options: Option[]; placeholder?: string; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select value={value || ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="input py-2 text-sm">
        <option value="">{placeholder}</option>
        {options.map((option) => {
          const optionValue = String(option.value || option.id || "");
          return <option key={optionValue} value={optionValue}>{option.label || option.name || optionValue}{option.isDefault ? " — default" : ""}</option>;
        })}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange, disabled = false, help }: { label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; help?: string }) {
  return (
    <label className={`flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 ${disabled ? "opacity-60" : ""}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300" />
      <span><span className="block text-xs font-900 text-navy-950">{label}</span>{help && <span className="mt-0.5 block text-[11px] leading-4 text-gray-500">{help}</span>}</span>
    </label>
  );
}

const blankTemplate = {
  name: "",
  description: "",
  html: `<div style="font-family: Arial, sans-serif; font-size: 14px; color: #222; line-height: 1.5; max-width: 900px; margin: 0 auto; border: 1px solid #e5e7eb; background: #ffffff;">
  <div style="background: #2D4F7A; padding: 18px 22px; color: #ffffff;">
    <h1 style="margin: 0; font-size: 22px; line-height: 1.3;">{{productTitle}}</h1>
    <p style="margin: 6px 0 0; color: #f4f4f4;">Industrial equipment supplied by Combay Limited</p>
  </div>
  <div style="height: 4px; background: #E8A44A;"></div>
  <div style="padding: 22px;">
    <h2 style="color: #2D4F7A; font-size: 18px; margin-top: 0;">Product Overview</h2>
    <p>{{overview}}</p>
    <h2 style="color: #2D4F7A; font-size: 18px;">Key Details</h2>
    {{keyDetailsTable}}
    <h2 style="color: #2D4F7A; font-size: 18px;">Description</h2>
    <p>{{description}}</p>
    <h2 style="color: #2D4F7A; font-size: 18px;">Technical Specifications</h2>
    {{specificationsTable}}
    <h2 style="color: #2D4F7A; font-size: 18px;">Condition & Testing</h2>
    <p>{{conditionDescription}}</p>
    <h2 style="color: #2D4F7A; font-size: 18px;">Shipping & Returns</h2>
    <p>{{shippingSummary}}</p>
  </div>
</div>`,
  isDefault: false,
};

function normaliseUkPostcodeForDisplay(value?: string) {
  const compact = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").trim();
  if (!compact || compact.length <= 3) return compact;
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

function locationDetails(payload: SettingsPayload, key?: string) {
  const locations = payload.locations || [];
  const options = payload.options?.inventoryLocations || [];
  const local = locations.find((item: any) => item.key === key) || null;
  const option = options.find((item: any) => (item.id || item.value) === key) || null;
  const rawAddress = option?.raw?.location?.address || option?.raw?.address || {};
  return {
    name: local?.name || option?.name || "Combay UK dispatch location",
    postcode: local?.postcode || rawAddress?.postalCode || "",
    city: local?.city || rawAddress?.city || "Chelmsford",
    countryCode: local?.countryCode || rawAddress?.country || "GB",
    addressLine1: local?.addressLine1 || rawAddress?.addressLine1 || "",
  };
}

export default function EbayPublishingPage() {
  const [payload, setPayload] = useState<SettingsPayload>({});
  const [form, setForm] = useState<any>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [processingJob, setProcessingJob] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState<any>(blankTemplate);
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/ebay/publishing/settings", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (result.ok) {
      setPayload(result);
      const config = result.config || {};
      const options = result.options || {};
      const defaultLocationKey = config.defaultInventoryLocationKey || options.inventoryLocations?.find((item: any) => item.isDefault)?.id || options.inventoryLocations?.[0]?.id || result.locations?.[0]?.key || "";
      const location = locationDetails(result, defaultLocationKey);
      setForm({
        marketplaceId: config.marketplaceId || "EBAY_GB",
        defaultInventoryLocationKey: defaultLocationKey,
        inventoryLocationName: location.name,
        inventoryLocationPostcode: normaliseUkPostcodeForDisplay(location.postcode),
        inventoryLocationCity: location.city,
        inventoryLocationCountryCode: location.countryCode,
        inventoryLocationAddressLine1: location.addressLine1,
        defaultPaymentPolicyId: config.defaultPaymentPolicyId || options.paymentPolicies?.find((item: any) => item.isDefault)?.id || options.paymentPolicies?.[0]?.id || "",
        defaultReturnPolicyId: config.defaultReturnPolicyId || options.returnPolicies?.find((item: any) => item.isDefault)?.id || options.returnPolicies?.[0]?.id || "",
        defaultFulfillmentPolicyId: config.defaultFulfillmentPolicyId || options.fulfillmentPolicies?.find((item: any) => item.isDefault)?.id || options.fulfillmentPolicies?.[0]?.id || "",
        defaultListingDuration: config.defaultListingDuration || "GTC",
        defaultSkuPrefix: config.defaultSkuPrefix || "CBUK",
        defaultDescriptionTemplateId: config.defaultDescriptionTemplateId || result.templates?.find((template: any) => template.isDefault)?.id || result.templates?.[0]?.id || "",
        autoGenerateSku: config.autoGenerateSku !== false,
        autoPublishToEbay: Boolean(config.autoPublishToEbay),
        manualApprovalBeforePublish: config.manualApprovalBeforePublish !== false,
      });
      if (result.schemaReady === false) setMessage(result.schemaMessage || "Database update required before eBay publishing can be used.");
      else setMessage(result.options?.fetchMessage || "");
    } else setMessage(result.error || "Could not load eBay publishing settings.");
    setLoading(false);
  }

  useEffect(() => { load().catch(() => { setMessage("Could not load eBay publishing settings."); setLoading(false); }); }, []);

  const options = payload.options || {};
  const schemaReady = payload.schemaReady !== false;
  const marketplaceOptions = options.marketplaceOptions?.length ? options.marketplaceOptions : FALLBACK_MARKETPLACES;
  const durationOptions = options.listingDurationOptions?.length ? options.listingDurationOptions : FALLBACK_DURATIONS;
  const inventoryOptions = options.inventoryLocations || [];
  const paymentOptions = options.paymentPolicies || [];
  const returnOptions = options.returnPolicies || [];
  const fulfillmentOptions = options.fulfillmentPolicies || [];

  const stats = useMemo(() => {
    const logs = payload.logs ?? [];
    const jobs = payload.jobs ?? [];
    return {
      templates: payload.templates?.length ?? 0,
      locations: inventoryOptions.length,
      payment: paymentOptions.length,
      returns: returnOptions.length,
      fulfillment: fulfillmentOptions.length,
      failedLogs: logs.filter((log: any) => String(log.status).includes("FAILED")).length,
      pendingJobs: jobs.filter((job: any) => ["QUEUED", "AWAITING_MANUAL_APPROVAL"].includes(String(job.status))).length,
    };
  }, [payload, inventoryOptions.length, paymentOptions.length, returnOptions.length, fulfillmentOptions.length]);

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
    await load();
    setMessage("eBay publishing defaults saved.");
  }

  async function createTemplate() {
    if (!templateForm.name?.trim()) { setMessage("Template name is required."); return; }
    setCreatingTemplate(true);
    setMessage("");
    const response = await fetch("/api/admin/ebay/publishing/template", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(templateForm) });
    const result = await response.json().catch(() => ({}));
    setCreatingTemplate(false);
    if (!result.ok) { setMessage(result.error || "Could not create template."); return; }
    setTemplateOpen(false);
    setTemplateForm(blankTemplate);
    await load();
    setMessage("New eBay HTML template saved.");
  }


  async function processApprovedJob() {
    const confirmed = window.confirm("This will process the next approved eBay publish job and may create or update a live eBay listing. Continue only after the product has been reviewed.");
    if (!confirmed) return;
    setProcessingJob(true);
    setMessage("Processing next approved eBay publish job…");
    const response = await fetch("/api/admin/ebay/publishing/jobs/process", { method: "POST" });
    const result = await response.json().catch(() => ({}));
    setProcessingJob(false);
    if (!result.ok) {
      setMessage(result.error || "Could not process approved eBay publish job.");
      return;
    }
    setMessage(result.processed ? `Processed eBay publish job. Listing ID: ${result.result?.data?.listingId || result.result?.listingId || "see logs"}.` : result.message || "No approved jobs waiting.");
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
            <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500">Combay is the master inventory system. Configure eBay marketplace, policy defaults, inventory location, HTML templates, validation and approval workflow before enabling live publishing.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={load} className="btn-secondary text-xs py-2"><RefreshCw size={14} /> Refresh / fetch eBay options</button>
            <button onClick={processApprovedJob} disabled={processingJob || !schemaReady || stats.pendingJobs < 1} className="btn-secondary text-xs py-2"><PlayCircle size={14} /> {processingJob ? "Processing…" : "Process approved publish job"}</button>
            <button onClick={save} disabled={saving || !schemaReady} className="btn-primary text-xs py-2"><Save size={14} /> {saving ? "Saving…" : "Save settings"}</button>
          </div>
        </div>
      </section>

      {message && <div className={`rounded-xl border px-4 py-2 text-sm font-700 ${schemaReady ? "border-blue-200 bg-blue-50 text-blue-900" : "border-red-200 bg-red-50 text-red-900"}`}>{message}</div>}

      {!schemaReady && <section className="rounded-xl border border-red-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 text-red-600" size={18} /><div><h2 className="font-display text-base font-900 text-red-900">Database schema update required</h2><p className="mt-1 text-sm leading-6 text-red-800">The page is protected from crashing, but the eBay publishing tables are not available in the active database yet. Run the Prisma generate and db push commands below against the same DATABASE_URL used by Vercel, then redeploy.</p><pre className="mt-3 overflow-x-auto rounded-lg bg-red-950 p-3 text-xs text-red-50">npm install{`\n`}npx --yes prisma@5.22.0 generate{`\n`}npx --yes prisma@5.22.0 db push</pre></div></div>
      </section>}

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[11px] font-900 uppercase text-gray-400">Templates</p><p className="mt-1 text-xl font-900 text-navy-950">{stats.templates}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[11px] font-900 uppercase text-gray-400">Locations</p><p className="mt-1 text-xl font-900 text-navy-950">{stats.locations}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[11px] font-900 uppercase text-gray-400">Payment policies</p><p className="mt-1 text-xl font-900 text-navy-950">{stats.payment}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[11px] font-900 uppercase text-gray-400">Return policies</p><p className="mt-1 text-xl font-900 text-navy-950">{stats.returns}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[11px] font-900 uppercase text-gray-400">Fulfilment</p><p className="mt-1 text-xl font-900 text-navy-950">{stats.fulfillment}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[11px] font-900 uppercase text-gray-400">Approval jobs</p><p className="mt-1 text-xl font-900 text-navy-950">{stats.pendingJobs}</p></div>
      </section>

      <section className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div><h2 className="font-display text-lg font-900 text-navy-950">Default publishing settings</h2><p className="mt-1 text-xs text-gray-500">Dropdowns are used for controlled fields. Policy and location options are pulled from the connected eBay account where possible and saved locally.</p></div>
              <div className="flex flex-wrap gap-1.5"><StatusBadge tone="blue">{form.marketplaceId || "EBAY_GB"}</StatusBadge><StatusBadge tone={options.fetchedFromEbay ? "green" : "amber"}>{options.fetchedFromEbay ? "eBay options fetched" : "local/fallback options"}</StatusBadge></div>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <SelectField label="Marketplace" value={form.marketplaceId || ""} onChange={(value) => setForm((c: any) => ({ ...c, marketplaceId: value }))} options={marketplaceOptions} disabled={!schemaReady} />
              <label className="block"><span className="label">SKU prefix</span><input value={form.defaultSkuPrefix || ""} disabled={!schemaReady} onChange={(e) => setForm((c: any) => ({ ...c, defaultSkuPrefix: e.target.value }))} className="input py-2 text-sm font-mono" /></label>
              <SelectField label="Listing duration" value={form.defaultListingDuration || ""} onChange={(value) => setForm((c: any) => ({ ...c, defaultListingDuration: value }))} options={durationOptions} disabled={!schemaReady} />
              <SelectField label="Inventory location" value={form.defaultInventoryLocationKey || ""} onChange={(value) => {
                const details = locationDetails(payload, value);
                setForm((c: any) => ({
                  ...c,
                  defaultInventoryLocationKey: value,
                  inventoryLocationName: details.name,
                  inventoryLocationPostcode: normaliseUkPostcodeForDisplay(details.postcode),
                  inventoryLocationCity: details.city,
                  inventoryLocationCountryCode: details.countryCode,
                  inventoryLocationAddressLine1: details.addressLine1,
                }));
              }} options={inventoryOptions} placeholder="No eBay inventory location found" disabled={!schemaReady} />
              <SelectField label="Payment policy" value={form.defaultPaymentPolicyId || ""} onChange={(value) => setForm((c: any) => ({ ...c, defaultPaymentPolicyId: value }))} options={paymentOptions} placeholder="Fetch/select payment policy" disabled={!schemaReady} />
              <SelectField label="Return policy" value={form.defaultReturnPolicyId || ""} onChange={(value) => setForm((c: any) => ({ ...c, defaultReturnPolicyId: value }))} options={returnOptions} placeholder="Fetch/select return policy" disabled={!schemaReady} />
              <SelectField label="Fulfilment policy" value={form.defaultFulfillmentPolicyId || ""} onChange={(value) => setForm((c: any) => ({ ...c, defaultFulfillmentPolicyId: value }))} options={fulfillmentOptions} placeholder="Fetch/select fulfilment policy" disabled={!schemaReady} />
              <div className="lg:col-span-2 flex items-end gap-2">
                <div className="flex-1"><SelectField label="Default eBay HTML template" value={form.defaultDescriptionTemplateId || ""} onChange={(value) => setForm((c: any) => ({ ...c, defaultDescriptionTemplateId: value }))} options={(payload.templates ?? []).map((template: any) => ({ id: template.id, name: template.name, isDefault: template.isDefault }))} placeholder="System default" disabled={!schemaReady} /></div>
                <button type="button" onClick={() => setTemplateOpen((value) => !value)} disabled={!schemaReady} className="btn-secondary mb-0.5 whitespace-nowrap py-2 text-xs"><Plus size={14} /> New template</button>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
              <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-display text-sm font-900 text-navy-950">Default inventory location details</h3>
                  <p className="mt-1 text-xs leading-5 text-amber-900">eBay UK requires a full postcode for the Inventory API location before a listing can be published. Do not use only the outward code such as CM17.</p>
                </div>
                <StatusBadge tone="amber">Required before live publish</StatusBadge>
              </div>
              <div className="grid gap-3 lg:grid-cols-4">
                <label className="block lg:col-span-2"><span className="label">Location name</span><input value={form.inventoryLocationName || ""} disabled={!schemaReady} onChange={(e) => setForm((c: any) => ({ ...c, inventoryLocationName: e.target.value }))} className="input py-2 text-sm" placeholder="Combay UK dispatch location" /></label>
                <label className="block"><span className="label">Full UK postcode</span><input value={form.inventoryLocationPostcode || ""} disabled={!schemaReady} onBlur={(e) => setForm((c: any) => ({ ...c, inventoryLocationPostcode: normaliseUkPostcodeForDisplay(e.target.value) }))} onChange={(e) => setForm((c: any) => ({ ...c, inventoryLocationPostcode: e.target.value }))} className="input py-2 text-sm font-mono" placeholder="e.g. CM17 9AA" /></label>
                <label className="block"><span className="label">Country</span><select value={form.inventoryLocationCountryCode || "GB"} disabled={!schemaReady} onChange={(e) => setForm((c: any) => ({ ...c, inventoryLocationCountryCode: e.target.value }))} className="input py-2 text-sm"><option value="GB">United Kingdom (GB)</option><option value="IE">Ireland (IE)</option><option value="US">United States (US)</option><option value="DE">Germany (DE)</option><option value="FR">France (FR)</option></select></label>
                <label className="block lg:col-span-2"><span className="label">Address line 1 <span className="font-500 text-gray-400">optional</span></span><input value={form.inventoryLocationAddressLine1 || ""} disabled={!schemaReady} onChange={(e) => setForm((c: any) => ({ ...c, inventoryLocationAddressLine1: e.target.value }))} className="input py-2 text-sm" placeholder="Warehouse/unit address if you want to store it" /></label>
                <label className="block lg:col-span-2"><span className="label">Town / city</span><input value={form.inventoryLocationCity || ""} disabled={!schemaReady} onChange={(e) => setForm((c: any) => ({ ...c, inventoryLocationCity: e.target.value }))} className="input py-2 text-sm" placeholder="Chelmsford" /></label>
              </div>
            </div>

            <div className="mt-4 grid gap-2 lg:grid-cols-3">
              <Toggle label="Auto-generate Combay SKU" checked={form.autoGenerateSku !== false} disabled={!schemaReady} onChange={(checked) => setForm((c: any) => ({ ...c, autoGenerateSku: checked }))} help="Required for controlled Combay → eBay publishing." />
              <Toggle label="Manual approval before publish" checked={form.manualApprovalBeforePublish !== false} disabled={!schemaReady} onChange={(checked) => setForm((c: any) => ({ ...c, manualApprovalBeforePublish: checked }))} help="Recommended. Prevents accidental live listings." />
              <Toggle label="Auto-publish to eBay" checked={Boolean(form.autoPublishToEbay)} disabled={!schemaReady} onChange={(checked) => setForm((c: any) => ({ ...c, autoPublishToEbay: checked }))} help="Keep off until publish worker is fully validated." />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <p className="text-xs text-gray-500">Settings save into the eBay sync configuration and are reused by the product eBay Listing tab.</p>
              <button onClick={save} disabled={saving || !schemaReady} className="btn-primary text-xs py-2"><Save size={14} /> {saving ? "Saving…" : "Save settings"}</button>
            </div>
          </div>

          {templateOpen && <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="font-display text-lg font-900 text-navy-950">Create eBay HTML template</h2><p className="mt-1 text-xs text-gray-500">Use eBay-safe inline HTML only. Tokens such as {"{{productTitle}}"}, {"{{sku}}"}, {"{{overview}}"}, {"{{specificationsTable}}"} and {"{{shippingSummary}}"} are supported.</p></div><button type="button" onClick={() => setTemplateOpen(false)} className="btn-secondary py-2 text-xs">Cancel</button></div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block"><span className="label">Template name</span><input value={templateForm.name} onChange={(e) => setTemplateForm((c: any) => ({ ...c, name: e.target.value }))} className="input py-2 text-sm" /></label>
              <label className="flex items-center gap-2 pt-6 text-xs font-900 text-navy-950"><input type="checkbox" checked={Boolean(templateForm.isDefault)} onChange={(e) => setTemplateForm((c: any) => ({ ...c, isDefault: e.target.checked }))} /> Set as default</label>
              <label className="block md:col-span-2"><span className="label">Description</span><input value={templateForm.description} onChange={(e) => setTemplateForm((c: any) => ({ ...c, description: e.target.value }))} className="input py-2 text-sm" /></label>
              <label className="block md:col-span-2"><span className="label">HTML</span><textarea value={templateForm.html} onChange={(e) => setTemplateForm((c: any) => ({ ...c, html: e.target.value }))} className="input min-h-[260px] py-2 font-mono text-xs" /></label>
            </div>
            <div className="mt-3 flex justify-end"><button onClick={createTemplate} disabled={creatingTemplate} className="btn-primary py-2 text-xs"><Save size={14} /> {creatingTemplate ? "Saving…" : "Save template"}</button></div>
          </div>}

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-display text-lg font-900 text-navy-950">Recent publishing logs</h2><p className="mt-1 text-xs text-gray-500">Validation, draft, repair and future publish events are recorded here.</p></div><button onClick={repairImported} disabled={repairing || !schemaReady} className="btn-secondary text-xs py-2"><Wrench size={14} /> {repairing ? "Repairing…" : "Repair imported eBay listings"}</button></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-gray-500"><tr><th className="px-3 py-2">SKU</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Message</th><th className="px-3 py-2">Date</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{(payload.logs ?? []).map((log: any) => <tr key={log.id}><td className="px-3 py-2 font-mono text-[11px] text-navy-950">{log.sku || "—"}</td><td className="px-3 py-2 font-800 text-gray-700">{log.actionType}</td><td className="px-3 py-2"><StatusBadge tone={String(log.status).includes("FAILED") ? "red" : String(log.status).includes("SUCCESS") ? "green" : "amber"}>{log.status}</StatusBadge></td><td className="max-w-[360px] truncate px-3 py-2 text-gray-500">{log.errorMessage || log.message || "—"}</td><td className="px-3 py-2 whitespace-nowrap text-gray-400">{log.startedAt ? new Date(log.startedAt).toLocaleString("en-GB") : "—"}</td></tr>)}{!(payload.logs ?? []).length && <tr><td colSpan={5} className="px-3 py-5 text-center text-gray-500">No publishing logs yet.</td></tr>}</tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2"><PackageCheck size={18} className="text-accent" /><h2 className="font-display text-lg font-900 text-navy-950">Product workflow</h2></div>
            <ol className="mt-3 space-y-2 text-xs leading-5 text-gray-600">
              <li>1. Open a product in <Link href="/admin/products" className="font-900 text-navy-950 underline">Products</Link>.</li>
              <li>2. Use the <strong>eBay Listing</strong> tab.</li>
              <li>3. Fill category, policies and mapping fields.</li>
              <li>4. Generate the branded eBay description.</li>
              <li>5. Validate and save local eBay draft.</li>
              <li>6. Queue for approval or explicitly publish/update live once validation passes.</li>
            </ol>
          </section>

          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-amber-900"><AlertTriangle size={17} /><h2 className="font-display text-sm font-900">Policy fetch note</h2></div>
            <p className="mt-2 text-xs leading-5 text-amber-900">Payment, return and fulfilment policy dropdowns are fetched from the connected eBay seller account. If they are empty, refresh after confirming eBay OAuth is connected and the token has Sell Account API scope.</p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2"><FileCode2 size={17} className="text-accent" /><h2 className="font-display text-sm font-900 text-navy-950">Templates</h2></div>
            <div className="mt-3 space-y-2">{(payload.templates ?? []).map((template: any) => <div key={template.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-900 text-navy-950">{template.name}</p>{template.isDefault && <StatusBadge tone="green">Default</StatusBadge>}</div><p className="mt-1 truncate text-[11px] text-gray-500">{template.description || "Combay eBay-safe HTML template"}</p></div>)}{!(payload.templates ?? []).length && <p className="rounded-lg border border-dashed border-slate-200 p-3 text-xs text-gray-500">Templates will appear after the database schema is updated.</p>}</div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2"><CheckCircle2 size={17} className="text-green-600" /><h2 className="font-display text-sm font-900 text-navy-950">Foundation status</h2></div>
            <div className="mt-3 flex flex-wrap gap-1.5"><StatusBadge>SKU governance</StatusBadge><StatusBadge>Validation</StatusBadge><StatusBadge>Drafts</StatusBadge><StatusBadge>Logs</StatusBadge><StatusBadge>HTML builder</StatusBadge><StatusBadge>Policy dropdowns</StatusBadge><StatusBadge tone="green">Live single-product publish</StatusBadge></div>
          </section>
        </aside>
      </section>
    </div>
  );
}
