import Link from "next/link";
import type { VisualWidget } from "@/lib/siteContent";

function widthClass(width?: string) {
  if (width === "full") return "lg:col-span-full";
  if (width === "half") return "lg:col-span-2";
  if (width === "third") return "lg:col-span-1";
  return "";
}
function normalizeHref(href?: string) { return href || "#"; }

export function VisualWidgetBlock({ widget, index, zone }: { widget: VisualWidget; index: number; zone: string }) {
  const type = widget.type || "card";
  if (type === "spacer") {
    const height = Math.max(12, Math.min(Number(widget.height || 48), 220));
    return <div data-vcms-widget-item={zone} data-vcms-index={index} className="relative" style={{ height }} aria-label="Spacer" />;
  }
  if (type === "divider") return <div data-vcms-widget-item={zone} data-vcms-index={index} className="relative py-6"><div className="mx-auto h-px max-w-5xl bg-gray-200" /></div>;
  if (type === "button") {
    const style = widget.buttonStyle || "primary";
    const cls = style === "outline" ? "inline-flex rounded border border-gray-300 px-5 py-2.5 font-display text-sm font-700 text-navy-900 hover:border-navy-900" : style === "secondary" ? "inline-flex rounded bg-white px-5 py-2.5 font-display text-sm font-700 text-navy-900 ring-1 ring-gray-200 hover:ring-navy-900" : "btn-primary inline-flex";
    return <div data-vcms-widget-item={zone} data-vcms-index={index} className={`${widthClass(widget.width)} relative py-2 ${widget.align === "center" ? "text-center" : widget.align === "right" ? "text-right" : "text-left"}`}><Link href={normalizeHref(widget.url)} target={widget.openInNewTab ? "_blank" : undefined} className={cls}>{widget.text || widget.title || "Button"}</Link></div>;
  }
  if (type === "video") return <div data-vcms-widget-item={zone} data-vcms-index={index} className={`${widthClass(widget.width)} relative overflow-hidden rounded-xl border border-gray-200 bg-navy-950 text-white shadow-sm`}>{widget.videoUrl ? <video src={widget.videoUrl} poster={widget.thumbnailUrl || undefined} controls autoPlay={!!widget.autoplay} muted={!!widget.muted} loop={!!widget.loop} className="aspect-video w-full bg-black object-cover" /> : <div className="flex aspect-video items-center justify-center bg-navy-900"><div className="text-center"><div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-2xl">▶</div><p className="font-display text-sm font-800">Video placeholder</p><p className="mt-1 text-xs text-white/60">Click to add video URL or upload later</p></div></div>}{(widget.title || widget.caption) ? <div className="p-4"><h3 className="font-display font-800">{widget.title}</h3>{widget.caption ? <p className="mt-1 text-sm text-white/65">{widget.caption}</p> : null}</div> : null}</div>;
  if (type === "promotion") return <div data-vcms-widget-item={zone} data-vcms-index={index} className="relative my-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="font-mono text-[10px] uppercase tracking-widest text-amber-700">Promotion</p><h3 className="font-display text-lg font-900 text-navy-950">{widget.title || "Promotion banner"}</h3>{widget.body ? <p className="mt-1 text-sm text-gray-600">{widget.body}</p> : null}{widget.promoCode ? <p className="mt-2 inline-flex rounded bg-white px-2 py-1 font-mono text-xs font-800 text-navy-900 ring-1 ring-amber-200">Code: {widget.promoCode}</p> : null}</div>{widget.linkLabel ? <Link href={normalizeHref(widget.url)} className="btn-primary whitespace-nowrap">{widget.linkLabel}</Link> : null}</div></div>;
  if (type === "text") {
    const Tag = widget.textKind === "heading" ? "h2" : widget.textKind === "subheading" ? "h3" : "p";
    const cls = widget.textKind === "heading" ? "font-display text-3xl font-900 text-navy-950" : widget.textKind === "subheading" ? "font-display text-xl font-800 text-navy-900" : "text-sm leading-relaxed text-gray-600";
    return <div data-vcms-widget-item={zone} data-vcms-index={index} className={`${widthClass(widget.width)} relative py-2 ${widget.align === "center" ? "text-center" : widget.align === "right" ? "text-right" : "text-left"}`}><Tag className={cls}>{widget.text || widget.title || "New text"}</Tag></div>;
  }
  return <div data-vcms-widget-item={zone} data-vcms-index={index} className={`${widthClass(widget.width)} relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm`}>{widget.imageUrl ? <img src={widget.imageUrl} alt={widget.title || "Card image"} className="mb-4 h-36 w-full rounded-lg object-cover" /> : widget.icon ? <div className="mb-3 text-3xl">{widget.icon}</div> : null}<h3 className="font-display text-lg font-800 text-navy-900">{widget.title || "New card"}</h3>{widget.subtitle ? <p className="mt-1 text-sm font-700 text-accent">{widget.subtitle}</p> : null}{widget.body ? <p className="mt-3 text-sm leading-relaxed text-gray-600">{widget.body}</p> : null}{widget.linkLabel ? <Link href={normalizeHref(widget.url)} target={widget.openInNewTab ? "_blank" : undefined} className="mt-4 inline-flex text-sm font-800 text-accent hover:text-accent-dark">{widget.linkLabel} →</Link> : null}</div>;
}

export default function VisualWidgetZone({ pageKey, zone, widgets = [], className = "" }: { pageKey: string; zone: string; widgets?: VisualWidget[]; className?: string }) {
  const fullZone = `${pageKey}:${zone}`;
  return <section data-vcms-dropzone={fullZone} className={`group/vcms-zone relative ${className}`}>
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 hidden -translate-y-1/2 items-center justify-center group-hover/vcms-zone:flex"><span className="rounded-full bg-accent px-3 py-1 text-[11px] font-display font-900 text-navy-950 shadow">+ add section/widget here</span></div>
    {widgets.length ? <div className="max-w-7xl mx-auto px-4 py-6"><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{widgets.map((widget, index) => <VisualWidgetBlock key={widget.id || `${zone}-${index}`} widget={widget} index={index} zone={fullZone} />)}</div></div> : <div className="h-3" />}
  </section>;
}
