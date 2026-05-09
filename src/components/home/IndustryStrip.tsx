"use client";
import Link from "next/link";

const INDUSTRIES = [
  { label: "Scientific Research", slug: "lab-scientific", icon: "🔬", count: "1,200+" },
  { label: "Automation & Control", slug: "automation-control", icon: "⚙️", count: "2,400+" },
  { label: "Manufacturing", slug: "manufacturing", icon: "🏭", count: "890+" },
  { label: "Display & Projectors", slug: "display-av", icon: "📺", count: "340+" },
  { label: "Oil & Gas", slug: "oil-gas", icon: "🛢️", count: "520+" },
  { label: "Audio & Broadcast", slug: "audio-broadcast", icon: "🎙️", count: "280+" },
  { label: "IT & Networking", slug: "it-networking", icon: "🖧", count: "1,100+" },
  { label: "Test & Detection", slug: "test-detection", icon: "🔭", count: "1,650+" },
];

export default function IndustryStrip() {
  return (
    <section className="border-y border-slate-200 bg-[#F4F6F8] py-8">
      <div className="site-shell">
        <div className="mb-4 flex items-center gap-3">
          <p className="font-mono text-[11px] font-800 uppercase tracking-[0.18em] text-slate-500">Serving industries</p>
          <div className="h-px flex-1 bg-slate-200" />
          <Link href="/shop" className="text-xs font-900 text-[#B87908] transition-colors hover:text-[#06101F]">Browse all →</Link>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {INDUSTRIES.map((industry) => (
            <Link key={industry.slug} href={`/shop?category=${industry.slug}`} className="group rounded-xl border border-slate-200 bg-white p-3.5 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#D99611]/45 hover:shadow-md">
              <span className="mb-2 block text-2xl transition-transform group-hover:scale-110">{industry.icon}</span>
              <span className="block text-[11px] font-900 leading-tight text-[#06101F]">{industry.label}</span>
              <span className="mt-1 block font-mono text-[10px] text-slate-400">{industry.count}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
