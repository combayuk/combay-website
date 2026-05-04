"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, X, ShoppingCart } from "lucide-react";
import { CATEGORIES, CONDITION_LABELS, PRODUCTS, searchProducts, type CatalogProduct } from "@/lib/catalog";
import { addCartItem } from "@/lib/cart";

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

type ShopClientProps = {
  initialQuery?: string;
  initialCategory?: string;
};

export default function ShopClient({ initialQuery = "", initialCategory = "" }: ShopClientProps) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [condition, setCondition] = useState("");
  const [sort, setSort] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  const filtered = useMemo(() => {
    const min = priceMin ? Number(priceMin) : null;
    const max = priceMax ? Number(priceMax) : null;
    const results = searchProducts({ query, category, condition, priceMin: Number.isFinite(min) ? min : null, priceMax: Number.isFinite(max) ? max : null });

    return [...results].sort((a, b) => {
      const priceA = a.priceOnRequest || a.price === null ? Number.POSITIVE_INFINITY : a.price;
      const priceB = b.priceOnRequest || b.price === null ? Number.POSITIVE_INFINITY : b.price;
      if (sort === "price_asc") return priceA - priceB;
      if (sort === "price_desc") return (priceB === Number.POSITIVE_INFINITY ? 0 : priceB) - (priceA === Number.POSITIVE_INFINITY ? 0 : priceA);
      if (sort === "name_asc") return a.title.localeCompare(b.title);
      return b.sku.localeCompare(a.sku);
    });
  }, [category, condition, priceMax, priceMin, query, sort]);

  const clearFilters = () => {
    setQuery("");
    setCategory("");
    setCondition("");
    setPriceMin("");
    setPriceMax("");
  };

  const hasFilters = Boolean(query || category || condition || priceMin || priceMax);

  return (
    <div>
      <div className="bg-navy-950 text-white py-10">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-mono text-xs tracking-widest uppercase text-accent mb-2">Inventory</p>
          <h1 className="font-display font-900 text-3xl lg:text-4xl mb-3">Browse industrial equipment</h1>
          <p className="text-gray-400 text-sm max-w-2xl">
            Search tested automation, laboratory, test, AV, networking and process equipment by SKU, brand, MPN, model or manufacturer.
          </p>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 py-4 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1 max-w-2xl">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search SKU, MPN, model, manufacturer, brand or product name..."
              className="input pl-9"
            />
          </div>
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="select lg:w-auto">
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center gap-1.5 border font-display font-600 text-sm px-4 py-2.5 rounded-lg transition-colors ${showFilters ? "bg-navy-900 text-white border-navy-900" : "border-gray-200 text-navy-900 hover:border-navy-900"}`}
          >
            <SlidersHorizontal size={14} /> Filters {hasFilters && <span className="bg-accent text-navy-900 text-xs rounded-full w-4 h-4 flex items-center justify-center font-700">!</span>}
          </button>
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center justify-center gap-1 text-red-500 text-sm font-600 hover:text-red-700">
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-6">
          <aside className={`${showFilters ? "block" : "hidden"} lg:block w-56 flex-shrink-0`}>
            <div className="bg-white border border-gray-200 rounded-xl p-4 sticky top-36 space-y-5">
              <div>
                <p className="font-display font-700 text-xs text-gray-500 uppercase tracking-wider mb-2">Category</p>
                <div className="space-y-0.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.slug || "all"}
                      onClick={() => setCategory(cat.slug)}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm font-display font-500 transition-colors ${category === cat.slug ? "bg-navy-900 text-white" : "text-gray-700 hover:bg-gray-50"}`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-display font-700 text-xs text-gray-500 uppercase tracking-wider mb-2">Condition</p>
                <div className="space-y-0.5">
                  {CONDITIONS.map((cond) => (
                    <button
                      key={cond.value || "all"}
                      onClick={() => setCondition(cond.value)}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm font-display font-500 transition-colors ${condition === cond.value ? "bg-navy-900 text-white" : "text-gray-700 hover:bg-gray-50"}`}
                    >
                      {cond.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-display font-700 text-xs text-gray-500 uppercase tracking-wider mb-2">Price Range (£)</p>
                <div className="flex items-center gap-2">
                  <input type="number" placeholder="Min" value={priceMin} onChange={(event) => setPriceMin(event.target.value)} className="input w-full text-sm" />
                  <span className="text-gray-400 flex-shrink-0">–</span>
                  <input type="number" placeholder="Max" value={priceMax} onChange={(event) => setPriceMax(event.target.value)} className="input w-full text-sm" />
                </div>
              </div>
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-gray-500"><span className="font-display font-700 text-navy-900">{filtered.length}</span> of {PRODUCTS.length} items found</p>
              <p className="hidden md:block text-xs text-gray-400">Structured product catalogue ready for Prisma/eBay sync.</p>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <div className="text-4xl mb-3">🔍</div>
                <p className="font-display font-600 text-navy-900 mb-1">No items found</p>
                <p className="text-sm mb-4">Try a brand, SKU, MPN, model or category.</p>
                <button onClick={clearFilters} className="btn-secondary">Clear all filters</button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((product) => <ProductCard key={product.id} product={product} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: CatalogProduct }) {
  const condition = CONDITION_LABELS[product.condition];
  const stockCopy = product.stockQty === 0 ? "Out of stock" : product.stockQty === 1 ? "Low stock" : `In stock (${product.stockQty})`;

  return (
    <div className="card card-hover flex flex-col">
      <div className="bg-gray-50 border-b border-gray-100 aspect-[4/3] flex items-center justify-center relative overflow-hidden">
        {product.image ? (
          <img src={product.image} alt={product.title} className="object-contain w-full h-full p-4" />
        ) : (
          <div className="text-gray-300 text-4xl">📦</div>
        )}
        <span className={`absolute top-2 left-2 badge border ${condition.color}`}>{condition.label}</span>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <p className="font-mono text-[11px] text-gray-400 mb-1">{product.sku} · {product.brand}</p>
        <h3 className="font-display font-700 text-navy-900 text-sm leading-snug mb-3 flex-1">{product.title}</h3>
        <div className="space-y-1 text-xs text-gray-500 mb-3">
          <p><span className="text-gray-400">MPN:</span> {product.mpn}</p>
          <p><span className="text-gray-400">Category:</span> {product.category}</p>
        </div>
        <div className="flex items-end justify-between mb-3">
          <div>
            {product.priceOnRequest || product.price === null ? (
              <span className="font-display font-700 text-sm text-gray-600">Price on request</span>
            ) : (
              <span className="font-display font-800 text-lg text-navy-900">£{product.price.toLocaleString("en-GB")}</span>
            )}
            <p className="text-gray-400 text-xs mt-0.5">Excl. VAT · {product.warranty}</p>
          </div>
          <span className={product.stockQty > 0 ? "text-green-700 text-xs font-600" : "text-red-600 text-xs font-600"}>{stockCopy}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/shop/${product.slug}`} className="text-center btn-secondary text-xs py-2 px-3">View</Link>
          <Link href={`/shop/${product.slug}?quote=1`} className="text-center btn-primary text-xs py-2 px-3">Quote</Link>
          {!product.priceOnRequest && product.price !== null && product.stockQty > 0 && (
            <button
              type="button"
              onClick={() => addCartItem(product.sku, 1)}
              className="col-span-2 btn-secondary text-xs py-2 px-3"
            >
              <ShoppingCart size={13} /> Add to cart
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
