"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, Search, ShoppingCart, X } from "lucide-react";
import { readCartLines } from "@/lib/cart";

const SHOP_CATS = [
  { name: "Lab & Scientific", slug: "lab-scientific", icon: "🔬", items: ["Spectrometers", "Analysers", "Microscopes", "Chromatography", "Centrifuges"] },
  { name: "Automation & Control", slug: "automation-control", icon: "⚙️", items: ["PLCs", "HMI Panels", "Drives", "Servo Systems", "Sensors"] },
  { name: "Test & Detection", slug: "test-detection", icon: "📡", items: ["Oscilloscopes", "Power Analysers", "Multimeters", "OTDR", "Signal Generators"] },
  { name: "IT & Networking", slug: "it-networking", icon: "🖧", items: ["Servers", "Switches", "Storage", "UPS", "Cabling"] },
  { name: "Display & AV", slug: "display-av", icon: "📺", items: ["Projectors", "Broadcast", "Video Walls", "Lenses", "Audio"] },
  { name: "Oil & Gas", slug: "oil-gas", icon: "🛢️", items: ["Gas Detection", "Flow Meters", "Pressure", "Valves", "Safety"] },
  { name: "Manufacturing", slug: "manufacturing", icon: "🏭", items: ["CNC Controls", "Vision", "Motors", "Robots", "Conveyors"] },
  { name: "Audio & Broadcast", slug: "audio-broadcast", icon: "🎙️", items: ["Mixers", "Amplifiers", "Transmitters", "Recording", "Cabling"] },
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
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
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/108">
      <div className="site-shell">
        <div className="flex h-[68px] items-center justify-between gap-4">
          <Link href="/" className="group flex flex-shrink-0 items-center gap-3" aria-label="Combay home">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-[#06101F] shadow-sm transition-transform group-hover:-translate-y-0.5">
              <span className="font-display text-sm font-900 tracking-tight text-[#D99611]">CB</span>
            </div>
            <div className="leading-none">
              <span className="block font-display text-xl font-900 tracking-[-0.04em] text-[#06101F]">COMBAY</span>
              <span className="hidden text-[10px] font-800 uppercase tracking-[0.16em] text-slate-400 sm:block">Industrial supply</span>
            </div>
          </Link>

          <nav className="hidden h-full items-center lg:flex">
            <div className="relative flex h-full items-center" onMouseEnter={openShop} onMouseLeave={closeShop}>
              <button className="flex h-full items-center gap-1.5 border-b-2 border-transparent px-4 text-sm font-800 text-slate-700 transition-colors hover:border-[#D99611] hover:text-[#06101F]">
                Shop <ChevronDown size={14} className={`transition-transform ${shopOpen ? "rotate-180" : ""}`} />
              </button>
              {shopOpen && (
                <div className="absolute left-0 top-full w-[900px] overflow-hidden rounded-b-2xl border border-slate-200 bg-white shadow-2xl">
                  <div className="grid grid-cols-4 gap-px bg-slate-100 p-px">
                    {SHOP_CATS.map((cat) => (
                      <Link key={cat.slug} href={`/shop?category=${cat.slug}`} className="group bg-white p-5 transition-colors hover:bg-slate-50">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-lg">{cat.icon}</span>
                          <span className="font-display text-sm font-900 text-[#06101F] group-hover:text-[#B87908]">{cat.name}</span>
                        </div>
                        <ul className="space-y-1">
                          {cat.items.map((item) => <li key={item} className="text-xs text-slate-500">{item}</li>)}
                        </ul>
                      </Link>
                    ))}
                  </div>
                  <div className="flex items-center justify-between bg-slate-50 px-6 py-4">
                    <div className="flex items-center gap-2 text-xs font-800 text-slate-500">
                      <Search size={14} /> Search by SKU, MPN, model or manufacturer
                    </div>
                    <Link href="/shop" className="btn-primary py-2 text-xs">Browse stock →</Link>
                  </div>
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
