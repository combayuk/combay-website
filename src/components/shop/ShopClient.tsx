"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronDown,
  Search,
  SlidersHorizontal,
  X,
  ShoppingCart,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { CONDITION_LABELS, type CatalogProduct } from "@/lib/catalog";
import {
  PUBLIC_CATEGORY_LIST,
  normaliseSelectedCategorySlug,
  selectedCategoryLabel,
  type PublicSubcategory,
} from "@/lib/categoryTaxonomy";
import { addCartItem } from "@/lib/cart";
import PublicPromotionCards, {
  type PromotionCardData,
} from "@/components/promotions/PublicPromotionCards";

const CONDITIONS = [
  { label: "All conditions", value: "" },
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

type ShopClientProps = {
  initialQuery?: string;
  initialCategory?: string;
  initialCondition?: string;
  initialPriceMin?: string;
  initialPriceMax?: string;
  initialProducts?: CatalogProduct[];
  initialCategories?: typeof PUBLIC_CATEGORY_LIST;
  initialSource?: string;
  initialTotal?: number;
  initialPage?: number;
  initialPageSize?: number;
  initialTotalPages?: number;
  promotions?: PromotionCardData[];
};

function priceLabel(product: CatalogProduct) {
  if (product.priceOnRequest || product.price === null) return "Request quote";
  return `£${product.price.toLocaleString("en-GB")}`;
}

function productBrand(product: CatalogProduct) {
  return product.brand || product.manufacturer || "Combay";
}

function dispatchCopy(product: CatalogProduct) {
  const dispatch = product.dispatchNote || product.leadTime || "";
  if (!dispatch) return product.warranty || "Warranty available";
  if (dispatch.length > 64) return `${dispatch.slice(0, 61)}…`;
  return dispatch;
}

function activeFilterLabel(type: string, value: string) {
  if (type === "category") return selectedCategoryLabel(value);
  if (type === "condition")
    return CONDITIONS.find((item) => item.value === value)?.label || value;
  if (type === "min") return `Min £${value}`;
  if (type === "max") return `Max £${value}`;
  return value;
}

export default function ShopClient({
  initialQuery = "",
  initialCategory = "",
  initialCondition = "",
  initialPriceMin = "",
  initialPriceMax = "",
  initialProducts = [],
  initialCategories = PUBLIC_CATEGORY_LIST,
  initialSource = "",
  initialTotal = initialProducts.length,
  initialPage = 1,
  initialPageSize = 24,
  initialTotalPages = 1,
  promotions = [],
}: ShopClientProps) {
  const searchParams = useSearchParams();
  const urlSignature = searchParams.toString();
  const initialCategoryNormalised =
    normaliseSelectedCategorySlug(initialCategory);
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(() => initialCategoryNormalised);
  const [condition, setCondition] = useState(initialCondition);
  const [sort, setSort] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [priceMin, setPriceMin] = useState(initialPriceMin);
  const [priceMax, setPriceMax] = useState(initialPriceMax);
  const [products, setProducts] = useState<CatalogProduct[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState(initialSource);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [categories, setCategories] = useState(
    initialCategories.length ? initialCategories : PUBLIC_CATEGORY_LIST,
  );
  const [openCategory, setOpenCategory] = useState(
    () =>
      initialCategories.find(
        (cat) =>
          cat.slug === initialCategoryNormalised ||
          cat.subcategories?.some(
            (sub: PublicSubcategory) => sub.slug === initialCategoryNormalised,
          ),
      )?.slug || "automation-control",
  );
  const initialRequestKey = useMemo(
    () =>
      `${initialQuery}|${initialCategoryNormalised}|${initialCondition}|${initialPriceMin}|${initialPriceMax}|${initialPage}|${initialPageSize}`,
    [
      initialCategoryNormalised,
      initialCondition,
      initialPage,
      initialPageSize,
      initialPriceMax,
      initialPriceMin,
      initialQuery,
    ],
  );
  const firstClientFetchSkipped = useRef(false);
  const lastLoadedKey = useRef(initialRequestKey);

  function buildParams(pageOverride = page) {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category) params.set("category", category);
    if (condition) params.set("condition", condition);
    if (priceMin) params.set("min", priceMin);
    if (priceMax) params.set("max", priceMax);
    if (pageOverride > 1) params.set("page", String(pageOverride));
    if (pageSize !== 24) params.set("pageSize", String(pageSize));
    return params;
  }

  function requestKey(pageOverride = page) {
    return `${query.trim()}|${category}|${condition}|${priceMin}|${priceMax}|${pageOverride}|${pageSize}`;
  }

  function replaceBrowserUrl() {
    if (typeof window === "undefined") return;
    const params = buildParams();
    const nextUrl = params.toString() ? `/shop?${params.toString()}` : "/shop";
    if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
      window.history.replaceState({}, "", nextUrl);
    }
  }

  async function loadProducts() {
    const key = requestKey();
    lastLoadedKey.current = key;
    setLoading(true);
    setError("");
    const params = buildParams();
    try {
      const response = await fetch(`/api/products?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Inventory request failed");
      const result = await response.json();
      setProducts(result.products ?? []);
      setSource(result.source ?? "");
      setTotal(Number(result.total ?? result.products?.length ?? 0));
      setPage(Number(result.page ?? 1));
      setPageSize(Number(result.pageSize ?? pageSize));
      setTotalPages(Number(result.totalPages ?? 1));
      if (Array.isArray(result.categories) && result.categories.length)
        setCategories(result.categories);
    } catch {
      setError(
        "Inventory could not be loaded. Please refresh the page or contact sales@combay.co.uk.",
      );
    } finally {
      setLoading(false);
    }
  }

  function applyUrlStateFromSearch(search: string) {
    const params = new URLSearchParams(search);
    const nextCategory = normaliseSelectedCategorySlug(
      params.get("category") ?? params.get("cat") ?? "",
    );
    setQuery(params.get("q") ?? "");
    setCategory(nextCategory);
    setCondition(params.get("condition") ?? "");
    setPriceMin(params.get("min") ?? params.get("priceMin") ?? "");
    setPriceMax(params.get("max") ?? params.get("priceMax") ?? "");
    setPage(Math.max(1, Number(params.get("page") || 1)));
    setPageSize(
      Math.min(48, Math.max(12, Number(params.get("pageSize") || 24))),
    );
    if (nextCategory) {
      const parent = categories.find(
        (cat) =>
          cat.slug === nextCategory ||
          cat.subcategories?.some(
            (sub: PublicSubcategory) => sub.slug === nextCategory,
          ),
      );
      if (parent?.slug) setOpenCategory(parent.slug);
    }
  }

  useEffect(() => {
    function applyCurrentUrl() {
      if (typeof window === "undefined") return;
      applyUrlStateFromSearch(window.location.search);
    }
    window.addEventListener("popstate", applyCurrentUrl);
    window.addEventListener("combay-shop-url-change", applyCurrentUrl);
    return () => {
      window.removeEventListener("popstate", applyCurrentUrl);
      window.removeEventListener("combay-shop-url-change", applyCurrentUrl);
    };
  }, [categories]);

  useEffect(() => {
    // Handles Next.js Link navigations to /shop?category=... from elsewhere. The
    // custom in-page mega-menu event above handles clicks while already on /shop.
    applyUrlStateFromSearch(urlSignature ? `?${urlSignature}` : "");
  }, [urlSignature]);

  useEffect(() => {
    const key = requestKey();
    if (!firstClientFetchSkipped.current) {
      firstClientFetchSkipped.current = true;
      lastLoadedKey.current = key;
      return;
    }
    const timer = setTimeout(() => {
      replaceBrowserUrl();
      if (lastLoadedKey.current === key) return;
      loadProducts();
    }, 220);
    return () => clearTimeout(timer);
  }, [category, condition, priceMax, priceMin, query, page, pageSize]);

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const priceA =
        a.priceOnRequest || a.price === null
          ? Number.POSITIVE_INFINITY
          : a.price;
      const priceB =
        b.priceOnRequest || b.price === null
          ? Number.POSITIVE_INFINITY
          : b.price;
      if (sort === "price_asc") return priceA - priceB;
      if (sort === "price_desc")
        return (
          (priceB === Number.POSITIVE_INFINITY ? 0 : priceB) -
          (priceA === Number.POSITIVE_INFINITY ? 0 : priceA)
        );
      if (sort === "name_asc") return a.title.localeCompare(b.title);
      return b.sku.localeCompare(a.sku);
    });
  }, [products, sort]);

  const clearFilters = () => {
    setQuery("");
    setCategory("");
    setCondition("");
    setPriceMin("");
    setPriceMax("");
    setPage(1);
  };

  const hasFilters = Boolean(
    query || category || condition || priceMin || priceMax,
  );
  const activeCategoryLabel =
    categories.find((cat) => cat.slug === category)?.label ||
    categories
      .flatMap((cat) => cat.subcategories || [])
      .find((sub: PublicSubcategory) => sub.slug === category)?.label ||
    selectedCategoryLabel(category);
  const activeFilters = [
    query
      ? { key: "q", type: "search", value: query, label: `Search: ${query}` }
      : null,
    category
      ? {
          key: "category",
          type: "category",
          value: category,
          label: activeFilterLabel("category", category),
        }
      : null,
    condition
      ? {
          key: "condition",
          type: "condition",
          value: condition,
          label: activeFilterLabel("condition", condition),
        }
      : null,
    priceMin
      ? {
          key: "min",
          type: "min",
          value: priceMin,
          label: activeFilterLabel("min", priceMin),
        }
      : null,
    priceMax
      ? {
          key: "max",
          type: "max",
          value: priceMax,
          label: activeFilterLabel("max", priceMax),
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    type: string;
    value: string;
    label: string;
  }>;

  function removeFilter(key: string) {
    if (key === "q") setQuery("");
    if (key === "category") setCategory("");
    if (key === "condition") setCondition("");
    if (key === "min") setPriceMin("");
    if (key === "max") setPriceMax("");
    setPage(1);
  }

  function selectCategory(slug: string) {
    setCategory(slug);
    setPage(1);
    if (slug) {
      const parent = categories.find(
        (cat) =>
          cat.slug === slug ||
          cat.subcategories?.some(
            (sub: PublicSubcategory) => sub.slug === slug,
          ),
      );
      if (parent?.slug) setOpenCategory(parent.slug);
    }
  }

  return (
    <div className="bg-slate-50">
      <section className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[1500px] px-4 py-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_340px] lg:items-end">
            <div>
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                Industrial inventory
              </p>
              <h1 className="mb-2 font-display text-2xl font-900 leading-tight lg:text-4xl">
                B2B industrial equipment catalogue
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-white/65">
                Search by SKU, MPN, model, manufacturer or product name. Filter
                stocked automation, laboratory, test, AV, networking and process
                equipment quickly.
              </p>
            </div>
            {promotions.length > 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-sm font-900 text-white">
                      Current shop offers
                    </p>
                    <p className="text-[11px] text-white/60">
                      Copy a code and apply it at checkout.
                    </p>
                  </div>
                </div>
                <PublicPromotionCards promotions={promotions} compact />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="sticky top-16 z-30 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-2 px-4 py-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search SKU, MPN, model, manufacturer, brand or product name..."
              className="input h-10 pl-9 text-sm"
            />
          </div>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="select h-10 text-sm lg:w-48"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex h-10 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-display font-900 transition-colors lg:hidden ${showFilters ? "bg-navy-900 text-white border-navy-900" : "border-gray-200 text-navy-900 hover:border-navy-900"}`}
          >
            <SlidersHorizontal size={14} /> Filters{" "}
            {hasFilters ? (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] text-navy-900">
                {activeFilters.length}
              </span>
            ) : null}
          </button>
          {hasFilters ? (
            <button
              onClick={clearFilters}
              className="hidden h-10 items-center justify-center gap-1 rounded-lg border border-red-100 px-3 text-xs font-900 text-red-600 hover:bg-red-50 lg:flex"
            >
              <RotateCcw size={13} /> Reset
            </button>
          ) : null}
        </div>
      </div>

      <main className="mx-auto max-w-[1500px] px-4 py-5">
        <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className={`${showFilters ? "block" : "hidden"} lg:block`}>
            <div className="sticky top-32 max-h-[calc(100vh-9rem)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="font-display text-sm font-900 text-navy-950">
                    Filters
                  </p>
                  <p className="text-[11px] text-gray-400">Refine catalogue</p>
                </div>
                {hasFilters ? (
                  <button
                    onClick={clearFilters}
                    className="text-[11px] font-900 text-red-600 hover:text-red-700"
                  >
                    Reset
                  </button>
                ) : null}
              </div>

              <FilterGroup
                title="Categories"
                summary={category ? activeCategoryLabel : "All categories"}
                defaultOpen
              >
                <button
                  onClick={() => selectCategory("")}
                  className={`mb-1.5 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs font-display font-900 transition-colors ${!category ? "bg-navy-950 text-white" : "text-slate-700 hover:bg-slate-50"}`}
                >
                  <span>All inventory</span>
                  <span className="text-[10px] opacity-70">View all</span>
                </button>
                <div className="divide-y divide-slate-100">
                  {categories
                    .filter((cat) => cat.slug)
                    .map((cat) => {
                      const isParentActive =
                        category === cat.slug ||
                        cat.subcategories?.some(
                          (sub: PublicSubcategory) => sub.slug === category,
                        );
                      const open = openCategory === cat.slug || isParentActive;
                      return (
                        <div key={cat.slug} className="py-1">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => selectCategory(cat.slug)}
                              className={`min-w-0 flex-1 rounded-md px-2 py-1.5 text-left text-xs font-display font-900 transition-colors ${category === cat.slug ? "bg-[#FFF8E8] text-[#2D4F7A]" : isParentActive ? "text-[#2D4F7A]" : "text-slate-700 hover:bg-slate-50"}`}
                            >
                              <span className="block truncate">
                                {cat.label}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setOpenCategory(open ? "" : cat.slug)
                              }
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50"
                              aria-label={`Toggle ${cat.label} sub-categories`}
                            >
                              <ChevronDown
                                size={13}
                                className={`transition-transform ${open ? "rotate-180" : ""}`}
                              />
                            </button>
                          </div>
                          {open && cat.subcategories?.length ? (
                            <div className="ml-3 mt-1 border-l border-slate-200 pl-2">
                              <button
                                onClick={() => selectCategory(cat.slug)}
                                className={`mb-0.5 block w-full rounded px-2 py-1 text-left text-[11px] font-800 ${category === cat.slug ? "bg-[#2D4F7A] text-white" : "text-slate-500 hover:bg-slate-50"}`}
                              >
                                View all {cat.label}
                              </button>
                              {cat.subcategories.map(
                                (sub: PublicSubcategory) => (
                                  <button
                                    key={sub.slug}
                                    onClick={() => selectCategory(sub.slug)}
                                    className={`block w-full rounded px-2 py-1 text-left text-[11px] font-700 transition-colors ${category === sub.slug ? "bg-[#2D4F7A] text-white" : "text-slate-600 hover:bg-slate-50"}`}
                                  >
                                    {sub.label}
                                  </button>
                                ),
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                </div>
              </FilterGroup>

              <FilterGroup
                title="Condition"
                summary={
                  condition
                    ? activeFilterLabel("condition", condition)
                    : "Any condition"
                }
                defaultOpen
              >
                <div className="space-y-1">
                  {CONDITIONS.map((cond) => (
                    <button
                      key={cond.value || "all"}
                      onClick={() => {
                        setCondition(cond.value);
                        setPage(1);
                      }}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs font-display font-800 transition-colors ${condition === cond.value ? "bg-navy-950 text-white" : "text-slate-700 hover:bg-slate-50"}`}
                    >
                      <span>{cond.label}</span>
                    </button>
                  ))}
                </div>
              </FilterGroup>

              <FilterGroup
                title="Price range"
                summary={
                  priceMin || priceMax
                    ? `${priceMin ? `£${priceMin}` : "£0"} – ${priceMax ? `£${priceMax}` : "Any"}`
                    : "Any price"
                }
                defaultOpen
              >
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceMin}
                    onChange={(event) => {
                      setPriceMin(event.target.value);
                      setPage(1);
                    }}
                    className="input h-9 text-xs"
                  />
                  <span className="text-gray-400">–</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceMax}
                    onChange={(event) => {
                      setPriceMax(event.target.value);
                      setPage(1);
                    }}
                    className="input h-9 text-xs"
                  />
                </div>
              </FilterGroup>

              <FilterGroup
                title="Future filters"
                summary="Brand, warranty, dispatch"
              >
                <p className="text-[11px] leading-4 text-gray-500">
                  Brand, manufacturer, warranty and dispatch-time filters can be
                  added here without changing the shop layout.
                </p>
              </FilterGroup>
            </div>
          </aside>

          <section className="min-w-0">
            <div className="mb-3 rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  {error ? (
                    <p className="font-display text-sm font-900 text-red-700">
                      Inventory unavailable
                    </p>
                  ) : (
                    <p className="font-display text-sm font-900 text-navy-950">
                      {total > 0
                        ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total} products`
                        : "0 products"}
                      {loading ? (
                        <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-900 text-blue-700">
                          Updating…
                        </span>
                      ) : null}
                    </p>
                  )}
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    {category
                      ? `Showing ${activeCategoryLabel}`
                      : "All published inventory"}{" "}
                    {source ? `· Source: ${source}` : ""}
                  </p>
                </div>
                <div className="hidden items-center gap-2 text-[11px] text-gray-400 md:flex">
                  <span className="rounded-full bg-green-50 px-2 py-1 font-900 text-green-700">
                    Stock-led catalogue
                  </span>
                  <span className="rounded-full bg-blue-50 px-2 py-1 font-900 text-blue-700">
                    Quote or buy online
                  </span>
                </div>
              </div>

              {activeFilters.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {activeFilters.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => removeFilter(item.key)}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-800 text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                    >
                      {item.label} <X size={11} />
                    </button>
                  ))}
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-2 py-1 text-[11px] font-900 text-red-600"
                  >
                    Clear all
                  </button>
                </div>
              ) : null}
            </div>

            {loading && sortedProducts.length === 0 ? (
              <LoadingGrid />
            ) : error ? (
              <ErrorState message={error} onRetry={loadProducts} />
            ) : sortedProducts.length === 0 ? (
              <EmptyState onClear={clearFilters} />
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {sortedProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                {totalPages > 1 ? (
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs font-800 text-slate-500">
                      Page {page} of {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={page <= 1 || loading}
                        onClick={() =>
                          setPage((current) => Math.max(1, current - 1))
                        }
                        className="btn-secondary py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={page >= totalPages || loading}
                        onClick={() =>
                          setPage((current) =>
                            Math.min(totalPages, current + 1),
                          )
                        }
                        className="btn-primary py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function FilterGroup({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-slate-100 py-3 first:border-t-0 first:pt-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span>
          <span className="block font-display text-xs font-900 uppercase tracking-wide text-navy-950">
            {title}
          </span>
          {summary ? (
            <span className="mt-0.5 block truncate text-[11px] text-gray-400">
              {summary}
            </span>
          ) : null}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}

function ProductCard({ product }: { product: CatalogProduct }) {
  const condition = CONDITION_LABELS[product.condition];
  const hasVariants = Boolean(product.variants?.length);
  const stockCopy =
    product.stockQty === 0
      ? "Out of stock"
      : product.stockQty === 1
        ? "Low stock"
        : `In stock (${product.stockQty})`;
  const canBuy =
    !product.priceOnRequest &&
    product.price !== null &&
    product.stockQty > 0 &&
    !hasVariants;

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md">
      <Link
        href={`/shop/${product.slug}`}
        className="relative flex aspect-[4/3] items-center justify-center overflow-hidden border-b border-gray-100 bg-gray-50"
      >
        {product.image ? (
          <img
            src={product.image}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-contain p-3 transition-transform group-hover:scale-[1.02]"
          />
        ) : (
          <div className="text-4xl text-gray-300">📦</div>
        )}
        <span
          className={`absolute left-2 top-2 rounded-full border px-2 py-0.5 text-[10px] font-900 ${condition.color}`}
        >
          {condition.label}
        </span>
        {hasVariants ? (
          <span className="absolute right-2 top-2 rounded-full border border-[#D8E0EA] bg-white/95 px-2 py-0.5 text-[10px] font-900 text-[#2D4F7A]">
            Options
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-3">
        <div className="mb-1 flex min-w-0 items-center justify-between gap-2">
          <p className="truncate font-mono text-[10.5px] text-gray-400">
            {product.sku}
          </p>
          <span
            className={
              product.stockQty > 0
                ? "shrink-0 text-[11px] font-900 text-green-700"
                : "shrink-0 text-[11px] font-900 text-red-600"
            }
          >
            {stockCopy}
          </span>
        </div>
        <Link
          href={`/shop/${product.slug}`}
          className="mb-2 block max-h-10 overflow-hidden font-display text-sm font-900 leading-5 text-navy-950 hover:text-accent"
        >
          {product.title}
        </Link>
        <div className="mb-2 space-y-0.5 text-[11px] text-gray-500">
          <p className="truncate">
            <span className="text-gray-400">Brand:</span>{" "}
            {productBrand(product)}
          </p>
          <p className="truncate">
            <span className="text-gray-400">MPN:</span>{" "}
            {product.mpn || product.model || "—"}
          </p>
          <p className="truncate">
            <span className="text-gray-400">Category:</span>{" "}
            {product.subcategory || product.category}
          </p>
        </div>
        <div className="mt-auto">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="font-display text-base font-900 text-navy-950">
                {priceLabel(product)}
              </p>
              <p className="max-w-[180px] truncate text-[10.5px] text-gray-400">
                {dispatchCopy(product)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {canBuy ? (
              <button
                type="button"
                onClick={() => addCartItem(product, 1)}
                className="btn-primary py-2 px-2 text-[11px]"
              >
                <ShoppingCart size={12} /> Buy now
              </button>
            ) : (
              <Link
                href={`/shop/${product.slug}?quote=1`}
                className="btn-primary py-2 px-2 text-center text-[11px]"
              >
                Request quote
              </Link>
            )}
            <Link
              href={`/shop/${product.slug}`}
              className="btn-secondary py-2 px-2 text-center text-[11px]"
            >
              View details
            </Link>
            {hasVariants ? (
              <Link
                href={`/shop/${product.slug}`}
                className="col-span-2 rounded-md border border-slate-200 px-2 py-1.5 text-center text-[11px] font-900 text-[#2D4F7A] hover:bg-slate-50"
              >
                Choose option
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function LoadingGrid() {
  return (
    <div>
      <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        Loading inventory…
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-[310px] animate-pulse rounded-xl border border-gray-200 bg-white shadow-sm"
          >
            <div className="h-36 bg-slate-100" />
            <div className="space-y-3 p-3">
              <div className="h-3 w-24 rounded bg-slate-100" />
              <div className="h-4 rounded bg-slate-100" />
              <div className="h-4 w-3/4 rounded bg-slate-100" />
              <div className="h-8 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-12 text-center shadow-sm">
      <div className="mb-3 text-4xl">🔍</div>
      <p className="mb-1 font-display text-lg font-900 text-navy-950">
        No products match your current filters.
      </p>
      <p className="mb-5 text-sm text-gray-500">
        Try clearing filters or searching by SKU, brand, model or manufacturer.
      </p>
      <button onClick={onClear} className="btn-secondary py-2 text-xs">
        Clear filters
      </button>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-10 text-center shadow-sm">
      <AlertTriangle className="mx-auto mb-3 text-red-600" size={28} />
      <p className="mb-1 font-display text-lg font-900 text-red-800">
        Inventory could not be loaded
      </p>
      <p className="mx-auto mb-5 max-w-xl text-sm text-red-700">{message}</p>
      <button
        onClick={onRetry}
        className="rounded-lg bg-red-700 px-4 py-2 text-xs font-900 text-white hover:bg-red-800"
      >
        Retry loading inventory
      </button>
    </div>
  );
}
