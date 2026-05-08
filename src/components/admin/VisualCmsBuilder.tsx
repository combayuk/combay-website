"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { DragEvent, FocusEvent, ReactNode } from "react";
import type { CmsBlock, CmsPage, CmsStep, SiteContent } from "@/lib/siteContent";

type PageKey = keyof SiteContent["pages"];
type DeviceMode = "desktop" | "tablet" | "mobile";
type EditScope = "all" | "device";
type SelectTarget =
  | { kind: "hero" }
  | { kind: "section"; section: string }
  | { kind: "block"; index: number }
  | { kind: "step"; index: number }
  | { kind: "contact" }
  | { kind: "footer" }
  | { kind: "homeHero"; index: number };

type DragTarget =
  | { kind: "section"; index: number }
  | { kind: "block"; index: number }
  | { kind: "step"; index: number }
  | { kind: "widget"; template: WidgetTemplate }
  | null;

type WidgetTemplate = {
  label: string;
  blockType: string;
  icon: string;
  title: string;
  subtitle: string;
  body: string;
  width?: string;
  background?: string;
  animation?: string;
  linkLabel?: string;
  linkHref?: string;
};

const PAGES: Array<{ key: PageKey; label: string; path: string }> = [
  { key: "home", label: "Home", path: "/" },
  { key: "repair", label: "Repair", path: "/repair" },
  { key: "assetRecovery", label: "Asset Recovery", path: "/asset-recovery" },
  { key: "about", label: "About", path: "/about" },
  { key: "contact", label: "Contact", path: "/contact" },
];

const SECTION_META: Record<string, { label: string; hint: string }> = {
  hero: { label: "Hero / top area", hint: "Click text directly to edit. Drag the whole section to reorder." },
  contactBar: { label: "Contact strip", hint: "Public email, phone and location cards." },
  content: { label: "Main content", hint: "Cards, images, icons, videos, banners, sliders and text blocks." },
  process: { label: "Process steps", hint: "Step-by-step cards. Drag steps to reorder." },
  formOrCta: { label: "Form / call-to-action", hint: "Form intro or final CTA block." },
};

const WIDGETS: WidgetTemplate[] = [
  { label: "Text", blockType: "text", icon: "T", title: "New text heading", subtitle: "Short supporting line", body: "Click this text in the website canvas and type your content.", width: "half", background: "white" },
  { label: "Image", blockType: "image", icon: "🖼", title: "Image block", subtitle: "Image with text", body: "Upload an image, then edit the heading and text directly.", width: "half", background: "white" },
  { label: "Video", blockType: "video", icon: "▶", title: "Video block", subtitle: "Product or service video", body: "Paste a video URL using the quick toolbar after selecting this block.", width: "half", background: "dark", linkLabel: "Watch video", linkHref: "" },
  { label: "Button", blockType: "button", icon: "↗", title: "Call to action", subtitle: "Clickable button", body: "Use this to send customers to a page, product, form, or promotion.", width: "half", background: "accent", linkLabel: "Button text", linkHref: "/shop" },
  { label: "Icon", blockType: "icon", icon: "⚙️", title: "Feature", subtitle: "Feature highlight", body: "Use icons for benefits, services, categories or trust points.", width: "quarter", background: "white" },
  { label: "Shape", blockType: "shape", icon: "■", title: "Visual shape", subtitle: "Divider / design element", body: "Use shapes to break up content or highlight a section.", width: "quarter", background: "soft" },
  { label: "Animation", blockType: "animation", icon: "✨", title: "Animated highlight", subtitle: "Motion cue", body: "Use subtle animation for an important feature or service.", width: "quarter", background: "soft", animation: "float" },
  { label: "Slider", blockType: "slider", icon: "▣", title: "Slider item", subtitle: "Carousel content", body: "Create multiple slider items together for campaign or service highlights.", width: "half", background: "soft" },
  { label: "Promo banner", blockType: "promotion", icon: "🏷", title: "Promotion banner", subtitle: "Offer / campaign", body: "Highlight discount codes, seasonal sales or stock campaigns.", width: "full", background: "accent", linkLabel: "View offer", linkHref: "/shop" },
  { label: "Spacer", blockType: "spacer", icon: "—", title: "Spacer", subtitle: "Spacing block", body: "Use this as a visual gap between sections.", width: "full", background: "white" },
];

const emptyPage: CmsPage = {
  eyebrow: "",
  heading: "",
  accent: "",
  body: "",
  backgroundImageUrl: "",
  heroImageUrl: "",
  primaryLabel: "",
  primaryHref: "#",
  secondaryLabel: "",
  secondaryHref: "#",
  sectionEyebrow: "",
  sectionHeading: "",
  sectionBody: "",
  blocks: [],
  steps: [],
  ctaHeading: "",
  ctaBody: "",
  ctaPrimaryLabel: "",
  ctaPrimaryHref: "#",
  ctaSecondaryLabel: "",
  ctaSecondaryHref: "#",
  sectionOrder: ["hero", "contactBar", "content", "process", "formOrCta"],
};

function safeOrder(page: CmsPage) {
  const allowed = ["hero", "contactBar", "content", "process", "formOrCta"];
  const existing = Array.isArray(page.sectionOrder) ? page.sectionOrder.filter((item) => allowed.includes(item)) : [];
  const unique = (existing.length ? existing : allowed).filter((item, index, arr) => arr.indexOf(item) === index);
  return [...unique, ...allowed.filter((item) => !unique.includes(item))];
}

function pagePath(key: PageKey) {
  return PAGES.find((item) => item.key === key)?.path || "/";
}

function makeBlock(template: WidgetTemplate): CmsBlock {
  return {
    icon: template.icon,
    title: template.title,
    subtitle: template.subtitle,
    body: template.body,
    imageUrl: "",
    linkLabel: template.linkLabel || "",
    linkHref: template.linkHref || "#",
    blockType: template.blockType,
    width: template.width || "quarter",
    align: "left",
    background: template.background || "white",
    animation: template.animation || "none",
  };
}

function makeStep(index: number): CmsStep {
  return { number: String(index + 1).padStart(2, "0"), title: "New step", body: "Click this text to describe the step.", imageUrl: "" };
}

function move<T>(items: T[], from: number, to: number) {
  const next = [...items];
  if (from < 0 || from >= next.length || to < 0 || to >= next.length) return next;
  const [picked] = next.splice(from, 1);
  next.splice(to, 0, picked);
  return next;
}

function textFromEvent(event: FocusEvent<HTMLElement>) {
  return event.currentTarget.innerText.replace(/\u00a0/g, " ").trim();
}

function EditableText({
  value,
  onChange,
  className,
  as = "div",
  multiline = false,
  placeholder = "Click to edit",
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  as?: "p" | "h1" | "h2" | "h3" | "h4" | "div" | "span";
  multiline?: boolean;
  placeholder?: string;
}) {
  const Tag = as;
  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={placeholder}
      onBlur={(event) => onChange(textFromEvent(event) || value || placeholder)}
      onKeyDown={(event) => {
        if (!multiline && event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      className={`${className || ""} min-h-[1em] cursor-text rounded outline-none ring-accent/0 transition hover:ring-2 hover:ring-accent/40 focus:px-1 focus:ring-2 focus:ring-accent`}
    >
      {value || placeholder}
    </Tag>
  );
}

const DEVICE_CANVAS: Record<DeviceMode, { label: string; width: number; note: string }> = {
  desktop: { label: "PC desktop", width: 1180, note: "Full desktop layout" },
  tablet: { label: "Tablet", width: 820, note: "Tablet-width preview" },
  mobile: { label: "Mobile", width: 390, note: "Phone-width preview" },
};

function DesktopShell({ children, zoom, device }: { children: ReactNode; zoom: number; device: DeviceMode }) {
  const meta = DEVICE_CANVAS[device];
  const width = meta.width;
  return (
    <div className="h-full overflow-auto bg-slate-200 p-6">
      <div className="mx-auto rounded-t-2xl border border-slate-400 bg-slate-800 p-3 shadow-2xl" style={{ width: width * zoom + 28 }}>
        <div className="mb-2 flex items-center gap-2 px-2">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-yellow-400" />
          <span className="h-3 w-3 rounded-full bg-green-400" />
          <div className="ml-3 flex-1 rounded bg-white/10 px-3 py-1 text-center text-[10px] text-white/70">{meta.label} preview · {width}px wide · editable canvas</div>
        </div>
        <div className="origin-top-left overflow-hidden rounded-lg bg-white text-navy-950" style={{ width, transform: `scale(${zoom})`, minHeight: `calc(100% / ${zoom})` }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function ImageUploadButton({ onUploaded, label = "Upload" }: { onUploaded: (url: string) => void; label?: string }) {
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
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }
  return (
    <label className="cursor-pointer rounded bg-white px-3 py-1 text-[11px] font-display font-800 text-navy-950 shadow hover:bg-accent">
      {uploading ? "Uploading…" : label}
      <input className="hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={uploading} onChange={(event) => upload(event.target.files?.[0] || null)} />
    </label>
  );
}

function QuickButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded border border-gray-300 bg-white px-2.5 py-1 text-[11px] font-display font-800 text-navy-900 hover:border-accent hover:bg-accent/10">{children}</button>;
}

function BlockCard({
  block,
  index,
  selected,
  onSelect,
  onPatch,
  onDropBlock,
  onStartDrag,
}: {
  block: CmsBlock;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onPatch: (patch: Partial<CmsBlock>) => void;
  onDropBlock: () => void;
  onStartDrag: () => void;
}) {
  const isDark = block.background === "dark";
  const bg = block.background === "dark" ? "bg-navy-950 text-white border-navy-950" : block.background === "accent" ? "bg-accent/15 border-accent/40" : block.background === "soft" ? "bg-gray-50 border-gray-200" : "bg-white border-gray-200";
  const width = block.width === "full" ? "col-span-4" : block.width === "half" ? "col-span-2" : block.width === "third" ? "col-span-2 xl:col-span-1" : "col-span-1";
  const align = block.align === "center" ? "text-center" : block.align === "right" ? "text-right" : "text-left";
  const isVideo = block.blockType === "video";
  const isShape = block.blockType === "shape" || block.blockType === "spacer";

  return (
    <div
      draggable
      onDragStart={onStartDrag}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => { event.preventDefault(); onDropBlock(); }}
      onClick={(event) => { event.stopPropagation(); onSelect(); }}
      className={`${width} ${bg} ${align} group relative min-h-[120px] cursor-move rounded-xl border p-6 transition-all ${selected ? "ring-4 ring-accent shadow-xl" : "hover:ring-2 hover:ring-accent/30"}`}
    >
      <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition group-hover:opacity-100">
        <span className="rounded bg-white/95 px-2 py-1 text-[10px] font-display font-800 text-navy-950 shadow">Drag</span>
      </div>
      {isShape ? <div className={`${block.background === "accent" ? "bg-accent" : "bg-gray-300"} mb-4 h-12 rounded-xl`} /> : null}
      {block.imageUrl && !isVideo ? <img src={block.imageUrl} alt="" className="mb-4 h-40 w-full rounded-lg object-cover" /> : null}
      {isVideo ? <div className="mb-4 flex h-40 items-center justify-center rounded-lg bg-black text-white"><span className="text-4xl">▶</span></div> : null}
      {!block.imageUrl && !isShape && !isVideo ? <div className="mb-3 text-3xl">{block.icon}</div> : null}
      <EditableText as="p" value={block.blockType || "block"} onChange={(v) => onPatch({ blockType: v.toLowerCase().replace(/\s+/g, "-") })} className="font-mono text-[10px] uppercase tracking-widest text-accent" />
      <EditableText as="h3" value={block.title} onChange={(v) => onPatch({ title: v })} className={`mt-1 font-display text-xl font-900 ${isDark ? "text-white" : "text-navy-950"}`} />
      <EditableText as="p" value={block.subtitle} onChange={(v) => onPatch({ subtitle: v })} className="mt-1 text-sm font-700 text-accent" />
      <EditableText as="p" multiline value={block.body} onChange={(v) => onPatch({ body: v })} className={`mt-3 whitespace-pre-line text-sm leading-relaxed ${isDark ? "text-white/70" : "text-gray-600"}`} />
      {block.linkLabel ? <EditableText as="span" value={block.linkLabel} onChange={(v) => onPatch({ linkLabel: v })} className="mt-4 inline-block rounded bg-navy-950 px-4 py-2 text-xs font-display font-800 text-white" /> : null}
    </div>
  );
}

export default function VisualCmsBuilder() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [pageKey, setPageKey] = useState<PageKey>("home");
  const [selected, setSelected] = useState<SelectTarget>({ kind: "hero" });
  const [drag, setDrag] = useState<DragTarget>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [zoom, setZoom] = useState(0.78);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [editScope, setEditScope] = useState<EditScope>("all");
  const [homeHeroIndex, setHomeHeroIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/content", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => { if (!cancelled && data?.content) setContent(data.content); })
      .catch(() => setMessage("Could not load website content."));
    return () => { cancelled = true; };
  }, []);

  const page = content?.pages?.[pageKey] || emptyPage;
  const order = safeOrder(page);
  const selectedBlockIndex = selected.kind === "block" ? selected.index : -1;
  const selectedBlock = selectedBlockIndex >= 0 ? page.blocks[selectedBlockIndex] : null;
  const selectedStepIndex = selected.kind === "step" ? selected.index : -1;
  const selectedStep = selectedStepIndex >= 0 ? page.steps[selectedStepIndex] : null;
  const publicPath = pagePath(pageKey);

  const selectedLabel = useMemo(() => {
    if (selected.kind === "hero") return "Hero section";
    if (selected.kind === "homeHero") return `Homepage slide ${selected.index + 1}`;
    if (selected.kind === "block") return `Content item ${selected.index + 1}`;
    if (selected.kind === "step") return `Process step ${selected.index + 1}`;
    if (selected.kind === "section") return SECTION_META[selected.section]?.label || selected.section;
    if (selected.kind === "contact") return "Contact details";
    return "Footer";
  }, [selected]);

  function updateContent(next: SiteContent) { setContent(next); }
  function updatePage(next: CmsPage) { if (!content) return; updateContent({ ...content, pages: { ...content.pages, [pageKey]: next } }); }
  function updatePagePatch(patch: Partial<CmsPage>) { updatePage({ ...page, ...patch }); }
  function updateBlock(index: number, patch: Partial<CmsBlock>) { updatePage({ ...page, blocks: page.blocks.map((block, i) => (i === index ? { ...block, ...patch } : block)) }); }
  function updateStep(index: number, patch: Partial<CmsStep>) { updatePage({ ...page, steps: page.steps.map((step, i) => (i === index ? { ...step, ...patch } : step)) }); }

  function addBlock(template: WidgetTemplate, index?: number) {
    const next = makeBlock(template);
    const blocks = [...page.blocks];
    const insertAt = typeof index === "number" ? Math.max(0, Math.min(index, blocks.length)) : blocks.length;
    blocks.splice(insertAt, 0, next);
    updatePage({ ...page, blocks });
    setSelected({ kind: "block", index: insertAt });
  }

  function addStep(index?: number) {
    const steps = [...page.steps];
    const insertAt = typeof index === "number" ? Math.max(0, Math.min(index, steps.length)) : steps.length;
    steps.splice(insertAt, 0, makeStep(steps.length));
    updatePage({ ...page, steps });
    setSelected({ kind: "step", index: insertAt });
  }

  function removeSelected() {
    if (selected.kind === "block") {
      updatePage({ ...page, blocks: page.blocks.filter((_, i) => i !== selected.index) });
      setSelected({ kind: "section", section: "content" });
    }
    if (selected.kind === "step") {
      updatePage({ ...page, steps: page.steps.filter((_, i) => i !== selected.index) });
      setSelected({ kind: "section", section: "process" });
    }
  }

  function duplicateSelected() {
    if (selected.kind === "block" && selectedBlock) {
      const blocks = [...page.blocks];
      blocks.splice(selected.index + 1, 0, { ...selectedBlock });
      updatePage({ ...page, blocks });
      setSelected({ kind: "block", index: selected.index + 1 });
    }
    if (selected.kind === "step" && selectedStep) {
      const steps = [...page.steps];
      steps.splice(selected.index + 1, 0, { ...selectedStep });
      updatePage({ ...page, steps });
      setSelected({ kind: "step", index: selected.index + 1 });
    }
  }

  function moveSelected(direction: "left" | "right" | "up" | "down") {
    if (selected.kind === "block") {
      const to = direction === "left" || direction === "up" ? selected.index - 1 : selected.index + 1;
      if (to >= 0 && to < page.blocks.length) {
        updatePage({ ...page, blocks: move(page.blocks, selected.index, to) });
        setSelected({ kind: "block", index: to });
      }
    }
    if (selected.kind === "step") {
      const to = direction === "left" || direction === "up" ? selected.index - 1 : selected.index + 1;
      if (to >= 0 && to < page.steps.length) {
        updatePage({ ...page, steps: move(page.steps, selected.index, to) });
        setSelected({ kind: "step", index: to });
      }
    }
    if (selected.kind === "section") {
      const index = order.indexOf(selected.section);
      const to = direction === "left" || direction === "up" ? index - 1 : index + 1;
      if (index >= 0 && to >= 0 && to < order.length) updatePagePatch({ sectionOrder: move(order, index, to) });
    }
  }

  async function save() {
    if (!content) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.error || "Could not save website layout.");
      setContent(data.content);
      setMessage("Saved. Refresh the public page to confirm the live website updated.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save website layout.");
    } finally {
      setSaving(false);
    }
  }

  function handleCanvasDrop(event: DragEvent<HTMLElement>, target: "content" | "process", index?: number) {
    event.preventDefault();
    if (!drag) return;
    if (target === "content") {
      if (drag.kind === "widget") addBlock(drag.template, index);
      if (drag.kind === "block" && typeof index === "number") updatePagePatch({ blocks: move(page.blocks, drag.index, index) });
    }
    if (target === "process") {
      if (drag.kind === "step" && typeof index === "number") updatePagePatch({ steps: move(page.steps, drag.index, index) });
    }
    setDrag(null);
  }

  function renderSection(section: string, index: number) {
    const selectedSection = selected.kind === "section" && selected.section === section;
    const sectionShell = `relative border-b border-gray-200 bg-white transition ${selectedSection ? "ring-4 ring-inset ring-accent" : "hover:ring-2 hover:ring-inset hover:ring-accent/20"}`;
    const sectionHandle = (
      <button
        type="button"
        draggable
        onDragStart={(event) => { event.stopPropagation(); setDrag({ kind: "section", index }); }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => { event.preventDefault(); if (drag?.kind === "section") updatePagePatch({ sectionOrder: move(order, drag.index, index) }); setDrag(null); }}
        onClick={(event) => { event.stopPropagation(); setSelected({ kind: "section", section }); }}
        className="absolute left-3 top-3 z-20 rounded bg-navy-950 px-3 py-1 text-[11px] font-display font-800 text-white shadow hover:bg-accent hover:text-navy-950"
      >
        ☰ {SECTION_META[section]?.label || section}
      </button>
    );

    if (section === "hero") {
      return (
        <section key={section} className={`${sectionShell} bg-navy-950 px-12 py-20 text-white`} style={{ backgroundImage: page.backgroundImageUrl ? `linear-gradient(rgba(3,14,33,.88),rgba(3,14,33,.88)), url(${page.backgroundImageUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }} onClick={() => setSelected({ kind: "hero" })}>
          {sectionHandle}
          <div className="grid grid-cols-[1fr_360px] items-center gap-12">
            <div>
              <EditableText as="p" value={page.eyebrow} onChange={(v) => updatePagePatch({ eyebrow: v })} className="font-mono text-xs uppercase tracking-widest text-accent" />
              <EditableText as="h1" value={page.heading} onChange={(v) => updatePagePatch({ heading: v })} className="mt-4 font-display text-5xl font-900 leading-tight" />
              <EditableText as="h2" value={page.accent} onChange={(v) => updatePagePatch({ accent: v })} className="font-display text-5xl font-900 leading-tight text-accent" />
              <EditableText as="p" multiline value={page.body} onChange={(v) => updatePagePatch({ body: v })} className="mt-6 max-w-2xl whitespace-pre-line text-lg leading-relaxed text-white/72" />
              <div className="mt-8 flex flex-wrap gap-3">
                <EditableText as="span" value={page.primaryLabel || "Main button"} onChange={(v) => updatePagePatch({ primaryLabel: v })} className="rounded bg-accent px-6 py-3 font-display text-sm font-900 text-navy-950" />
                <EditableText as="span" value={page.secondaryLabel || "Second button"} onChange={(v) => updatePagePatch({ secondaryLabel: v })} className="rounded border border-white/35 px-6 py-3 font-display text-sm font-800 text-white" />
              </div>
            </div>
            <div className="group relative rounded-2xl border border-white/10 bg-white/5 p-3">
              {page.heroImageUrl ? <img src={page.heroImageUrl} alt="" className="h-80 w-full rounded-xl object-cover" /> : <div className="flex h-80 items-center justify-center rounded-xl border border-dashed border-white/30 text-sm text-white/60">Hero side image</div>}
              <div className="absolute inset-x-6 bottom-6 flex justify-center gap-2 opacity-0 transition group-hover:opacity-100"><ImageUploadButton label="Upload image" onUploaded={(url) => updatePagePatch({ heroImageUrl: url })} /><QuickButton onClick={() => { const url = prompt("Paste image URL", page.heroImageUrl || ""); if (url !== null) updatePagePatch({ heroImageUrl: url }); }}>URL</QuickButton></div>
            </div>
          </div>
        </section>
      );
    }

    if (section === "contactBar") {
      return (
        <section key={section} className={`${sectionShell} bg-gray-50 px-10 py-10`} onClick={() => setSelected({ kind: "contact" })}>
          {sectionHandle}
          <div className="grid grid-cols-4 gap-4 pt-6">
            <div className="rounded-xl border border-gray-200 bg-white p-5"><strong>Order’s/Quotes</strong><EditableText as="p" value={content?.contact.salesEmail || "sales@combay.co.uk"} onChange={(v) => content && updateContent({ ...content, contact: { ...content.contact, salesEmail: v } })} className="mt-1 text-sm text-gray-500" /></div>
            <div className="rounded-xl border border-gray-200 bg-white p-5"><strong>General/Media</strong><EditableText as="p" value={content?.contact.infoEmail || "info@combay.co.uk"} onChange={(v) => content && updateContent({ ...content, contact: { ...content.contact, infoEmail: v } })} className="mt-1 text-sm text-gray-500" /></div>
            <div className="rounded-xl border border-gray-200 bg-white p-5"><strong>Phone</strong><EditableText as="p" value={content?.contact.phone || ""} onChange={(v) => content && updateContent({ ...content, contact: { ...content.contact, phone: v } })} className="mt-1 text-sm text-gray-500" /></div>
            <div className="rounded-xl border border-gray-200 bg-white p-5"><strong>Location</strong><EditableText as="p" value={content?.contact.location || ""} onChange={(v) => content && updateContent({ ...content, contact: { ...content.contact, location: v } })} className="mt-1 text-sm text-gray-500" /></div>
          </div>
        </section>
      );
    }

    if (section === "content") {
      return (
        <section key={section} className={`${sectionShell} px-10 py-14`} onClick={() => setSelected({ kind: "section", section })} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleCanvasDrop(event, "content")}>
          {sectionHandle}
          <div className="pt-5">
            <EditableText as="p" value={page.sectionEyebrow} onChange={(v) => updatePagePatch({ sectionEyebrow: v })} className="font-mono text-xs uppercase tracking-widest text-accent" />
            <EditableText as="h2" value={page.sectionHeading} onChange={(v) => updatePagePatch({ sectionHeading: v })} className="mt-2 font-display text-4xl font-900 text-navy-950" />
            <EditableText as="p" multiline value={page.sectionBody} onChange={(v) => updatePagePatch({ sectionBody: v })} className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-gray-600" />
            <div className="mt-8 grid grid-cols-4 gap-5">
              {page.blocks.map((block, blockIndex) => (
                <BlockCard
                  key={`${block.title}-${blockIndex}`}
                  block={block}
                  index={blockIndex}
                  selected={selected.kind === "block" && selected.index === blockIndex}
                  onSelect={() => setSelected({ kind: "block", index: blockIndex })}
                  onPatch={(patch) => updateBlock(blockIndex, patch)}
                  onStartDrag={() => setDrag({ kind: "block", index: blockIndex })}
                  onDropBlock={() => handleCanvasDrop({ preventDefault() {}, stopPropagation() {} } as DragEvent<HTMLElement>, "content", blockIndex)}
                />
              ))}
              <div className="col-span-4 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500" onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleCanvasDrop(event, "content", page.blocks.length)}>
                Drop widgets here, or click a widget on the left to add it.
              </div>
            </div>
          </div>
        </section>
      );
    }

    if (section === "process") {
      return (
        <section key={section} className={`${sectionShell} bg-gray-50 px-10 py-14`} onClick={() => setSelected({ kind: "section", section })}>
          {sectionHandle}
          <div className="pt-5">
            <h2 className="font-display text-4xl font-900 text-navy-950">How it works.</h2>
            <div className="mt-8 grid grid-cols-4 gap-5">
              {page.steps.map((step, stepIndex) => (
                <div key={`${step.title}-${stepIndex}`} draggable onDragStart={() => setDrag({ kind: "step", index: stepIndex })} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleCanvasDrop(event, "process", stepIndex)} onClick={(event) => { event.stopPropagation(); setSelected({ kind: "step", index: stepIndex }); }} className={`group relative cursor-move rounded-xl border bg-white p-5 ${selected.kind === "step" && selected.index === stepIndex ? "ring-4 ring-accent" : "border-gray-200 hover:ring-2 hover:ring-accent/30"}`}>
                  {step.imageUrl ? <img src={step.imageUrl} alt="" className="mb-4 h-28 w-full rounded object-cover" /> : null}
                  <EditableText as="p" value={step.number} onChange={(v) => updateStep(stepIndex, { number: v })} className="font-mono text-xs text-accent" />
                  <EditableText as="h3" value={step.title} onChange={(v) => updateStep(stepIndex, { title: v })} className="mt-2 font-display text-lg font-900 text-navy-950" />
                  <EditableText as="p" multiline value={step.body} onChange={(v) => updateStep(stepIndex, { body: v })} className="mt-2 whitespace-pre-line text-xs leading-relaxed text-gray-500" />
                </div>
              ))}
              <button type="button" onClick={(event) => { event.stopPropagation(); addStep(); }} className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-5 text-sm font-display font-800 text-gray-500 hover:border-accent hover:text-navy-950">+ Add step</button>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section key={section} className={`${sectionShell} bg-accent px-10 py-14 text-center`} onClick={() => setSelected({ kind: "section", section })}>
        {sectionHandle}
        <EditableText as="h2" value={page.ctaHeading || "Call to action"} onChange={(v) => updatePagePatch({ ctaHeading: v })} className="mx-auto max-w-3xl font-display text-4xl font-900 text-navy-950" />
        <EditableText as="p" multiline value={page.ctaBody || "Add call-to-action body text."} onChange={(v) => updatePagePatch({ ctaBody: v })} className="mx-auto mt-3 max-w-2xl whitespace-pre-line text-sm text-navy-800" />
        <div className="mt-6 flex justify-center gap-3"><EditableText as="span" value={page.ctaPrimaryLabel || "Primary CTA"} onChange={(v) => updatePagePatch({ ctaPrimaryLabel: v })} className="rounded bg-navy-950 px-6 py-3 font-display text-sm font-900 text-white" /><EditableText as="span" value={page.ctaSecondaryLabel || "Secondary CTA"} onChange={(v) => updatePagePatch({ ctaSecondaryLabel: v })} className="rounded border border-navy-950/30 px-6 py-3 font-display text-sm font-900 text-navy-950" /></div>
      </section>
    );
  }

  if (!content) return <div className="p-8 text-sm text-gray-600">Loading visual website builder…</div>;

  const selectedHomeSlide = content.heroSlides[homeHeroIndex];

  return (
    <div className="fixed inset-0 z-40 flex bg-gray-100 text-navy-950">
      <aside className="flex w-[290px] shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Combay CMS</p>
          <h1 className="font-display text-xl font-900">Visual Builder</h1>
          <p className="mt-1 text-xs text-gray-500">Drag widgets into the PC website canvas. Click text on the website to edit it directly.</p>
        </div>
        <div className="border-b border-gray-200 p-3">
          <label className="text-[10px] font-display font-800 uppercase tracking-wide text-gray-500">Page</label>
          <div className="mt-2 grid gap-1">
            {PAGES.map((item) => <button key={item.key} type="button" onClick={() => { setPageKey(item.key); setSelected({ kind: "hero" }); }} className={`rounded px-3 py-2 text-left text-sm font-display font-800 ${pageKey === item.key ? "bg-navy-950 text-white" : "bg-gray-50 text-navy-900 hover:bg-gray-100"}`}>{item.label}</button>)}
          </div>
        </div>
        <div className="flex-1 overflow-auto p-3">
          <p className="mb-2 text-[10px] font-display font-800 uppercase tracking-wide text-gray-500">Widgets</p>
          <div className="grid grid-cols-2 gap-2">
            {WIDGETS.map((widget) => (
              <button
                key={widget.label}
                type="button"
                draggable
                onDragStart={() => setDrag({ kind: "widget", template: widget })}
                onClick={() => addBlock(widget)}
                className="rounded-lg border border-gray-200 bg-white p-3 text-left shadow-sm hover:border-accent hover:bg-accent/10"
              >
                <span className="block text-xl">{widget.icon}</span>
                <span className="mt-1 block text-xs font-display font-900 text-navy-950">{widget.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-500">
            <strong className="text-navy-950">How to edit</strong>
            <p className="mt-1">Click text on the website and type. Drag sections/cards to move or swap. Use the quick bar at the bottom for image upload, width, alignment, background and delete.</p><p className="mt-2 text-[11px] text-gray-500">Screen selector lets you preview PC, tablet and mobile. Use “This screen only draft” before making device-specific layout experiments.</p>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="rounded bg-navy-950 px-3 py-1 text-xs font-display font-900 text-white">{DEVICE_CANVAS[deviceMode].label} mode</span>
            <span className="text-xs text-gray-500">Switch screen size to preview responsive layout. Use screen-only mode for device-specific drafts.</span>
          </div>
          <div className="flex items-center gap-2">
            <select className="input h-9 w-32 text-xs" value={deviceMode} onChange={(event) => { const next = event.target.value as DeviceMode; setDeviceMode(next); setZoom(next === "desktop" ? 0.78 : next === "tablet" ? 0.9 : 1); }}>
              <option value="desktop">PC desktop</option>
              <option value="tablet">Tablet</option>
              <option value="mobile">Mobile</option>
            </select>
            <select className="input h-9 w-40 text-xs" value={editScope} onChange={(event) => setEditScope(event.target.value as EditScope)}>
              <option value="all">Apply to all screens</option>
              <option value="device">This screen only draft</option>
            </select>
            <select className="input h-9 w-28 text-xs" value={zoom} onChange={(event) => setZoom(Number(event.target.value))}>
              <option value={0.65}>65%</option>
              <option value={0.78}>78%</option>
              <option value={0.9}>90%</option>
              <option value={1}>100%</option>
            </select>
            <Link href={publicPath} target="_blank" className="btn-outline text-xs">Open live page</Link>
            <button type="button" onClick={save} disabled={saving} className="btn-primary text-xs">{saving ? "Saving…" : "Save website"}</button>
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <DesktopShell zoom={zoom} device={deviceMode}>
            {pageKey === "home" && selectedHomeSlide ? (
              <section className="border-b border-gray-200 bg-navy-950 px-12 py-10 text-white" style={{ backgroundImage: selectedHomeSlide.backgroundImageUrl ? `linear-gradient(rgba(3,14,33,.88),rgba(3,14,33,.88)), url(${selectedHomeSlide.backgroundImageUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}>
                <div className="mb-5 flex gap-2">{content.heroSlides.map((_, index) => <button key={index} type="button" onClick={() => { setHomeHeroIndex(index); setSelected({ kind: "homeHero", index }); }} className={`rounded px-3 py-1 text-xs font-display font-800 ${homeHeroIndex === index ? "bg-accent text-navy-950" : "bg-white/10 text-white"}`}>Home slide {index + 1}</button>)}</div>
                <EditableText as="p" value={selectedHomeSlide.eyebrow} onChange={(v) => updateContent({ ...content, heroSlides: content.heroSlides.map((slide, i) => i === homeHeroIndex ? { ...slide, eyebrow: v } : slide) })} className="font-mono text-xs uppercase tracking-widest text-accent" />
                <EditableText as="h1" value={selectedHomeSlide.heading} onChange={(v) => updateContent({ ...content, heroSlides: content.heroSlides.map((slide, i) => i === homeHeroIndex ? { ...slide, heading: v } : slide) })} className="mt-4 max-w-3xl font-display text-5xl font-900" />
                <EditableText as="h2" value={selectedHomeSlide.accent} onChange={(v) => updateContent({ ...content, heroSlides: content.heroSlides.map((slide, i) => i === homeHeroIndex ? { ...slide, accent: v } : slide) })} className="max-w-3xl font-display text-5xl font-900 text-accent" />
                <EditableText as="p" multiline value={selectedHomeSlide.body} onChange={(v) => updateContent({ ...content, heroSlides: content.heroSlides.map((slide, i) => i === homeHeroIndex ? { ...slide, body: v } : slide) })} className="mt-5 max-w-2xl whitespace-pre-line text-lg text-white/70" />
              </section>
            ) : null}
            {order.map((section, index) => renderSection(section, index))}
            <footer onClick={() => setSelected({ kind: "footer" })} className={`bg-navy-950 px-10 py-8 text-white ${selected.kind === "footer" ? "ring-4 ring-inset ring-accent" : ""}`}>
              <EditableText as="p" multiline value={content.footer.description} onChange={(v) => updateContent({ ...content, footer: { ...content.footer, description: v } })} className="max-w-2xl whitespace-pre-line text-sm text-white/70" />
            </footer>
          </DesktopShell>
        </div>
      </main>

      <div className="pointer-events-none fixed bottom-4 left-[310px] right-6 z-50 flex justify-center">
        <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur">
          <span className="mr-2 text-xs font-display font-900 text-navy-950">Selected: {selectedLabel}</span>
          <QuickButton onClick={() => moveSelected("left")}>Move left/up</QuickButton>
          <QuickButton onClick={() => moveSelected("right")}>Move right/down</QuickButton>
          <QuickButton onClick={duplicateSelected}>Duplicate</QuickButton>
          {(selected.kind === "block" || selected.kind === "step") ? <QuickButton onClick={removeSelected}>Delete</QuickButton> : null}
          {selected.kind === "block" && selectedBlock ? (
            <>
              <select className="rounded border border-gray-300 px-2 py-1 text-xs" value={selectedBlock.width || "quarter"} onChange={(event) => updateBlock(selected.index, { width: event.target.value })}>
                <option value="quarter">Small</option><option value="half">Medium</option><option value="full">Full width</option>
              </select>
              <select className="rounded border border-gray-300 px-2 py-1 text-xs" value={selectedBlock.align || "left"} onChange={(event) => updateBlock(selected.index, { align: event.target.value })}>
                <option value="left">Left text</option><option value="center">Centre text</option><option value="right">Right text</option>
              </select>
              <select className="rounded border border-gray-300 px-2 py-1 text-xs" value={selectedBlock.background || "white"} onChange={(event) => updateBlock(selected.index, { background: event.target.value })}>
                <option value="white">White</option><option value="soft">Soft grey</option><option value="accent">Accent</option><option value="dark">Dark</option>
              </select>
              <select className="rounded border border-gray-300 px-2 py-1 text-xs" value={selectedBlock.animation || "none"} onChange={(event) => updateBlock(selected.index, { animation: event.target.value })}>
                <option value="none">No animation</option><option value="float">Float</option><option value="pulse">Pulse</option><option value="slide">Slide</option>
              </select>
              <ImageUploadButton label="Upload image" onUploaded={(url) => updateBlock(selected.index, { imageUrl: url })} />
              <QuickButton onClick={() => { const url = prompt("Paste image URL", selectedBlock.imageUrl || ""); if (url !== null) updateBlock(selected.index, { imageUrl: url }); }}>Image URL</QuickButton>
              <QuickButton onClick={() => { const url = prompt("Paste button/video link", selectedBlock.linkHref || ""); if (url !== null) updateBlock(selected.index, { linkHref: url }); }}>Link URL</QuickButton>
            </>
          ) : null}
          {selected.kind === "step" && selectedStep ? <ImageUploadButton label="Upload step image" onUploaded={(url) => updateStep(selected.index, { imageUrl: url })} /> : null}
          {selected.kind === "hero" ? <><ImageUploadButton label="Hero background" onUploaded={(url) => updatePagePatch({ backgroundImageUrl: url })} /><QuickButton onClick={() => { const url = prompt("Paste background image URL", page.backgroundImageUrl || ""); if (url !== null) updatePagePatch({ backgroundImageUrl: url }); }}>Background URL</QuickButton></> : null}
          {message ? <span className="ml-2 text-xs text-gray-500">{message}</span> : null}
        </div>
      </div>
    </div>
  );
}
