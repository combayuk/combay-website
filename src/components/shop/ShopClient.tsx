"use client";
import { useState, useCallback } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";

const CATEGORIES = [
  { label:"All Categories",       slug:"" },
  { label:"Lab & Scientific",     slug:"lab-scientific" },
  { label:"Automation & Control", slug:"automation-control" },
  { label:"Test & Detection",     slug:"test-detection" },
  { label:"IT & Networking",      slug:"it-networking" },
  { label:"Display & AV",        slug:"display-av" },
  { label:"Oil & Gas",            slug:"oil-gas" },
  { label:"Audio & Broadcast",   slug:"audio-broadcast" },
  { label:"Manufacturing",        slug:"manufacturing" },
];

const CONDITIONS = [
  { label:"All Conditions",   value:"" },
  { label:"New",              value:"NEW" },
  { label:"New (Open Box)",   value:"NEW_OPEN_BOX" },
  { label:"Used",             value:"USED" },
  { label:"For Parts",        value:"FOR_PARTS" },
];

const SORT_OPTIONS = [
  { label:"Newest First",     value:"newest" },
  { label:"Price: Low–High",  value:"price_asc" },
  { label:"Price: High–Low",  value:"price_desc" },
  { label:"Name A–Z",         value:"name_asc" },
];

// Demo products — replaced by DB once connected
const DEMO_PRODUCTS = Array.from({length: 24}, (_, i) => ({
  id: `prod-${i+1}`,
  slug: `product-${i+1}`,
  title: ["Siemens S7-400 PLC Module","Thermo Scientific FT-IR IS5","ABB ACS550 AC Drive 75kW","Tektronix MDO3054 Oscilloscope","GE Fanuc 90-30 PLC","Mitsubishi FR-A800 Drive","Rigel 288+ Safety Analyser","Barco RLM W12 Projector","Cisco Catalyst 3750 Stack","Yamaha DM1000 Mixer","OHAUS Ranger 7000 Scale","Exfo AXS-200/850 OTDR","Honeywell HC900 Controller","Dräger X-am 5000 Detector","Agilent DSO6054A Scope","Siemens S7-300 CPU 315","ABB Robot Controller","Leica TS06 Total Station","Keithley 2401 SMU","Panasonic PT-DZ870 Projector","Emerson DeltaV Controller","Fluke 435-II Power Analyser","Heidenhain TNC 530","Endress+Hauser Promag"][i % 24],
  brand: ["Siemens","Thermo Scientific","ABB","Tektronix","GE","Mitsubishi","Rigel","Barco","Cisco","Yamaha","OHAUS","EXFO","Honeywell","Dräger","Agilent","Siemens","ABB","Leica","Keithley","Panasonic","Emerson","Fluke","Heidenhain","Endress+Hauser"][i % 24],
  category: CATEGORIES[1 + (i % 8)].label,
  categorySlug: CATEGORIES[1 + (i % 8)].slug,
  condition: ["NEW","USED","NEW_OPEN_BOX","USED","FOR_PARTS","USED","NEW","USED"][i % 8],
  price: [1240, 2450, 890, 875, 340, 1100, 420, 3200, 435, 1850, 290, 780, 920, 480, 1650, 980, 2100, 4500, 1380, 2900, 3400, 960, 1780, 650][i % 24],
  priceOnRequest: i % 7 === 0,
  sku: `CB${String(10000+i).padStart(5,'0')}`,
  stockQty: Math.max(1, (i % 5)),
  image: null,
}));

const CONDITION_BADGE: Record<string,{label:string,color:string}> = {
  NEW:          {label:"New",           color:"text-green-700 bg-green-50 border-green-200"},
  NEW_OPEN_BOX: {label:"New (Open Box)",color:"text-blue-700 bg-blue-50 border-blue-200"},
  USED:         {label:"Used",          color:"text-yellow-700 bg-yellow-50 border-yellow-200"},
  FOR_PARTS:    {label:"For Parts",     color:"text-red-700 bg-red-50 border-red-200"},
};

export default function ShopClient() {
  const [query,     setQuery]     = useState("");
  const [category,  setCategory]  = useState("");
  const [condition, setCondition] = useState("");
  const [sort,      setSort]      = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [priceMin,  setPriceMin]  = useState("");
  const [priceMax,  setPriceMax]  = useState("");

  const filtered = DEMO_PRODUCTS.filter(p => {
    if (query && !p.title.toLowerCase().includes(query.toLowerCase()) && !p.brand.toLowerCase().includes(query.toLowerCase())) return false;
    if (category && p.categorySlug !== category) return false;
    if (condition && p.condition !== condition) return false;
    if (priceMin && !p.priceOnRequest && p.price < parseFloat(priceMin)) return false;
    if (priceMax && !p.priceOnRequest && p.price > parseFloat(priceMax)) return false;
    return true;
  }).sort((a, b) => {
    if (sort === "price_asc")  return (a.priceOnRequest ? 999999 : a.price) - (b.priceOnRequest ? 999999 : b.price);
    if (sort === "price_desc") return (b.priceOnRequest ? 0 : b.price) - (a.priceOnRequest ? 0 : a.price);
    if (sort === "name_asc")   return a.title.localeCompare(b.title);
    return b.id.localeCompare(a.id);
  });

  const clearFilters = () => { setQuery(""); setCategory(""); setCondition(""); setPriceMin(""); setPriceMax(""); };
  const hasFilters   = query || category || condition || priceMin || priceMax;

  return (
    <div>
      {/* Shop header */}
      <div className="bg-navy-950 text-white py-10">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-mono text-xs tracking-widest uppercase text-accent mb-2">Inventory</p>
          <h1 className="font-display font-900 text-3xl lg:text-4xl mb-3">Browse Equipment</h1>
          <p className="text-gray-400 text-sm max-w-lg">~10,000 industrial and commercial items. Tested. Warranted. Ready to dispatch.</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="bg-white border-b border-gray-200 py-4 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 flex gap-3 items-center">
          <div className="relative flex-1 max-w-lg">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input
              type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search by product name, brand, model or part number..."
              className="input pl-9"
            />
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)} className="select w-auto">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 border font-display font-600 text-sm px-4 py-2.5 rounded-lg transition-colors ${showFilters ? "bg-navy-900 text-white border-navy-900" : "border-gray-200 text-navy-900 hover:border-navy-900"}`}>
            <SlidersHorizontal size={14}/> Filters {hasFilters && <span className="bg-accent text-navy-900 text-xs rounded-full w-4 h-4 flex items-center justify-center font-700">!</span>}
          </button>
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-red-500 text-sm font-600 hover:text-red-700">
              <X size={14}/> Clear
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-6">

          {/* Sidebar filters */}
          <aside className={`${showFilters ? "block" : "hidden"} lg:block w-56 flex-shrink-0`}>
            <div className="bg-white border border-gray-200 rounded-xl p-4 sticky top-36 space-y-5">
              <div>
                <p className="font-display font-700 text-xs text-gray-500 uppercase tracking-wider mb-2">Category</p>
                <div className="space-y-0.5">
                  {CATEGORIES.map(c => (
                    <button key={c.slug} onClick={() => setCategory(c.slug)}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm font-display font-500 transition-colors ${category===c.slug ? "bg-navy-900 text-white" : "text-gray-700 hover:bg-gray-50"}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-display font-700 text-xs text-gray-500 uppercase tracking-wider mb-2">Condition</p>
                <div className="space-y-0.5">
                  {CONDITIONS.map(c => (
                    <button key={c.value} onClick={() => setCondition(c.value)}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm font-display font-500 transition-colors ${condition===c.value ? "bg-navy-900 text-white" : "text-gray-700 hover:bg-gray-50"}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-display font-700 text-xs text-gray-500 uppercase tracking-wider mb-2">Price Range (£)</p>
                <div className="flex items-center gap-2">
                  <input type="number" placeholder="Min" value={priceMin} onChange={e=>setPriceMin(e.target.value)} className="input w-full text-sm"/>
                  <span className="text-gray-400 flex-shrink-0">–</span>
                  <input type="number" placeholder="Max" value={priceMax} onChange={e=>setPriceMax(e.target.value)} className="input w-full text-sm"/>
                </div>
              </div>
            </div>
          </aside>

          {/* Product grid */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-gray-500"><span className="font-display font-700 text-navy-900">{filtered.length}</span> items found</p>
            </div>
            {filtered.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <div className="text-4xl mb-3">🔍</div>
                <p className="font-display font-600 text-navy-900 mb-1">No items found</p>
                <p className="text-sm mb-4">Try adjusting your search or filters</p>
                <button onClick={clearFilters} className="btn-secondary">Clear all filters</button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map(p => <ProductCard key={p.id} product={p}/>)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product: p }: { product: typeof DEMO_PRODUCTS[0] }) {
  const cond = CONDITION_BADGE[p.condition] ?? {label:p.condition, color:"text-gray-700 bg-gray-50 border-gray-200"};
  return (
    <div className="card card-hover flex flex-col">
      {/* Image */}
      <div className="bg-gray-50 border-b border-gray-100 aspect-[4/3] flex items-center justify-center relative overflow-hidden">
        {p.image ? (
          <img src={p.image} alt={p.title} className="object-contain w-full h-full p-4"/>
        ) : (
          <div className="text-gray-300 text-4xl">📦</div>
        )}
        <span className={`absolute top-2 left-2 badge border ${cond.color}`}>{cond.label}</span>
        {p.stockQty === 0 && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="font-display font-700 text-sm text-gray-500">Out of Stock</span>
          </div>
        )}
      </div>
      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <p className="font-mono text-xs text-gray-400 mb-1">{p.brand} · {p.category}</p>
        <h3 className="font-display font-700 text-navy-900 text-sm leading-snug mb-3 flex-1">{p.title}</h3>
        <div className="flex items-end justify-between mb-3">
          <div>
            {p.priceOnRequest ? (
              <span className="font-display font-700 text-sm text-gray-500">Price on Request</span>
            ) : (
              <span className="font-display font-800 text-lg text-navy-900">
                £{p.price.toLocaleString("en-GB")}
              </span>
            )}
            <p className="text-gray-400 text-xs mt-0.5">SKU: {p.sku}</p>
          </div>
          {p.stockQty > 0 && <span className="text-green-600 text-xs font-600">In Stock</span>}
        </div>
        <div className="flex gap-2">
          <Link href={`/shop/${p.slug}`} className="flex-1 text-center btn-secondary text-xs py-2 px-3">View</Link>
          <Link href={`/contact?type=enquiry&product=${p.sku}`} className="flex-1 text-center btn-primary text-xs py-2 px-3">Enquire</Link>
        </div>
      </div>
    </div>
  );
}
