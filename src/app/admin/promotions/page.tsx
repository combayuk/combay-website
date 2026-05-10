"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

type ProductOption = {
  id: string;
  title: string;
  sku: string;
  brand?: string | null;
  manufacturer?: string | null;
  category?: string | null;
  categorySlug?: string | null;
};

type CategoryOption = { slug: string; label: string };

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
  minOrderValue: number | null;
  maxUses: number | null;
  usedCount: number;
  showOnHomepage: boolean;
  showOnShop: boolean;
  bannerText: string | null;
  displayPriority: number;
  includeAllProducts: boolean;
  includeProductIds: string[];
  excludeProductIds: string[];
  includeAllCategories: boolean;
  includeCategorySlugs: string[];
  excludeCategorySlugs: string[];
  includeAllBrands: boolean;
  includeBrands: string[];
  excludeBrands: string[];
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
  includeAllProducts: boolean;
  includeProductIds: string[];
  excludeProductIds: string[];
  includeAllCategories: boolean;
  includeCategorySlugs: string[];
  excludeCategorySlugs: string[];
  includeAllBrands: boolean;
  includeBrands: string[];
  excludeBrands: string[];
};

type TabId = "offer" | "visibility" | "eligibility" | "review";
type EligibilityPanel = "products" | "categories" | "brands" | null;

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
  includeAllProducts: true,
  includeProductIds: [],
  excludeProductIds: [],
  includeAllCategories: true,
  includeCategorySlugs: [],
  excludeCategorySlugs: [],
  includeAllBrands: true,
  includeBrands: [],
  excludeBrands: [],
};

const tabs: Array<{ id: TabId; label: string; step: string }> = [
  { id: "offer", label: "Offer", step: "1" },
  { id: "visibility", label: "Visibility", step: "2" },
  { id: "eligibility", label: "Eligibility", step: "3" },
  { id: "review", label: "Review", step: "4" },
];

function money(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(value || 0));
}

function dateInput(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function dateLabel(value: string | null | undefined) {
  if (!value) return "No end";
  return new Date(value).toLocaleDateString("en-GB");
}

function promotionLabel(promotion: Pick<Promotion, "type" | "value"> | Pick<FormState, "type" | "value">) {
  const value = Number(promotion.value || 0);
  if (promotion.type === "PERCENTAGE") return `${value}% off`;
  if (promotion.type === "FIXED_AMOUNT") return `${money(value)} off`;
  return "Free shipping";
}

function statusFor(promotion: Promotion) {
  const now = new Date();
  const starts = promotion.startsAt ? new Date(promotion.startsAt) : null;
  const ends = promotion.endsAt ? new Date(promotion.endsAt) : null;
  if (!promotion.isActive) return "Draft";
  if (starts && starts > now) return "Scheduled";
  if (ends && ends < now) return "Expired";
  return "Active";
}

function visibilityLabel(item: Pick<Promotion, "showOnHomepage" | "showOnShop"> | Pick<FormState, "showOnHomepage" | "showOnShop">) {
  return [item.showOnHomepage ? "Home" : "", item.showOnShop ? "Shop" : ""].filter(Boolean).join(" + ") || "Not public";
}

function promotionToForm(promotion: Promotion): FormState {
  return {
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
    includeAllProducts: !Array.isArray(promotion.includeProductIds) || promotion.includeProductIds.length === 0,
    includeProductIds: Array.isArray(promotion.includeProductIds) ? promotion.includeProductIds : [],
    excludeProductIds: Array.isArray(promotion.excludeProductIds) ? promotion.excludeProductIds : [],
    includeAllCategories: !Array.isArray(promotion.includeCategorySlugs) || promotion.includeCategorySlugs.length === 0,
    includeCategorySlugs: Array.isArray(promotion.includeCategorySlugs) ? promotion.includeCategorySlugs : [],
    excludeCategorySlugs: Array.isArray(promotion.excludeCategorySlugs) ? promotion.excludeCategorySlugs : [],
    includeAllBrands: !Array.isArray(promotion.includeBrands) || promotion.includeBrands.length === 0,
    includeBrands: Array.isArray(promotion.includeBrands) ? promotion.includeBrands : [],
    excludeBrands: Array.isArray(promotion.excludeBrands) ? promotion.excludeBrands : [],
  };
}

function makePayload(form: FormState, isActive = form.isActive) {
  return {
    ...form,
    isActive,
    value: Number(form.value || 0),
    minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : null,
    maxUses: form.maxUses ? Number(form.maxUses) : null,
    displayPriority: form.displayPriority ? Number(form.displayPriority) : 100,
    includeProductIds: form.includeAllProducts ? [] : form.includeProductIds,
    excludeProductIds: form.excludeProductIds,
    includeCategorySlugs: form.includeAllCategories ? [] : form.includeCategorySlugs,
    excludeCategorySlugs: form.excludeCategorySlugs,
    includeBrands: form.includeAllBrands ? [] : form.includeBrands,
    excludeBrands: form.excludeBrands,
  };
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [brandSearch, setBrandSearch] = useState("");
  const [promotionSearch, setPromotionSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("offer");
  const [activeEligibility, setActiveEligibility] = useState<EligibilityPanel>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeCount = useMemo(() => promotions.filter((item) => statusFor(item) === "Active").length, [promotions]);
  const visibleCount = useMemo(() => promotions.filter((item) => item.showOnHomepage || item.showOnShop).length, [promotions]);
  const usedCount = useMemo(() => promotions.reduce((sum, item) => sum + Number(item.usedCount || 0), 0), [promotions]);
  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.slug, category])), [categories]);
  const brands = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((product) => [product.brand, product.manufacturer].forEach((value) => {
      const label = String(value || "").trim();
      if (label) map.set(label.toLowerCase(), label);
    }));
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products.slice(0, 30);
    return products.filter((product) => `${product.sku} ${product.title} ${product.brand || ""} ${product.manufacturer || ""} ${product.category || ""}`.toLowerCase().includes(q)).slice(0, 60);
  }, [products, productSearch]);

  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    const pool = q ? categories.filter((category) => `${category.label} ${category.slug}`.toLowerCase().includes(q)) : categories;
    return pool.slice(0, 50);
  }, [categories, categorySearch]);

  const filteredBrands = useMemo(() => {
    const q = brandSearch.trim().toLowerCase();
    const pool = q ? brands.filter((brand) => brand.toLowerCase().includes(q)) : brands;
    return pool.slice(0, 50);
  }, [brands, brandSearch]);

  const filteredPromotions = useMemo(() => {
    const q = promotionSearch.trim().toLowerCase();
    return promotions.filter((promotion) => {
      const status = statusFor(promotion);
      const visible = promotion.showOnHomepage || promotion.showOnShop;
      const matchesSearch = !q || `${promotion.name} ${promotion.code || ""} ${promotion.description || ""}`.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || status.toLowerCase() === statusFilter;
      const matchesVisibility = visibilityFilter === "all" || (visibilityFilter === "public" ? visible : !visible);
      return matchesSearch && matchesStatus && matchesVisibility;
    });
  }, [promotions, promotionSearch, statusFilter, visibilityFilter]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/promotions", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not load promotions.");
      setPromotions(data.promotions || []);

      const productResponse = await fetch("/api/products?admin=1&status=PUBLISHED", { cache: "no-store" });
      const productData = await productResponse.json().catch(() => ({}));
      const loadedProducts = Array.isArray(productData.products)
        ? productData.products
          .map((p: any) => ({ id: p.id, title: p.title, sku: p.sku, brand: p.brand || null, manufacturer: p.manufacturer || null, category: p.category || null, categorySlug: p.categorySlug || null }))
          .filter((p: ProductOption) => p.id)
        : [];

      setProducts(loadedProducts);

      const categoryMapNext = new Map<string, CategoryOption>();
      if (Array.isArray(productData.categories)) {
        productData.categories.forEach((c: any) => {
          const slug = String(c.slug || "");
          const label = String(c.label || c.name || c.slug || "");
          if (slug && label) categoryMapNext.set(slug, { slug, label });
        });
      }
      loadedProducts.forEach((product: ProductOption) => {
        if (product.categorySlug && product.category) categoryMapNext.set(product.categorySlug, { slug: product.categorySlug, label: product.category });
      });
      setCategories(Array.from(categoryMapNext.values()).sort((a, b) => a.label.localeCompare(b.label)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load promotions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openNew() {
    setForm(emptyForm);
    setActiveTab("offer");
    setActiveEligibility(null);
    setDrawerOpen(true);
  }

  function edit(promotion: Promotion) {
    setForm(promotionToForm(promotion));
    setActiveTab("offer");
    setActiveEligibility(null);
    setDrawerOpen(true);
  }

  function duplicate(promotion: Promotion) {
    const next = promotionToForm(promotion);
    setForm({
      ...next,
      id: null,
      name: `${next.name} copy`,
      code: next.code ? `${next.code}-COPY`.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32) : "",
      isActive: false,
    });
    setActiveTab("offer");
    setActiveEligibility(null);
    setDrawerOpen(true);
  }

  async function submitPromotion(activeOverride?: boolean) {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload = makePayload(form, activeOverride ?? form.isActive);
      const response = await fetch(form.id ? `/api/promotions/${form.id}` : "/api/promotions", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not save promotion.");
      setMessage(activeOverride ? "Promotion activated." : form.id ? "Promotion saved." : "Promotion draft saved.");
      setForm(emptyForm);
      setDrawerOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save promotion.");
    } finally {
      setSaving(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitPromotion();
  }

  async function quickToggle(promotion: Promotion, active: boolean) {
    const payload = makePayload({ ...promotionToForm(promotion), isActive: active }, active);
    const response = await fetch(`/api/promotions/${promotion.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      setError(data?.error || "Could not update promotion.");
      return;
    }
    setMessage(active ? "Promotion activated." : "Promotion paused.");
    await load();
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
    setDrawerOpen(false);
    await load();
  }

  function toggleIncludeAll(kind: "products" | "categories" | "brands", checked: boolean) {
    setForm((current) => {
      if (kind === "products") return { ...current, includeAllProducts: checked, includeProductIds: checked ? [] : current.includeProductIds };
      if (kind === "categories") return { ...current, includeAllCategories: checked, includeCategorySlugs: checked ? [] : current.includeCategorySlugs };
      return { ...current, includeAllBrands: checked, includeBrands: checked ? [] : current.includeBrands };
    });
  }

  function toggleList(mode: "includeProductIds" | "excludeProductIds" | "includeCategorySlugs" | "excludeCategorySlugs" | "includeBrands" | "excludeBrands", id: string) {
    setForm((current) => {
      const currentList = current[mode] || [];
      const oppositeMap = {
        includeProductIds: "excludeProductIds",
        excludeProductIds: "includeProductIds",
        includeCategorySlugs: "excludeCategorySlugs",
        excludeCategorySlugs: "includeCategorySlugs",
        includeBrands: "excludeBrands",
        excludeBrands: "includeBrands",
      } as const;
      const opposite = oppositeMap[mode];
      const nextList = currentList.includes(id) ? currentList.filter((item) => item !== id) : [...currentList, id];
      const includeAllReset = mode === "includeProductIds" ? { includeAllProducts: false } : mode === "includeCategorySlugs" ? { includeAllCategories: false } : mode === "includeBrands" ? { includeAllBrands: false } : {};
      return { ...current, ...includeAllReset, [mode]: nextList, [opposite]: (current[opposite] || []).filter((item) => item !== id) } as FormState;
    });
  }

  const eligibilitySummary = [
    form.includeAllProducts ? "All products" : `${form.includeProductIds.length} included products`,
    form.excludeProductIds.length ? `${form.excludeProductIds.length} product exclusions` : "",
    form.includeAllCategories ? "All categories" : `${form.includeCategorySlugs.length} included categories`,
    form.excludeCategorySlugs.length ? `${form.excludeCategorySlugs.length} category exclusions` : "",
    form.includeAllBrands ? "All brands" : `${form.includeBrands.length} included brands`,
    form.excludeBrands.length ? `${form.excludeBrands.length} brand exclusions` : "",
  ].filter(Boolean).join(" · ");

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-gray-400">Commerce controls</p>
            <h1 className="font-display text-2xl font-900 text-navy-950">Promotions</h1>
            <p className="mt-1 text-xs text-gray-500">Manage checkout codes, public banners and eligibility rules.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-900 text-navy-950">{promotions.length} total</span>
            <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-900 text-green-700">{activeCount} active</span>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-900 text-amber-700">{visibleCount} public banners</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-900 text-slate-600">{usedCount} total uses</span>
            <button type="button" onClick={openNew} className="btn-primary py-2 text-xs"><Plus size={14} /> New promotion</button>
          </div>
        </div>
      </section>

      {message ? <Notice tone="green"><CheckCircle2 size={16} />{message}</Notice> : null}
      {error ? <Notice tone="red"><AlertTriangle size={16} />{error}</Notice> : null}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-2 border-b border-slate-100 px-4 py-3 lg:grid-cols-[1fr_170px_170px_auto]">
          <label className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-accent" value={promotionSearch} onChange={(event) => setPromotionSearch(event.target.value)} placeholder="Search code, name, note…" />
          </label>
          <select className="h-9 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-accent" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="expired">Expired</option>
          </select>
          <select className="h-9 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-accent" value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value)}>
            <option value="all">All visibility</option>
            <option value="public">Public banners</option>
            <option value="private">Not public</option>
          </select>
          <button type="button" onClick={openNew} className="btn-secondary py-2 text-xs"><Plus size={14} /> New</button>
        </div>

        {loading ? <div className="p-6 text-sm text-gray-500">Loading promotions…</div> : filteredPromotions.length === 0 ? <div className="p-8 text-center text-sm text-gray-400">No promotions match the current filters.</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Offer</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Visibility</th>
                  <th className="px-4 py-2">Eligibility</th>
                  <th className="px-4 py-2">Usage</th>
                  <th className="px-4 py-2">Dates</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPromotions.map((promotion) => (
                  <tr key={promotion.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-900 text-navy-950">{promotion.code || "—"}</p>
                      <p className="mt-1 max-w-[220px] truncate text-xs text-gray-500">{promotion.name}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-800 text-navy-950">{promotionLabel(promotion)}</td>
                    <td className="px-4 py-3"><StatusChip status={statusFor(promotion)} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{visibilityLabel(promotion)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{eligibilityText(promotion)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{promotion.usedCount || 0}{promotion.maxUses ? ` / ${promotion.maxUses}` : ""}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{promotion.startsAt ? dateLabel(promotion.startsAt) : "Now"} – {dateLabel(promotion.endsAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => edit(promotion)} className="btn-secondary px-2 py-1.5 text-xs"><Pencil size={13} /> Edit</button>
                        <button type="button" onClick={() => duplicate(promotion)} className="btn-secondary px-2 py-1.5 text-xs"><Copy size={13} /> Duplicate</button>
                        <button type="button" onClick={() => quickToggle(promotion, !promotion.isActive)} className="btn-secondary px-2 py-1.5 text-xs">{promotion.isActive ? "Pause" : "Activate"}</button>
                        <button type="button" onClick={() => remove(promotion.id)} className="btn-secondary px-2 py-1.5 text-xs text-red-600"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/35">
          <div className="absolute right-0 top-0 flex h-full w-full max-w-[720px] flex-col bg-white shadow-2xl">
            <form onSubmit={save} className="flex h-full flex-col">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-accent">{form.id ? "Edit promotion" : "Create promotion"}</p>
                    <h2 className="font-display text-xl font-900 text-navy-950">{form.name || "Untitled promotion"}</h2>
                  </div>
                  <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-lg p-2 text-gray-400 hover:bg-slate-50 hover:text-navy-950"><X size={18} /></button>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1">
                  {tabs.map((tab) => (
                    <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`rounded-lg px-2 py-2 text-xs font-900 transition-colors ${activeTab === tab.id ? "bg-white text-navy-950 shadow-sm" : "text-slate-500 hover:bg-white/70"}`}>
                      {tab.step} {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                {activeTab === "offer" && (
                  <div className="space-y-4">
                    <CompactGrid>
                      <Field label="Promotion name"><input required className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-accent" value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Spring sale" /></Field>
                      <Field label="Checkout code"><input className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-accent font-mono uppercase" value={form.code} onChange={(event) => update("code", event.target.value.toUpperCase())} placeholder="SPRING10" /></Field>
                      <Field label="Discount type"><select className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-accent" value={form.type} onChange={(event) => update("type", event.target.value as Promotion["type"])}><option value="PERCENTAGE">Percentage</option><option value="FIXED_AMOUNT">Fixed amount</option><option value="FREE_SHIPPING">Free shipping</option></select></Field>
                      <Field label="Value"><input className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-accent" type="number" min="0" step="0.01" value={form.value} onChange={(event) => update("value", event.target.value)} /></Field>
                      <Field label="Minimum order"><input className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-accent" type="number" min="0" step="0.01" value={form.minOrderValue} onChange={(event) => update("minOrderValue", event.target.value)} placeholder="Optional" /></Field>
                      <Field label="Maximum uses"><input className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-accent" type="number" min="0" value={form.maxUses} onChange={(event) => update("maxUses", event.target.value)} placeholder="Unlimited" /></Field>
                      <Field label="Start date"><input className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-accent" type="date" value={form.startsAt} onChange={(event) => update("startsAt", event.target.value)} /></Field>
                      <Field label="End date"><input className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-accent" type="date" value={form.endsAt} onChange={(event) => update("endsAt", event.target.value)} /></Field>
                    </CompactGrid>
                    <Field label="Internal/customer note"><textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent min-h-[90px]" value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Optional note shown in admin/customer contexts where applicable." /></Field>
                    <details className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <summary className="cursor-pointer text-xs font-900 text-navy-950">Advanced settings</summary>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <Field label="Display priority"><input className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-accent" type="number" value={form.displayPriority} onChange={(event) => update("displayPriority", event.target.value)} /></Field>
                      </div>
                    </details>
                  </div>
                )}

                {activeTab === "visibility" && (
                  <div className="space-y-4">
                    <div className="grid gap-2 sm:grid-cols-3">
                      <ToggleChip label="Checkout active" checked={form.isActive} onChange={(checked) => update("isActive", checked)} />
                      <ToggleChip label="Homepage banner" checked={form.showOnHomepage} onChange={(checked) => update("showOnHomepage", checked)} />
                      <ToggleChip label="Shop banner" checked={form.showOnShop} onChange={(checked) => update("showOnShop", checked)} />
                    </div>
                    <Field label="Public banner text"><textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent min-h-[86px]" value={form.bannerText} onChange={(event) => update("bannerText", event.target.value)} placeholder="10% off selected automation spares this week." /></Field>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-xs font-900 uppercase tracking-wide text-gray-400">Customer banner preview</p>
                        <span className="rounded-full bg-white px-2 py-1 text-[11px] font-900 text-slate-500">{form.isActive ? "Active" : "Draft"} · {visibilityLabel(form)}</span>
                      </div>
                      <div className="rounded-lg border border-amber-200 bg-white px-4 py-3 text-sm">
                        <strong className="text-navy-950">{form.bannerText || `${promotionLabel(form)} with code ${form.code || "CODE"}`}</strong>
                        <span className="ml-2 font-mono text-xs text-amber-700">Code: {form.code || "CODE"}</span>
                        <button type="button" className="ml-3 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-900 text-slate-600">Copy code</button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "eligibility" && (
                  <div className="space-y-3">
                    <EligibilitySummary title="Products" all={form.includeAllProducts} includeCount={form.includeProductIds.length} excludeCount={form.excludeProductIds.length} onEdit={() => setActiveEligibility(activeEligibility === "products" ? null : "products")} />
                    {activeEligibility === "products" && (
                      <RulePanel
                        includeAllLabel="Include all products"
                        includeAll={form.includeAllProducts}
                        onToggleAll={(checked) => toggleIncludeAll("products", checked)}
                        search={productSearch}
                        setSearch={setProductSearch}
                        searchPlaceholder="Search SKU, title, brand or category..."
                        options={filteredProducts.map((product) => ({ id: product.id, label: product.title, sub: `${product.sku} · ${product.brand || product.manufacturer || "—"} · ${product.category || "—"}` }))}
                        includeIds={form.includeProductIds}
                        excludeIds={form.excludeProductIds}
                        onInclude={(id) => toggleList("includeProductIds", id)}
                        onExclude={(id) => toggleList("excludeProductIds", id)}
                        includedChips={form.includeProductIds.map((id) => ({ id, label: productMap.get(id)?.title || id }))}
                        excludedChips={form.excludeProductIds.map((id) => ({ id, label: productMap.get(id)?.title || id }))}
                      />
                    )}

                    <EligibilitySummary title="Categories" all={form.includeAllCategories} includeCount={form.includeCategorySlugs.length} excludeCount={form.excludeCategorySlugs.length} onEdit={() => setActiveEligibility(activeEligibility === "categories" ? null : "categories")} />
                    {activeEligibility === "categories" && (
                      <RulePanel
                        includeAllLabel="Include all categories"
                        includeAll={form.includeAllCategories}
                        onToggleAll={(checked) => toggleIncludeAll("categories", checked)}
                        search={categorySearch}
                        setSearch={setCategorySearch}
                        searchPlaceholder="Search categories..."
                        options={filteredCategories.map((category) => ({ id: category.slug, label: category.label, sub: category.slug }))}
                        includeIds={form.includeCategorySlugs}
                        excludeIds={form.excludeCategorySlugs}
                        onInclude={(id) => toggleList("includeCategorySlugs", id)}
                        onExclude={(id) => toggleList("excludeCategorySlugs", id)}
                        includedChips={form.includeCategorySlugs.map((slug) => ({ id: slug, label: categoryMap.get(slug)?.label || slug }))}
                        excludedChips={form.excludeCategorySlugs.map((slug) => ({ id: slug, label: categoryMap.get(slug)?.label || slug }))}
                      />
                    )}

                    <EligibilitySummary title="Brands" all={form.includeAllBrands} includeCount={form.includeBrands.length} excludeCount={form.excludeBrands.length} onEdit={() => setActiveEligibility(activeEligibility === "brands" ? null : "brands")} />
                    {activeEligibility === "brands" && (
                      <RulePanel
                        includeAllLabel="Include all brands"
                        includeAll={form.includeAllBrands}
                        onToggleAll={(checked) => toggleIncludeAll("brands", checked)}
                        search={brandSearch}
                        setSearch={setBrandSearch}
                        searchPlaceholder="Search brands..."
                        options={filteredBrands.map((brand) => ({ id: brand, label: brand }))}
                        includeIds={form.includeBrands}
                        excludeIds={form.excludeBrands}
                        onInclude={(id) => toggleList("includeBrands", id)}
                        onExclude={(id) => toggleList("excludeBrands", id)}
                        includedChips={form.includeBrands.map((brand) => ({ id: brand, label: brand }))}
                        excludedChips={form.excludeBrands.map((brand) => ({ id: brand, label: brand }))}
                      />
                    )}
                  </div>
                )}

                {activeTab === "review" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <h3 className="font-display text-lg font-900 text-navy-950">Review promotion</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        <strong>{form.code || "No code"}</strong> gives <strong>{promotionLabel(form)}</strong>. Visibility: <strong>{visibilityLabel(form)}</strong>. Status: <strong>{form.isActive ? "Active" : "Draft"}</strong>.
                      </p>
                    </div>
                    <ReviewRows rows={[
                      ["Code", form.code || "—"],
                      ["Offer", promotionLabel(form)],
                      ["Minimum order", form.minOrderValue ? money(form.minOrderValue) : "None"],
                      ["Maximum uses", form.maxUses || "Unlimited"],
                      ["Dates", `${form.startsAt || "No start"} – ${form.endsAt || "No end"}`],
                      ["Visibility", visibilityLabel(form)],
                      ["Eligibility", eligibilitySummary || "All products, categories and brands"],
                    ]} />
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 border-t border-slate-200 bg-white px-5 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-2">
                    {form.id ? <button type="button" onClick={() => remove(form.id!)} className="btn-secondary py-2 text-xs text-red-600"><Trash2 size={14} /> Delete</button> : null}
                    <button type="button" onClick={() => setDrawerOpen(false)} className="btn-secondary py-2 text-xs">Cancel</button>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => submitPromotion(false)} disabled={saving} className="btn-secondary py-2 text-xs">Save draft</button>
                    <button type="button" onClick={() => setActiveTab("review")} className="btn-secondary py-2 text-xs"><Eye size={14} /> Review</button>
                    <button type="button" onClick={() => submitPromotion(true)} disabled={saving} className="btn-primary py-2 text-xs">{saving ? "Saving..." : "Activate promotion"}</button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function eligibilityText(promotion: Promotion) {
  const hasProductIncludes = Array.isArray(promotion.includeProductIds) && promotion.includeProductIds.length > 0;
  const pieces = [
    hasProductIncludes ? `${promotion.includeProductIds.length} included products` : "All products",
    promotion.excludeProductIds?.length ? `${promotion.excludeProductIds.length} product exclusions` : "",
    promotion.includeCategorySlugs?.length ? `${promotion.includeCategorySlugs.length} included categories` : "",
    promotion.excludeCategorySlugs?.length ? `${promotion.excludeCategorySlugs.length} category exclusions` : "",
    promotion.includeBrands?.length ? `${promotion.includeBrands.length} included brands` : "",
    promotion.excludeBrands?.length ? `${promotion.excludeBrands.length} brand exclusions` : "",
  ].filter(Boolean);
  return pieces.join(" · ");
}

function Notice({ tone, children }: { tone: "green" | "red"; children: ReactNode }) {
  return <div className={`flex gap-2 rounded-xl border px-4 py-3 text-sm ${tone === "green" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>{children}</div>;
}

function StatusChip({ status }: { status: string }) {
  const style = status === "Active" ? "bg-green-50 text-green-700" : status === "Expired" ? "bg-red-50 text-red-700" : status === "Scheduled" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600";
  return <span className={`rounded-full px-2 py-1 text-xs font-900 ${style}`}>{status}</span>;
}

function CompactGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-2">{children}</div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1 block text-[11px] font-900 uppercase tracking-wide text-gray-400">{label}</span>{children}</label>;
}

function ToggleChip({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${checked ? "border-accent bg-amber-50 text-navy-950" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
      <span className="font-900">{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-900 ${checked ? "bg-accent text-navy-950" : "bg-slate-200 text-slate-500"}`}>{checked ? "ON" : "OFF"}</span>
    </button>
  );
}

function EligibilitySummary({ title, all, includeCount, excludeCount, onEdit }: { title: string; all: boolean; includeCount: number; excludeCount: number; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div>
        <p className="font-display text-sm font-900 text-navy-950">{title}</p>
        <p className="text-xs text-gray-500">{all ? "All included" : `${includeCount} included`} · {excludeCount} excluded</p>
      </div>
      <button type="button" onClick={onEdit} className="btn-secondary py-1.5 text-xs">Edit</button>
    </div>
  );
}

function RulePanel({
  includeAllLabel,
  includeAll,
  onToggleAll,
  search,
  setSearch,
  searchPlaceholder,
  options,
  includeIds,
  excludeIds,
  onInclude,
  onExclude,
  includedChips,
  excludedChips,
}: {
  includeAllLabel: string;
  includeAll: boolean;
  onToggleAll: (checked: boolean) => void;
  search: string;
  setSearch: (value: string) => void;
  searchPlaceholder: string;
  options: Array<{ id: string; label: string; sub?: string }>;
  includeIds: string[];
  excludeIds: string[];
  onInclude: (id: string) => void;
  onExclude: (id: string) => void;
  includedChips: Array<{ id: string; label: string }>;
  excludedChips: Array<{ id: string; label: string }>;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <label className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm">
        <span className="font-900 text-navy-950">{includeAllLabel}</span>
        <input type="checkbox" checked={includeAll} onChange={(event) => onToggleAll(event.target.checked)} />
      </label>

      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
        <input className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-accent" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={searchPlaceholder} />
      </div>

      <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white">
        {options.map((option) => {
          const included = includeIds.includes(option.id);
          const excluded = excludeIds.includes(option.id);
          return (
            <div key={option.id} className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 last:border-b-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-800 text-navy-950">{option.label}</p>
                {option.sub ? <p className="truncate text-xs text-gray-400">{option.sub}</p> : null}
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={() => onInclude(option.id)} className={`rounded-full px-2 py-1 text-[11px] font-900 ${included ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>{included ? "Included" : "Include"}</button>
                <button type="button" onClick={() => onExclude(option.id)} className={`rounded-full px-2 py-1 text-[11px] font-900 ${excluded ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-500"}`}>{excluded ? "Excluded" : "Exclude"}</button>
              </div>
            </div>
          );
        })}
        {!options.length ? <p className="px-3 py-3 text-sm text-gray-400">No matching records.</p> : null}
      </div>

      <ChipGroup title="Included" chips={includedChips} onRemove={onInclude} />
      <ChipGroup title="Excluded" chips={excludedChips} onRemove={onExclude} />
    </div>
  );
}

function ChipGroup({ title, chips, onRemove }: { title: string; chips: Array<{ id: string; label: string }>; onRemove: (id: string) => void }) {
  if (!chips.length) return null;
  return (
    <div className="mt-3">
      <p className="mb-1 text-[11px] font-900 uppercase tracking-wide text-gray-400">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {chips.slice(0, 30).map((chip) => (
          <span key={chip.id} className="inline-flex max-w-full items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600">
            <span className="max-w-[220px] truncate">{chip.label}</span>
            <button type="button" onClick={() => onRemove(chip.id)} className="text-gray-400 hover:text-red-600"><X size={11} /></button>
          </span>
        ))}
        {chips.length > 30 ? <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] text-slate-600">+{chips.length - 30} more</span> : null}
      </div>
    </div>
  );
}

function ReviewRows({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[150px_1fr] border-b border-slate-100 last:border-b-0">
          <div className="bg-slate-50 px-3 py-2 text-xs font-900 uppercase tracking-wide text-gray-400">{label}</div>
          <div className="px-3 py-2 text-sm text-slate-700">{value}</div>
        </div>
      ))}
    </div>
  );
}
