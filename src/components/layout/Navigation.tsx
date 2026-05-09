"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, Search, ShoppingCart, X } from "lucide-react";
import { readCartLines } from "@/lib/cart";

const SHOP_CATS = [
  { name: "Lab & Scientific", slug: "lab-scientific", image: "/images/categories/real/lab-instrument.svg", items: ["Spectrometers", "Analysers", "Microscopes", "Chromatography", "Centrifuges"] },
  { name: "Automation & Control", slug: "automation-control", image: "/images/categories/real/plc-module.svg", items: ["PLCs", "HMI Panels", "Drives", "Servo Systems", "Sensors"] },
  { name: "Test & Detection", slug: "test-detection", image: "/images/categories/real/oscilloscope.svg", items: ["Oscilloscopes", "Power Analysers", "Multimeters", "OTDR", "Signal Generators"] },
  { name: "IT & Networking", slug: "it-networking", image: "/images/categories/real/server-switch.svg", items: ["Servers", "Switches", "Storage", "UPS", "Cabling"] },
  { name: "Display & AV", slug: "display-av", image: "/images/categories/real/projector.svg", items: ["Projectors", "Broadcast", "Video Walls", "Lenses", "Audio"] },
  { name: "Oil & Gas", slug: "oil-gas", image: "/images/categories/real/gas-detector.svg", items: ["Gas Detection", "Flow Meters", "Pressure", "Valves", "Safety"] },
  { name: "Manufacturing", slug: "manufacturing", image: "/images/categories/real/robot-arm.svg", items: ["CNC Controls", "Vision", "Motors", "Robots", "Conveyors"] },
  { name: "Audio & Broadcast", slug: "audio-broadcast", image: "/images/categories/real/audio-broadcast.svg", items: ["Mixers", "Amplifiers", "Transmitters", "Recording", "Cabling"] },
];

const NAV = [
  { label: "Asset Recovery", href: "/asset-recovery" },
  { label: "Repairs", href: "/repair" },
  { label: "Manufacturers", href: "/manufacturers" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

function WAIcon() {
  return (
    <svg viewBox="0 0 24 24" className="block h-4 w-4 shrink-0 align-middle" aria-hidden="true" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26C2.168 6.443 6.603 2.009 12.055 2.009c2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

export default function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [megaSearch, setMegaSearch] = useState("");
  const [megaSearchError, setMegaSearchError] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const syncCart = () => setCartCount(readCartLines().reduce((sum, line) => sum + line.qty, 0));
    syncCart();
    window.addEventListener("storage", syncCart);
    window.addEventListener("combay-cart-updated", syncCart as EventListener);
    return () => {
      window.removeEventListener("storage", syncCart);
      window.removeEventListener("combay-cart-updated", syncCart as EventListener);
    };
  }, []);

  const openShop = () => { if (closeTimer.current) clearTimeout(closeTimer.current); setShopOpen(true); };
  const closeShop = () => { closeTimer.current = setTimeout(() => setShopOpen(false), 140); };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/95">
      <div className="site-shell">
        <div className="flex h-[68px] items-center justify-between gap-4">
          <Link href="/" className="group flex flex-shrink-0 items-center" aria-label="Combay home">
            <img src="/images/combay-logo.svg" alt="Combay" className="h-10 w-auto max-w-[180px] object-contain" />
          </Link>

          <nav className="hidden h-full items-center lg:flex">
            <div className="relative flex h-full items-center" onMouseEnter={openShop} onMouseLeave={closeShop}>
              <button className="flex h-full items-center gap-1.5 border-b-2 border-transparent px-4 text-sm font-800 text-slate-700 transition-colors hover:border-[#E8A44A] hover:text-[#2D4F7A]">
                Shop <ChevronDown size={14} className={`transition-transform ${shopOpen ? "rotate-180" : ""}`} />
              </button>
              {shopOpen && (
                <div className="absolute left-0 top-full w-[960px] overflow-hidden rounded-b-2xl border border-slate-200 bg-white shadow-2xl">
                  <div className="grid grid-cols-4 gap-px bg-slate-100 p-px">
                    {SHOP_CATS.map((cat) => (
                      <Link key={cat.slug} href={`/shop?category=${cat.slug}`} className="group bg-white p-4 transition-colors hover:bg-slate-50">
                        <div className="mb-2 flex items-center gap-3">
                          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-slate-50">
                            <img src={cat.image} alt="" className="h-12 w-12 object-contain" />
                          </span>
                          <span className="font-display text-sm font-900 text-[#2D4F7A] group-hover:text-[#C9872F]">{cat.name}</span>
                        </div>
                        <ul className="space-y-1 pl-[60px]">
                          {cat.items.map((item) => <li key={item} className="text-xs text-slate-500">{item}</li>)}
                        </ul>
                      </Link>
                    ))}
                  </div>
                  <form action="/shop" method="get" onSubmit={(event) => { if (!megaSearch.trim()) { event.preventDefault(); setMegaSearchError(true); return; } setShopOpen(false); }} className="bg-slate-50 px-6 py-4">
                    <div className="flex items-start justify-between gap-3">
                    <label className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg border bg-white px-3 py-2 text-xs font-800 text-slate-500 shadow-sm focus-within:border-[#E8A44A] ${megaSearchError ? "border-red-500 ring-2 ring-red-100" : "border-slate-200"}`}>
                      <Search size={15} className="flex-shrink-0 text-[#C9872F]" />
                      <input
                        name="q"
                        value={megaSearch}
                        onChange={(event) => { setMegaSearch(event.target.value); if (event.target.value.trim()) setMegaSearchError(false); }}
                        placeholder="Search by SKU, MPN, model or manufacturer"
                        className="min-w-0 flex-1 bg-transparent text-sm font-600 text-[#2D4F7A] outline-none placeholder:text-slate-400"
                      />
                    </label>
                    <button type="submit" className="btn-primary py-2 text-xs">Search stock →</button>
                    <Link href="/shop" className="btn-secondary py-2 text-xs">Browse all</Link>
                    </div>
                    {megaSearchError ? <p className="mt-2 pl-1 text-xs font-800 text-red-600">Please type something.</p> : null}
                  </form>
                </div>
              )}
            </div>
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="flex h-full items-center border-b-2 border-transparent px-3.5 text-sm font-800 text-slate-700 transition-colors hover:border-[#E8A44A] hover:text-[#2D4F7A]">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Link href="/cart" className="relative rounded-md border border-slate-200 p-2.5 text-slate-600 transition-colors hover:border-slate-400 hover:text-[#2D4F7A]" aria-label="Cart">
              <ShoppingCart size={18} />
              {cartCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E8A44A] px-1 text-[10px] font-900 text-[#2D4F7A]">{cartCount}</span>}
            </Link>
            <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP ?? "447340383334"}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-md border border-[#25D366]/50 px-3.5 py-2 text-sm font-800 leading-none text-[#128C4A] transition-colors hover:bg-[#25D366] hover:text-white">
              <WAIcon /> WhatsApp
            </a>
            <Link href="/repair" className="rounded-md bg-[#2D4F7A] px-4 py-2.5 text-sm font-900 text-white transition-colors hover:bg-[#355F8E]">Request Repair</Link>
          </div>

          <button className="rounded-md border border-slate-200 p-2.5 text-[#2D4F7A] lg:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white lg:hidden">
          <div className="site-shell py-4">
            <div className="grid gap-2">
              <Link href="/shop" className="rounded-lg bg-slate-50 px-4 py-3 font-900 text-[#2D4F7A]">Shop equipment</Link>
              {NAV.map((item) => <Link key={item.href} href={item.href} className="rounded-lg px-4 py-3 font-800 text-slate-700 hover:bg-slate-50">{item.label}</Link>)}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link href="/cart" className="btn-secondary">Cart {cartCount ? `(${cartCount})` : ""}</Link>
                <Link href="/contact" className="btn-primary">Get quote</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
