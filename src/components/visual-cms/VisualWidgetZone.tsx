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
    case "full":
      return "lg:col-span-12";
    case "threeQuarter":
      return "lg:col-span-9";
    case "twoThird":
      return "lg:col-span-8";
    case "half":
      return "lg:col-span-6";
    case "third":
      return "lg:col-span-4";
    case "quarter":
      return "lg:col-span-3";
    default:
      return "lg:col-span-4";
  }
}

function alignClass(align?: string) {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
}

function buttonClass(style?: string) {
  if (style === "outline") return "inline-flex rounded border border-gray-300 px-5 py-2.5 font-display text-sm font-700 text-navy-900 transition-colors hover:border-navy-900 hover:bg-white";
  if (style === "secondary") return "inline-flex rounded bg-white px-5 py-2.5 font-display text-sm font-700 text-navy-900 ring-1 ring-gray-200 transition-colors hover:ring-navy-900";
  return "btn-primary inline-flex";
}

function sectionBg(variant?: string) {
  if (variant === "dark") return "bg-navy-950 text-white";
  if (variant === "accent") return "bg-accent/15";
  if (variant === "soft") return "bg-gray-50";
  return "bg-white";
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
    <div
      data-vcms-widget-item={zone}
      data-vcms-index={index}
      data-vcms-widget-type={widget.type || "card"}
      className={`${widthClass(widget.width)} relative ${className}`}
    >
      {children}
    </div>
  );
}

export function VisualWidgetBlock({ widget, index, zone, pageKey, allWidgets }: { widget: VisualWidget; index: number; zone: string; pageKey: string; allWidgets?: VisualWidgetsMap }) {
  if (widget.visible === false) return null;
  const type = widget.type || "card";
  const mt = Number(widget.marginTop || 0);
  const mb = Number(widget.marginBottom || 0);
  const style: React.CSSProperties = { marginTop: mt || undefined, marginBottom: mb || undefined };

  if (type === "section") {
    const columns = Math.max(1, Math.min(4, Number(widget.columns || 1)));
    return (
      <WidgetChrome widget={widget} index={index} zone={zone} className="lg:col-span-12" >
        <section className={`${sectionBg(widget.sectionVariant)} rounded-2xl border border-gray-200 px-4 py-8 shadow-sm`} style={style}>
          {(widget.title || widget.body) ? (
            <div className="mx-auto mb-6 max-w-4xl text-center">
              {widget.title ? <h2 className="font-display text-2xl font-900 text-navy-950">{widget.title}</h2> : null}
              {widget.body ? <p className="mt-2 text-sm leading-relaxed text-gray-600">{widget.body}</p> : null}
            </div>
          ) : null}
          <div className={`grid gap-5 ${gridCols(columns)}`}>
            {Array.from({ length: columns }).map((_, colIndex) => {
              const childZone = `${zone}:${widget.id}:col${colIndex}`;
              return (
                <div key={childZone} className="min-h-[120px] rounded-xl border border-dashed border-gray-300 bg-white/70">
                  <VisualWidgetZone pageKey={pageKey} zone={childZone} allWidgets={allWidgets} compact />
                </div>
              );
            })}
          </div>
        </section>
      </WidgetChrome>
    );
  }

  if (type === "spacer") {
    const height = Math.max(8, Math.min(Number(widget.height || 48), 260));
    return <WidgetChrome widget={widget} index={index} zone={zone} className="lg:col-span-12"><div style={{ height }} aria-label="Spacer" /></WidgetChrome>;
  }

  if (type === "divider") {
    const thickness = Math.max(1, Math.min(Number(widget.thickness || 1), 8));
    const colour = widget.colour || "#E5E7EB";
    return <WidgetChrome widget={widget} index={index} zone={zone} className="lg:col-span-12"><div className="py-6" style={style}><div className="mx-auto max-w-6xl" style={{ height: thickness, backgroundColor: colour }} /></div></WidgetChrome>;
  }

  if (type === "button") {
    return (
      <WidgetChrome widget={widget} index={index} zone={zone} className={alignClass(widget.align)}>
        <div className="py-2" style={style}>
          <Link href={normalizeHref(widget.url)} target={widget.openInNewTab ? "_blank" : undefined} className={buttonClass(widget.buttonStyle)}>
            {widget.text || widget.title || widget.linkLabel || "Button"}
          </Link>
        </div>
      </WidgetChrome>
    );
  }

  if (type === "video") {
    return (
      <WidgetChrome widget={widget} index={index} zone={zone}>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-navy-950 text-white shadow-sm" style={style}>
          {widget.videoUrl ? (
            <video src={widget.videoUrl} poster={widget.thumbnailUrl || undefined} controls autoPlay={!!widget.autoplay} muted={!!widget.muted} loop={!!widget.loop} className="aspect-video w-full bg-black object-cover" />
          ) : (
            <div className="flex aspect-video items-center justify-center bg-navy-900">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-2xl">▶</div>
                <p className="font-display text-sm font-800">Video placeholder</p>
                <p className="mt-1 text-xs text-white/60">Select this widget to add a video URL or upload a video.</p>
              </div>
            </div>
          )}
          {(widget.title || widget.caption) ? (
            <div className="p-4">
              {widget.title ? <h3 className="font-display font-800">{widget.title}</h3> : null}
              {widget.caption ? <p className="mt-1 text-sm text-white/65">{widget.caption}</p> : null}
            </div>
          ) : null}
        </div>
      </WidgetChrome>
    );
  }

  if (type === "promotion") {
    return (
      <WidgetChrome widget={widget} index={index} zone={zone} className="lg:col-span-12">
        <div className="my-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm" style={style}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-amber-700">Promotion</p>
              <h3 className="font-display text-lg font-900 text-navy-950">{widget.title || "Promotion banner"}</h3>
              {widget.body ? <p className="mt-1 text-sm text-gray-600">{widget.body}</p> : null}
              {widget.promoCode ? <p className="mt-2 inline-flex rounded bg-white px-2 py-1 font-mono text-xs font-800 text-navy-900 ring-1 ring-amber-200">Code: {widget.promoCode}</p> : null}
            </div>
            {widget.linkLabel ? <Link href={normalizeHref(widget.url)} className="btn-primary whitespace-nowrap">{widget.linkLabel}</Link> : null}
          </div>
        </div>
      </WidgetChrome>
    );
  }

  if (type === "text") {
    const Tag = widget.textKind === "heading" ? "h2" : widget.textKind === "subheading" ? "h3" : widget.textKind === "caption" ? "p" : "p";
    const cls = widget.textKind === "heading" ? "font-display text-3xl font-900 text-navy-950" : widget.textKind === "subheading" ? "font-display text-xl font-800 text-navy-900" : widget.textKind === "caption" ? "text-xs leading-relaxed text-gray-500" : "text-sm leading-relaxed text-gray-600";
    return <WidgetChrome widget={widget} index={index} zone={zone} className={alignClass(widget.align)}><div className="py-2" style={style}><Tag className={cls}>{widget.text || widget.title || "New text"}</Tag></div></WidgetChrome>;
  }

  if (type === "image") {
    return (
      <WidgetChrome widget={widget} index={index} zone={zone}>
        <figure className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" style={style}>
          {widget.imageUrl ? <img src={widget.imageUrl} alt={widget.title || "Image"} className="aspect-[4/3] w-full object-cover" /> : <div className="flex aspect-[4/3] items-center justify-center bg-gray-50 text-sm text-gray-500">Image placeholder</div>}
          {(widget.title || widget.caption) ? <figcaption className="p-3 text-sm text-gray-600">{widget.title || widget.caption}</figcaption> : null}
        </figure>
      </WidgetChrome>
    );
  }

  return (
    <WidgetChrome widget={widget} index={index} zone={zone}>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm" style={style}>
        {widget.imageUrl ? <img src={widget.imageUrl} alt={widget.title || "Card image"} className="mb-4 h-36 w-full rounded-lg object-cover" /> : widget.icon ? <div className="mb-3 text-3xl">{widget.icon}</div> : null}
        <h3 className="font-display text-lg font-800 text-navy-900">{widget.title || "New card"}</h3>
        {widget.subtitle ? <p className="mt-1 text-sm font-700 text-accent">{widget.subtitle}</p> : null}
        {widget.body ? <p className="mt-3 text-sm leading-relaxed text-gray-600">{widget.body}</p> : null}
        {widget.linkLabel ? <Link href={normalizeHref(widget.url)} target={widget.openInNewTab ? "_blank" : undefined} className="mt-4 inline-flex text-sm font-800 text-accent hover:text-accent-dark">{widget.linkLabel} →</Link> : null}
      </div>
    </WidgetChrome>
  );
}

export default function VisualWidgetZone({ pageKey, zone, widgets, allWidgets, className = "", compact = false }: VisualWidgetZoneProps) {
  const fullZone = zoneKey(pageKey, zone);
  const zoneWidgets = widgets ?? allWidgets?.[fullZone] ?? [];
  return (
    <section data-vcms-dropzone={fullZone} className={`group/vcms-zone relative ${className}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 hidden -translate-y-1/2 items-center justify-center group-hover/vcms-zone:flex">
        <span className="rounded-full bg-accent px-3 py-1 text-[11px] font-display font-900 text-navy-950 shadow">+ add section/widget here</span>
      </div>
      {zoneWidgets.length ? (
        <div className={`${compact ? "px-3 py-3" : "mx-auto max-w-7xl px-4 py-6"}`}>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {zoneWidgets.map((widget, index) => (
              <VisualWidgetBlock key={widget.id || `${fullZone}-${index}`} widget={widget} index={index} zone={fullZone} pageKey={pageKey} allWidgets={allWidgets} />
            ))}
          </div>
        </div>
      ) : (
        <div className={compact ? "min-h-[80px]" : "h-3"} />
      )}
    </section>
  );
}
