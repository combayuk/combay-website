"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { VisualWidget } from "@/lib/siteContent";

type VisualWidgetsMap = Record<string, VisualWidget[]>;

type VisualWidgetZoneProps = {
  pageKey: string;
  zone: string;
  widgets?: VisualWidget[];
  allWidgets?: VisualWidgetsMap;
  className?: string;
  compact?: boolean;
};

function zoneKey(pageKey: string, zone: string) {
  return zone.includes(":") ? zone : `${pageKey}:${zone}`;
}

function normalizeHref(href?: string) {
  const clean = String(href || "#").trim();
  return clean || "#";
}

function widthClass(width?: string) {
  switch (width) {
    case "full": return "lg:col-span-12";
    case "threeQuarter": return "lg:col-span-9";
    case "twoThird": return "lg:col-span-8";
    case "half": return "lg:col-span-6";
    case "third": return "lg:col-span-4";
    case "quarter": return "lg:col-span-3";
    default: return "lg:col-span-4";
  }
}

function alignClass(align?: string) {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
}

function buttonClass(style?: string) {
  if (style === "outline") return "inline-flex rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-900 text-[#06101F] shadow-sm transition-colors hover:border-[#06101F]";
  if (style === "secondary") return "btn-secondary";
  return "btn-primary";
}

function sectionBg(variant?: string) {
  if (variant === "dark") return "bg-[#06101F] text-white border-[#06101F]";
  if (variant === "accent") return "bg-[#FFF8E8] border-[#E6C06E]";
  if (variant === "soft") return "bg-slate-50 border-slate-200";
  return "bg-white border-slate-200";
}

function gridCols(columns?: number) {
  const n = Math.max(1, Math.min(4, Number(columns || 1)));
  if (n === 4) return "lg:grid-cols-4";
  if (n === 3) return "lg:grid-cols-3";
  if (n === 2) return "lg:grid-cols-2";
  return "lg:grid-cols-1";
}

function WidgetChrome({ widget, index, zone, children, className = "" }: { widget: VisualWidget; index: number; zone: string; children: React.ReactNode; className?: string }) {
  return (
    <div data-vcms-widget-item={zone} data-vcms-index={index} data-vcms-widget-type={widget.type || "card"} className={`${widthClass(widget.width)} relative ${className}`}>
      {children}
    </div>
  );
}

export function VisualWidgetBlock({ widget, index, zone, pageKey, allWidgets }: { widget: VisualWidget; index: number; zone: string; pageKey: string; allWidgets?: VisualWidgetsMap }) {
  if (widget.visible === false) return null;
  const type = widget.type || "card";
  const style: React.CSSProperties = { marginTop: Number(widget.marginTop || 0) || undefined, marginBottom: Number(widget.marginBottom || 0) || undefined };

  if (type === "section") {
    const columns = Math.max(1, Math.min(4, Number(widget.columns || 1)));
    return (
      <WidgetChrome widget={widget} index={index} zone={zone} className="lg:col-span-12">
        <section className={`${sectionBg(widget.sectionVariant)} rounded-2xl border px-5 py-8 shadow-sm`} style={style}>
          {(widget.title || widget.body) ? <div className="mx-auto mb-6 max-w-4xl text-center">{widget.title ? <h2 className="font-display text-2xl font-900 tracking-[-0.02em] text-[#06101F]">{widget.title}</h2> : null}{widget.body ? <p className="mt-2 text-sm leading-7 text-slate-600">{widget.body}</p> : null}</div> : null}
          <div className={`grid gap-5 ${gridCols(columns)}`}>{Array.from({ length: columns }).map((_, colIndex) => { const childZone = `${zone}:${widget.id}:col${colIndex}`; return <div key={childZone} className="min-h-[120px] rounded-xl border border-dashed border-slate-300 bg-white/75"><VisualWidgetZone pageKey={pageKey} zone={childZone} allWidgets={allWidgets} compact /></div>; })}</div>
        </section>
      </WidgetChrome>
    );
  }

  if (type === "spacer") return <WidgetChrome widget={widget} index={index} zone={zone} className="lg:col-span-12"><div style={{ height: Math.max(8, Math.min(Number(widget.height || 48), 260)) }} aria-label="Spacer" /></WidgetChrome>;
  if (type === "divider") return <WidgetChrome widget={widget} index={index} zone={zone} className="lg:col-span-12"><div className="py-6" style={style}><div className="mx-auto max-w-6xl" style={{ height: Math.max(1, Math.min(Number(widget.thickness || 1), 8)), backgroundColor: widget.colour || "#E2E8F0" }} /></div></WidgetChrome>;
  if (type === "button") return <WidgetChrome widget={widget} index={index} zone={zone} className={alignClass(widget.align)}><div className="py-2" style={style}><Link href={normalizeHref(widget.url)} target={widget.openInNewTab ? "_blank" : undefined} className={buttonClass(widget.buttonStyle)}>{widget.text || widget.title || widget.linkLabel || "Button"}</Link></div></WidgetChrome>;
  if (type === "video") return <WidgetChrome widget={widget} index={index} zone={zone}><div className="overflow-hidden rounded-xl border border-slate-200 bg-[#06101F] text-white shadow-sm" style={style}>{widget.videoUrl ? <video src={widget.videoUrl} poster={widget.thumbnailUrl || undefined} controls autoPlay={!!widget.autoplay} muted={!!widget.muted} loop={!!widget.loop} className="aspect-video w-full bg-black object-cover" /> : <div className="flex aspect-video items-center justify-center bg-[#0A1A2D]"><div className="text-center"><div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-2xl">▶</div><p className="font-display text-sm font-900">Video placeholder</p><p className="mt-1 text-xs text-white/60">Select this widget to add a video URL or upload a video.</p></div></div>}{(widget.title || widget.caption) ? <div className="p-4">{widget.title ? <h3 className="font-display font-900">{widget.title}</h3> : null}{widget.caption ? <p className="mt-1 text-sm text-white/65">{widget.caption}</p> : null}</div> : null}</div></WidgetChrome>;
  if (type === "promotion") return <WidgetChrome widget={widget} index={index} zone={zone} className="lg:col-span-12"><div className="my-4 rounded-xl border border-[#E6C06E] bg-[#FFF8E8] px-5 py-4 shadow-sm" style={style}><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="font-mono text-[10px] font-800 uppercase tracking-widest text-[#B87908]">Promotion</p><h3 className="font-display text-lg font-900 text-[#06101F]">{widget.title || "Promotion banner"}</h3>{widget.body ? <p className="mt-1 text-sm text-slate-600">{widget.body}</p> : null}{widget.promoCode ? <p className="mt-2 inline-flex rounded bg-white px-2 py-1 font-mono text-xs font-900 text-[#06101F] ring-1 ring-[#E6C06E]">Code: {widget.promoCode}</p> : null}</div>{widget.linkLabel ? <Link href={normalizeHref(widget.url)} className="btn-primary whitespace-nowrap">{widget.linkLabel}</Link> : null}</div></div></WidgetChrome>;
  if (type === "text") { const Tag = widget.textKind === "heading" ? "h2" : widget.textKind === "subheading" ? "h3" : "p"; const cls = widget.textKind === "heading" ? "font-display text-3xl font-900 text-[#06101F]" : widget.textKind === "subheading" ? "font-display text-xl font-900 text-[#0A1A2D]" : widget.textKind === "caption" ? "text-xs leading-7 text-slate-500" : "text-sm leading-7 text-slate-600"; return <WidgetChrome widget={widget} index={index} zone={zone} className={alignClass(widget.align)}><div className="py-2" style={style}><Tag className={cls}>{widget.text || widget.title || "New text"}</Tag></div></WidgetChrome>; }
  if (type === "image") return <WidgetChrome widget={widget} index={index} zone={zone}><figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" style={style}>{widget.imageUrl ? <img src={widget.imageUrl} alt={widget.title || "Image"} className="aspect-[4/3] w-full object-cover" /> : <div className="flex aspect-[4/3] items-center justify-center bg-slate-50 text-sm text-slate-500">Image placeholder</div>}{(widget.title || widget.caption) ? <figcaption className="p-3 text-sm text-slate-600">{widget.title || widget.caption}</figcaption> : null}</figure></WidgetChrome>;

  return <WidgetChrome widget={widget} index={index} zone={zone}><div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm" style={style}>{widget.imageUrl ? <img src={widget.imageUrl} alt={widget.title || "Card image"} className="mb-4 h-36 w-full rounded-lg object-cover" /> : widget.icon ? <div className="mb-3 text-3xl">{widget.icon}</div> : null}<h3 className="font-display text-lg font-900 text-[#06101F]">{widget.title || "New card"}</h3>{widget.subtitle ? <p className="mt-1 text-sm font-900 text-[#B87908]">{widget.subtitle}</p> : null}{widget.body ? <p className="mt-3 text-sm leading-7 text-slate-600">{widget.body}</p> : null}{widget.linkLabel ? <Link href={normalizeHref(widget.url)} target={widget.openInNewTab ? "_blank" : undefined} className="mt-4 inline-flex text-sm font-900 text-[#B87908] hover:text-[#06101F]">{widget.linkLabel} →</Link> : null}</div></WidgetChrome>;
}

export default function VisualWidgetZone({ pageKey, zone, widgets, allWidgets, className = "", compact = false }: VisualWidgetZoneProps) {
  const [visualCms, setVisualCms] = useState(false);
  useEffect(() => setVisualCms(new URLSearchParams(window.location.search).get("vcms") === "1"), []);
  const fullZone = zoneKey(pageKey, zone);
  const zoneWidgets = widgets ?? allWidgets?.[fullZone] ?? [];
  if (!visualCms && zoneWidgets.length === 0) return null;
  return (
    <section data-vcms-dropzone={fullZone} className={`group/vcms-zone relative ${className}`}>
      {visualCms ? <div className="pointer-events-none absolute inset-x-0 top-0 z-10 hidden -translate-y-1/2 items-center justify-center group-hover/vcms-zone:flex"><span className="rounded-full bg-[#D99611] px-3 py-1 text-[11px] font-900 text-[#06101F] shadow">+ add section/widget here</span></div> : null}
      {zoneWidgets.length ? <div className={`${compact ? "px-3 py-3" : "mx-auto max-w-7xl px-4 py-6"}`}><div className="grid grid-cols-1 gap-5 lg:grid-cols-12">{zoneWidgets.map((widget, index) => <VisualWidgetBlock key={widget.id || `${fullZone}-${index}`} widget={widget} index={index} zone={fullZone} pageKey={pageKey} allWidgets={allWidgets} />)}</div></div> : visualCms ? <div className={compact ? "min-h-[80px]" : "h-3"} /> : null}
    </section>
  );
}
