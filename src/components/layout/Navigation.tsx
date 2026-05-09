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
    <svg viewBox="0 0 32 32" className="h-4 w-4" aria-hidden="true" fill="currentColor">
      <path d="M16.03 3.2A12.73 12.73 0 0 0 5.08 22.4L3.2 29l6.78-1.78A12.72 12.72 0 1 0 16.03 3.2Zm0 2.22a10.5 10.5 0 1 1-5.35 19.54l-.39-.23-4.02 1.05 1.08-3.9-.26-.4A10.5 10.5 0 0 1 16.03 5.42Zm-4.37 5.22c-.24 0-.62.09-.95.45-.33.36-1.25 1.22-1.25 2.98s1.28 3.46 1.46 3.7c.18.24 2.47 3.95 6.11 5.38 3.03 1.2 3.65.96 4.31.9.66-.06 2.12-.87 2.42-1.71.3-.84.3-1.56.21-1.71-.09-.15-.33-.24-.69-.42-.36-.18-2.12-1.05-2.45-1.17-.33-.12-.57-.18-.81.18-.24.36-.93 1.17-1.14 1.41-.21.24-.42.27-.78.09-.36-.18-1.52-.56-2.89-1.78-1.07-.95-1.79-2.12-2-2.48-.21-.36-.02-.56.16-.74.16-.16.36-.42.54-.63.18-.21.24-.36.36-.6.12-.24.06-.45-.03-.63-.09-.18-.81-1.95-1.11-2.67-.29-.7-.59-.6-.81-.61l-.69-.01Z" />
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
            <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP ?? "447340383334"}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-md border border-[#25D366]/50 px-3.5 py-2 text-sm font-800 text-[#128C4A] transition-colors hover:bg-[#25D366] hover:text-white">
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
