"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Menu, Search, ShoppingCart, X } from "lucide-react";
import { readCartLines } from "@/lib/cart";

const SHOP_CATS = [
  { name: "Lab & Scientific", slug: "lab-scientific", image: "/images/categories/lab-instrument.svg", items: ["Spectrometers", "Analysers", "Microscopes", "Chromatography", "Centrifuges"] },
  { name: "Automation & Control", slug: "automation-control", image: "/images/categories/automation-plc.svg", items: ["PLCs", "HMI Panels", "Drives", "Servo Systems", "Sensors"] },
  { name: "Test & Detection", slug: "test-detection", image: "/images/categories/oscilloscope.svg", items: ["Oscilloscopes", "Power Analysers", "Multimeters", "OTDR", "Signal Generators"] },
  { name: "IT & Networking", slug: "it-networking", image: "/images/categories/server-switch.svg", items: ["Servers", "Switches", "Storage", "UPS", "Cabling"] },
  { name: "Display & AV", slug: "display-av", image: "/images/categories/projector.svg", items: ["Projectors", "Broadcast", "Video Walls", "Lenses", "Audio"] },
  { name: "Oil & Gas", slug: "oil-gas", image: "/images/categories/gas-detector.svg", items: ["Gas Detection", "Flow Meters", "Pressure", "Valves", "Safety"] },
  { name: "Manufacturing", slug: "manufacturing", image: "/images/categories/robot-arm.svg", items: ["CNC Controls", "Vision", "Motors", "Robots", "Conveyors"] },
  { name: "Audio & Broadcast", slug: "audio-broadcast", image: "/images/categories/audio-broadcast.svg", items: ["Mixers", "Amplifiers", "Transmitters", "Recording", "Cabling"] },
];

const NAV = [
  { label: "Asset Recovery", href: "/asset-recovery" },
  { label: "Repairs", href: "/repair" },
  { label: "Manufacturers", href: "/manufacturers" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

function WAIcon() {
  return <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#25D366] text-[10px] font-900 text-white">W</span>;
}

export default function Navigation() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [megaSearch, setMegaSearch] = useState("");
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

  function submitMegaSearch(event: React.FormEvent) {
    event.preventDefault();
    const query = megaSearch.trim();
    setShopOpen(false);
    router.push(query ? `/shop?q=${encodeURIComponent(query)}` : "/shop");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/95">
      <div className="site-shell">
        <div className="flex h-[68px] items-center justify-between gap-4">
          <Link href="/" className="group flex flex-shrink-0 items-center" aria-label="Combay home">
            <img src="/images/combay-logo.svg" alt="Combay" className="h-10 w-auto max-w-[180px] object-contain" />
          </Link>

          <nav className="hidden h-full items-center lg:flex">
            <div className="relative flex h-full items-center" onMouseEnter={openShop} onMouseLeave={closeShop}>
              <button className="flex h-full items-center gap-1.5 border-b-2 border-transparent px-4 text-sm font-800 text-slate-700 transition-colors hover:border-[#D99611] hover:text-[#06101F]">
                Shop <ChevronDown size={14} className={`transition-transform ${shopOpen ? "rotate-180" : ""}`} />
              </button>
              {shopOpen && (
                <div className="absolute left-0 top-full w-[960px] overflow-hidden rounded-b-2xl border border-slate-200 bg-white shadow-2xl">
                  <div className="grid grid-cols-4 gap-px bg-slate-100 p-px">
                    {SHOP_CATS.map((cat) => (
                      <Link key={cat.slug} href={`/shop?category=${cat.slug}`} className="group bg-white p-4 transition-colors hover:bg-slate-50">
                        <div className="mb-2 flex items-center gap-3">
                          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-slate-50">
                            <img src={cat.image} alt="" className="h-10 w-10 object-contain" />
                          </span>
                          <span className="font-display text-sm font-900 text-[#06101F] group-hover:text-[#B87908]">{cat.name}</span>
                        </div>
                        <ul className="space-y-1 pl-[60px]">
                          {cat.items.map((item) => <li key={item} className="text-xs text-slate-500">{item}</li>)}
                        </ul>
                      </Link>
                    ))}
                  </div>
                  <form onSubmit={submitMegaSearch} className="flex items-center justify-between gap-3 bg-slate-50 px-6 py-4">
                    <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-800 text-slate-500 shadow-sm focus-within:border-[#D99611]">
                      <Search size={15} className="flex-shrink-0 text-[#B87908]" />
                      <input
                        value={megaSearch}
                        onChange={(event) => setMegaSearch(event.target.value)}
                        placeholder="Search by SKU, MPN, model or manufacturer"
                        className="min-w-0 flex-1 bg-transparent text-sm font-600 text-[#06101F] outline-none placeholder:text-slate-400"
                      />
                    </label>
                    <button type="submit" className="btn-primary py-2 text-xs">Search stock →</button>
                    <Link href="/shop" className="btn-secondary py-2 text-xs">Browse all</Link>
                  </form>
                </div>
              )}
            </div>
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="flex h-full items-center border-b-2 border-transparent px-3.5 text-sm font-800 text-slate-700 transition-colors hover:border-[#D99611] hover:text-[#06101F]">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Link href="/cart" className="relative rounded-md border border-slate-200 p-2.5 text-slate-600 transition-colors hover:border-slate-400 hover:text-[#06101F]" aria-label="Cart">
              <ShoppingCart size={18} />
              {cartCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#D99611] px-1 text-[10px] font-900 text-[#06101F]">{cartCount}</span>}
            </Link>
            <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP ?? "447340383334"}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-md border border-[#25D366]/50 px-3.5 py-2 text-sm font-800 text-[#128C4A] transition-colors hover:bg-[#25D366] hover:text-white">
              <WAIcon /> WhatsApp
            </a>
            <Link href="/repair" className="rounded-md bg-[#06101F] px-4 py-2.5 text-sm font-900 text-white transition-colors hover:bg-[#102840]">Request Repair</Link>
          </div>

          <button className="rounded-md border border-slate-200 p-2.5 text-[#06101F] lg:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white lg:hidden">
          <div className="site-shell py-4">
            <div className="grid gap-2">
              <Link href="/shop" className="rounded-lg bg-slate-50 px-4 py-3 font-900 text-[#06101F]">Shop equipment</Link>
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
