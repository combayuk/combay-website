"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const slides = [
  {
    eyebrow: "10,000+ Items In Stock",
    heading: "Mission-critical equipment,",
    accent:  "delivered fast.",
    body:    "Tested, warranted industrial and commercial equipment across all industries. 30-day warranty as standard. Dispatch within 48 hours.",
    cta1: { label: "Browse Stock",    href: "/shop" },
    cta2: { label: "View Categories", href: "/shop" },
    stats: [{ v:"10K+", l:"Items in stock" },{ v:"30d", l:"Warranty" },{ v:"48h", l:"Avg. dispatch" }],
    gradient: "from-navy-950 to-navy-800",
    panel: "stock",
  },
  {
    eyebrow: "Repair Service",
    heading: "Don't replace —",
    accent:  "repair instead.",
    body:    "40% lower than manufacturer quotes. Free collection. 60-day checking warranty. Our engineers handle calibration, repair, installation, and PPM.",
    cta1: { label: "Book a Repair",  href: "/repair" },
    cta2: { label: "Get a Quote",    href: "/contact?type=repair" },
    stats: [{ v:"40%", l:"Below OEM cost" },{ v:"60d", l:"Repair warranty" },{ v:"Free", l:"Collection & return" }],
    gradient: "from-navy-950 to-[#0A1F12]",
    panel: "repair",
  },
  {
    eyebrow: "Asset Recovery",
    heading: "Recover cash on",
    accent:  "unwanted equipment.",
    body:    "Fair value for your surplus stock. Free collection from anywhere. Payment before your goods leave. No stock list needed.",
    cta1: { label: "Get Cash for Goods", href: "/asset-recovery" },
    cta2: { label: "Learn How",          href: "/asset-recovery" },
    stats: [{ v:"Same Day", l:"Collection available" },{ v:"Cash", l:"On collection" },{ v:"24h", l:"Quote response" }],
    gradient: "from-navy-950 to-[#1A150A]",
    panel: "recovery",
  },
];

const stockItems = [
  { name:"Siemens S7-400 PLC",     cat:"Automation",       price:"£1,240",  grade:"A" },
  { name:"Thermo FT-IR IS5",       cat:"Lab & Scientific", price:"£2,450",  grade:"A" },
  { name:"Tektronix MDO3054",      cat:"Test & Detection", price:"£875",   grade:"B" },
  { name:"ABB ACS550 Drive 75kW",  cat:"Automation",       price:"£890",   grade:"A" },
];

export default function HeroCarousel() {
  const [active, setActive]       = useState(0);
  const [fading, setFading]       = useState(false);

  useEffect(() => {
    const t = setInterval(() => transition((active + 1) % slides.length), 7000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const transition = (idx: number) => {
    if (idx === active) return;
    setFading(true);
    setTimeout(() => { setActive(idx); setFading(false); }, 300);
  };

  const s = slides[active];

  return (
    <section className={`relative bg-gradient-to-br ${s.gradient} text-white overflow-hidden transition-all duration-700 min-h-[520px]`}>
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.5) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.5) 40px)" }} />
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Content */}
          <div className={`transition-all duration-300 ${fading ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"}`}>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-5 h-px bg-accent"/>
              <span className="font-mono text-accent text-xs tracking-widest uppercase">{s.eyebrow}</span>
            </div>
            <h1 className="font-display font-800 text-4xl lg:text-5xl xl:text-[3.25rem] leading-tight mb-1">{s.heading}</h1>
            <h1 className="font-display font-900 text-4xl lg:text-5xl xl:text-[3.25rem] leading-tight text-accent italic mb-6">{s.accent}</h1>
            <p className="text-gray-300 text-lg leading-relaxed mb-8 max-w-lg">{s.body}</p>
            <div className="flex flex-wrap gap-3 mb-10">
              <Link href={s.cta1.href} className="bg-accent text-navy-900 font-display font-700 px-6 py-3 rounded hover:bg-accent-dark transition-colors">
                {s.cta1.label} →
              </Link>
              <Link href={s.cta2.href} className="border border-white/25 text-white font-display font-600 px-6 py-3 rounded hover:bg-white/10 hover:border-white/50 transition-colors">
                {s.cta2.label}
              </Link>
            </div>
            <div className="flex gap-8">
              {s.stats.map(st => (
                <div key={st.l}>
                  <div className="font-display font-800 text-2xl text-accent">{st.v}</div>
                  <div className="text-gray-400 text-xs mt-0.5">{st.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Panel */}
          <div className={`hidden lg:block transition-all duration-300 ${fading ? "opacity-0 translate-x-3" : "opacity-100 translate-x-0"}`}>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-7 backdrop-blur-sm">
              <p className="font-mono text-accent text-xs tracking-widest uppercase mb-4">
                {["Featured Stock","How It Works","Asset Recovery Steps"][active]}
              </p>
              {s.panel === "stock" && (
                <div className="space-y-2.5">
                  {stockItems.map(item => (
                    <div key={item.name} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-4 py-3">
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
                  <Link href="/shop" className="block text-center text-accent font-600 text-sm pt-2 hover:text-accent-light">Browse all 10,000+ items →</Link>
                </div>
              )}
              {s.panel === "repair" && (
                <div className="space-y-3">
                  {[["01","Submit request","Email or form — 5 min"],["02","Receive quote","Within 48 hours"],["03","Free collection","From your site"],["04","Return + warranty","60-day guarantee"]].map(([n,t,d])=>(
                    <div key={n} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-4 py-3">
                      <span className="font-mono text-accent text-xs w-5">{n}</span>
                      <div className="flex-1">
                        <div className="font-display font-600 text-sm text-white">{t}</div>
                        <div className="text-gray-400 text-xs">{d}</div>
                      </div>
                    </div>
                  ))}
                  <Link href="/repair" className="block text-center text-accent font-600 text-sm pt-2 hover:text-accent-light">Book a repair →</Link>
                </div>
              )}
              {s.panel === "recovery" && (
                <div className="space-y-3">
                  {[["📦","Send disposal request","Stock list or photos"],["🤝","Receive fair quote","24h turnaround"],["🚚","We collect — free","Any location"],["💷","Paid on collection","Cash or card"]].map(([icon,t,d])=>(
                    <div key={t} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-lg px-4 py-3">
                      <span className="text-base">{icon}</span>
                      <div>
                        <div className="font-display font-600 text-sm text-white">{t}</div>
                        <div className="text-gray-400 text-xs">{d}</div>
                      </div>
                    </div>
                  ))}
                  <Link href="/asset-recovery" className="block text-center text-accent font-600 text-sm pt-2 hover:text-accent-light">Sell your stock →</Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Slide controls */}
        <div className="flex items-center gap-3 mt-10">
          {slides.map((_, i) => (
            <button key={i} onClick={() => transition(i)}
              className={`transition-all duration-200 rounded-full ${i===active ? "w-8 h-2 bg-accent" : "w-2 h-2 bg-white/25 hover:bg-white/50"}`}/>
          ))}
          <div className="ml-auto flex gap-2">
            <button onClick={() => transition((active-1+slides.length)%slides.length)}
              className="w-8 h-8 rounded border border-white/20 text-white hover:border-accent hover:text-accent transition-colors text-sm">←</button>
            <button onClick={() => transition((active+1)%slides.length)}
              className="w-8 h-8 rounded border border-white/20 text-white hover:border-accent hover:text-accent transition-colors text-sm">→</button>
          </div>
        </div>
      </div>
    </section>
  );
}
