"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Search, SlidersHorizontal, X, ShoppingCart } from "lucide-react";
import { CONDITION_LABELS, type CatalogProduct } from "@/lib/catalog";
import { PUBLIC_CATEGORY_LIST, normaliseSelectedCategorySlug, selectedCategoryLabel, type PublicSubcategory } from "@/lib/categoryTaxonomy";
import { addCartItem } from "@/lib/cart";
import PublicPromotionCards, { type PromotionCardData } from "@/components/promotions/PublicPromotionCards";

const CONDITIONS = [
  { label: "All Conditions", value: "" },
  { label: "New", value: "NEW" },
  { label: "New open box", value: "NEW_OPEN_BOX" },
  { label: "Used tested", value: "USED" },
  { label: "For parts / repair", value: "FOR_PARTS" },
];

const SORT_OPTIONS = [
  { label: "Newest first", value: "newest" },
  { label: "Price: Low–High", value: "price_asc" },
  { label: "Price: High–Low", value: "price_desc" },
  { label: "Name A–Z", value: "name_asc" },
];

type ShopClientProps = { initialQuery?: string; initialCategory?: string; promotions?: PromotionCardData[] };

export default function ShopClient({ initialQuery = "", initialCategory = "", promotions = [] }: ShopClientProps) {
  const initialCategoryNormalised = normaliseSelectedCategorySlug(initialCategory);
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(() => initialCategoryNormalised);
  const [condition, setCondition] = useState("");
  const [sort, setSort] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("");
  const [categories, setCategories] = useState(PUBLIC_CATEGORY_LIST);
  const [openCategory, setOpenCategory] = useState(() => PUBLIC_CATEGORY_LIST.find((cat) => cat.slug === initialCategoryNormalised || cat.subcategories?.some((sub: PublicSubcategory) => sub.slug === initialCategoryNormalised))?.slug || "automation-control");

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (category) params.set("category", category);
      if (condition) params.set("condition", condition);
      if (priceMin) params.set("priceMin", priceMin);
      if (priceMax) params.set("priceMax", priceMax);
      const response = await fetch(`/api/products?${params.toString()}`, { cache: "no-store" });
      const result = await response.json();
      setProducts(result.products ?? []);
      setSource(result.source ?? "");
      if (Array.isArray(result.categories) && result.categories.length) setCategories(result.categories);
      setLoading(false);
    }, 160);
    return () => clearTimeout(timer);
  }, [category, condition, priceMax, priceMin, query]);

  const filtered = useMemo(() => {
    return [...products].sort((a, b) => {
      const priceA = a.priceOnRequest || a.price === null ? Number.POSITIVE_INFINITY : a.price;
      const priceB = b.priceOnRequest || b.price === null ? Number.POSITIVE_INFINITY : b.price;
      if (sort === "price_asc") return priceA - priceB;
      if (sort === "price_desc") return (priceB === Number.POSITIVE_INFINITY ? 0 : priceB) - (priceA === Number.POSITIVE_INFINITY ? 0 : priceA);
      if (sort === "name_asc") return a.title.localeCompare(b.title);
      return b.sku.localeCompare(a.sku);
    });
  }, [products, sort]);

  const clearFilters = () => { setQuery(""); setCategory(""); setCondition(""); setPriceMin(""); setPriceMax(""); };
  const hasFilters = Boolean(query || category || condition || priceMin || priceMax);
  const activeCategoryLabel = selectedCategoryLabel(category);

  function selectCategory(slug: string) {
    setCategory(slug);
    if (slug) {
      const parent = categories.find((cat) => cat.slug === slug || cat.subcategories?.some((sub: PublicSubcategory) => sub.slug === slug));
      if (parent?.slug) setOpenCategory(parent.slug);
    }
  }

  return (
    <div>
      <div className="bg-navy-950 text-white py-10"><div className="max-w-7xl mx-auto px-4"><div className="grid lg:grid-cols-[1fr_420px] gap-6 items-end"><div><p className="font-mono text-xs tracking-widest uppercase text-accent mb-2">Inventory</p><h1 className="font-display font-900 text-3xl lg:text-4xl mb-3">Browse industrial equipment</h1><p className="text-gray-400 text-sm max-w-2xl">Search tested automation, laboratory, test, AV, networking and process equipment by SKU, brand, MPN, model or manufacturer.</p></div>{promotions.length > 0 ? <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex items-center justify-between gap-3 mb-3"><div><p className="font-display font-800 text-sm text-white">Current shop offers</p><p className="text-xs text-white/60">Copy a code and apply it at checkout.</p></div></div><div className="space-y-2"><PublicPromotionCards promotions={promotions} compact /></div></div> : null}</div></div></div>
      <div className="bg-white border-b border-gray-200 py-4 sticky top-16 z-30"><div className="max-w-7xl mx-auto px-4 flex flex-col lg:flex-row gap-3 lg:items-center"><div className="relative flex-1 max-w-2xl"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search SKU, MPN, model, manufacturer, brand or product name..." className="input pl-9" /></div><select value={sort} onChange={(event) => setSort(event.target.value)} className="select lg:w-auto">{SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><button onClick={() => setShowFilters(!showFilters)} className={`flex items-center justify-center gap-1.5 border font-display font-600 text-sm px-4 py-2.5 rounded-lg transition-colors ${showFilters ? "bg-navy-900 text-white border-navy-900" : "border-gray-200 text-navy-900 hover:border-navy-900"}`}><SlidersHorizontal size={14} /> Filters {hasFilters && <span className="bg-accent text-navy-900 text-xs rounded-full w-4 h-4 flex items-center justify-center font-700">!</span>}</button>{hasFilters && <button onClick={clearFilters} className="flex items-center justify-center gap-1 text-red-500 text-sm font-600 hover:text-red-700"><X size={14} /> Clear</button>}</div></div>
      <div className="max-w-7xl mx-auto px-4 py-8"><div className="flex gap-6"><aside className={`${showFilters ? "block" : "hidden"} lg:block w-64 flex-shrink-0`}><div className="bg-white border border-gray-200 rounded-xl p-4 sticky top-36 space-y-5"><div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-display font-700 text-xs text-gray-500 uppercase tracking-wider">Category</p>
                {category ? <span className="rounded-full bg-[#FFF8E8] px-2 py-0.5 text-[10px] font-900 text-[#2D4F7A]">Selected</span> : null}
              </div>
              <button onClick={() => selectCategory("")} className={`mb-2 w-full rounded-md px-2 py-2 text-left text-sm font-display font-800 transition-colors ${!category ? "bg-navy-900 text-white" : "bg-slate-50 text-gray-700 hover:bg-gray-100"}`}>All Categories</button>
              <div className="space-y-1">
                {categories.filter((cat) => cat.slug).map((cat) => {
                  const isParentActive = category === cat.slug || cat.subcategories?.some((sub: PublicSubcategory) => sub.slug === category);
                  const open = openCategory === cat.slug || isParentActive;
                  return (
                    <div key={cat.slug} className={`rounded-lg border ${isParentActive ? "border-[#E8A44A] bg-[#FFF8E8]" : "border-slate-200 bg-white"}`}>
                      <div className="flex items-center">
                        <button onClick={() => selectCategory(cat.slug)} className={`min-w-0 flex-1 rounded-l-lg px-2 py-2 text-left text-sm font-display font-800 transition-colors ${category === cat.slug ? "bg-[#2D4F7A] text-white" : "text-[#2D4F7A] hover:bg-slate-50"}`}>
                          <span className="block leading-tight">{cat.label}</span>
                          <span className={`mt-0.5 block text-[10px] font-700 ${category === cat.slug ? "text-white/70" : "text-slate-400"}`}>All in this category</span>
                        </button>
                        <button type="button" onClick={() => setOpenCategory(open ? "" : cat.slug)} className="flex h-9 w-9 items-center justify-center rounded-r-lg text-[#2D4F7A] hover:bg-slate-50" aria-label={`Toggle ${cat.label} sub-categories`}>
                          <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
                        </button>
                      </div>
                      {open && cat.subcategories?.length ? (
                        <div className="border-t border-slate-200 px-2 py-2">
                          {cat.subcategories.map((sub: PublicSubcategory) => (
                            <button key={sub.slug} onClick={() => selectCategory(sub.slug)} className={`block w-full rounded px-2 py-1.5 text-left text-xs font-700 transition-colors ${category === sub.slug ? "bg-[#2D4F7A] text-white" : "text-slate-600 hover:bg-white"}`}>
                              {sub.label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div><div><p className="font-display font-700 text-xs text-gray-500 uppercase tracking-wider mb-2">Condition</p><div className="space-y-0.5">{CONDITIONS.map((cond) => <button key={cond.value || "all"} onClick={() => setCondition(cond.value)} className={`w-full text-left px-2 py-1.5 rounded text-sm font-display font-500 transition-colors ${condition === cond.value ? "bg-navy-900 text-white" : "text-gray-700 hover:bg-gray-50"}`}>{cond.label}</button>)}</div></div><div><p className="font-display font-700 text-xs text-gray-500 uppercase tracking-wider mb-2">Price Range (£)</p><div className="flex items-center gap-2"><input type="number" placeholder="Min" value={priceMin} onChange={(event) => setPriceMin(event.target.value)} className="input w-full text-sm" /><span className="text-gray-400 flex-shrink-0">–</span><input type="number" placeholder="Max" value={priceMax} onChange={(event) => setPriceMax(event.target.value)} className="input w-full text-sm" /></div></div></div></aside>
        <div className="flex-1 min-w-0"><div className="flex items-center justify-between mb-5"><div>
                  <p className="text-sm text-gray-500"><span className="font-display font-700 text-navy-900">{filtered.length}</span> items found {loading && "· loading…"}</p>
                  {category ? <p className="mt-1 text-xs font-900 text-[#2D4F7A]">Showing category: <span className="rounded bg-[#FFF8E8] px-2 py-0.5 text-[#C9872F]">{activeCategoryLabel}</span></p> : null}
                </div><p className="hidden md:block text-xs text-gray-400">Source: {source || "database"}</p></div>{filtered.length === 0 && !loading ? <div className="text-center py-20 text-gray-400"><div className="text-4xl mb-3">🔍</div><p className="font-display font-600 text-navy-900 mb-1">No items found</p><p className="text-sm mb-4">Try a brand, SKU, MPN, model or category.</p><button onClick={clearFilters} className="btn-secondary">Clear all filters</button></div> : <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{filtered.map((product) => <ProductCard key={product.id} product={product} />)}</div>}</div>
      </div></div>
    </div>
  );
}

function ProductCard({ product }: { product: CatalogProduct }) {
  const condition = CONDITION_LABELS[product.condition];
  const hasVariants = Boolean(product.variants?.length);
  const stockCopy = product.stockQty === 0 ? "Out of stock" : product.stockQty === 1 ? "Low stock" : `In stock (${product.stockQty})`;

  return (
    <div className="card card-hover flex flex-col">
      <div className="bg-gray-50 border-b border-gray-100 aspect-[4/3] flex items-center justify-center relative overflow-hidden">
        {product.image ? <img src={product.image} alt={product.title} className="object-contain w-full h-full p-4" /> : <div className="text-gray-300 text-4xl">📦</div>}
        <span className={`absolute top-2 left-2 badge border ${condition.color}`}>{condition.label}</span>
        {hasVariants ? <span className="absolute top-2 right-2 badge border bg-white/95 text-[#2D4F7A] border-[#D8E0EA]">Options</span> : null}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <p className="font-mono text-[11px] text-gray-400 mb-1">{product.sku} · {product.brand}</p>
        <h3 className="font-display font-700 text-navy-900 text-sm leading-snug mb-3 flex-1">{product.title}</h3>
        <div className="space-y-1 text-xs text-gray-500 mb-3">
          <p><span className="text-gray-400">MPN:</span> {product.mpn}</p>
          <p><span className="text-gray-400">Category:</span> {product.category}{product.subcategory ? ` / ${product.subcategory}` : ""}</p>
          {hasVariants ? <p><span className="text-gray-400">Variations:</span> Choose option before purchase</p> : null}
        </div>
        <div className="flex items-end justify-between mb-3">
          <div>
            {product.priceOnRequest || product.price === null ? <span className="font-display font-700 text-sm text-gray-600">Price on request</span> : <span className="font-display font-800 text-lg text-navy-900">£{product.price.toLocaleString("en-GB")}</span>}
            <p className="text-gray-400 text-xs mt-0.5">Excl. VAT · {product.warranty}</p>
          </div>
          <span className={product.stockQty > 0 ? "text-green-700 text-xs font-600" : "text-red-600 text-xs font-600"}>{stockCopy}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/shop/${product.slug}`} className="text-center btn-secondary text-xs py-2 px-3">View</Link>
          <Link href={`/shop/${product.slug}?quote=1`} className="text-center btn-primary text-xs py-2 px-3">Quote</Link>
          {!product.priceOnRequest && product.price !== null && product.stockQty > 0 ? (
            hasVariants ? (
              <Link href={`/shop/${product.slug}`} className="col-span-2 text-center btn-secondary text-xs py-2 px-3">Choose option</Link>
            ) : (
              <button type="button" onClick={() => addCartItem(product, 1)} className="col-span-2 btn-secondary text-xs py-2 px-3"><ShoppingCart size={13} /> Add to cart</button>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
