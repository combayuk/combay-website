"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, Pencil, Plus, Trash2 } from "lucide-react";

type Promotion = {
  id: string;
  name: string;
  code: string | null;
  type: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";
  value: number;
  description: string;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  minOrderValue: number;
  maxUses: number | null;
  usedCount: number;
};

type FormState = {
  id: string | null;
  name: string;
  code: string;
  type: Promotion["type"];
  value: string;
  description: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  minOrderValue: string;
  maxUses: string;
  showOnHomepage: boolean;
  showOnShop: boolean;
  bannerText: string;
  displayPriority: string;
};

const emptyForm: FormState = {
  id: null,
  name: "",
  code: "",
  type: "PERCENTAGE",
  value: "10",
  description: "",
  isActive: false,
  startsAt: "",
  endsAt: "",
  minOrderValue: "",
  maxUses: "",
  showOnHomepage: false,
  showOnShop: false,
  bannerText: "",
  displayPriority: "100",
};

function money(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(value || 0));
}

function dateInput(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function promotionLabel(promotion: Promotion) {
  if (promotion.type === "PERCENTAGE") return `${promotion.value}% off`;
  if (promotion.type === "FIXED_AMOUNT") return `${money(promotion.value)} off`;
  return "Free shipping";
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeCount = useMemo(() => promotions.filter((item) => item.isActive).length, [promotions]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/promotions", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not load promotions.");
      setPromotions(data.promotions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load promotions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function edit(promotion: Promotion) {
    setForm({
      id: promotion.id,
      name: promotion.name,
      code: promotion.code || "",
      type: promotion.type,
      value: String(promotion.value ?? 0),
      description: promotion.description || "",
      isActive: promotion.isActive,
      startsAt: dateInput(promotion.startsAt),
      endsAt: dateInput(promotion.endsAt),
      minOrderValue: promotion.minOrderValue ? String(promotion.minOrderValue) : "",
      maxUses: promotion.maxUses ? String(promotion.maxUses) : "",
      showOnHomepage: Boolean(promotion.showOnHomepage),
      showOnShop: Boolean(promotion.showOnShop),
      bannerText: promotion.bannerText || "",
      displayPriority: String(promotion.displayPriority ?? 100),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload = {
        ...form,
        value: Number(form.value || 0),
        minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : null,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        showOnHomepage: form.showOnHomepage,
        showOnShop: form.showOnShop,
        bannerText: form.bannerText,
        displayPriority: form.displayPriority ? Number(form.displayPriority) : 100,
      };
      const response = await fetch(form.id ? `/api/promotions/${form.id}` : "/api/promotions", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not save promotion.");
      setMessage(form.id ? "Promotion updated." : "Promotion created.");
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save promotion.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this promotion? This cannot be undone.")) return;
    setError(null);
    setMessage(null);
    const response = await fetch(`/api/promotions/${id}`, { method: "DELETE" });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      setError(data?.error || "Could not delete promotion.");
      return;
    }
    setMessage("Promotion deleted.");
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-widest uppercase text-gray-400 mb-2">Commerce controls</p>
          <h1 className="font-display font-900 text-3xl text-navy-950">Promotions</h1>
          <p className="text-sm text-gray-500 mt-1">Create controlled checkout promotion codes. All discounts are recalculated server-side before Stripe checkout.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 min-w-[260px]">
          <div className="bg-white border border-gray-200 rounded-xl p-4"><p className="text-xs text-gray-400">Total codes</p><p className="font-display font-900 text-2xl text-navy-950">{promotions.length}</p></div>
          <div className="bg-white border border-gray-200 rounded-xl p-4"><p className="text-xs text-gray-400">Active</p><p className="font-display font-900 text-2xl text-green-700">{activeCount}</p></div>
        </div>
      </div>

      {message ? <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 text-sm flex gap-2"><CheckCircle2 size={16} />{message}</div> : null}
      {error ? <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm flex gap-2"><AlertTriangle size={16} />{error}</div> : null}

      <form onSubmit={save} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display font-800 text-xl text-navy-950">{form.id ? "Edit promotion" : "Create promotion"}</h2>
          {form.id ? <button type="button" onClick={() => setForm(emptyForm)} className="btn-secondary">Cancel edit</button> : null}
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <label className="block"><span className="label">Promotion name *</span><input required className="input" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Spring industrial sale" /></label>
          <label className="block"><span className="label">Checkout code *</span><input required className="input uppercase" value={form.code} onChange={(e) => update("code", e.target.value.toUpperCase())} placeholder="SPRING10" /></label>
          <label className="block"><span className="label">Type</span><select className="input" value={form.type} onChange={(e) => update("type", e.target.value as Promotion["type"])}><option value="PERCENTAGE">Percentage discount</option><option value="FIXED_AMOUNT">Fixed amount discount</option><option value="FREE_SHIPPING">Free shipping</option></select></label>
          <label className="block"><span className="label">Value {form.type === "PERCENTAGE" ? "(%)" : form.type === "FIXED_AMOUNT" ? "(GBP)" : ""}</span><input className="input" type="number" min="0" step="0.01" disabled={form.type === "FREE_SHIPPING"} value={form.type === "FREE_SHIPPING" ? "0" : form.value} onChange={(e) => update("value", e.target.value)} /></label>
          <label className="block"><span className="label">Minimum order value before VAT</span><input className="input" type="number" min="0" step="0.01" value={form.minOrderValue} onChange={(e) => update("minOrderValue", e.target.value)} placeholder="Optional" /></label>
          <label className="block"><span className="label">Maximum paid uses</span><input className="input" type="number" min="0" step="1" value={form.maxUses} onChange={(e) => update("maxUses", e.target.value)} placeholder="Optional" /></label>
          <label className="block"><span className="label">Display priority</span><input className="input" type="number" min="0" step="1" value={form.displayPriority} onChange={(e) => update("displayPriority", e.target.value)} placeholder="100" /></label>
          <label className="block"><span className="label">Start date</span><input className="input" type="date" value={form.startsAt} onChange={(e) => update("startsAt", e.target.value)} /></label>
          <label className="block"><span className="label">End date</span><input className="input" type="date" value={form.endsAt} onChange={(e) => update("endsAt", e.target.value)} /></label>
          <label className="flex items-center gap-3 pt-7"><input type="checkbox" checked={form.isActive} onChange={(e) => update("isActive", e.target.checked)} className="h-4 w-4" /><span className="text-sm font-display font-700 text-navy-950">Active at checkout</span></label>
          <label className="flex items-center gap-3"><input type="checkbox" checked={form.showOnHomepage} onChange={(e) => update("showOnHomepage", e.target.checked)} className="h-4 w-4" /><span className="text-sm font-display font-700 text-navy-950">Show on homepage</span></label>
          <label className="flex items-center gap-3"><input type="checkbox" checked={form.showOnShop} onChange={(e) => update("showOnShop", e.target.checked)} className="h-4 w-4" /><span className="text-sm font-display font-700 text-navy-950">Show on shop page</span></label>
          <label className="block lg:col-span-3"><span className="label">Public banner text</span><input className="input" value={form.bannerText} onChange={(e) => update("bannerText", e.target.value)} placeholder="Example: 10% off selected automation spares this week." /></label>
          <label className="block lg:col-span-3"><span className="label">Internal/customer note</span><textarea className="textarea min-h-[90px]" value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Optional note shown to admin. Keep customer-facing code names professional." /></label>
        </div>

        <button disabled={saving} className="btn-primary inline-flex items-center gap-2"><Plus size={16} />{saving ? "Saving..." : form.id ? "Save promotion" : "Create promotion"}</button>
      </form>

      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200"><h2 className="font-display font-800 text-xl text-navy-950">Promotion codes</h2></div>
        {loading ? <div className="p-6 text-sm text-gray-500">Loading promotions...</div> : promotions.length === 0 ? <div className="p-8 text-center text-sm text-gray-400">No promotions created yet.</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500"><tr><th className="px-5 py-3">Code</th><th className="px-5 py-3">Offer</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Dates</th><th className="px-5 py-3">Usage</th><th className="px-5 py-3">Public</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {promotions.map((promotion) => (
                  <tr key={promotion.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4"><p className="font-mono font-700 text-navy-950">{promotion.code}</p><p className="text-xs text-gray-500">{promotion.name}</p></td>
                    <td className="px-5 py-4"><p className="font-display font-700 text-navy-950">{promotionLabel(promotion)}</p>{promotion.minOrderValue ? <p className="text-xs text-gray-500">Min order {money(promotion.minOrderValue)}</p> : null}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-xs font-display font-700 ${promotion.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>{promotion.isActive ? "Active" : "Inactive"}</span></td>
                    <td className="px-5 py-4 text-xs text-gray-500">{promotion.startsAt ? dateInput(promotion.startsAt) : "No start"} → {promotion.endsAt ? dateInput(promotion.endsAt) : "No end"}</td>
                    <td className="px-5 py-4 text-xs text-gray-500">{promotion.usedCount}{promotion.maxUses ? ` / ${promotion.maxUses}` : " used"}</td>
                    <td className="px-5 py-4 text-xs text-gray-500">{promotion.showOnHomepage ? "Home" : ""}{promotion.showOnHomepage && promotion.showOnShop ? " + " : ""}{promotion.showOnShop ? "Shop" : ""}{!promotion.showOnHomepage && !promotion.showOnShop ? "Hidden" : ""}</td>
                    <td className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => edit(promotion)} className="btn-secondary py-2 px-3"><Pencil size={14} /></button><button type="button" onClick={() => remove(promotion.id)} className="btn-secondary py-2 px-3 text-red-600"><Trash2 size={14} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
