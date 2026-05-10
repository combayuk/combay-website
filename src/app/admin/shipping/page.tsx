"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, Plus, Save, Ship, Trash2 } from "lucide-react";

type Zone = { id: string; name: string; countriesJson?: any; sortOrder?: number; isActive?: boolean };
type Rate = { id?: string; shippingZoneId?: string; zone?: Zone; cost?: number | string | null; dispatchMinDays?: number; dispatchMaxDays?: number; deliveryMinDays?: number | null; deliveryMaxDays?: number | null; manualQuoteRequired?: boolean; isActive?: boolean };
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

export default function AdminShippingPoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Policy>(blankPolicy);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/shipping/policies", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      setMessage(data.error || "Could not load shipping policies.");
      setLoading(false);
      return;
    }
    setPolicies(data.policies ?? []);
    setZones(data.zones ?? []);
    const first = data.policies?.[0] ?? null;
    if (first && !selectedId) {
      setSelectedId(first.id);
      setDraft(clonePolicy(first));
    }
    setLoading(false);
  }

  useEffect(() => { load().catch(() => setMessage("Could not load shipping policies.")); }, []);

  const selected = useMemo(() => policies.find((policy) => policy.id === selectedId) ?? null, [policies, selectedId]);
  const activeCount = policies.filter((policy) => policy.isActive !== false).length;
  const defaultPolicy = policies.find((policy) => policy.isDefault);

  function selectPolicy(policy: Policy) {
    setSelectedId(policy.id || null);
    setDraft(clonePolicy(policy));
    setMessage("");
  }

  function createNewPolicy() {
    const rates = zones.map((zone) => ({ shippingZoneId: zone.id, zone, cost: "", dispatchMinDays: 2, dispatchMaxDays: 2, deliveryMinDays: zone.name === "UK" ? 2 : zone.name === "Europe" ? 3 : 6, deliveryMaxDays: zone.name === "UK" ? 3 : zone.name === "Europe" ? 5 : 8, manualQuoteRequired: false, isActive: true }));
    setSelectedId(null);
    setDraft({ ...blankPolicy, rates });
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
    if (!response.ok || !data.ok) { setMessage(data.error || "Could not add zone."); return; }
    setNewZoneName("");
    setMessage("Destination zone added.");
    await load();
  }

  async function savePolicy() {
    if (!draft.name.trim()) { setMessage("Policy name is required."); return; }
    if (!draft.rates.length) { setMessage("Add at least one destination/rate row."); return; }
    setSaving(true);
    setMessage("");
    const endpoint = draft.id ? `/api/admin/shipping/policies/${draft.id}` : "/api/admin/shipping/policies";
    const method = draft.id ? "PATCH" : "POST";
    const response = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !data.ok) { setMessage(data.error || "Could not save shipping policy."); return; }
    setSelectedId(data.policy.id);
    setDraft(clonePolicy(data.policy));
    setMessage("Shipping policy saved.");
    await load();
  }

  async function deletePolicy() {
    if (!draft.id || !window.confirm("Delete this shipping policy? Products using it must be reassigned first.")) return;
    setSaving(true);
    const response = await fetch(`/api/admin/shipping/policies/${draft.id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !data.ok) { setMessage(data.error || "Could not delete policy."); return; }
    setSelectedId(null);
    setDraft(blankPolicy);
    setMessage("Shipping policy deleted.");
    await load();
  }

  return (
    <div className="admin-page space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-gray-400">Commerce settings</p>
            <h1 className="font-display text-2xl font-900 text-navy-950">Shipping policies</h1>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-gray-500">Reusable website shipping engine with destination zones, product assignment, checkout calculation, order snapshots and future eBay fulfilment-policy mapping.</p>
          </div>
          <button onClick={createNewPolicy} className="btn-primary py-2 text-xs"><Plus size={14} /> New policy</button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-slate-50 px-3 py-1.5 font-900 text-navy-950">{policies.length} policies</span>
          <span className="rounded-full bg-green-50 px-3 py-1.5 font-900 text-green-700">{activeCount} active</span>
          <span className="rounded-full bg-blue-50 px-3 py-1.5 font-900 text-blue-700">Default: {defaultPolicy?.name || "not set"}</span>
          <span className="rounded-full bg-amber-50 px-3 py-1.5 font-900 text-amber-700">eBay-ready mapping fields included</span>
        </div>
      </section>

      {message ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-800 text-amber-900">{message}</div> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="font-display text-base font-900 text-navy-950">Policy table</h2>
            <p className="text-xs text-gray-500">Highest applicable item shipping is used for the first checkout rule; manual quote overrides if any item requires it.</p>
          </div>
          <div className="overflow-hidden">
            <table className="w-full table-fixed text-xs">
              <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <tr><th className="w-[24%] px-3 py-2">Policy</th><th className="w-[12%] px-3 py-2">Weight</th><th className="w-[13%] px-3 py-2">UK</th><th className="w-[13%] px-3 py-2">Europe</th><th className="w-[13%] px-3 py-2">Worldwide</th><th className="w-[13%] px-3 py-2">Dispatch</th><th className="w-[12%] px-3 py-2 text-right">Edit</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {policies.map((policy) => {
                  const uk = policyRate(policy, "UK"); const eu = policyRate(policy, "Europe"); const ww = policyRate(policy, "Worldwide");
                  return <tr key={policy.id || policy.name} className={selected?.id === policy.id ? "bg-blue-50/40" : "hover:bg-slate-50/70"}>
                    <td className="px-3 py-3 align-top"><p className="truncate font-display font-900 text-navy-950">{policy.name}</p><div className="mt-1 flex flex-wrap gap-1">{policy.isDefault ? <Badge tone="blue">Default</Badge> : null}{policy.manualQuoteRequired ? <Badge tone="amber">Manual quote</Badge> : null}{policy.isActive === false ? <Badge tone="gray">Inactive</Badge> : <Badge tone="green">Active</Badge>}</div></td>
                    <td className="px-3 py-3 align-top text-gray-600">{policy.maxWeightKg ? `≤${policy.maxWeightKg}kg` : "—"}</td>
                    <td className="px-3 py-3 align-top font-800 text-navy-950">{money(uk?.cost)}</td>
                    <td className="px-3 py-3 align-top font-800 text-navy-950">{money(eu?.cost)}</td>
                    <td className="px-3 py-3 align-top font-800 text-navy-950">{money(ww?.cost)}</td>
                    <td className="px-3 py-3 align-top text-gray-600">{days(uk?.dispatchMinDays, uk?.dispatchMaxDays)}</td>
                    <td className="px-3 py-3 text-right align-top"><button onClick={() => selectPolicy(policy)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-900 text-navy-950 hover:border-accent">Edit</button></td>
                  </tr>;
                })}
                {!policies.length && !loading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">No policies yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-3">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div><h2 className="font-display text-base font-900 text-navy-950">{draft.id ? "Edit policy" : "New policy"}</h2><p className="text-xs text-gray-500">Rates are editable per destination zone.</p></div><Ship size={20} className="text-accent" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2"><span className="label">Policy name</span><input className="input py-2 text-sm" value={draft.name} onChange={(e) => updateDraft("name", e.target.value)} /></label>
              <label><span className="label">Weight limit kg</span><input className="input py-2 text-sm" value={draft.maxWeightKg ?? ""} onChange={(e) => updateDraft("maxWeightKg", e.target.value)} /></label>
              <label><span className="label">Packaging</span><input className="input py-2 text-sm" value={draft.packagingType ?? ""} onChange={(e) => updateDraft("packagingType", e.target.value)} /></label>
              <label className="col-span-2"><span className="label">Description</span><textarea className="input min-h-[70px] text-sm" value={draft.description ?? ""} onChange={(e) => updateDraft("description", e.target.value)} /></label>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <Toggle label="Active" checked={draft.isActive !== false} onChange={(checked) => updateDraft("isActive", checked)} />
              <Toggle label="Default" checked={Boolean(draft.isDefault)} onChange={(checked) => updateDraft("isDefault", checked)} />
              <Toggle label="Manual quote" checked={Boolean(draft.manualQuoteRequired)} onChange={(checked) => updateDraft("manualQuoteRequired", checked)} />
              <Toggle label="Collection only" checked={Boolean(draft.collectionOnly)} onChange={(checked) => updateDraft("collectionOnly", checked)} />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between"><h3 className="font-display text-sm font-900 text-navy-950">Destination rates</h3><button onClick={addRate} className="text-xs font-900 text-accent">+ Add row</button></div>
            <div className="space-y-2">
              {draft.rates.map((rate, index) => <div key={`${rate.shippingZoneId || rate.zone?.id}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                <div className="grid grid-cols-2 gap-2">
                  <select className="input py-1.5 text-xs" value={rate.shippingZoneId || rate.zone?.id || ""} onChange={(e) => updateRate(index, { shippingZoneId: e.target.value, zone: zones.find((z) => z.id === e.target.value) })}>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select>
                  <input className="input py-1.5 text-xs" value={rate.manualQuoteRequired ? "Manual quote" : rate.cost ?? ""} disabled={Boolean(rate.manualQuoteRequired)} onChange={(e) => updateRate(index, { cost: e.target.value })} placeholder="Cost" />
                  <input className="input py-1.5 text-xs" type="number" value={rate.dispatchMinDays ?? 2} onChange={(e) => updateRate(index, { dispatchMinDays: Number(e.target.value || 2) })} title="Dispatch min" />
                  <input className="input py-1.5 text-xs" type="number" value={rate.dispatchMaxDays ?? 2} onChange={(e) => updateRate(index, { dispatchMaxDays: Number(e.target.value || 2) })} title="Dispatch max" />
                  <input className="input py-1.5 text-xs" value={rate.deliveryMinDays ?? ""} disabled={Boolean(rate.manualQuoteRequired)} onChange={(e) => updateRate(index, { deliveryMinDays: e.target.value ? Number(e.target.value) : null })} placeholder="Delivery min" />
                  <input className="input py-1.5 text-xs" value={rate.deliveryMaxDays ?? ""} disabled={Boolean(rate.manualQuoteRequired)} onChange={(e) => updateRate(index, { deliveryMaxDays: e.target.value ? Number(e.target.value) : null })} placeholder="Delivery max" />
                </div>
                <div className="mt-2 flex items-center justify-between"><Toggle label="Manual quote" checked={Boolean(rate.manualQuoteRequired)} onChange={(checked) => updateRate(index, { manualQuoteRequired: checked, cost: checked ? null : rate.cost })} /><button className="text-red-600" onClick={() => setDraft((cur) => ({ ...cur, rates: cur.rates.filter((_, idx) => idx !== index) }))}><Trash2 size={14} /></button></div>
              </div>)}
              {!draft.rates.length ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"><AlertTriangle size={14} className="mb-1" /> Add destination rows before saving.</div> : null}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-display text-sm font-900 text-navy-950">Future eBay mapping</h3>
            <p className="mb-3 mt-1 text-xs leading-5 text-gray-500">These fields make the website shipping policy reusable for the next eBay push/publishing phase.</p>
            <div className="grid grid-cols-2 gap-2">
              <input className="input py-2 text-xs" value={draft.ebayFulfillmentPolicyId ?? ""} onChange={(e) => updateDraft("ebayFulfillmentPolicyId", e.target.value)} placeholder="Fulfilment policy ID" />
              <input className="input py-2 text-xs" value={draft.ebayMarketplaceId ?? "EBAY_GB"} onChange={(e) => updateDraft("ebayMarketplaceId", e.target.value)} placeholder="EBAY_GB" />
              <input className="input py-2 text-xs" value={draft.ebayDomesticShippingServiceCode ?? ""} onChange={(e) => updateDraft("ebayDomesticShippingServiceCode", e.target.value)} placeholder="Domestic service code" />
              <input className="input py-2 text-xs" value={draft.ebayInternationalShippingServiceCode ?? ""} onChange={(e) => updateDraft("ebayInternationalShippingServiceCode", e.target.value)} placeholder="International service code" />
              <input className="input py-2 text-xs" value={draft.ebayHandlingTimeDays ?? ""} onChange={(e) => updateDraft("ebayHandlingTimeDays", e.target.value)} placeholder="Handling days" />
              <select className="input py-2 text-xs" value={draft.ebayMappingStatus ?? "UNMAPPED"} onChange={(e) => updateDraft("ebayMappingStatus", e.target.value)}><option>UNMAPPED</option><option>READY</option><option>NEEDS_REVIEW</option><option>MAPPED</option></select>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-display text-sm font-900 text-navy-950">Destination zones</h3>
            <div className="mt-2 flex gap-2"><input className="input py-2 text-xs" value={newZoneName} onChange={(e) => setNewZoneName(e.target.value)} placeholder="e.g. UK Mainland" /><button onClick={addZone} className="btn-secondary py-2 text-xs">Add</button></div>
            <div className="mt-2 flex flex-wrap gap-1">{zones.map((zone) => <span key={zone.id} className="rounded-full bg-slate-50 px-2 py-1 text-[11px] font-900 text-navy-950">{zone.name}</span>)}</div>
          </section>

          <div className="sticky bottom-4 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur">
            <div className="flex flex-wrap gap-2"><button disabled={saving} onClick={savePolicy} className="btn-primary flex-1 py-2 text-xs"><Save size={14} /> Save policy</button>{draft.id ? <button disabled={saving} onClick={deletePolicy} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-900 text-red-600 hover:bg-red-50">Delete</button> : null}</div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone: "blue" | "green" | "amber" | "gray" }) {
  const cls = tone === "blue" ? "bg-blue-50 text-blue-700 border-blue-200" : tone === "green" ? "bg-green-50 text-green-700 border-green-200" : tone === "amber" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-gray-50 text-gray-600 border-gray-200";
  return <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-900 ${cls}`}>{children}</span>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-display font-800 text-navy-950"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}</label>;
}
