"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { cmsBackgroundStyle } from "@/lib/cmsBackground";

type HeroSlide = {
  eyebrow: string;
  heading: string;
  accent: string;
  body: string;
  cta1: { label: string; href: string };
  cta2: { label: string; href: string };
  stats: { v: string; l: string }[];
  bg: string;
  imageUrl?: string;
  backgroundImageUrl?: string;
};

const DEFAULT_SLIDES: HeroSlide[] = [
  {
    eyebrow: "10,000+ Items In Stock",
    heading: "Mission-critical equipment,",
    accent:  "ready to dispatch.",
    body:    "Tested, warranted industrial and commercial equipment. 30-day warranty. Trusted by UK businesses across every industry.",
    cta1: { label:"Browse Equipment", href:"/shop" },
    cta2: { label:"View Categories",  href:"/shop" },
    stats: [{v:"10K+",l:"In stock"},{v:"30d",l:"Warranty"},{v:"48h",l:"Dispatch"}],
    bg: "from-navy-950 via-navy-900 to-navy-800",
  },
  {
    eyebrow: "Repair Service",
    heading: "40% lower than",
    accent:  "manufacturer quotes.",
    body:    "Free collection. 60-day checking warranty. Calibration, repair, PPM and installation — all covered by our engineers.",
    cta1: { label:"Book a Repair",  href:"/repair" },
    cta2: { label:"How It Works",   href:"/repair#how" },
    stats: [{v:"40%",l:"Below OEM"},{v:"60d",l:"Warranty"},{v:"Free",l:"Collection"}],
    bg: "from-navy-950 via-[#091E14] to-[#0A2016]",
  },
  {
    eyebrow: "Asset Recovery",
    heading: "Cash for your",
    accent:  "surplus equipment.",
    body:    "Fair value. Free collection from anywhere. Payment before goods leave your site. No stock list needed.",
    cta1: { label:"Get Cash for Goods",  href:"/asset-recovery" },
    cta2: { label:"How It Works",        href:"/asset-recovery#how" },
    stats: [{v:"Same Day",l:"Collection"},{v:"Cash",l:"On-site"},{v:"24h",l:"Response"}],
    bg: "from-navy-950 via-[#1A1006] to-[#1A1200]",
  },
];

type HeroSlideInput = {
  eyebrow: string;
  heading: string;
  accent: string;
  body: string;
  cta1Label: string;
  cta1Href: string;
  cta2Label: string;
  cta2Href: string;
  stat1Value: string;
  stat1Label: string;
  stat2Value: string;
  stat2Label: string;
  stat3Value: string;
  stat3Label: string;
  imageUrl?: string;
  backgroundImageUrl?: string;
};

function buildSlides(contentSlides?: HeroSlideInput[]): HeroSlide[] {
  if (!Array.isArray(contentSlides) || !contentSlides.length) return DEFAULT_SLIDES;
  return DEFAULT_SLIDES.map((fallback, index) => {
    const input = contentSlides[index];
    if (!input) return fallback;
    return {
      ...fallback,
      eyebrow: input.eyebrow || fallback.eyebrow,
      heading: input.heading || fallback.heading,
      accent: input.accent || fallback.accent,
      body: input.body || fallback.body,
      cta1: { label: input.cta1Label === "__HIDDEN__" ? "" : (input.cta1Label || fallback.cta1.label), href: input.cta1Href || fallback.cta1.href },
      cta2: { label: input.cta2Label === "__HIDDEN__" ? "" : (input.cta2Label || fallback.cta2.label), href: input.cta2Href || fallback.cta2.href },
      stats: [
        { v: input.stat1Value || fallback.stats[0].v, l: input.stat1Label || fallback.stats[0].l },
        { v: input.stat2Value || fallback.stats[1].v, l: input.stat2Label || fallback.stats[1].l },
        { v: input.stat3Value || fallback.stats[2].v, l: input.stat3Label || fallback.stats[2].l },
      ],
      imageUrl: input.imageUrl || "",
      backgroundImageUrl: input.backgroundImageUrl || "",
    };
  });
}

export default function HeroCarousel({ slides: contentSlides }: { slides?: HeroSlideInput[] }) {
  const router = useRouter();
  const SLIDES = buildSlides(contentSlides);
  const [active, setActive] = useState(0);
  const [fading, setFading] = useState(false);
  const [query,  setQuery]  = useState("");

  useEffect(() => {
    const t = setInterval(() => go((active + 1) % SLIDES.length), 7000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const go = (i: number) => {
    if (i === active) return;
    setFading(true);
    setTimeout(() => { setActive(i); setFading(false); }, 280);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/shop?q=${encodeURIComponent(query.trim())}`);
  };

  const s = SLIDES[active];

  return (
    <section className={`relative bg-gradient-to-br ${s.bg} text-white overflow-hidden transition-all duration-700`}
      style={{minHeight:"520px", ...cmsBackgroundStyle(s.backgroundImageUrl)}}>
      {/* Grid texture */}
      <div className="absolute inset-0 opacity-[0.035]" style={{
        backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 47px,rgba(255,255,255,.4) 48px),repeating-linear-gradient(90deg,transparent,transparent 47px,rgba(255,255,255,.4) 48px)"
      }}/>
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-accent via-accent-light to-transparent"/>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <div className="grid lg:grid-cols-[1fr_420px] gap-10 items-center">

          {/* Left */}
          <div className={`transition-all duration-280 ${fading?"opacity-0 translate-y-2":"opacity-100 translate-y-0"}`}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-4 h-px bg-accent"/>
              <span className="font-mono text-accent text-[10px] tracking-[0.2em] uppercase">{s.eyebrow}</span>
            </div>
            <h1 className="font-display font-800 text-3xl lg:text-[2.6rem] leading-[1.15] mb-1">{s.heading}</h1>
            <h1 className="font-display font-800 text-3xl lg:text-[2.6rem] leading-[1.15] text-accent mb-5">{s.accent}</h1>
            <p className="text-white/70 text-base leading-relaxed mb-7 max-w-lg">{s.body}</p>

            {/* Search bar — CRITICAL feature per spec */}
            <form onSubmit={handleSearch} className="flex items-center bg-white/10 border border-white/20 rounded-xl overflow-hidden mb-7 focus-within:border-accent/60 transition-colors max-w-lg">
              <Search size={16} className="ml-4 text-white/40 flex-shrink-0"/>
              <input
                type="text" value={query} onChange={e=>setQuery(e.target.value)}
                placeholder="Search by SKU, brand, MPN, model, category..."
                className="flex-1 bg-transparent px-3 py-3 text-sm text-white placeholder:text-white/35 focus:outline-none"
              />
              <button type="submit" className="bg-accent text-navy-950 font-display font-700 text-xs px-4 py-3 hover:bg-accent-dark transition-colors whitespace-nowrap">
                Search →
              </button>
            </form>

            <div className="flex flex-wrap gap-3">
              {s.cta1.label ? <Link href={s.cta1.href} className="btn-primary">{s.cta1.label} →</Link> : null}
              {s.cta2.label ? <Link href={s.cta2.href} className="btn-outline-white">{s.cta2.label}</Link> : null}
            </div>
          </div>

          {/* Right stats panel */}
          <div className={`hidden lg:block transition-all duration-280 ${fading?"opacity-0 translate-x-2":"opacity-100 translate-x-0"}`}>
            {s.imageUrl ? <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-sm"><img src={s.imageUrl} alt="Homepage hero" className="w-full h-80 object-cover rounded-xl"/></div> : <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-accent mb-4">
                {["01 · Equipment","02 · Repair","03 · Recovery"][active]}
              </p>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-5">
                {s.stats.map(st => (
                  <div key={st.l} className="text-center bg-white/5 rounded-xl py-4 border border-white/8">
                    <div className="font-display font-800 text-2xl text-accent">{st.v}</div>
                    <div className="text-white/50 text-xs mt-1">{st.l}</div>
                  </div>
                ))}
              </div>
              {/* Quick links */}
              <div className="space-y-2">
                {active===0 && [
                  ["Siemens S7-400 PLC CPU",  "Automation",  "£1,240"],
                  ["Thermo Scientific FT-IR", "Lab",         "£2,450"],
                  ["Tektronix MDO3054",        "Test",        "£875"],
                  ["ABB ACS550 Drive 75kW",    "Automation",  "£890"],
                ].map(([n,c,p])=>(
                  <div key={n} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2.5 border border-white/8">
                    <div>
                      <div className="font-display font-600 text-xs text-white">{n}</div>
                      <div className="text-white/35 text-[10px]">{c}</div>
                    </div>
                    <div className="font-display font-700 text-accent text-sm">{p}</div>
                  </div>
                ))}
                {active===1 && [
                  ["Submit request","5 min","01"],
                  ["Receive quote","≤48h","02"],
                  ["Free collection","Your site","03"],
                  ["Return + warranty","60 days","04"],
                ].map(([t,d,n])=>(
                  <div key={t} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2.5 border border-white/8">
                    <span className="font-mono text-accent text-[10px] w-4">{n}</span>
                    <div className="flex-1 font-display font-600 text-xs text-white">{t}</div>
                    <div className="text-white/35 text-[10px]">{d}</div>
                  </div>
                ))}
                {active===2 && [
                  ["📦","Send disposal request","Photos OK"],
                  ["🤝","We quote & visit","24h turnaround"],
                  ["🚚","Free collection","Any location"],
                  ["💷","Paid on collection","Cash or card"],
                ].map(([i,t,d])=>(
                  <div key={t} className="flex items-center gap-2.5 bg-white/5 rounded-lg px-3 py-2.5 border border-white/8">
                    <span className="text-sm">{i}</span>
                    <div className="flex-1 font-display font-600 text-xs text-white">{t}</div>
                    <div className="text-white/35 text-[10px]">{d}</div>
                  </div>
                ))}
              </div>
              <Link href={s.cta1.href} className="block text-center text-accent font-display font-600 text-xs mt-4 hover:text-accent-light transition-colors">
                {s.cta1.label} →
              </Link>
            </div>}
          </div>
        </div>

        {/* Slide controls */}
        <div className="flex items-center gap-3 mt-8">
          {SLIDES.map((_,i)=>(
            <button key={i} onClick={()=>go(i)}
              className={`transition-all duration-300 rounded-full ${i===active?"w-8 h-2 bg-accent":"w-2 h-2 bg-white/25 hover:bg-white/50"}`}/>
          ))}
          <div className="ml-auto flex gap-1.5">
            <button onClick={()=>go((active-1+SLIDES.length)%SLIDES.length)}
              className="w-7 h-7 rounded border border-white/20 text-white/60 hover:border-accent hover:text-accent transition-colors text-xs flex items-center justify-center">←</button>
            <button onClick={()=>go((active+1)%SLIDES.length)}
              className="w-7 h-7 rounded border border-white/20 text-white/60 hover:border-accent hover:text-accent transition-colors text-xs flex items-center justify-center">→</button>
          </div>
        </div>
      </div>
    </section>
  );
}
