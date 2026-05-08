"use client";
import { useState } from "react";
import Link from "next/link";
import { cmsBackgroundStyle } from "@/lib/cmsBackground";
import type { CmsPage } from "@/lib/siteContent";

function adaptiveGridClass(count: number) {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "sm:grid-cols-2";
  if (count === 3) return "sm:grid-cols-2 lg:grid-cols-3";
  return "sm:grid-cols-2 lg:grid-cols-4";
}

function cardSpan(count: number, index: number) {
  if (count === 1) return "max-w-2xl";
  if (count === 5 && index >= 3) return "lg:col-span-2";
  return "";
}

export default function ServiceTabs({ content }: { content?: CmsPage }) {
  const [active, setActive] = useState(0);
  const tabs = content?.blocks || [];
  const tab = tabs[active];
  if (!content || !tab) return null;
  return <section className="py-16 bg-white" data-vcms-collection="page.blocks" style={cmsBackgroundStyle(content.backgroundImageUrl, "rgba(255,255,255,.94)")}><div className="max-w-7xl mx-auto px-4"><div className="mb-8"><p className="font-mono text-xs tracking-widest uppercase text-accent mb-2">{content.eyebrow}</p><h2 className="font-display font-800 text-3xl lg:text-4xl text-navy-900">{content.heading} <em className="not-italic text-accent">{content.accent}</em></h2><p className="text-gray-500 text-sm mt-2 max-w-2xl">{content.body}</p></div><div className="flex flex-wrap gap-2 mb-8">{tabs.map((t,i)=><button key={`${t.title}-${i}`} data-vcms-item="page.blocks" data-vcms-index={i} onClick={()=>setActive(i)} className={`flex items-center gap-2 font-display font-600 text-sm px-5 py-3 rounded-lg border transition-all ${i===active?"bg-navy-900 text-white border-navy-900":"bg-white text-navy-800 border-gray-200 hover:border-navy-900"}`}><span>{t.icon}</span>{t.title}</button>)}</div><div className="grid lg:grid-cols-2 gap-10 items-start"><div><h3 className="font-display font-800 text-2xl text-navy-900 mb-3">{tab.title}</h3><p className="text-accent text-sm font-display font-700 mb-3">{tab.subtitle}</p><p className="text-gray-600 leading-relaxed mb-6">{tab.body}</p><div className="flex flex-wrap gap-3">{tab.linkLabel && <Link href={tab.linkHref || "/"} className="bg-navy-900 text-white font-display font-700 px-5 py-2.5 rounded hover:bg-navy-800 transition-colors">{tab.linkLabel} →</Link>}<Link href="/contact" className="border border-gray-300 text-navy-900 font-display font-600 px-5 py-2.5 rounded hover:border-navy-900 transition-colors">Ask a Question</Link></div></div><div className="bg-gray-50 border border-gray-200 rounded-xl p-6">{tab.imageUrl ? <img src={tab.imageUrl} alt={tab.title} className="w-full h-72 object-cover rounded-lg"/> : <div className="text-center py-16"><div className="text-5xl mb-4">{tab.icon}</div><div className="font-display font-800 text-2xl text-navy-900">{tab.title}</div><div className="text-gray-500 mt-2">{tab.subtitle}</div></div>}</div></div></div></section>;
}
