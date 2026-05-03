"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";

const shopCategories = [
  {
    heading: "Lab & Scientific",
    items: ["Spectrometers", "Analysers", "Microscopes", "Chromatography", "Centrifuges"],
    slug: "lab-scientific",
  },
  {
    heading: "Automation & Control",
    items: ["PLCs & Controllers", "HMI Panels", "AC & DC Drives", "Servo Systems", "Sensors"],
    slug: "automation",
  },
  {
    heading: "Test & Detection",
    items: ["Oscilloscopes", "Signal Generators", "Power Analysers", "Spectrum Analysers", "Multimeters"],
    slug: "test-detection",
  },
  {
    heading: "IT & Networking",
    items: ["Servers & Rack", "Switches & Routers", "Storage Systems", "UPS Systems", "Cables"],
    slug: "it-networking",
  },
  {
    heading: "Display & AV",
    items: ["Projectors", "Displays & Monitors", "Audio Mixing", "Broadcast Equipment", "Video Walls"],
    slug: "display-av",
  },
  {
    heading: "Oil & Gas",
    items: ["Flow Meters", "Pressure Systems", "Gas Detectors", "Control Valves", "Safety Equipment"],
    slug: "oil-gas",
  },
];

export default function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 bg-navy-900 rounded flex items-center justify-center">
                <span className="text-accent font-display font-900 text-xs">C</span>
              </div>
              <span className="font-display font-800 text-navy-900 text-xl tracking-tight">COMBAY</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">

            {/* Shop mega menu trigger */}
            <div className="relative group">
              <button
                className="flex items-center gap-1 px-4 py-5 font-display font-600 text-sm text-navy-900 hover:text-accent transition-colors"
                onMouseEnter={() => setShopOpen(true)}
                onMouseLeave={() => setShopOpen(false)}
              >
                Shop <ChevronDown size={14} className="group-hover:rotate-180 transition-transform duration-200" />
              </button>

              {/* Mega Menu */}
              {shopOpen && (
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-0 w-[860px] bg-white border border-gray-200 shadow-2xl rounded-b-lg z-50 p-6"
                  onMouseEnter={() => setShopOpen(true)}
                  onMouseLeave={() => setShopOpen(false)}
                >
                  <div className="grid grid-cols-3 gap-6 mb-6">
                    {shopCategories.map((cat) => (
                      <div key={cat.slug}>
                        <Link
                          href={`/shop?cat=${cat.slug}`}
                          className="block font-display font-700 text-navy-900 text-sm mb-2 hover:text-accent transition-colors"
                        >
                          {cat.heading}
                        </Link>
                        <ul className="space-y-1">
                          {cat.items.map((item) => (
                            <li key={item}>
                              <Link
                                href={`/shop?cat=${cat.slug}`}
                                className="text-gray-500 text-xs hover:text-navy-900 transition-colors block py-0.5"
                              >
                                {item}
                              </Link>
                            </li>
                          ))}
                          <li>
                            <Link
                              href={`/shop?cat=${cat.slug}`}
                              className="text-accent text-xs font-600 hover:text-accent-dark transition-colors block pt-1"
                            >
                              View all →
                            </Link>
                          </li>
                        </ul>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Link href="/shop?filter=new" className="text-xs font-600 text-navy-800 hover:text-accent flex items-center gap-1">
                        ⭐ New Arrivals
                      </Link>
                      <Link href="/shop?filter=grade-a" className="text-xs font-600 text-navy-800 hover:text-accent flex items-center gap-1">
                        🔖 Grade A Only
                      </Link>
                      <Link href="/shop?filter=repaired" className="text-xs font-600 text-navy-800 hover:text-accent flex items-center gap-1">
                        🔧 Repaired Stock
                      </Link>
                    </div>
                    <Link href="/shop" className="bg-navy-900 text-white font-display font-700 text-xs px-4 py-2 rounded hover:bg-navy-800 transition-colors">
                      View all 10,000+ items →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link href="/repair" className="px-4 py-5 font-display font-600 text-sm text-navy-900 hover:text-accent transition-colors">
              Repairs
            </Link>
            <Link href="/asset-recovery" className="px-4 py-5 font-display font-600 text-sm text-navy-900 hover:text-accent transition-colors">
              Asset Recovery
            </Link>
            <Link href="/manufacturers" className="px-4 py-5 font-display font-600 text-sm text-navy-900 hover:text-accent transition-colors">
              Manufacturers
            </Link>
            <Link href="/about" className="px-4 py-5 font-display font-600 text-sm text-navy-900 hover:text-accent transition-colors">
              About
            </Link>
            <Link href="/contact" className="px-4 py-5 font-display font-600 text-sm text-navy-900 hover:text-accent transition-colors">
              Contact
            </Link>
          </nav>

          {/* Right CTAs */}
          <div className="hidden lg:flex items-center gap-2">
            <a
              href="https://wa.me/447340383334"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 border border-[#25D366] text-[#25D366] font-display font-600 text-sm px-4 py-2 rounded hover:bg-[#25D366] hover:text-white transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
            <Link
              href="/repair"
              className="bg-navy-900 text-white font-display font-700 text-sm px-4 py-2 rounded hover:bg-navy-800 transition-colors"
            >
              Request Repair
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="lg:hidden p-2 text-navy-900"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-gray-200 px-4 py-4 space-y-1">
          <Link href="/shop" className="block py-2.5 font-display font-600 text-navy-900 border-b border-gray-100">Shop</Link>
          <Link href="/repair" className="block py-2.5 font-display font-600 text-navy-900 border-b border-gray-100">Repairs</Link>
          <Link href="/asset-recovery" className="block py-2.5 font-display font-600 text-navy-900 border-b border-gray-100">Asset Recovery</Link>
          <Link href="/manufacturers" className="block py-2.5 font-display font-600 text-navy-900 border-b border-gray-100">Manufacturers</Link>
          <Link href="/about" className="block py-2.5 font-display font-600 text-navy-900 border-b border-gray-100">About</Link>
          <Link href="/contact" className="block py-2.5 font-display font-600 text-navy-900 border-b border-gray-100">Contact</Link>
          <div className="pt-3 flex gap-2">
            <a href="https://wa.me/447340383334" className="flex-1 text-center border border-[#25D366] text-[#25D366] font-display font-600 text-sm px-3 py-2 rounded">WhatsApp</a>
            <Link href="/repair" className="flex-1 text-center bg-navy-900 text-white font-display font-700 text-sm px-3 py-2 rounded">Request Repair</Link>
          </div>
        </div>
      )}
    </header>
  );
}
