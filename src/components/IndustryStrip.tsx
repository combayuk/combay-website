"use client";
import Link from "next/link";

const industries = [
  { label: "Scientific Research", slug: "lab-scientific", icon: "🔬" },
  { label: "Automation & Control", slug: "automation", icon: "⚙️" },
  { label: "Manufacturing", slug: "manufacturing", icon: "🏭" },
  { label: "Display & Projectors", slug: "display-av", icon: "📺" },
  { label: "Oil & Gas", slug: "oil-gas", icon: "🛢️" },
  { label: "Audio & Broadcast", slug: "audio-broadcast", icon: "📡" },
  { label: "IT & Networking", slug: "it-networking", icon: "🖧" },
  { label: "Test & Detection", slug: "test-detection", icon: "🔭" },
];

export default function IndustryStrip() {
  return (
    <section className="bg-gray-50 border-b border-gray-200 py-4">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <span className="font-mono text-xs text-gray-400 tracking-wider uppercase whitespace-nowrap pr-3 border-r border-gray-200 mr-1">
            Industries
          </span>
          {industries.map((ind) => (
            <Link
              key={ind.slug}
              href={`/shop?cat=${ind.slug}`}
              className="flex items-center gap-1.5 bg-white border border-gray-200 text-navy-900 font-display font-600 text-xs px-3 py-2 rounded whitespace-nowrap hover:border-accent hover:text-accent hover:bg-accent/5 transition-all flex-shrink-0"
            >
              <span>{ind.icon}</span>
              {ind.label}
            </Link>
          ))}
          <Link
            href="/shop"
            className="ml-auto flex-shrink-0 text-accent font-display font-600 text-xs hover:text-accent-dark transition-colors whitespace-nowrap pl-3"
          >
            Browse all →
          </Link>
        </div>
      </div>
    </section>
  );
}
