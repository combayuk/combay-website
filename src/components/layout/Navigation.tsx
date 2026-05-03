"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";

const shopCategories = [
  { name: "Lab & Scientific",      slug: "lab-scientific",     icon: "🔬", items: ["Spectrometers","Analysers","Microscopes","Chromatography","Centrifuges"] },
  { name: "Automation & Control",  slug: "automation-control", icon: "⚙️", items: ["PLCs","HMI Panels","AC/DC Drives","Servo Systems","Sensors & I/O"] },
  { name: "Test & Detection",      slug: "test-detection",     icon: "📡", items: ["Oscilloscopes","Signal Generators","Power Analysers","Spectrum Analysers","Multimeters"] },
  { name: "IT & Networking",       slug: "it-networking",      icon: "🖧",  items: ["Servers & Rack","Switches & Routers","Storage","UPS Systems","Cabling"] },
  { name: "Display & AV",          slug: "display-av",         icon: "📺", items: ["Projectors","Monitors","Audio Mixing","Broadcast","Video Walls"] },
  { name: "Oil & Gas",             slug: "oil-gas",            icon: "🛢️", items: ["Flow Meters","Pressure Systems","Gas Detectors","Control Valves","Safety"] },
  { name: "Audio & Broadcast",     slug: "audio-broadcast",    icon: "🎙️", items: ["Mixers","Amplifiers","Transmitters","Recording","Cabling"] },
  { name: "Manufacturing",         slug: "manufacturing",      icon: "🏭", items: ["CNC Controls","Vision Systems","Robots","Conveyors","Motors"] },
];

export default function Navigation() {
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [shopHover,  setShopHover]    = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const openShop  = () => { if (timerRef.current) clearTimeout(timerRef.current); setShopHover(true); };
  const closeShop = () => { timerRef.current = setTimeout(() => setShopHover(false), 120); };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-navy-900 rounded flex items-center justify-center">
              <span className="text-accent font-display font-900 text-sm">C</span>
            </div>
            <span className="font-display font-800 text-navy-900 text-xl tracking-tight">COMBAY</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center">

            {/* Shop Mega Menu */}
            <div className="relative" onMouseEnter={openShop} onMouseLeave={closeShop}>
              <button className="flex items-center gap-1 px-4 h-16 font-display font-600 text-sm text-navy-900 hover:text-accent transition-colors">
                Shop <ChevronDown size={13} className={`transition-transform duration-200 ${shopHover ? "rotate-180" : ""}`} />
              </button>

              {shopHover && (
                <div className="absolute top-full left-0 w-[900px] bg-white border border-gray-200 shadow-2xl z-50 rounded-b-xl">
                  <div className="grid grid-cols-4 gap-0 p-6">
                    {shopCategories.map((cat) => (
                      <div key={cat.slug} className="pr-4 mb-4">
                        <Link href={`/shop?category=${cat.slug}`}
                          className="flex items-center gap-1.5 font-display font-700 text-navy-900 text-xs mb-2 hover:text-accent transition-colors">
                          <span>{cat.icon}</span>{cat.name}
                        </Link>
                        <ul className="space-y-0.5">
                          {cat.items.map(item => (
                            <li key={item}>
                              <Link href={`/shop?category=${cat.slug}`} className="text-gray-400 text-xs hover:text-navy-900 transition-colors block py-0.5">
                                {item}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-100 px-6 py-3 flex items-center justify-between bg-gray-50 rounded-b-xl">
                    <div className="flex gap-4">
                      <Link href="/shop?filter=new-arrivals" className="text-xs font-display font-600 text-navy-800 hover:text-accent">⭐ New Arrivals</Link>
                      <Link href="/shop?condition=NEW" className="text-xs font-display font-600 text-navy-800 hover:text-accent">🏷 Grade A / New</Link>
                      <Link href="/shop?filter=all" className="text-xs font-display font-600 text-navy-800 hover:text-accent">📋 Browse All</Link>
                    </div>
                    <Link href="/shop" className="bg-navy-900 text-white font-display font-700 text-xs px-4 py-2 rounded hover:bg-navy-800 transition-colors">
                      View all 10,000+ items →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {[
              { label: "Repairs",         href: "/repair" },
              { label: "Asset Recovery",  href: "/asset-recovery" },
              { label: "Manufacturers",   href: "/manufacturers" },
              { label: "About",           href: "/about" },
              { label: "Contact",         href: "/contact" },
            ].map(n => (
              <Link key={n.href} href={n.href} className="px-4 h-16 flex items-center font-display font-600 text-sm text-navy-900 hover:text-accent transition-colors">
                {n.label}
              </Link>
            ))}
          </nav>

          {/* Right CTAs */}
          <div className="hidden lg:flex items-center gap-2">
            <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP ?? "447340383334"}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 border border-[#25D366] text-[#25D366] font-display font-600 text-sm px-3 py-2 rounded hover:bg-[#25D366] hover:text-white transition-colors">
              <WhatsAppIcon /> WhatsApp
            </a>
            <Link href="/repair" className="bg-navy-900 text-white font-display font-700 text-sm px-4 py-2 rounded hover:bg-navy-800 transition-colors">
              Request Repair
            </Link>
          </div>

          {/* Mobile toggle */}
          <button className="lg:hidden p-2 text-navy-900" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={22}/> : <Menu size={22}/>}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-gray-200 px-4 py-3 space-y-0.5">
          {[
            { label: "Shop",            href: "/shop" },
            { label: "Repairs",         href: "/repair" },
            { label: "Asset Recovery",  href: "/asset-recovery" },
            { label: "Manufacturers",   href: "/manufacturers" },
            { label: "About",           href: "/about" },
            { label: "Contact",         href: "/contact" },
            { label: "Customer Portal", href: "/portal" },
            { label: "FAQs",            href: "/faq" },
          ].map(n => (
            <Link key={n.href} href={n.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2.5 font-display font-600 text-navy-900 border-b border-gray-100 text-sm">
              {n.label}
            </Link>
          ))}
          <div className="pt-3 grid grid-cols-2 gap-2">
            <a href="https://wa.me/447340383334" className="text-center border border-[#25D366] text-[#25D366] font-display font-600 text-sm px-3 py-2 rounded">WhatsApp</a>
            <Link href="/repair" className="text-center bg-navy-900 text-white font-display font-700 text-sm px-3 py-2 rounded">Request Repair</Link>
          </div>
        </div>
      )}
    </header>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
