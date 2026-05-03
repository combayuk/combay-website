"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const slides = [
  {
    id: 1,
    eyebrow: "10,000+ Items in Stock",
    heading: "Mission-critical equipment,",
    headingAccent: "delivered.",
    sub: "Industrial and commercial equipment — tested, warranted, and ready to dispatch. Serving every industry from lab to manufacturing.",
    cta1: { label: "Browse Stock", href: "/shop" },
    cta2: { label: "View Categories", href: "/shop" },
    stats: [
      { value: "10K+", label: "Items in stock" },
      { value: "30d", label: "Warranty" },
      { value: "48h", label: "Avg. dispatch" },
    ],
    badge: "Engineers in action delivering you the best products and service",
    bg: "from-navy-950 to-navy-800",
  },
  {
    id: 2,
    eyebrow: "Repair Service",
    heading: "Need to keep it",
    headingAccent: "cost effective?",
    sub: "Why replace when you can repair? Our engineers handle calibration, repair, and preventative maintenance — at 40% less than manufacturer prices.",
    cta1: { label: "Book a Repair", href: "/repair" },
    cta2: { label: "Get a Quote", href: "/contact" },
    stats: [
      { value: "40%", label: "Cheaper than OEM" },
      { value: "60d", label: "Repair warranty" },
      { value: "Free", label: "Collection & return" },
    ],
    badge: "Risk-free · Free collection · No fix = full refund",
    bg: "from-navy-950 to-[#0F2A1A]",
  },
  {
    id: 3,
    eyebrow: "Asset Recovery",
    heading: "Recover money on your",
    headingAccent: "unwanted equipment.",
    sub: "Fair value for your surplus stock. We collect for free, pay you on the spot — no shipping needed, no hassle.",
    cta1: { label: "Get Cash for Goods", href: "/asset-recovery" },
    cta2: { label: "Learn More", href: "/asset-recovery" },
    stats: [
      { value: "Same", label: "Day collection" },
      { value: "Cash", label: "On collection" },
      { value: "Free", label: "Collection service" },
    ],
    badge: "Warehouses · Offices · Homes — we collect anywhere",
    bg: "from-navy-950 to-[#1A1A0A]",
  },
];

export default function HeroCarousel() {
  const [active, setActive] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      next();
    }, 6000);
    return () => clearInterval(timer);
  }, [active]);

  const goTo = (idx: number) => {
    if (animating || idx === active) return;
    setAnimating(true);
    setActive(idx);
    setTimeout(() => setAnimating(false), 500);
  };

  const next = () => goTo((active + 1) % slides.length);
  const prev = () => goTo((active - 1 + slides.length) % slides.length);

  const slide = slides[active];

  return (
    <section className={`relative bg-gradient-to-br ${slide.bg} text-white overflow-hidden transition-all duration-700`}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.3) 39px, rgba(255,255,255,0.3) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.3) 39px, rgba(255,255,255,0.3) 40px)`
        }} />
      </div>

      {/* Accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />

      <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Content */}
          <div className={`transition-all duration-500 ${animating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"}`}>
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 mb-5">
              <div className="w-6 h-px bg-accent" />
              <span className="font-mono text-accent text-xs tracking-widest uppercase">{slide.eyebrow}</span>
            </div>

            {/* Heading */}
            <h1 className="font-display font-800 text-4xl lg:text-5xl xl:text-6xl leading-tight mb-2">
              {slide.heading}
            </h1>
            <h1 className="font-display font-900 text-4xl lg:text-5xl xl:text-6xl leading-tight text-accent italic mb-6">
              {slide.headingAccent}
            </h1>

            <p className="text-gray-300 text-lg leading-relaxed mb-8 max-w-lg">
              {slide.sub}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 mb-10">
              <Link
                href={slide.cta1.href}
                className="bg-accent text-navy-900 font-display font-700 px-6 py-3 rounded hover:bg-accent-dark transition-colors"
              >
                {slide.cta1.label} →
              </Link>
              <Link
                href={slide.cta2.href}
                className="border border-white/30 text-white font-display font-600 px-6 py-3 rounded hover:border-white/60 hover:bg-white/10 transition-colors"
              >
                {slide.cta2.label}
              </Link>
            </div>

            {/* Stats row */}
            <div className="flex gap-8">
              {slide.stats.map((stat) => (
                <div key={stat.label}>
                  <div className="font-display font-800 text-2xl text-accent">{stat.value}</div>
                  <div className="text-gray-400 text-xs mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel — service card */}
          <div className={`hidden lg:block transition-all duration-500 ${animating ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"}`}>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur">
              <div className="font-mono text-accent text-xs tracking-widest uppercase mb-4">
                {["01 / BUY EQUIPMENT", "02 / REPAIR SERVICE", "03 / ASSET RECOVERY"][active]}
              </div>

              {/* Visual grid for each slide */}
              {active === 0 && (
                <div className="space-y-3">
                  {[
                    { name: "Siemens S7-400 PLC", cat: "Automation", grade: "A", price: "£1,240" },
                    { name: "Thermo FT-IR IS5", cat: "Lab & Scientific", grade: "A", price: "£2,450" },
                    { name: "Tektronix MDO3054", cat: "Test & Detection", grade: "B", price: "£875" },
                    { name: "ABB ACS550 Drive", cat: "Automation", grade: "A", price: "£890" },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3 border border-white/10">
                      <div>
                        <div className="font-display font-600 text-sm text-white">{item.name}</div>
                        <div className="text-gray-400 text-xs mt-0.5">{item.cat}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-display font-700 text-accent text-sm">{item.price}</div>
                        <div className="text-gray-400 text-xs">Grade {item.grade}</div>
                      </div>
                    </div>
                  ))}
                  <Link href="/shop" className="block text-center text-accent font-600 text-sm pt-2 hover:text-accent-light transition-colors">
                    Browse all 10,000+ items →
                  </Link>
                </div>
              )}

              {active === 1 && (
                <div className="space-y-4">
                  {[
                    { step: "01", label: "Submit a request", time: "5 min" },
                    { step: "02", label: "Receive a quote", time: "Within 48h" },
                    { step: "03", label: "Free collection", time: "From your site" },
                    { step: "04", label: "Repaired & returned", time: "60d warranty" },
                  ].map((s) => (
                    <div key={s.step} className="flex items-center gap-4 bg-white/5 rounded-lg px-4 py-3 border border-white/10">
                      <span className="font-mono text-accent text-xs w-6">{s.step}</span>
                      <span className="font-display font-600 text-sm text-white flex-1">{s.label}</span>
                      <span className="text-gray-400 text-xs">{s.time}</span>
                    </div>
                  ))}
                  <Link href="/repair" className="block text-center text-accent font-600 text-sm pt-2 hover:text-accent-light transition-colors">
                    Book a repair →
                  </Link>
                </div>
              )}

              {active === 2 && (
                <div className="space-y-4">
                  {[
                    { icon: "📦", label: "Send a disposal request", desc: "Stock list or a few photos" },
                    { icon: "🤝", label: "Receive a fair quote", desc: "Within 24 hours" },
                    { icon: "🚚", label: "We collect — free", desc: "Same day or as preferred" },
                    { icon: "💷", label: "Get paid instantly", desc: "Cash or card on collection" },
                  ].map((s) => (
                    <div key={s.label} className="flex items-start gap-3 bg-white/5 rounded-lg px-4 py-3 border border-white/10">
                      <span className="text-lg">{s.icon}</span>
                      <div>
                        <div className="font-display font-600 text-sm text-white">{s.label}</div>
                        <div className="text-gray-400 text-xs mt-0.5">{s.desc}</div>
                      </div>
                    </div>
                  ))}
                  <Link href="/asset-recovery" className="block text-center text-accent font-600 text-sm pt-2 hover:text-accent-light transition-colors">
                    Sell your stock →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Slide controls */}
        <div className="flex items-center gap-4 mt-10">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i)}
              className={`transition-all duration-300 rounded-full ${
                i === active
                  ? "w-8 h-2 bg-accent"
                  : "w-2 h-2 bg-white/30 hover:bg-white/60"
              }`}
            />
          ))}
          <div className="ml-auto flex gap-2">
            <button onClick={prev} className="w-9 h-9 rounded border border-white/20 flex items-center justify-center text-white hover:border-accent hover:text-accent transition-colors">
              ←
            </button>
            <button onClick={next} className="w-9 h-9 rounded border border-white/20 flex items-center justify-center text-white hover:border-accent hover:text-accent transition-colors">
              →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
