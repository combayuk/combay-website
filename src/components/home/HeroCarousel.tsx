"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Search, ShieldCheck, Truck } from "lucide-react";
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
    eyebrow: "10,000+ items in stock",
    heading: "Mission-critical equipment,",
    accent: "ready to dispatch.",
    body: "Tested, warranted industrial and commercial equipment for maintenance teams, engineers and procurement buyers who cannot afford downtime.",
    cta1: { label: "Browse Equipment", href: "/shop" },
    cta2: { label: "View Categories", href: "/shop" },
    stats: [{ v: "10K+", l: "stock items" }, { v: "30d", l: "warranty" }, { v: "48h", l: "typical dispatch" }],
    bg: "from-[#06101F] via-[#0A1A2D] to-[#102840]",
  },
  {
    eyebrow: "Repair service",
    heading: "Reduce replacement cost",
    accent: "without losing time.",
    body: "Repairs, calibration support, preventative maintenance and installation help for industrial, lab and commercial equipment.",
    cta1: { label: "Book a Repair", href: "/repair" },
    cta2: { label: "How It Works", href: "/repair#how" },
    stats: [{ v: "40%", l: "below OEM repair" }, { v: "60d", l: "checking warranty" }, { v: "Free", l: "collection options" }],
    bg: "from-[#06101F] via-[#0B221A] to-[#102840]",
  },
  {
    eyebrow: "Asset recovery",
    heading: "Turn surplus stock",
    accent: "into working capital.",
    body: "Fair-value purchasing, free collection and payment before equipment leaves your site. No perfect stock list required.",
    cta1: { label: "Sell Your Stock", href: "/asset-recovery" },
    cta2: { label: "Recovery Process", href: "/asset-recovery#how" },
    stats: [{ v: "24h", l: "response" }, { v: "Free", l: "collection" }, { v: "Paid", l: "before removal" }],
    bg: "from-[#06101F] via-[#251706] to-[#102840]",
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
      cta1: { label: input.cta1Label === "__HIDDEN__" ? "" : input.cta1Label || fallback.cta1.label, href: input.cta1Href || fallback.cta1.href },
      cta2: { label: input.cta2Label === "__HIDDEN__" ? "" : input.cta2Label || fallback.cta2.label, href: input.cta2Href || fallback.cta2.href },
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

const catalogueRows = [
  ["Siemens S7-400 PLC CPU", "Automation", "Ready"],
  ["Thermo Scientific FT-IR", "Lab", "Tested"],
  ["Tektronix MDO3054", "Test", "In stock"],
  ["ABB ACS550 Drive 75kW", "Drives", "Warranted"],
];

export default function HeroCarousel({ slides: contentSlides }: { slides?: HeroSlideInput[] }) {
  const router = useRouter();
  const slides = buildSlides(contentSlides);
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState("");
  const s = slides[active];

  useEffect(() => {
    const timer = setInterval(() => setActive((current) => (current + 1) % slides.length), 8000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const clean = query.trim();
    if (clean) router.push(`/shop?q=${encodeURIComponent(clean)}`);
  };

  return (
    <section className={`relative overflow-hidden bg-gradient-to-br ${s.bg} text-white`} style={{ ...cmsBackgroundStyle(s.backgroundImageUrl || "/images/hero/industrial-automation-bg.svg", "rgba(6,16,31,.72)") }}>
      <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.65) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.65) 1px, transparent 1px)", backgroundSize: "56px 56px" }} />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/22 to-transparent" />
      <div className="site-shell relative flex min-h-[calc(100svh-104px)] max-h-[760px] items-center py-8 lg:py-10">
        <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-800 text-white/85 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D99611]" /> {s.eyebrow}
            </div>
            <h1 className="font-display text-[2.35rem] font-900 leading-[1.03] tracking-[-0.04em] sm:text-[2.9rem] lg:text-[3.45rem]">
              {s.heading}<br /><span className="text-[#F4B83A]">{s.accent}</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/74 lg:text-base">{s.body}</p>

            <form onSubmit={handleSearch} className="mt-6 flex max-w-2xl items-center overflow-hidden rounded-lg border border-white/15 bg-white shadow-xl shadow-black/10">
              <Search size={18} className="ml-4 flex-shrink-0 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search SKU, brand, MPN, model or category..." className="min-w-0 flex-1 px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400" />
              <button type="submit" className="h-full bg-[#D99611] px-5 py-3 text-sm font-900 text-[#06101F] transition-colors hover:bg-[#B87908] hover:text-white">Search</button>
            </form>

            <div className="mt-5 flex flex-wrap gap-3">
              {s.cta1.label ? <Link href={s.cta1.href} className="btn-primary">{s.cta1.label} <ArrowRight size={16} /></Link> : null}
              {s.cta2.label ? <Link href={s.cta2.href} className="btn-outline-white">{s.cta2.label}</Link> : null}
            </div>

            <div className="mt-6 grid max-w-xl grid-cols-3 gap-3">
              {s.stats.map((stat) => (
                <div key={stat.l} className="rounded-lg border border-white/15 bg-white/10 p-3 backdrop-blur">
                  <div className="font-display text-xl font-900 text-[#F4B83A]">{stat.v}</div>
                  <div className="mt-1 text-xs font-700 uppercase tracking-wide text-white/45">{stat.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/20 backdrop-blur">
              {s.imageUrl ? (
                <img src={s.imageUrl} alt="Combay featured equipment" className="h-[320px] w-full rounded-xl object-cover" />
              ) : (
                <div className="rounded-xl bg-white p-3 text-[#06101F]">
                  <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                      <p className="font-mono text-[10px] font-800 uppercase tracking-[0.18em] text-slate-400">Procurement desk</p>
                      <h2 className="mt-1 font-display text-xl font-900 tracking-tight">Fast stock decisions</h2>
                    </div>
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-900 text-green-700">Live stock</span>
                  </div>
                  <div className="space-y-2">
                    {catalogueRows.map(([title, category, status]) => (
                      <div key={title} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5">
                        <div>
                          <p className="font-display text-sm font-900 text-[#06101F]">{title}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{category}</p>
                        </div>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-900 text-slate-600 ring-1 ring-slate-200">{status}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-800 text-slate-600">
                    <div className="rounded-lg bg-slate-50 p-3"><ShieldCheck size={16} className="mb-1 text-[#B87908]" />Warranted</div>
                    <div className="rounded-lg bg-slate-50 p-3"><Truck size={16} className="mb-1 text-[#B87908]" />Dispatch</div>
                    <div className="rounded-lg bg-slate-50 p-3"><CheckCircle2 size={16} className="mb-1 text-[#B87908]" />Tested</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3">
          {slides.map((slide, index) => (
            <button key={`${slide.eyebrow}-${index}`} onClick={() => setActive(index)} aria-label={`Show slide ${index + 1}`} className={`h-2 rounded-full transition-all ${index === active ? "w-10 bg-[#D99611]" : "w-2 bg-white/25 hover:bg-white/45"}`} />
          ))}
        </div>
      </div>
    </section>
  );
}
