"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cmsBackgroundStyle } from "@/lib/cmsBackground";
import type { CmsPage } from "@/lib/siteContent";

function gridClass(count: number) {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "md:grid-cols-2";
  if (count === 3) return "md:grid-cols-3";
  return "md:grid-cols-2 xl:grid-cols-4";
}

export default function ServiceTabs({ content }: { content?: CmsPage }) {
  const cards = content?.blocks || [];
  if (!content || !cards.length) return null;
  return (
    <section className="section-pad bg-white" data-vcms-collection="page.blocks" style={cmsBackgroundStyle(content.backgroundImageUrl, "rgba(255,255,255,.96)")}>
      <div className="site-shell">
        <div className="mb-9 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:items-end">
          <div>
            <p className="section-label">{content.eyebrow || "What We Do"}</p>
            <h2 className="section-heading mt-2 text-3xl lg:text-5xl">
              {content.heading} <span className="text-[#B87908]">{content.accent}</span>
            </h2>
          </div>
          <p className="section-lede max-w-2xl lg:justify-self-end">{content.body}</p>
        </div>

        <div className={`grid gap-4 ${gridClass(cards.length)}`}>
          {cards.map((card, index) => (
            <article key={`${card.title}-${index}`} data-vcms-item="page.blocks" data-vcms-index={index} className="group flex min-h-[330px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#D99611]/55 hover:shadow-xl">
              {card.imageUrl ? (
                <img src={card.imageUrl} alt={card.title} className="mb-5 h-40 w-full rounded-xl object-cover" />
              ) : (
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-3xl transition-colors group-hover:border-[#D99611]/40 group-hover:bg-[#D99611]/10">{card.icon || "⚙"}</div>
              )}
              <p className="mb-2 text-xs font-900 uppercase tracking-[0.14em] text-[#B87908]">{card.subtitle}</p>
              <h3 className="font-display text-xl font-900 tracking-[-0.02em] text-[#06101F]">{card.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">{card.body}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {card.linkLabel ? <Link href={card.linkHref || "/"} className="btn-primary py-2 text-xs">{card.linkLabel} <ArrowRight size={14} /></Link> : null}
                <Link href="/contact" className="btn-secondary py-2 text-xs">Ask a Question</Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
