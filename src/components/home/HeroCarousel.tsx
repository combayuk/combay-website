"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Gauge, PackageCheck, Search, ShieldCheck, Truck } from "lucide-react";
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
    heading: "Industrial equipment supply,",
    accent: "without the downtime.",
    body: "Tested PLCs, HMIs, drives, lab instruments, test equipment and commercial stock supplied by a UK team that understands maintenance pressure.",
    cta1: { label: "Browse Equipment", href: "/shop" },
    cta2: { label: "View Categories", href: "/shop" },
    stats: [{ v: "10K+", l: "stock items" }, { v: "30d", l: "warranty" }, { v: "48h", l: "typical dispatch" }],
    bg: "from-[#06101F] via-[#0A1A2D] to-[#102840]",
  },
  {
    eyebrow: "Repair service",
    heading: "Repair before replace,",
    accent: "wherever possible.",
    body: "Practical repair, calibration and servicing support for engineering teams trying to keep older production, laboratory and site equipment running.",
    cta1: { label: "Book a Repair", href: "/repair" },
    cta2: { label: "How It Works", href: "/repair#how" },
    stats: [{ v: "40%", l: "below OEM target" }, { v: "60d", l: "checking warranty" }, { v: "Free", l: "collection options" }],
    bg: "from-[#06101F] via-[#0B221A] to-[#102840]",
  },
  {
    eyebrow: "Asset recovery",
    heading: "Surplus equipment,",
    accent: "converted into cash.",
    body: "Clear warehouses, labs and engineering stores with fair-value purchasing, free collection and payment before equipment leaves your site.",
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

const capabilityStrip = [
  { Icon: PackageCheck, label: "Bench-tested stock", note: "PLCs · drives · lab · test" },
  { Icon: ShieldCheck, label: "Warranty first", note: "30-day RTB on sold goods" },
  { Icon: Truck, label: "Dispatch support", note: "UK-based procurement desk" },
  { Icon: Gauge, label: "Repair route", note: "before costly replacement" },
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
    <section className={`relative overflow-hidden bg-gradient-to-br ${s.bg} text-white`} style={{ ...cmsBackgroundStyle(s.backgroundImageUrl || "/images/hero/industrial-automation-bg.svg", "rgba(6,16,31,.74)") }}>
      <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.65) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.65) 1px, transparent 1px)", backgroundSize: "56px 56px" }} />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/25 to-transparent" />
      <div className="site-shell relative flex min-h-[500px] items-center py-7 sm:min-h-[520px] lg:min-h-[560px] xl:min-h-[590px] lg:py-8">
        <div className="w-full max-w-5xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-sm border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-900 uppercase tracking-[0.16em] text-white/85 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D99611]" /> {s.eyebrow}
          </div>
          <h1 className="max-w-4xl font-display text-[2.25rem] font-900 leading-[1.02] tracking-[-0.045em] sm:text-[2.85rem] lg:text-[4rem]">
            {s.heading} <span className="text-[#F4B83A]">{s.accent}</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/76 lg:text-base">{s.body}</p>

          <form onSubmit={handleSearch} className="mt-6 flex max-w-2xl items-center overflow-hidden rounded-md border border-white/15 bg-white shadow-xl shadow-black/10">
            <Search size={18} className="ml-4 flex-shrink-0 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search SKU, brand, MPN, model or category..." className="min-w-0 flex-1 px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400" />
            <button type="submit" className="h-full bg-[#D99611] px-5 py-3 text-sm font-900 text-[#06101F] transition-colors hover:bg-[#B87908] hover:text-white">Search</button>
          </form>

          <div className="mt-5 flex flex-wrap gap-3">
            {s.cta1.label ? <Link href={s.cta1.href} className="btn-primary">{s.cta1.label} <ArrowRight size={16} /></Link> : null}
            {s.cta2.label ? <Link href={s.cta2.href} className="btn-outline-white">{s.cta2.label}</Link> : null}
          </div>

          <div className="mt-6 grid max-w-4xl gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {capabilityStrip.map(({ Icon, label, note }) => (
              <div key={label} className="flex items-start gap-3 border-l border-white/14 bg-white/[0.055] px-3 py-3 backdrop-blur-sm">
                <Icon size={17} className="mt-0.5 flex-shrink-0 text-[#F4B83A]" />
                <div>
                  <p className="text-xs font-900 text-white">{label}</p>
                  <p className="mt-1 text-[11px] leading-4 text-white/48">{note}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {s.stats.map((stat) => (
              <div key={stat.l} className="inline-flex items-center gap-2 rounded-sm border border-white/14 bg-black/15 px-3 py-2">
                <span className="font-display text-lg font-900 text-[#F4B83A]">{stat.v}</span>
                <span className="text-[11px] font-800 uppercase tracking-wide text-white/48">{stat.l}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-5 right-5 hidden items-center gap-2 rounded-sm border border-white/12 bg-black/25 px-3 py-2 text-[11px] font-900 uppercase tracking-[0.14em] text-white/55 backdrop-blur lg:flex">
          <CheckCircle2 size={14} className="text-[#F4B83A]" /> Combay stockholding supply desk
        </div>
      </div>
    </section>
  );
}
