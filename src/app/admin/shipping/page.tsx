"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, Copy, Plus, RotateCcw, Save, Ship, Trash2, X } from "lucide-react";

type Zone = { id: string; name: string; countriesJson?: any; sortOrder?: number; isActive?: boolean };
type Rate = { id?: string; shippingZoneId?: string; zone?: Zone; cost?: number | string | null; dispatchMinDays?: number; dispatchMaxDays?: number; deliveryMinDays?: number | string | null; deliveryMaxDays?: number | string | null; manualQuoteRequired?: boolean; isActive?: boolean };
type Policy = {
  id?: string;
  name: string;
  description?: string | null;
  internalNote?: string | null;
  maxWeightKg?: number | string | null;
  maxLengthCm?: number | string | null;
  maxWidthCm?: number | string | null;
  maxHeightCm?: number | string | null;
  packagingType?: string | null;
  manualQuoteRequired?: boolean;
  collectionOnly?: boolean;
  internationalAllowed?: boolean;
  isDefault?: boolean;
  isActive?: boolean;
  adminOnlyNotes?: string | null;
  ebayFulfillmentPolicyId?: string | null;
  ebayMarketplaceId?: string | null;
  ebayDomesticShippingServiceCode?: string | null;
  ebayInternationalShippingServiceCode?: string | null;
  ebayHandlingTimeDays?: number | string | null;
  ebayCollectionOnly?: boolean;
  ebayFreightRequired?: boolean;
  ebayMappingStatus?: string | null;
  rates: Rate[];
};

type ResetPolicy = {
  name: string;
  description: string;
  maxWeightKg: number | null;
  packagingType: string;
  manualQuoteRequired?: boolean;
  rates: Array<{ zone: string; cost: number | null; deliveryMinDays: number | null; deliveryMaxDays: number | null; manualQuoteRequired?: boolean }>;
};

const DEFAULT_POLICY_RESETS: ResetPolicy[] = [
  { name: "Letter / Large Packing Bag", description: "Small components and light industrial spares packed in a reinforced letter, padded mailer or large packing bag.", maxWeightKg: 2, packagingType: "Letter / large packing bag", rates: [{ zone: "UK", cost: 2.99, deliveryMinDays: 2, deliveryMaxDays: 3 }, { zone: "Europe", cost: 11.99, deliveryMinDays: 3, deliveryMaxDays: 5 }, { zone: "Worldwide", cost: 19.99, deliveryMinDays: 6, deliveryMaxDays: 8 }] },
  { name: "Shoebox", description: "Small boxed automation, electrical and test accessories up to 5kg.", maxWeightKg: 5, packagingType: "Shoebox", rates: [{ zone: "UK", cost: 7.99, deliveryMinDays: 2, deliveryMaxDays: 3 }, { zone: "Europe", cost: 22.99, deliveryMinDays: 3, deliveryMaxDays: 5 }, { zone: "Worldwide", cost: 49.99, deliveryMinDays: 6, deliveryMaxDays: 8 }] },
  { name: "Medium Sized Box", description: "Medium parcel tier for industrial parts, modules and boxed units up to 15kg.", maxWeightKg: 15, packagingType: "Medium sized box", rates: [{ zone: "UK", cost: 19.99, deliveryMinDays: 2, deliveryMaxDays: 3 }, { zone: "Europe", cost: 49.99, deliveryMinDays: 3, deliveryMaxDays: 5 }, { zone: "Worldwide", cost: 89.99, deliveryMinDays: 6, deliveryMaxDays: 8 }] },
  { name: "Medium-Large Box", description: "Larger boxed equipment up to 25kg where reinforced packaging is normally required.", maxWeightKg: 25, packagingType: "Medium-large box", rates: [{ zone: "UK", cost: 25.99, deliveryMinDays: 2, deliveryMaxDays: 3 }, { zone: "Europe", cost: 67.99, deliveryMinDays: 3, deliveryMaxDays: 5 }, { zone: "Worldwide", cost: 119.99, deliveryMinDays: 6, deliveryMaxDays: 8 }] },
  { name: "Large Heavy Box", description: "Heavy boxed industrial stock up to 50kg. Use manual quote if packaging, export or tail-lift delivery is uncertain.", maxWeightKg: 50, packagingType: "Large heavy box", rates: [{ zone: "UK", cost: 49.99, deliveryMinDays: 2, deliveryMaxDays: 3 }, { zone: "Europe", cost: 139.99, deliveryMinDays: 3, deliveryMaxDays: 5 }, { zone: "Worldwide", cost: 279.99, deliveryMinDays: 6, deliveryMaxDays: 8 }] },
  { name: "Pallet", description: "Palletised freight for larger industrial equipment. Confirm access requirements before dispatch.", maxWeightKg: null, packagingType: "Pallet", rates: [{ zone: "UK", cost: 129.99, deliveryMinDays: 2, deliveryMaxDays: 3 }, { zone: "Europe", cost: 279.99, deliveryMinDays: 3, deliveryMaxDays: 5 }, { zone: "Worldwide", cost: 749.99, deliveryMinDays: 6, deliveryMaxDays: 8 }] },
  { name: "Heavy / Specialist Order", description: "Oversized, irregular, crated, freight, specialist handling or export-sensitive equipment. Manual shipping quote required.", maxWeightKg: null, packagingType: "Specialist / freight", manualQuoteRequired: true, rates: [{ zone: "UK", cost: null, deliveryMinDays: null, deliveryMaxDays: null, manualQuoteRequired: true }, { zone: "Europe", cost: null, deliveryMinDays: null, deliveryMaxDays: null, manualQuoteRequired: true }, { zone: "Worldwide", cost: null, deliveryMinDays: null, deliveryMaxDays: null, manualQuoteRequired: true }] },
];

const blankPolicy: Policy = {
  name: "",
  description: "",
  packagingType: "",
  maxWeightKg: "",
  manualQuoteRequired: false,
  collectionOnly: false,
  internationalAllowed: true,
  isActive: true,
  isDefault: false,
  ebayMarketplaceId: "EBAY_GB",
  ebayMappingStatus: "UNMAPPED",
  rates: [],
};

function money(value: unknown) {
  if (value === null || value === undefined || value === "") return "Quote";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(value));
}
function days(min?: number | null, max?: number | null) {
  if (!min && !max) return "Quote";
  return min === max || !max ? `${min || max} wd` : `${min}–${max} wd`;
}
function zoneName(rate: Rate) { return rate.zone?.name || "Zone"; }
function policyRate(policy: Policy, zone: string) { return policy.rates?.find((rate) => zoneName(rate) === zone); }
function clonePolicy(policy: Policy): Policy { return JSON.parse(JSON.stringify(policy)); }
function sortRates(rates: Rate[]) {
  const order = new Map([["UK", 1], ["Europe", 2], ["Worldwide", 3]]);
  return [...rates].sort((a, b) => (order.get(zoneName(a)) || 50) - (order.get(zoneName(b)) || 50));
}
function stable(policy: Policy) { return JSON.stringify(policy); }
function isNumericValue(value: unknown) { return value !== "" && value !== null && value !== undefined && Number.isFinite(Number(value)); }

export default function AdminShippingPoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Policy>(blankPolicy);
  const [originalDraft, setOriginalDraft] = useState<Policy>(blankPolicy);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "error" | "info" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");

  async function load(preferredId?: string | null) {
    setLoading(true);
    const response = await fetch("/api/admin/shipping/policies", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      setMessage({ text: data.error || "Could not load shipping policies.", tone: "error" });
      setLoading(false);
      return;
    }
    const nextPolicies: Policy[] = data.policies ?? [];
    setPolicies(nextPolicies);
    setZones(data.zones ?? []);
    const nextSelected = nextPolicies.find((policy) => policy.id === (preferredId || selectedId)) || nextPolicies[0] || null;
    if (nextSelected) {
      setSelectedId(nextSelected.id || null);
      const cloned = clonePolicy(nextSelected);
      setDraft(cloned);
      setOriginalDraft(cloned);
    }
    setLoading(false);
  }

  useEffect(() => { load().catch(() => setMessage({ text: "Could not load shipping policies.", tone: "error" })); }, []);

  const selected = useMemo(() => policies.find((policy) => policy.id === selectedId) ?? null, [policies, selectedId]);
  const activeCount = policies.filter((policy) => policy.isActive !== false).length;
  const defaultPolicy = policies.find((policy) => policy.isDefault);
  const dirty = stable(draft) !== stable(originalDraft);
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!draft.name.trim()) errors.push("Policy name is required.");
    if (!draft.rates.length) errors.push("Add at least one destination/rate row.");
    draft.rates.forEach((rate) => {
      const name = zoneName(rate);
      if (!rate.manualQuoteRequired && !isNumericValue(rate.cost)) errors.push(`${name} cost must be numeric unless manual quote is enabled.`);
      if (!rate.manualQuoteRequired && (!rate.deliveryMinDays || !rate.deliveryMaxDays)) errors.push(`${name} delivery time is required unless manual quote is enabled.`);
      if (!rate.dispatchMinDays || !rate.dispatchMaxDays) errors.push(`${name} dispatch time is required.`);
    });
    return errors;
  }, [draft]);

  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function canLeaveDirty() {
    return !dirty || window.confirm("You have unsaved shipping-policy changes. Discard them?");
  }

  function selectPolicy(policy: Policy) {
    if (!canLeaveDirty()) return;
    setSelectedId(policy.id || null);
    const cloned = clonePolicy(policy);
    setDraft(cloned);
    setOriginalDraft(cloned);
    setMessage(null);
  }

  function createNewPolicy() {
    if (!canLeaveDirty()) return;
    const rates = zones.map((zone) => ({ shippingZoneId: zone.id, zone, cost: "", dispatchMinDays: 2, dispatchMaxDays: 2, deliveryMinDays: zone.name === "UK" ? 2 : zone.name === "Europe" ? 3 : 6, deliveryMaxDays: zone.name === "UK" ? 3 : zone.name === "Europe" ? 5 : 8, manualQuoteRequired: false, isActive: true }));
    const next = { ...blankPolicy, rates };
    setSelectedId(null);
    setDraft(next);
    setOriginalDraft(next);
    setMessage({ text: "New policy started. Complete the details and save.", tone: "info" });
  }

  function duplicatePolicy() {
    const copy = clonePolicy(draft);
    delete copy.id;
    copy.name = `Copy of ${copy.name || "shipping policy"}`;
    copy.isDefault = false;
    copy.rates = copy.rates.map((rate) => ({ ...rate, id: undefined }));
    setSelectedId(null);
    setDraft(copy);
    setOriginalDraft(blankPolicy);
    setMessage({ text: "Policy duplicated. Review and save as a new policy.", tone: "info" });
  }

  function resetToDefault() {
    const preset = DEFAULT_POLICY_RESETS.find((item) => item.name === draft.name || item.name === selected?.name);
    if (!preset) return;
    if (!window.confirm(`Reset ${preset.name} values to the original Combay defaults? You still need to save after reset.`)) return;
    const nextRates = preset.rates.map((presetRate) => {
      const zone = zones.find((item) => item.name === presetRate.zone);
      const existing = draft.rates.find((rate) => zoneName(rate) === presetRate.zone);
      return {
        ...existing,
        id: existing?.id,
        shippingZoneId: zone?.id || existing?.shippingZoneId,
        zone: zone || existing?.zone,
        cost: presetRate.cost,
        dispatchMinDays: 2,
        dispatchMaxDays: 2,
        deliveryMinDays: presetRate.deliveryMinDays,
        deliveryMaxDays: presetRate.deliveryMaxDays,
        manualQuoteRequired: Boolean(preset.manualQuoteRequired || presetRate.manualQuoteRequired),
        isActive: true,
      };
    });
    setDraft((current) => ({
      ...current,
      description: preset.description,
      maxWeightKg: preset.maxWeightKg,
      packagingType: preset.packagingType,
      manualQuoteRequired: Boolean(preset.manualQuoteRequired),
      collectionOnly: false,
      rates: nextRates,
    }));
    setMessage({ text: "Default values restored in the editor. Save changes to apply them.", tone: "info" });
  }

  function cancelChanges() {
    setDraft(clonePolicy(originalDraft));
    setMessage({ text: "Unsaved changes discarded.", tone: "info" });
  }

  function updateDraft<K extends keyof Policy>(key: K, value: Policy[K]) { setDraft((current) => ({ ...current, [key]: value })); }
  function updateRate(index: number, patch: Partial<Rate>) { setDraft((current) => ({ ...current, rates: current.rates.map((rate, idx) => idx === index ? { ...rate, ...patch } : rate) })); }
  function addRate() {
    const available = zones.find((zone) => !draft.rates.some((rate) => (rate.shippingZoneId || rate.zone?.id) === zone.id));
    if (!available) return;
    setDraft((current) => ({ ...current, rates: [...current.rates, { shippingZoneId: available.id, zone: available, cost: "", dispatchMinDays: 2, dispatchMaxDays: 2, deliveryMinDays: 2, deliveryMaxDays: 3, manualQuoteRequired: Boolean(current.manualQuoteRequired), isActive: true }] }));
  }

  async function addZone() {
    if (!newZoneName.trim()) return;
    setSaving(true);
    const response = await fetch("/api/admin/shipping/zones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newZoneName.trim(), countries: [], sortOrder: zones.length * 10 + 40 }) });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !data.ok) { setMessage({ text: data.error || "Could not add zone.", tone: "error" }); return; }
    setNewZoneName("");
    setMessage({ text: "Destination zone added.", tone: "success" });
    await load(selectedId);
  }

  async function savePolicy() {
    if (validationErrors.length) { setMessage({ text: validationErrors[0], tone: "error" }); return; }
    setSaving(true);
    setMessage(null);
    const endpoint = draft.id ? `/api/admin/shipping/policies/${draft.id}` : "/api/admin/shipping/policies";
    const method = draft.id ? "PATCH" : "POST";
    const response = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !data.ok) { setMessage({ text: data.error || "Could not save shipping policy.", tone: "error" }); return; }
    setSelectedId(data.policy.id);
    const cloned = clonePolicy(data.policy);
    setDraft(cloned);
    setOriginalDraft(cloned);
    setMessage({ text: "Shipping policy saved.", tone: "success" });
    await load(data.policy.id);
  }

  async function deletePolicy() {
    if (!draft.id || !window.confirm("Delete this shipping policy? Products using it must be reassigned first.")) return;
    setSaving(true);
    const response = await fetch(`/api/admin/shipping/policies/${draft.id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !data.ok) { setMessage({ text: data.error || "Could not delete policy.", tone: "error" }); return; }
    setSelectedId(null);
    setDraft(blankPolicy);
    setOriginalDraft(blankPolicy);
    setMessage({ text: "Shipping policy deleted.", tone: "success" });
    await load(null);
  }

  return (
    <div className="admin-page space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-widest text-gray-400">Commerce settings</p>
            <h1 className="font-display text-2xl font-900 text-navy-950">Shipping policies</h1>
            <p className="mt-1 max-w-4xl text-xs leading-5 text-gray-500">Reusable website shipping engine with destination zones, product assignment, checkout calculation, order snapshots and future eBay fulfilment-policy mapping.</p>
          </div>
          <button onClick={createNewPolicy} className="btn-primary whitespace-nowrap py-2 text-xs"><Plus size={14} /> New policy</button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <SummaryPill>{policies.length} policies</SummaryPill>
          <SummaryPill tone="green">{activeCount} active</SummaryPill>
          <SummaryPill tone="blue">Default: {defaultPolicy?.name || "not set"}</SummaryPill>
          <SummaryPill tone="amber">eBay-ready mapping fields included</SummaryPill>
        </div>
      </section>

      {message ? <div className={`rounded-xl border px-4 py-2 text-sm font-800 ${message.tone === "success" ? "border-green-200 bg-green-50 text-green-800" : message.tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-blue-200 bg-blue-50 text-blue-800"}`}>{message.text}</div> : null}

      <div className="grid gap-4 2xl:grid-cols-[minmax(860px,1fr)_minmax(520px,620px)]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-1 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-base font-900 text-navy-950">Policy list</h2>
              <p className="text-xs text-gray-500">Click a row to edit. Values are kept readable and do not wrap across lines.</p>
            </div>
            {dirty ? <span className="whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-900 text-amber-700">Unsaved changes</span> : null}
          </div>
          <div className="overflow-x-auto">
            <table className="shipping-policy-table min-w-[850px] w-full text-xs">
              <colgroup>
                <col className="w-[30%]" />
                <col className="w-[9%]" />
                <col className="w-[10%]" />
                <col className="w-[11%]" />
                <col className="w-[12%]" />
                <col className="w-[11%]" />
                <col className="w-[9%]" />
                <col className="w-[8%]" />
              </colgroup>
              <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">Policy</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Weight</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">UK</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Europe</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Worldwide</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Dispatch</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Status</th>
                  <th className="px-3 py-2.5 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {policies.map((policy) => {
                  const uk = policyRate(policy, "UK"); const eu = policyRate(policy, "Europe"); const ww = policyRate(policy, "Worldwide");
                  const selectedRow = selected?.id === policy.id;
                  return <tr key={policy.id || policy.name} onClick={() => selectPolicy(policy)} className={`cursor-pointer transition ${selectedRow ? "bg-blue-50/70 ring-1 ring-inset ring-blue-200" : "hover:bg-slate-50/80"}`}>
                    <td className="px-3 py-2.5 align-middle">
                      <p title={policy.name} className="policy-name max-w-[260px] truncate font-display font-900 text-navy-950">{policy.name}</p>
                      <p className="mt-0.5 max-w-[280px] truncate text-[11px] text-slate-400">{policy.description || policy.packagingType || "Shipping policy"}</p>
                    </td>
                    <td className="value weight px-3 py-2.5 align-middle text-gray-600 whitespace-nowrap">{policy.maxWeightKg ? `≤${policy.maxWeightKg}kg` : "—"}</td>
                    <td className="value price px-3 py-2.5 align-middle font-800 text-navy-950 whitespace-nowrap">{money(uk?.cost)}</td>
                    <td className="value price px-3 py-2.5 align-middle font-800 text-navy-950 whitespace-nowrap">{money(eu?.cost)}</td>
                    <td className="value price px-3 py-2.5 align-middle font-800 text-navy-950 whitespace-nowrap">{money(ww?.cost)}</td>
                    <td className="value dispatch px-3 py-2.5 align-middle text-gray-600 whitespace-nowrap">{days(uk?.dispatchMinDays, uk?.dispatchMaxDays)}</td>
                    <td className="px-3 py-2.5 align-middle"><div className="flex flex-wrap gap-1">{policy.isDefault ? <Badge tone="blue">Default</Badge> : null}{policy.manualQuoteRequired ? <Badge tone="amber">Manual</Badge> : null}{policy.isActive === false ? <Badge tone="gray">Inactive</Badge> : <Badge tone="green">Active</Badge>}</div></td>
                    <td className="action px-3 py-2.5 text-right align-middle whitespace-nowrap"><button type="button" onClick={(event) => { event.stopPropagation(); selectPolicy(policy); }} className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-900 text-navy-950 hover:border-accent">Edit</button></td>
                  </tr>;
                })}
                {!policies.length && !loading ? <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">No policies yet.</td></tr> : null}
                {loading ? <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">Loading shipping policies…</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-3">
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="min-w-0">
                <h2 className="truncate font-display text-base font-900 text-navy-950">{draft.id ? "Edit policy" : "New policy"}</h2>
                <p className="text-xs text-gray-500">Structured policy fields, destination rates and marketplace mapping.</p>
              </div>
              <Ship size={19} className="shrink-0 text-accent" />
            </div>

            <div className="space-y-4 p-4">
              <EditorSection title="1. Basic details">
                <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-2">
                  <label className="md:col-span-2"><span className="label">Policy name</span><input className="input py-2 text-sm" value={draft.name} onChange={(e) => updateDraft("name", e.target.value)} /></label>
                  <label><span className="label">Weight limit kg</span><input className="input py-2 text-sm" inputMode="decimal" value={draft.maxWeightKg ?? ""} onChange={(e) => updateDraft("maxWeightKg", e.target.value)} placeholder="e.g. 15" /></label>
                  <label><span className="label">Packaging</span><input className="input py-2 text-sm" value={draft.packagingType ?? ""} onChange={(e) => updateDraft("packagingType", e.target.value)} placeholder="e.g. Medium box" /></label>
                  <label className="md:col-span-2"><span className="label">Description</span><textarea className="input min-h-[68px] py-2 text-sm" value={draft.description ?? ""} onChange={(e) => updateDraft("description", e.target.value)} /></label>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Toggle label="Active" checked={draft.isActive !== false} onChange={(checked) => updateDraft("isActive", checked)} />
                  <Toggle label="Default" checked={Boolean(draft.isDefault)} onChange={(checked) => updateDraft("isDefault", checked)} />
                  <Toggle label="Manual quote" checked={Boolean(draft.manualQuoteRequired)} onChange={(checked) => updateDraft("manualQuoteRequired", checked)} />
                  <Toggle label="Collection only" checked={Boolean(draft.collectionOnly)} onChange={(checked) => updateDraft("collectionOnly", checked)} />
                </div>
              </EditorSection>

              <EditorSection title="2. Destination rates" action={<button type="button" onClick={addRate} className="whitespace-nowrap text-xs font-900 text-accent">+ Add row</button>}>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-[700px] w-full text-xs">
                    <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-2 py-2 whitespace-nowrap">Destination</th>
                        <th className="px-2 py-2 whitespace-nowrap">Cost</th>
                        <th className="px-2 py-2 whitespace-nowrap">Dispatch</th>
                        <th className="px-2 py-2 whitespace-nowrap">Delivery</th>
                        <th className="px-2 py-2 whitespace-nowrap">Manual quote</th>
                        <th className="px-2 py-2 text-right whitespace-nowrap">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortRates(draft.rates).map((rate) => {
                        const originalIndex = draft.rates.findIndex((candidate) => candidate === rate);
                        const index = originalIndex >= 0 ? originalIndex : 0;
                        return <tr key={`${rate.shippingZoneId || rate.zone?.id}-${index}`}>
                          <td className="px-2 py-2 align-middle"><select className="input min-w-[130px] py-1.5 text-xs" value={rate.shippingZoneId || rate.zone?.id || ""} onChange={(e) => updateRate(index, { shippingZoneId: e.target.value, zone: zones.find((z) => z.id === e.target.value) })}>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></td>
                          <td className="px-2 py-2 align-middle"><input className="input min-w-[90px] py-1.5 text-xs" inputMode="decimal" value={rate.manualQuoteRequired ? "" : rate.cost ?? ""} disabled={Boolean(rate.manualQuoteRequired)} onChange={(e) => updateRate(index, { cost: e.target.value })} placeholder="0.00" /></td>
                          <td className="px-2 py-2 align-middle"><div className="flex items-center gap-1 whitespace-nowrap"><input className="input w-14 py-1.5 text-xs" type="number" min="0" value={rate.dispatchMinDays ?? 2} onChange={(e) => updateRate(index, { dispatchMinDays: Number(e.target.value || 2) })} /><span>–</span><input className="input w-14 py-1.5 text-xs" type="number" min="0" value={rate.dispatchMaxDays ?? 2} onChange={(e) => updateRate(index, { dispatchMaxDays: Number(e.target.value || 2) })} /><span className="text-gray-400">wd</span></div></td>
                          <td className="px-2 py-2 align-middle"><div className="flex items-center gap-1 whitespace-nowrap"><input className="input w-14 py-1.5 text-xs" type="number" min="0" disabled={Boolean(rate.manualQuoteRequired)} value={rate.deliveryMinDays ?? ""} onChange={(e) => updateRate(index, { deliveryMinDays: e.target.value ? Number(e.target.value) : null })} /><span>–</span><input className="input w-14 py-1.5 text-xs" type="number" min="0" disabled={Boolean(rate.manualQuoteRequired)} value={rate.deliveryMaxDays ?? ""} onChange={(e) => updateRate(index, { deliveryMaxDays: e.target.value ? Number(e.target.value) : null })} /><span className="text-gray-400">wd</span></div></td>
                          <td className="px-2 py-2 align-middle"><Toggle small label="Manual" checked={Boolean(rate.manualQuoteRequired)} onChange={(checked) => updateRate(index, { manualQuoteRequired: checked, cost: checked ? null : rate.cost })} /></td>
                          <td className="px-2 py-2 text-right align-middle"><button type="button" className="inline-flex rounded-lg border border-red-100 p-1.5 text-red-600 hover:bg-red-50" onClick={() => setDraft((cur) => ({ ...cur, rates: cur.rates.filter((_, idx) => idx !== index) }))}><Trash2 size={14} /></button></td>
                        </tr>;
                      })}
                      {!draft.rates.length ? <tr><td colSpan={6} className="px-3 py-4 text-xs text-amber-800"><AlertTriangle size={14} className="mr-1 inline" /> Add destination rows before saving.</td></tr> : null}
                    </tbody>
                  </table>
                </div>
              </EditorSection>

              <EditorSection title="3. Product/default settings">
                <div className="grid gap-3 md:grid-cols-2">
                  <label><span className="label">Max length cm</span><input className="input py-2 text-sm" inputMode="decimal" value={draft.maxLengthCm ?? ""} onChange={(e) => updateDraft("maxLengthCm", e.target.value)} /></label>
                  <label><span className="label">Max width cm</span><input className="input py-2 text-sm" inputMode="decimal" value={draft.maxWidthCm ?? ""} onChange={(e) => updateDraft("maxWidthCm", e.target.value)} /></label>
                  <label><span className="label">Max height cm</span><input className="input py-2 text-sm" inputMode="decimal" value={draft.maxHeightCm ?? ""} onChange={(e) => updateDraft("maxHeightCm", e.target.value)} /></label>
                  <Toggle label="International allowed" checked={draft.internationalAllowed !== false} onChange={(checked) => updateDraft("internationalAllowed", checked)} />
                </div>
              </EditorSection>

              <EditorSection title="4. Future eBay mapping">
                <p className="mb-3 text-xs leading-5 text-gray-500">These fields make this policy reusable for the eBay push/publishing phase without rebuilding the database.</p>
                <div className="grid gap-2 md:grid-cols-2">
                  <input className="input py-2 text-xs" value={draft.ebayFulfillmentPolicyId ?? ""} onChange={(e) => updateDraft("ebayFulfillmentPolicyId", e.target.value)} placeholder="Fulfilment policy ID" />
                  <input className="input py-2 text-xs" value={draft.ebayMarketplaceId ?? "EBAY_GB"} onChange={(e) => updateDraft("ebayMarketplaceId", e.target.value)} placeholder="EBAY_GB" />
                  <input className="input py-2 text-xs" value={draft.ebayDomesticShippingServiceCode ?? ""} onChange={(e) => updateDraft("ebayDomesticShippingServiceCode", e.target.value)} placeholder="Domestic service code" />
                  <input className="input py-2 text-xs" value={draft.ebayInternationalShippingServiceCode ?? ""} onChange={(e) => updateDraft("ebayInternationalShippingServiceCode", e.target.value)} placeholder="International service code" />
                  <input className="input py-2 text-xs" inputMode="numeric" value={draft.ebayHandlingTimeDays ?? ""} onChange={(e) => updateDraft("ebayHandlingTimeDays", e.target.value)} placeholder="Handling days" />
                  <select className="input py-2 text-xs" value={draft.ebayMappingStatus ?? "UNMAPPED"} onChange={(e) => updateDraft("ebayMappingStatus", e.target.value)}><option>UNMAPPED</option><option>READY</option><option>NEEDS_REVIEW</option><option>MAPPED</option></select>
                  <Toggle small label="eBay collection only" checked={Boolean(draft.ebayCollectionOnly)} onChange={(checked) => updateDraft("ebayCollectionOnly", checked)} />
                  <Toggle small label="eBay freight required" checked={Boolean(draft.ebayFreightRequired)} onChange={(checked) => updateDraft("ebayFreightRequired", checked)} />
                </div>
              </EditorSection>

              {validationErrors.length ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"><p className="mb-1 font-900">Fix before saving:</p><ul className="list-disc space-y-1 pl-4">{validationErrors.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
            </div>

            <div className="sticky bottom-0 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
              <div className="flex flex-wrap items-center gap-2">
                <button disabled={saving || Boolean(validationErrors.length)} onClick={savePolicy} className="btn-primary whitespace-nowrap py-2 text-xs"><Save size={14} /> {saving ? "Saving…" : "Save changes"}</button>
                <button type="button" disabled={!dirty || saving} onClick={cancelChanges} className="btn-secondary whitespace-nowrap py-2 text-xs"><X size={14} /> Cancel</button>
                <button type="button" onClick={duplicatePolicy} className="btn-secondary whitespace-nowrap py-2 text-xs"><Copy size={14} /> Duplicate</button>
                {DEFAULT_POLICY_RESETS.some((item) => item.name === draft.name || item.name === selected?.name) ? <button type="button" onClick={resetToDefault} className="btn-secondary whitespace-nowrap py-2 text-xs"><RotateCcw size={14} /> Reset defaults</button> : null}
                {draft.id ? <button disabled={saving} onClick={deletePolicy} className="ml-auto rounded-lg border border-red-200 px-3 py-2 text-xs font-900 text-red-600 hover:bg-red-50"><Trash2 size={14} className="mr-1 inline" /> Delete</button> : null}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-display text-sm font-900 text-navy-950">Destination zones</h3>
            <div className="mt-2 flex gap-2"><input className="input py-2 text-xs" value={newZoneName} onChange={(e) => setNewZoneName(e.target.value)} placeholder="e.g. UK Mainland" /><button onClick={addZone} className="btn-secondary whitespace-nowrap py-2 text-xs">Add</button></div>
            <div className="mt-2 flex flex-wrap gap-1">{zones.map((zone) => <span key={zone.id} className="whitespace-nowrap rounded-full bg-slate-50 px-2 py-1 text-[11px] font-900 text-navy-950">{zone.name}</span>)}</div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function SummaryPill({ children, tone = "gray" }: { children: ReactNode; tone?: "gray" | "green" | "blue" | "amber" }) {
  const cls = tone === "green" ? "bg-green-50 text-green-700" : tone === "blue" ? "bg-blue-50 text-blue-700" : tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-navy-950";
  return <span className={`max-w-full truncate whitespace-nowrap rounded-full px-2.5 py-1 font-900 ${cls}`}>{children}</span>;
}

function EditorSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-slate-50/45 p-3"><div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-display text-sm font-900 text-navy-950">{title}</h3>{action}</div>{children}</section>;
}

function Badge({ children, tone }: { children: ReactNode; tone: "blue" | "green" | "amber" | "gray" }) {
  const cls = tone === "blue" ? "bg-blue-50 text-blue-700 border-blue-200" : tone === "green" ? "bg-green-50 text-green-700 border-green-200" : tone === "amber" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-gray-50 text-gray-600 border-gray-200";
  return <span className={`badge whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[10px] font-900 ${cls}`}>{children}</span>;
}

function Toggle({ label, checked, onChange, small = false }: { label: string; checked: boolean; onChange: (checked: boolean) => void; small?: boolean }) {
  return <label className={`flex min-h-[34px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 font-display font-800 text-navy-950 ${small ? "py-1 text-[11px]" : "py-1.5 text-xs"}`}><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> <span className="whitespace-nowrap">{label}</span></label>;
}
