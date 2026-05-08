"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { CmsBlock, CmsPage, CmsStep, SiteContent, SiteHeroSlide } from "@/lib/siteContent";

type PageKey = keyof SiteContent["pages"];
type DeviceMode = "desktop" | "tablet" | "mobile";
type PanelMode = "pages" | "widgets" | "style";
type EditTarget =
  | { kind: "homeSlide"; index: number; field?: keyof SiteHeroSlide }
  | { kind: "pageHero"; field?: keyof CmsPage }
  | { kind: "pageBlock"; index: number; field?: keyof CmsBlock }
  | { kind: "pageStep"; index: number; field?: keyof CmsStep }
  | { kind: "pageCta"; field?: keyof CmsPage }
  | { kind: "trust"; field?: string }
  | { kind: "finalCta"; field?: string }
  | { kind: "footer"; field?: string };

type WidgetTemplate = { label: string; blockType: string; icon: string; title: string; subtitle: string; body: string; width?: string; background?: string; linkLabel?: string; linkHref?: string };

const PAGES: Array<{ key: PageKey; label: string; path: string }> = [
  { key: "home", label: "Home", path: "/" },
  { key: "repair", label: "Repair", path: "/repair" },
  { key: "assetRecovery", label: "Asset Recovery", path: "/asset-recovery" },
  { key: "about", label: "About", path: "/about" },
  { key: "contact", label: "Contact", path: "/contact" },
];

const DEVICE_CANVAS: Record<DeviceMode, { label: string; width: number }> = {
  desktop: { label: "PC desktop", width: 1180 },
  tablet: { label: "Tablet", width: 820 },
  mobile: { label: "Mobile", width: 390 },
};

const WIDGETS: WidgetTemplate[] = [
  { label: "Text", blockType: "text", icon: "T", title: "New text heading", subtitle: "Supporting line", body: "Click this text to edit it.", width: "half", background: "white" },
  { label: "Image", blockType: "image", icon: "🖼", title: "Image block", subtitle: "Image with copy", body: "Upload or paste an image URL.", width: "half", background: "white" },
  { label: "Video", blockType: "video", icon: "▶", title: "Video block", subtitle: "Video / demo", body: "Add a video URL using the style panel.", width: "half", background: "dark" },
  { label: "Button", blockType: "button", icon: "↗", title: "Call to action", subtitle: "Button area", body: "Add a button and link it to a page.", width: "quarter", background: "accent", linkLabel: "Learn more", linkHref: "/contact" },
  { label: "Icon", blockType: "icon", icon: "⚙️", title: "Feature", subtitle: "Feature highlight", body: "Describe the feature or benefit.", width: "quarter", background: "white" },
  { label: "Shape", blockType: "shape", icon: "■", title: "Shape / divider", subtitle: "Design element", body: "Use as a visual divider or spacer.", width: "quarter", background: "soft" },
  { label: "Animation", blockType: "animation", icon: "✨", title: "Animated highlight", subtitle: "Motion cue", body: "Add a subtle visual highlight.", width: "quarter", background: "soft" },
  { label: "Slider", blockType: "slider", icon: "▣", title: "Slider item", subtitle: "Carousel content", body: "Add an editable slide item.", width: "half", background: "soft" },
  { label: "Promotion", blockType: "promotion", icon: "🏷", title: "Promotion banner", subtitle: "Offer / campaign", body: "Highlight an offer, sale or stock campaign.", width: "full", background: "accent", linkLabel: "View offer", linkHref: "/shop" },
  { label: "Spacer", blockType: "spacer", icon: "↕", title: "Spacer", subtitle: "Spacing block", body: "Use to create breathing room.", width: "full", background: "soft" },
];

const emptyPage: CmsPage = {
  eyebrow: "", heading: "", accent: "", body: "", backgroundImageUrl: "", heroImageUrl: "", primaryLabel: "", primaryHref: "#", secondaryLabel: "", secondaryHref: "#",
  sectionEyebrow: "", sectionHeading: "", sectionBody: "", blocks: [], steps: [], ctaHeading: "", ctaBody: "", ctaPrimaryLabel: "", ctaPrimaryHref: "#", ctaSecondaryLabel: "", ctaSecondaryHref: "#", sectionOrder: ["hero", "contactBar", "content", "process", "formOrCta"],
};

function pagePath(key: PageKey) { return PAGES.find((item) => item.key === key)?.path || "/"; }
function pageLabel(key: PageKey) { return PAGES.find((item) => item.key === key)?.label || "Page"; }
function makeBlock(template: WidgetTemplate): CmsBlock { return { icon: template.icon, title: template.title, subtitle: template.subtitle, body: template.body, imageUrl: "", linkLabel: template.linkLabel || "", linkHref: template.linkHref || "#", blockType: template.blockType, width: template.width || "quarter", align: "left", background: template.background || "white", animation: "none" }; }
function move<T>(items: T[], from: number, to: number) { const next = [...items]; if (from < 0 || from >= next.length || to < 0 || to >= next.length) return next; const [picked] = next.splice(from, 1); next.splice(to, 0, picked); return next; }
function widthClass(width?: string) { if (width === "full") return "md:col-span-4"; if (width === "half") return "md:col-span-2"; if (width === "third") return "md:col-span-2 lg:col-span-1"; return "md:col-span-1"; }
function alignClass(align?: string) { if (align === "center") return "text-center"; if (align === "right") return "text-right"; return "text-left"; }
function bgClass(bg?: string) { if (bg === "dark") return "border-navy-800 bg-navy-950 text-white"; if (bg === "accent") return "border-accent bg-accent/20 text-navy-950"; if (bg === "soft") return "border-slate-200 bg-slate-50 text-navy-950"; return "border-slate-200 bg-white text-navy-950"; }

function ImageUploadButton({ onUploaded, label = "Upload image" }: { onUploaded: (url: string) => void; label?: string }) {
  const [uploading, setUploading] = useState(false);
  async function upload(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.set("folder", "company-docs");
      form.set("file", file);
      const response = await fetch("/api/uploads", { method: "POST", body: form });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok || !data?.url) throw new Error(data?.error || "Upload failed");
      onUploaded(data.url);
    } catch (err) { alert(err instanceof Error ? err.message : "Upload failed"); } finally { setUploading(false); }
  }
  return <label className="inline-flex cursor-pointer items-center rounded bg-navy-950 px-3 py-2 text-xs font-display font-800 text-white hover:bg-accent hover:text-navy-950">{uploading ? "Uploading…" : label}<input className="hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={uploading} onChange={(e) => upload(e.target.files?.[0] || null)} /></label>;
}

function InlineText({ children, className, onSave, onSelect, multiline = false }: { children: ReactNode; className?: string; onSave: (value: string) => void; onSelect: () => void; multiline?: boolean }) {
  return <span
    role="textbox"
    tabIndex={0}
    contentEditable
    suppressContentEditableWarning
    onClick={(e) => { e.stopPropagation(); onSelect(); }}
    onFocus={(e) => { onSelect(); e.currentTarget.classList.add("ring-2", "ring-accent", "ring-offset-2"); }}
    onBlur={(e) => { e.currentTarget.classList.remove("ring-2", "ring-accent", "ring-offset-2"); const value = multiline ? e.currentTarget.innerText : e.currentTarget.textContent; onSave((value || "").trim()); }}
    onKeyDown={(e) => { if (!multiline && e.key === "Enter") { e.preventDefault(); (e.currentTarget as HTMLElement).blur(); } }}
    className={`cms-inline-edit rounded-sm outline-none ${className || ""}`}
  >{children}</span>;
}

function MiniButton({ children, onClick }: { children: ReactNode; onClick: () => void }) { return <button type="button" onClick={onClick} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-display font-800 text-navy-900 hover:border-accent hover:bg-accent/10">{children}</button>; }
function SmallInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className="text-[10px] font-display font-800 uppercase tracking-wide text-slate-500">{label}</span><input className="input mt-1 h-9 w-full text-xs" value={value || ""} onChange={(e) => onChange(e.target.value)} /></label>; }
function SmallSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) { return <label className="block"><span className="text-[10px] font-display font-800 uppercase tracking-wide text-slate-500">{label}</span><select className="input mt-1 h-9 w-full text-xs" value={value || ""} onChange={(e) => onChange(e.target.value)}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>; }

export default function VisualCmsBuilder() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [pageKey, setPageKey] = useState<PageKey>("home");
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [zoom, setZoom] = useState(0.78);
  const [panelMode, setPanelMode] = useState<PanelMode>("widgets");
  const [selected, setSelected] = useState<EditTarget>({ kind: "pageHero" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [dragBlockIndex, setDragBlockIndex] = useState<number | null>(null);
  const [dragStepIndex, setDragStepIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/content", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => { if (!cancelled && data?.content) setContent(data.content); })
      .catch(() => setMessage("Could not load website content."));
    return () => { cancelled = true; };
  }, []);

  const page = content?.pages?.[pageKey] || emptyPage;
  const publicPath = pagePath(pageKey);
  const device = DEVICE_CANVAS[deviceMode];

  const selectedLabel = useMemo(() => {
    if (selected.kind === "homeSlide") return `Homepage slide ${selected.index + 1}`;
    if (selected.kind === "pageHero") return `${pageLabel(pageKey)} hero / section text`;
    if (selected.kind === "pageBlock") return `Content block ${selected.index + 1}`;
    if (selected.kind === "pageStep") return `Process step ${selected.index + 1}`;
    if (selected.kind === "pageCta") return `${pageLabel(pageKey)} CTA`;
    if (selected.kind === "trust") return "Trust section";
    if (selected.kind === "finalCta") return "Final CTA";
    return "Footer";
  }, [selected, pageKey]);

  function updateContent(next: SiteContent) { setContent(next); }
  function updatePage(next: CmsPage) { if (!content) return; updateContent({ ...content, pages: { ...content.pages, [pageKey]: next } }); }
  function updatePagePatch(patch: Partial<CmsPage>) { updatePage({ ...page, ...patch }); }
  function updateBlock(index: number, patch: Partial<CmsBlock>) { updatePage({ ...page, blocks: page.blocks.map((block, i) => (i === index ? { ...block, ...patch } : block)) }); }
  function updateStep(index: number, patch: Partial<CmsStep>) { updatePage({ ...page, steps: page.steps.map((step, i) => (i === index ? { ...step, ...patch } : step)) }); }
  function updateHomeSlide(index: number, patch: Partial<SiteHeroSlide>) { if (!content) return; updateContent({ ...content, heroSlides: content.heroSlides.map((slide, i) => i === index ? { ...slide, ...patch } : slide) }); }

  function addBlock(template: WidgetTemplate) { const block = makeBlock(template); const blocks = [...page.blocks, block]; updatePage({ ...page, blocks }); setSelected({ kind: "pageBlock", index: blocks.length - 1 }); setPanelMode("style"); }
  function duplicateSelected() { if (selected.kind === "pageBlock") { const block = page.blocks[selected.index]; if (!block) return; const blocks = [...page.blocks]; blocks.splice(selected.index + 1, 0, { ...block }); updatePage({ ...page, blocks }); setSelected({ kind: "pageBlock", index: selected.index + 1 }); } if (selected.kind === "pageStep") { const step = page.steps[selected.index]; if (!step) return; const steps = [...page.steps]; steps.splice(selected.index + 1, 0, { ...step }); updatePage({ ...page, steps }); setSelected({ kind: "pageStep", index: selected.index + 1 }); } }
  function deleteSelected() { if (selected.kind === "pageBlock") { updatePage({ ...page, blocks: page.blocks.filter((_, i) => i !== selected.index) }); setSelected({ kind: "pageHero" }); } if (selected.kind === "pageStep") { updatePage({ ...page, steps: page.steps.filter((_, i) => i !== selected.index) }); setSelected({ kind: "pageHero" }); } }
  function moveSelected(direction: "up" | "down") { if (selected.kind === "pageBlock") { const to = direction === "up" ? selected.index - 1 : selected.index + 1; if (to >= 0 && to < page.blocks.length) { updatePage({ ...page, blocks: move(page.blocks, selected.index, to) }); setSelected({ kind: "pageBlock", index: to }); } } if (selected.kind === "pageStep") { const to = direction === "up" ? selected.index - 1 : selected.index + 1; if (to >= 0 && to < page.steps.length) { updatePage({ ...page, steps: move(page.steps, selected.index, to) }); setSelected({ kind: "pageStep", index: to }); } } }

  async function save() {
    if (!content) return;
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.error || "Could not save website content.");
      setContent(data.content); setMessage("Saved. The public website now uses these CMS changes.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Could not save website content."); } finally { setSaving(false); }
  }

  function canvasDrop(e: React.DragEvent) {
    e.preventDefault();
    const label = e.dataTransfer.getData("widget-label");
    const template = WIDGETS.find((w) => w.label === label);
    if (template) addBlock(template);
  }

  function renderCard(block: CmsBlock, index: number) {
    return <article
      key={`${block.title}-${index}`}
      draggable
      onDragStart={() => setDragBlockIndex(index)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => { if (dragBlockIndex !== null && dragBlockIndex !== index) { updatePage({ ...page, blocks: move(page.blocks, dragBlockIndex, index) }); setSelected({ kind: "pageBlock", index }); } setDragBlockIndex(null); }}
      onClick={(e) => { e.stopPropagation(); setSelected({ kind: "pageBlock", index }); setPanelMode("style"); }}
      className={`${widthClass(block.width)} ${bgClass(block.background)} ${alignClass(block.align)} cms-selectable rounded-2xl border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${selected.kind === "pageBlock" && selected.index === index ? "ring-2 ring-accent ring-offset-2" : ""}`}
    >
      {block.imageUrl ? <img src={block.imageUrl} alt="" className="mb-4 h-40 w-full rounded-xl object-cover" /> : null}
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-xl font-display font-900 text-navy-950">
        <InlineText onSelect={() => setSelected({ kind: "pageBlock", index, field: "icon" })} onSave={(v) => updateBlock(index, { icon: v })}>{block.icon || "•"}</InlineText>
      </div>
      <h3 className="font-display text-xl font-900 tracking-tight"><InlineText onSelect={() => setSelected({ kind: "pageBlock", index, field: "title" })} onSave={(v) => updateBlock(index, { title: v })}>{block.title}</InlineText></h3>
      <p className={`mt-1 text-sm font-display font-800 ${block.background === "dark" ? "text-accent" : "text-accent-700"}`}><InlineText onSelect={() => setSelected({ kind: "pageBlock", index, field: "subtitle" })} onSave={(v) => updateBlock(index, { subtitle: v })}>{block.subtitle}</InlineText></p>
      <p className={`mt-3 text-sm leading-6 ${block.background === "dark" ? "text-white/75" : "text-slate-600"}`}><InlineText multiline onSelect={() => setSelected({ kind: "pageBlock", index, field: "body" })} onSave={(v) => updateBlock(index, { body: v })}>{block.body}</InlineText></p>
      {block.linkLabel ? <span className="mt-5 inline-flex rounded bg-navy-950 px-4 py-2 text-xs font-display font-900 text-white"><InlineText onSelect={() => setSelected({ kind: "pageBlock", index, field: "linkLabel" })} onSave={(v) => updateBlock(index, { linkLabel: v })}>{block.linkLabel}</InlineText></span> : null}
    </article>;
  }

  function renderStep(step: CmsStep, index: number) {
    return <article key={`${step.title}-${index}`} draggable onDragStart={() => setDragStepIndex(index)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragStepIndex !== null && dragStepIndex !== index) { updatePage({ ...page, steps: move(page.steps, dragStepIndex, index) }); setSelected({ kind: "pageStep", index }); } setDragStepIndex(null); }} onClick={(e) => { e.stopPropagation(); setSelected({ kind: "pageStep", index }); setPanelMode("style"); }} className={`cms-selectable rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${selected.kind === "pageStep" && selected.index === index ? "ring-2 ring-accent ring-offset-2" : ""}`}>
      <span className="font-mono text-xs font-bold text-accent"><InlineText onSelect={() => setSelected({ kind: "pageStep", index, field: "number" })} onSave={(v) => updateStep(index, { number: v })}>{step.number}</InlineText></span>
      {step.imageUrl ? <img src={step.imageUrl} alt="" className="mt-3 h-32 w-full rounded-xl object-cover" /> : null}
      <h3 className="mt-3 font-display text-lg font-900"><InlineText onSelect={() => setSelected({ kind: "pageStep", index, field: "title" })} onSave={(v) => updateStep(index, { title: v })}>{step.title}</InlineText></h3>
      <p className="mt-2 text-sm leading-6 text-slate-600"><InlineText multiline onSelect={() => setSelected({ kind: "pageStep", index, field: "body" })} onSave={(v) => updateStep(index, { body: v })}>{step.body}</InlineText></p>
    </article>;
  }

  function renderHomeCanvas() {
    if (!content) return null;
    return <>
      <section className="relative overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-slate-900 px-10 py-12 text-white" onClick={() => setSelected({ kind: "homeSlide", index: 0 })}>
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 47px,rgba(255,255,255,.55) 48px),repeating-linear-gradient(90deg,transparent,transparent 47px,rgba(255,255,255,.55) 48px)" }} />
        <div className="relative grid gap-8 md:grid-cols-[1.2fr_.8fr]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent"><InlineText onSelect={() => setSelected({ kind: "homeSlide", index: 0, field: "eyebrow" })} onSave={(v) => updateHomeSlide(0, { eyebrow: v })}>{content.heroSlides[0]?.eyebrow}</InlineText></p>
            <h1 className="mt-4 max-w-3xl font-display text-5xl font-900 leading-[0.95] tracking-tight"><InlineText onSelect={() => setSelected({ kind: "homeSlide", index: 0, field: "heading" })} onSave={(v) => updateHomeSlide(0, { heading: v })}>{content.heroSlides[0]?.heading}</InlineText> <span className="text-accent"><InlineText onSelect={() => setSelected({ kind: "homeSlide", index: 0, field: "accent" })} onSave={(v) => updateHomeSlide(0, { accent: v })}>{content.heroSlides[0]?.accent}</InlineText></span></h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/75"><InlineText multiline onSelect={() => setSelected({ kind: "homeSlide", index: 0, field: "body" })} onSave={(v) => updateHomeSlide(0, { body: v })}>{content.heroSlides[0]?.body}</InlineText></p>
            <div className="mt-8 flex flex-wrap gap-3"><span className="rounded bg-accent px-5 py-3 font-display text-sm font-900 text-navy-950"><InlineText onSelect={() => setSelected({ kind: "homeSlide", index: 0, field: "cta1Label" })} onSave={(v) => updateHomeSlide(0, { cta1Label: v })}>{content.heroSlides[0]?.cta1Label}</InlineText></span><span className="rounded border border-white/30 px-5 py-3 font-display text-sm font-900 text-white"><InlineText onSelect={() => setSelected({ kind: "homeSlide", index: 0, field: "cta2Label" })} onSave={(v) => updateHomeSlide(0, { cta2Label: v })}>{content.heroSlides[0]?.cta2Label}</InlineText></span></div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur"><p className="font-display text-sm font-900 uppercase tracking-wide text-accent">Homepage slides</p><div className="mt-4 space-y-3">{content.heroSlides.map((slide, i) => <button type="button" key={`${slide.heading}-${i}`} onClick={(e) => { e.stopPropagation(); setSelected({ kind: "homeSlide", index: i }); setPanelMode("style"); }} className={`block w-full rounded-xl border border-white/10 bg-white/10 p-4 text-left hover:border-accent ${selected.kind === "homeSlide" && selected.index === i ? "ring-2 ring-accent" : ""}`}><span className="text-xs text-accent">Slide {i + 1}</span><strong className="block font-display text-base font-900">{slide.heading} {slide.accent}</strong><span className="mt-1 block text-xs text-white/60">Click text on slide 1 directly, or select another slide here and use left style controls.</span></button>)}</div></div>
        </div>
      </section>
      <section className="px-10 py-12"><p className="font-mono text-xs uppercase tracking-[0.24em] text-accent"><InlineText onSelect={() => setSelected({ kind: "pageHero", field: "eyebrow" })} onSave={(v) => updatePagePatch({ eyebrow: v })}>{page.eyebrow}</InlineText></p><h2 className="mt-3 font-display text-4xl font-900"><InlineText onSelect={() => setSelected({ kind: "pageHero", field: "heading" })} onSave={(v) => updatePagePatch({ heading: v })}>{page.heading}</InlineText> <span className="text-accent"><InlineText onSelect={() => setSelected({ kind: "pageHero", field: "accent" })} onSave={(v) => updatePagePatch({ accent: v })}>{page.accent}</InlineText></span></h2><p className="mt-3 max-w-3xl text-slate-600"><InlineText multiline onSelect={() => setSelected({ kind: "pageHero", field: "body" })} onSave={(v) => updatePagePatch({ body: v })}>{page.body}</InlineText></p><div className="mt-8 grid gap-5 md:grid-cols-4" onDragOver={(e) => e.preventDefault()} onDrop={canvasDrop}>{page.blocks.map(renderCard)}</div></section>
      <section className="bg-slate-50 px-10 py-12"><p className="font-mono text-xs uppercase tracking-[0.24em] text-accent"><InlineText onSelect={() => setSelected({ kind: "trust", field: "eyebrow" })} onSave={(v) => updateContent({ ...content, trust: { ...content.trust, eyebrow: v } })}>{content.trust.eyebrow}</InlineText></p><h2 className="mt-3 font-display text-4xl font-900"><InlineText onSelect={() => setSelected({ kind: "trust", field: "heading" })} onSave={(v) => updateContent({ ...content, trust: { ...content.trust, heading: v } })}>{content.trust.heading}</InlineText> <span className="text-accent"><InlineText onSelect={() => setSelected({ kind: "trust", field: "accent" })} onSave={(v) => updateContent({ ...content, trust: { ...content.trust, accent: v } })}>{content.trust.accent}</InlineText></span></h2><div className="mt-6 flex flex-wrap gap-3">{content.trust.clients.map((client, index) => <span key={`${client}-${index}`} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-display font-800">{client}</span>)}</div></section>
      <section className="bg-navy-950 px-10 py-12 text-white"><p className="font-mono text-xs uppercase tracking-[0.24em] text-accent"><InlineText onSelect={() => setSelected({ kind: "finalCta", field: "eyebrow" })} onSave={(v) => updateContent({ ...content, finalCta: { ...content.finalCta, eyebrow: v } })}>{content.finalCta.eyebrow}</InlineText></p><h2 className="mt-3 font-display text-4xl font-900"><InlineText onSelect={() => setSelected({ kind: "finalCta", field: "heading" })} onSave={(v) => updateContent({ ...content, finalCta: { ...content.finalCta, heading: v } })}>{content.finalCta.heading}</InlineText></h2><p className="mt-3 max-w-3xl text-white/70"><InlineText multiline onSelect={() => setSelected({ kind: "finalCta", field: "body" })} onSave={(v) => updateContent({ ...content, finalCta: { ...content.finalCta, body: v } })}>{content.finalCta.body}</InlineText></p></section>
    </>;
  }

  function renderPageCanvas() {
    if (!content) return null;
    return <>
      <section className="relative overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-slate-900 px-10 py-14 text-white" onClick={() => setSelected({ kind: "pageHero" })} style={page.backgroundImageUrl ? { backgroundImage: `linear-gradient(rgba(3,14,33,.88),rgba(3,14,33,.88)),url(${page.backgroundImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent"><InlineText onSelect={() => setSelected({ kind: "pageHero", field: "eyebrow" })} onSave={(v) => updatePagePatch({ eyebrow: v })}>{page.eyebrow}</InlineText></p>
        <h1 className="mt-4 max-w-4xl font-display text-5xl font-900 leading-none"><InlineText onSelect={() => setSelected({ kind: "pageHero", field: "heading" })} onSave={(v) => updatePagePatch({ heading: v })}>{page.heading}</InlineText> <span className="text-accent"><InlineText onSelect={() => setSelected({ kind: "pageHero", field: "accent" })} onSave={(v) => updatePagePatch({ accent: v })}>{page.accent}</InlineText></span></h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-white/75"><InlineText multiline onSelect={() => setSelected({ kind: "pageHero", field: "body" })} onSave={(v) => updatePagePatch({ body: v })}>{page.body}</InlineText></p>
        <div className="mt-8 flex flex-wrap gap-3"><span className="rounded bg-accent px-5 py-3 font-display text-sm font-900 text-navy-950"><InlineText onSelect={() => setSelected({ kind: "pageHero", field: "primaryLabel" })} onSave={(v) => updatePagePatch({ primaryLabel: v })}>{page.primaryLabel || "Primary action"}</InlineText></span><span className="rounded border border-white/30 px-5 py-3 font-display text-sm font-900 text-white"><InlineText onSelect={() => setSelected({ kind: "pageHero", field: "secondaryLabel" })} onSave={(v) => updatePagePatch({ secondaryLabel: v })}>{page.secondaryLabel || "Secondary action"}</InlineText></span></div>
      </section>
      <section className="border-b border-slate-200 bg-white px-10 py-6"><div className="grid gap-4 md:grid-cols-3"><div><p className="text-xs uppercase tracking-wide text-slate-500">Orders / Quotes</p><p className="font-display font-900 text-navy-950">{content.contact.salesEmail}</p></div><div><p className="text-xs uppercase tracking-wide text-slate-500">General / Media</p><p className="font-display font-900 text-navy-950">{content.contact.infoEmail}</p></div><div><p className="text-xs uppercase tracking-wide text-slate-500">Phone</p><p className="font-display font-900 text-navy-950">{content.contact.phone}</p></div></div></section>
      <section className="px-10 py-12"><p className="font-mono text-xs uppercase tracking-[0.24em] text-accent"><InlineText onSelect={() => setSelected({ kind: "pageHero", field: "sectionEyebrow" })} onSave={(v) => updatePagePatch({ sectionEyebrow: v })}>{page.sectionEyebrow}</InlineText></p><h2 className="mt-3 font-display text-4xl font-900"><InlineText onSelect={() => setSelected({ kind: "pageHero", field: "sectionHeading" })} onSave={(v) => updatePagePatch({ sectionHeading: v })}>{page.sectionHeading}</InlineText></h2><p className="mt-3 max-w-3xl text-slate-600"><InlineText multiline onSelect={() => setSelected({ kind: "pageHero", field: "sectionBody" })} onSave={(v) => updatePagePatch({ sectionBody: v })}>{page.sectionBody}</InlineText></p><div className="mt-8 grid gap-5 md:grid-cols-4" onDragOver={(e) => e.preventDefault()} onDrop={canvasDrop}>{page.blocks.map(renderCard)}</div></section>
      {page.steps.length ? <section className="bg-slate-50 px-10 py-12"><h2 className="font-display text-3xl font-900">Process</h2><div className="mt-7 grid gap-5 md:grid-cols-4">{page.steps.map(renderStep)}</div></section> : null}
      <section className="bg-navy-950 px-10 py-12 text-white" onClick={() => setSelected({ kind: "pageCta" })}><h2 className="font-display text-4xl font-900"><InlineText onSelect={() => setSelected({ kind: "pageCta", field: "ctaHeading" })} onSave={(v) => updatePagePatch({ ctaHeading: v })}>{page.ctaHeading || "Call to action"}</InlineText></h2><p className="mt-3 max-w-3xl text-white/70"><InlineText multiline onSelect={() => setSelected({ kind: "pageCta", field: "ctaBody" })} onSave={(v) => updatePagePatch({ ctaBody: v })}>{page.ctaBody || "Add supporting CTA copy."}</InlineText></p></section>
    </>;
  }

  function renderFooter() {
    if (!content) return null;
    return <footer className="bg-slate-950 px-10 py-10 text-white" onClick={() => { setSelected({ kind: "footer" }); setPanelMode("style"); }}><div className="grid gap-6 md:grid-cols-[1.4fr_1fr_1fr]"><div><h3 className="font-display text-2xl font-900">Combay</h3><p className="mt-3 max-w-md text-sm leading-6 text-white/65"><InlineText multiline onSelect={() => setSelected({ kind: "footer", field: "description" })} onSave={(v) => updateContent({ ...content, footer: { ...content.footer, description: v } })}>{content.footer.description}</InlineText></p></div><div><p className="font-display text-sm font-900 uppercase tracking-wide text-accent">Contact</p><p className="mt-3 text-sm text-white/70">Orders / Quotes: {content.contact.salesEmail}</p><p className="mt-1 text-sm text-white/70">General / Media: {content.contact.infoEmail}</p></div><div><p className="font-display text-sm font-900 uppercase tracking-wide text-accent">Location</p><p className="mt-3 text-sm text-white/70">{content.contact.location}</p><p className="mt-1 text-sm text-white/70">{content.contact.phone}</p></div></div></footer>;
  }

  function renderStylePanel() {
    if (!content) return null;
    let block: CmsBlock | null = null;
    let step: CmsStep | null = null;
    if (selected.kind === "pageBlock") block = page.blocks[selected.index] || null;
    if (selected.kind === "pageStep") step = page.steps[selected.index] || null;
    return <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] uppercase tracking-wide text-slate-500">Selected</p><p className="font-display text-sm font-900 text-navy-950">{selectedLabel}</p><p className="mt-1 text-[11px] text-slate-500">Most text is edited directly on the website canvas. Use these controls for styling, URLs, uploads and item movement.</p></div>
      <div className="grid grid-cols-2 gap-2"><MiniButton onClick={() => moveSelected("up")}>Move up</MiniButton><MiniButton onClick={() => moveSelected("down")}>Move down</MiniButton><MiniButton onClick={duplicateSelected}>Duplicate</MiniButton><MiniButton onClick={deleteSelected}>Delete</MiniButton></div>
      {block ? <div className="space-y-3 rounded-xl border border-slate-200 p-3"><SmallSelect label="Width" value={block.width} onChange={(v) => updateBlock(selected.kind === "pageBlock" ? selected.index : 0, { width: v })} options={["quarter", "third", "half", "full"]} /><SmallSelect label="Background" value={block.background} onChange={(v) => updateBlock(selected.kind === "pageBlock" ? selected.index : 0, { background: v })} options={["white", "soft", "accent", "dark"]} /><SmallSelect label="Alignment" value={block.align} onChange={(v) => updateBlock(selected.kind === "pageBlock" ? selected.index : 0, { align: v })} options={["left", "center", "right"]} /><SmallInput label="Image URL" value={block.imageUrl} onChange={(v) => updateBlock(selected.kind === "pageBlock" ? selected.index : 0, { imageUrl: v })} /><ImageUploadButton onUploaded={(url) => updateBlock(selected.kind === "pageBlock" ? selected.index : 0, { imageUrl: url })} /><SmallInput label="Button link" value={block.linkHref} onChange={(v) => updateBlock(selected.kind === "pageBlock" ? selected.index : 0, { linkHref: v })} /></div> : null}
      {step ? <div className="space-y-3 rounded-xl border border-slate-200 p-3"><SmallInput label="Step image URL" value={step.imageUrl} onChange={(v) => updateStep(selected.kind === "pageStep" ? selected.index : 0, { imageUrl: v })} /><ImageUploadButton onUploaded={(url) => updateStep(selected.kind === "pageStep" ? selected.index : 0, { imageUrl: url })} /></div> : null}
      {selected.kind === "pageHero" ? <div className="space-y-3 rounded-xl border border-slate-200 p-3"><SmallInput label="Hero background URL" value={page.backgroundImageUrl} onChange={(v) => updatePagePatch({ backgroundImageUrl: v })} /><ImageUploadButton onUploaded={(url) => updatePagePatch({ backgroundImageUrl: url })} /><SmallInput label="Primary button link" value={page.primaryHref} onChange={(v) => updatePagePatch({ primaryHref: v })} /><SmallInput label="Secondary button link" value={page.secondaryHref} onChange={(v) => updatePagePatch({ secondaryHref: v })} /></div> : null}
      {selected.kind === "homeSlide" ? <div className="space-y-3 rounded-xl border border-slate-200 p-3"><SmallInput label="Slide background URL" value={content.heroSlides[selected.index]?.backgroundImageUrl || ""} onChange={(v) => updateHomeSlide(selected.index, { backgroundImageUrl: v })} /><ImageUploadButton onUploaded={(url) => updateHomeSlide(selected.index, { backgroundImageUrl: url })} /><SmallInput label="Primary button link" value={content.heroSlides[selected.index]?.cta1Href || ""} onChange={(v) => updateHomeSlide(selected.index, { cta1Href: v })} /><SmallInput label="Secondary button link" value={content.heroSlides[selected.index]?.cta2Href || ""} onChange={(v) => updateHomeSlide(selected.index, { cta2Href: v })} /></div> : null}
    </div>;
  }

  if (!content) return <div className="p-8 text-sm text-gray-600">Loading visual CMS…</div>;

  return <div className="fixed inset-0 z-40 flex bg-slate-200 text-navy-950">
    <aside className="flex w-[315px] shrink-0 flex-col border-r border-slate-200 bg-white shadow-xl">
      <div className="border-b border-slate-200 p-4"><p className="font-mono text-[10px] uppercase tracking-widest text-accent">Combay CMS</p><h1 className="font-display text-xl font-900">Visual Builder</h1><p className="mt-1 text-xs text-slate-500">One editable website canvas. Use this left panel only for pages, widgets and styling.</p></div>
      <div className="grid grid-cols-3 gap-1 border-b border-slate-200 p-2"><button onClick={() => setPanelMode("pages")} className={`rounded py-2 text-xs font-display font-900 ${panelMode === "pages" ? "bg-navy-950 text-white" : "bg-slate-50"}`}>Pages</button><button onClick={() => setPanelMode("widgets")} className={`rounded py-2 text-xs font-display font-900 ${panelMode === "widgets" ? "bg-navy-950 text-white" : "bg-slate-50"}`}>Widgets</button><button onClick={() => setPanelMode("style")} className={`rounded py-2 text-xs font-display font-900 ${panelMode === "style" ? "bg-navy-950 text-white" : "bg-slate-50"}`}>Style</button></div>
      <div className="flex-1 overflow-auto p-3">
        {panelMode === "pages" ? <div className="space-y-2">{PAGES.map((item) => <button key={item.key} type="button" onClick={() => { setPageKey(item.key); setSelected({ kind: item.key === "home" ? "homeSlide" : "pageHero", index: 0 } as EditTarget); }} className={`w-full rounded px-3 py-2 text-left text-sm font-display font-800 ${pageKey === item.key ? "bg-navy-950 text-white" : "bg-gray-50 text-navy-900 hover:bg-gray-100"}`}>{item.label}</button>)}</div> : null}
        {panelMode === "widgets" ? <div><p className="mb-2 text-[10px] font-display font-800 uppercase tracking-wide text-slate-500">Drag or click to add</p><div className="grid grid-cols-2 gap-2">{WIDGETS.map((w) => <button key={w.label} draggable type="button" onDragStart={(e) => e.dataTransfer.setData("widget-label", w.label)} onClick={() => addBlock(w)} className="rounded-lg border border-gray-200 bg-white p-3 text-left shadow-sm hover:border-accent hover:bg-accent/10"><span className="block text-xl">{w.icon}</span><span className="mt-1 block text-xs font-display font-900 text-navy-950">{w.label}</span></button>)}</div><div className="mt-4 rounded-lg border border-accent/30 bg-accent/10 p-3 text-xs text-navy-900">Drop widgets onto the content card area in the website canvas, or click a widget to add it to the current page.</div></div> : null}
        {panelMode === "style" ? renderStylePanel() : null}
      </div>
      {message ? <div className="border-t border-slate-200 bg-accent/10 p-3 text-xs text-navy-900">{message}</div> : null}
    </aside>

    <main className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3"><div><span className="rounded bg-navy-950 px-3 py-1 text-xs font-display font-900 text-white">{device.label}</span><span className="ml-3 text-xs text-slate-500">Inline editing: click text directly, drag cards/steps, use the left panel for widgets and styling.</span></div><div className="flex items-center gap-2"><select className="input h-9 w-32 text-xs" value={deviceMode} onChange={(e) => { const next = e.target.value as DeviceMode; setDeviceMode(next); setZoom(next === "desktop" ? 0.78 : next === "tablet" ? 0.9 : 1); }}><option value="desktop">PC desktop</option><option value="tablet">Tablet</option><option value="mobile">Mobile</option></select><select className="input h-9 w-28 text-xs" value={zoom} onChange={(e) => setZoom(Number(e.target.value))}><option value={0.65}>65%</option><option value={0.78}>78%</option><option value={0.9}>90%</option><option value={1}>100%</option></select><Link href={publicPath} target="_blank" className="btn-outline text-xs">Open live page</Link><button type="button" onClick={save} disabled={saving} className="btn-primary text-xs">{saving ? "Saving…" : "Save website"}</button></div></div>
      <section className="min-h-0 flex-1 overflow-auto bg-slate-200 p-6" onDragOver={(e) => e.preventDefault()} onDrop={canvasDrop}>
        <div className="mx-auto rounded-t-2xl border border-slate-400 bg-slate-800 p-3 shadow-2xl" style={{ width: device.width * zoom + 28 }}>
          <div className="mb-2 flex items-center gap-2 px-2"><span className="h-3 w-3 rounded-full bg-red-400"/><span className="h-3 w-3 rounded-full bg-yellow-400"/><span className="h-3 w-3 rounded-full bg-green-400"/><div className="ml-3 flex-1 rounded bg-white/10 px-3 py-1 text-center text-[10px] text-white/70">{device.label} · {device.width}px · editable screen</div></div>
          <div className="origin-top-left overflow-hidden rounded-lg bg-white shadow" style={{ width: device.width, transform: `scale(${zoom})`, transformOrigin: "top left" }}>
            <div className="min-h-[1100px] bg-white" onClick={() => setSelected({ kind: pageKey === "home" ? "homeSlide" : "pageHero", index: 0 } as EditTarget)}>
              {pageKey === "home" ? renderHomeCanvas() : renderPageCanvas()}
              {renderFooter()}
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>;
}
