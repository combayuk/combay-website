"use client";
import Link from "next/link";

const INDUSTRIES = [
  { label: "Scientific Research", slug: "lab-scientific", image: "/images/categories/real/lab-instrument.svg", count: "1,200+" },
  { label: "Automation & Control", slug: "automation-control", image: "/images/categories/real/plc-module.svg", count: "2,400+" },
  { label: "Manufacturing", slug: "manufacturing", image: "/images/categories/real/robot-arm.svg", count: "890+" },
  { label: "Display & Projectors", slug: "display-av", image: "/images/categories/real/projector.svg", count: "340+" },
  { label: "Oil & Gas", slug: "oil-gas", image: "/images/categories/real/gas-detector.svg", count: "520+" },
  { label: "Audio & Broadcast", slug: "audio-broadcast", image: "/images/categories/real/audio-broadcast.svg", count: "280+" },
  { label: "IT & Networking", slug: "it-networking", image: "/images/categories/real/server-switch.svg", count: "1,100+" },
  { label: "Test & Detection", slug: "test-detection", image: "/images/categories/real/oscilloscope.svg", count: "1,650+" },
];

export default function IndustryStrip() {
  return (
    <section className="border-y border-slate-200 bg-[#F4F6F8] py-8">
      <div className="site-shell">
        <div className="mb-4 flex items-center gap-3">
          <p className="font-mono text-[11px] font-800 uppercase tracking-[0.18em] text-slate-500">Serving industries</p>
          <div className="h-px flex-1 bg-slate-200" />
          <Link href="/shop" className="text-xs font-900 text-[#C9872F] transition-colors hover:text-[#2D4F7A]">Browse all →</Link>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {INDUSTRIES.map((industry) => (
            <Link key={industry.slug} href={`/shop?category=${industry.slug}`} className="group rounded-xl border border-slate-200 bg-white p-3.5 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#E8A44A]/45 hover:shadow-md">
              <span className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-xl bg-white transition-colors group-hover:bg-[#FFF8E8]">
                <img src={industry.image} alt="" className="h-16 w-16 object-contain" />
              </span>
              <span className="block text-[11px] font-900 leading-tight text-[#2D4F7A]">{industry.label}</span>
              <span className="mt-1 block font-mono text-[10px] text-slate-400">{industry.count}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
