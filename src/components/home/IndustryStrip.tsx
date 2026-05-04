"use client";
import Link from "next/link";

const INDUSTRIES = [
  { label:"Scientific Research",  slug:"lab-scientific",    icon:"🔬", count:"1,200+" },
  { label:"Automation & Control", slug:"automation-control",icon:"⚙️", count:"2,400+" },
  { label:"Manufacturing",        slug:"manufacturing",     icon:"🏭", count:"890+" },
  { label:"Display & Projectors", slug:"display-av",        icon:"📺", count:"340+" },
  { label:"Oil & Gas",            slug:"oil-gas",           icon:"🛢️", count:"520+" },
  { label:"Audio & Broadcast",   slug:"audio-broadcast",   icon:"🎙️", count:"280+" },
  { label:"IT & Networking",      slug:"it-networking",     icon:"🖧",  count:"1,100+" },
  { label:"Test & Detection",     slug:"test-detection",    icon:"🔭", count:"1,650+" },
];

export default function IndustryStrip() {
  return (
    <section className="bg-surface border-b border-gray-200 py-5">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono text-[10px] text-gray-400 tracking-[0.18em] uppercase whitespace-nowrap">Serving Industries</span>
          <div className="flex-1 h-px bg-gray-200"/>
          <Link href="/shop" className="font-display font-600 text-xs text-accent hover:text-accent-dark whitespace-nowrap transition-colors">Browse all →</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {INDUSTRIES.map(ind => (
            <Link key={ind.slug} href={`/shop?category=${ind.slug}`}
              className="group flex flex-col items-center text-center bg-white border border-gray-200 rounded-xl p-3 hover:border-accent hover:bg-accent/5 hover:shadow-sm transition-all duration-200">
              <span className="text-xl mb-1.5 group-hover:scale-110 transition-transform duration-200">{ind.icon}</span>
              <span className="font-display font-600 text-gray-800 text-[10px] leading-tight mb-1">{ind.label}</span>
              <span className="font-mono text-[9px] text-gray-400">{ind.count}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
