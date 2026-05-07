"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CmsBlock, CmsPage, CmsStep, SiteContent } from "@/lib/siteContent";

type PageKey = keyof SiteContent["pages"];
type SelectTarget =
  | { kind: "hero" }
  | { kind: "section"; section: string }
  | { kind: "block"; index: number }
  | { kind: "step"; index: number }
  | { kind: "contact" }
  | { kind: "footer" }
  | { kind: "homeHero"; index: number }
  | { kind: "faq" };

type DragTarget = { kind: "section"; index: number } | { kind: "block"; index: number } | { kind: "step"; index: number } | null;

type AddBlockTemplate = { label: string; blockType: string; icon: string; title: string; subtitle: string; body: string; width?: string; background?: string; animation?: string; linkLabel?: string; linkHref?: string };

const PAGES: Array<{ key: PageKey; label: string; path: string }> = [
  { key: "home", label: "Home", path: "/" },
  { key: "repair", label: "Repair", path: "/repair" },
  { key: "assetRecovery", label: "Asset Recovery", path: "/asset-recovery" },
  { key: "about", label: "About", path: "/about" },
  { key: "contact", label: "Contact", path: "/contact" },
];

const SECTION_META: Record<string, { label: string; hint: string }> = {
  hero: { label: "Hero / top section", hint: "Main heading, intro, buttons and background." },
  contactBar: { label: "Contact details strip", hint: "Public contact cards for contact-style pages." },
  content: { label: "Content cards", hint: "Cards, banners, icons, image blocks and sliders." },
  process: { label: "Process steps", hint: "Step-by-step blocks." },
  formOrCta: { label: "Form / final call-to-action", hint: "Repair form, asset form, or CTA block." },
};

const ADD_BLOCKS: AddBlockTemplate[] = [
  { label: "Text block", blockType: "text", icon: "✦", title: "New text block", subtitle: "Editable text", body: "Add clear website copy here.", width: "half", background: "white" },
  { label: "Image block", blockType: "image", icon: "🖼", title: "New image block", subtitle: "Image and text", body: "Upload an image and add supporting text.", width: "half", background: "white" },
  { label: "Icon feature", blockType: "icon", icon: "⚙️", title: "New feature", subtitle: "Feature highlight", body: "Use this for a service, benefit, category or trust point.", width: "quarter", background: "white" },
  { label: "Promotion banner", blockType: "promotion", icon: "🏷", title: "Promotion banner", subtitle: "Offer / campaign", body: "Highlight an offer, discount code, seasonal campaign or landing page CTA.", width: "full", background: "accent", linkLabel: "View offer", linkHref: "/shop" },
  { label: "Slider item", blockType: "slider", icon: "▣", title: "Slider item", subtitle: "Carousel content", body: "Create several slider items together for a carousel-style content area.", width: "half", background: "soft" },
  { label: "Animation cue", blockType: "animation", icon: "✨", title: "Animation / visual cue", subtitle: "Animated highlight", body: "Use this for a motion-style highlight, icon animation or interactive cue.", width: "quarter", background: "soft", animation: "float" },
];

const emptyPage: CmsPage = { eyebrow: "", heading: "", accent: "", body: "", backgroundImageUrl: "", heroImageUrl: "", primaryLabel: "", primaryHref: "#", secondaryLabel: "", secondaryHref: "#", sectionEyebrow: "", sectionHeading: "", sectionBody: "", blocks: [], steps: [], ctaHeading: "", ctaBody: "", ctaPrimaryLabel: "", ctaPrimaryHref: "#", ctaSecondaryLabel: "", ctaSecondaryHref: "#", sectionOrder: ["hero", "contactBar", "content", "process", "formOrCta"] };

function safeOrder(page: CmsPage) {
  const allowed = ["hero", "contactBar", "content", "process", "formOrCta"];
  const existing = Array.isArray(page.sectionOrder) ? page.sectionOrder.filter((item) => allowed.includes(item)) : [];
  return (existing.length ? existing : allowed).filter((item, index, arr) => arr.indexOf(item) === index);
}

function makeBlock(template: AddBlockTemplate): CmsBlock {
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
  return { number: String(index + 1).padStart(2, "0"), title: "New step", body: "Describe this step for customers.", imageUrl: "" };
}

function pagePath(key: PageKey) {
  return PAGES.find((item) => item.key === key)?.path || "/";
}

function Field({ label, value, onChange, textarea = false, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; textarea?: boolean; placeholder?: string }) {
  return <label className="block space-y-1"><span className="text-[11px] font-display font-800 uppercase tracking-wide text-gray-500">{label}</span>{textarea ? <textarea className="textarea text-sm" rows={4} value={value || ""} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /> : <input className="input text-sm" value={value || ""} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />}</label>;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return <label className="block space-y-1"><span className="text-[11px] font-display font-800 uppercase tracking-wide text-gray-500">{label}</span><select className="input text-sm" value={value || ""} onChange={(event) => onChange(event.target.value)}>{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>;
}

function ImageField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  async function upload(file: File | null) {
    if (!file) return;
    setUploading(true); setError("");
    try {
      const form = new FormData();
      form.set("folder", "company-docs");
      form.set("file", file);
      const response = await fetch("/api/uploads", { method: "POST", body: form });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok || !data?.url) throw new Error(data?.error || "Upload failed.");
      onChange(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally { setUploading(false); }
  }
  return <div className="space-y-2"><span className="text-[11px] font-display font-800 uppercase tracking-wide text-gray-500">{label}</span><div className="grid grid-cols-[1fr_auto] gap-2"><input className="input text-sm" value={value || ""} placeholder="Paste image URL" onChange={(event)=>onChange(event.target.value)} /><label className="btn-outline text-xs cursor-pointer whitespace-nowrap">{uploading ? "Uploading…" : "Upload image"}<input className="hidden" type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={(event)=>upload(event.target.files?.[0] || null)} /></label></div>{value ? <div className="flex items-center gap-3"><img src={value} alt="CMS preview" className="h-16 w-24 rounded border border-gray-200 object-cover" /><button type="button" className="text-xs text-red-600" onClick={()=>onChange("")}>Remove</button></div> : null}{error ? <p className="text-xs text-red-600">{error}</p> : null}</div>;
}

function CanvasBlock({ block, selected, onClick, draggable, onDragStart, onDrop, onDragOver }: { block: CmsBlock; selected: boolean; onClick: () => void; draggable?: boolean; onDragStart?: () => void; onDrop?: () => void; onDragOver?: (event: React.DragEvent) => void }) {
  const bg = block.background === "dark" ? "bg-navy-950 text-white border-navy-950" : block.background === "accent" ? "bg-accent/10 border-accent/40" : block.background === "soft" ? "bg-gray-50 border-gray-200" : "bg-white border-gray-200";
  const width = block.width === "full" ? "md:col-span-4" : block.width === "half" ? "md:col-span-2" : "";
  return <div draggable={draggable} onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onClick={onClick} className={`${width} ${bg} group relative cursor-move rounded-xl border p-4 transition-all ${selected ? "ring-2 ring-accent shadow-lg" : "hover:ring-2 hover:ring-accent/30"}`}><div className="absolute right-2 top-2 rounded bg-white/90 px-2 py-1 text-[10px] font-display font-800 uppercase text-navy-900 shadow-sm opacity-0 group-hover:opacity-100">Drag / edit</div>{block.imageUrl ? <img src={block.imageUrl} className="mb-3 h-28 w-full rounded-lg object-cover" alt="" /> : <div className="mb-3 text-2xl">{block.icon}</div>}<p className="font-mono text-[10px] uppercase tracking-widest text-accent">{block.blockType || "block"}</p><h4 className="font-display font-900 text-sm">{block.title}</h4><p className="text-xs text-accent font-700">{block.subtitle}</p><p className="mt-2 line-clamp-3 text-xs opacity-75">{block.body}</p>{block.linkLabel ? <span className="mt-3 inline-block text-xs font-display font-800 text-accent">{block.linkLabel} →</span> : null}</div>;
}

export default function VisualCmsBuilder() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [pageKey, setPageKey] = useState<PageKey>("home");
  const [selected, setSelected] = useState<SelectTarget>({ kind: "hero" });
  const [drag, setDrag] = useState<DragTarget>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [homeHeroIndex, setHomeHeroIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/content", { cache: "no-store" }).then((response) => response.json()).then((data) => { if (!cancelled && data?.content) setContent(data.content); }).catch(() => setMessage("Could not load website content."));
    return () => { cancelled = true; };
  }, []);

  const page = content?.pages?.[pageKey] || emptyPage;
  const order = safeOrder(page);
  const previewHref = pagePath(pageKey);

  function updateContent(next: SiteContent) { setContent(next); }
  function updatePage(next: CmsPage) { if (!content) return; updateContent({ ...content, pages: { ...content.pages, [pageKey]: next } }); }
  function updatePagePatch(patch: Partial<CmsPage>) { updatePage({ ...page, ...patch }); }
  function updateBlock(index: number, patch: Partial<CmsBlock>) { updatePage({ ...page, blocks: page.blocks.map((block, i) => i === index ? { ...block, ...patch } : block) }); }
  function updateStep(index: number, patch: Partial<CmsStep>) { updatePage({ ...page, steps: page.steps.map((step, i) => i === index ? { ...step, ...patch } : step) }); }
  function move<T>(items: T[], from: number, to: number) { const next = [...items]; const [picked] = next.splice(from, 1); next.splice(to, 0, picked); return next; }
  function addBlock(template: AddBlockTemplate) { const next = makeBlock(template); updatePage({ ...page, blocks: [...page.blocks, next] }); setSelected({ kind: "block", index: page.blocks.length }); }
  function addStep() { const next = makeStep(page.steps.length); updatePage({ ...page, steps: [...page.steps, next] }); setSelected({ kind: "step", index: page.steps.length }); }
  function removeBlock(index: number) { updatePage({ ...page, blocks: page.blocks.filter((_, i) => i !== index) }); setSelected({ kind: "section", section: "content" }); }
  function removeStep(index: number) { updatePage({ ...page, steps: page.steps.filter((_, i) => i !== index) }); setSelected({ kind: "section", section: "process" }); }

  async function save() {
    if (!content) return;
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.error || "Could not save website layout.");
      setContent(data.content); setMessage("Website layout saved. Open the public page to confirm the live site updated.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Could not save website layout."); }
    finally { setSaving(false); }
  }

  function renderSection(section: string, index: number) {
    const selectedSection = selected.kind === "section" && selected.section === section;
    const base = `relative rounded-2xl border bg-white shadow-sm transition-all ${selectedSection ? "ring-2 ring-accent border-accent" : "border-gray-200 hover:ring-2 hover:ring-accent/20"}`;
    return <div key={section} draggable onDragStart={() => setDrag({ kind: "section", index })} onDragOver={(event)=>event.preventDefault()} onDrop={() => { if (drag?.kind === "section") updatePagePatch({ sectionOrder: move(order, drag.index, index) }); setDrag(null); }} className={base} onClick={() => setSelected({ kind: "section", section })}><div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-2"><div><p className="text-[10px] font-mono uppercase tracking-widest text-accent">☰ {SECTION_META[section]?.label || section}</p><p className="text-[11px] text-gray-400">{SECTION_META[section]?.hint}</p></div><button type="button" className="text-[11px] font-display font-800 text-navy-900">Move section</button></div>{section === "hero" && <div className="bg-navy-950 p-7 text-white" style={{ backgroundImage: page.backgroundImageUrl ? `linear-gradient(rgba(3,14,33,.88),rgba(3,14,33,.88)), url(${page.backgroundImageUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }} onClick={(event)=>{event.stopPropagation(); setSelected({ kind: "hero" });}}><p className="font-mono text-[10px] uppercase tracking-widest text-accent">{page.eyebrow}</p><h2 className="mt-2 font-display text-3xl font-900">{page.heading} <span className="text-accent">{page.accent}</span></h2><p className="mt-3 max-w-2xl text-sm text-white/70 whitespace-pre-line">{page.body}</p><div className="mt-4 flex gap-2"><span className="rounded bg-accent px-4 py-2 text-xs font-display font-800 text-navy-950">{page.primaryLabel || "Main button"}</span><span className="rounded border border-white/30 px-4 py-2 text-xs font-display font-800 text-white">{page.secondaryLabel || "Second button"}</span></div></div>}{section === "contactBar" && <div className="grid gap-3 p-4 md:grid-cols-4" onClick={(event)=>{event.stopPropagation(); setSelected({ kind: "contact" });}}>{["Order’s/Quotes", "General/Media", "Phone", "Location"].map((x)=><div key={x} className="rounded-xl border border-gray-200 bg-gray-50 p-3"><p className="font-display font-800 text-sm text-navy-900">{x}</p><p className="text-xs text-gray-500">{x === "Order’s/Quotes" ? content?.contact.salesEmail : x === "General/Media" ? content?.contact.infoEmail : x === "Phone" ? content?.contact.phone : content?.contact.location}</p></div>)}</div>}{section === "content" && <div className="p-5"><p className="font-mono text-[10px] uppercase tracking-widest text-accent">{page.sectionEyebrow}</p><h3 className="font-display text-2xl font-900 text-navy-950">{page.sectionHeading}</h3><p className="mt-1 text-sm text-gray-500 whitespace-pre-line">{page.sectionBody}</p><div className="mt-5 grid gap-4 md:grid-cols-4">{page.blocks.map((block, i)=><CanvasBlock key={`${block.title}-${i}`} block={block} selected={selected.kind === "block" && selected.index === i} draggable onClick={()=>setSelected({ kind: "block", index: i })} onDragStart={()=>setDrag({ kind: "block", index: i })} onDragOver={(event)=>event.preventDefault()} onDrop={()=>{ if (drag?.kind === "block") updatePagePatch({ blocks: move(page.blocks, drag.index, i) }); setDrag(null); }} />)}</div></div>}{section === "process" && <div className="grid gap-4 p-5 md:grid-cols-4">{page.steps.map((step, i)=><div key={`${step.title}-${i}`} draggable onDragStart={()=>setDrag({ kind: "step", index: i })} onDragOver={(event)=>event.preventDefault()} onDrop={()=>{ if (drag?.kind === "step") updatePagePatch({ steps: move(page.steps, drag.index, i) }); setDrag(null); }} onClick={(event)=>{event.stopPropagation(); setSelected({ kind: "step", index: i });}} className={`cursor-move rounded-xl border p-4 ${selected.kind === "step" && selected.index === i ? "ring-2 ring-accent" : "border-gray-200 bg-gray-50"}`}>{step.imageUrl ? <img src={step.imageUrl} alt="" className="mb-3 h-20 w-full rounded object-cover" /> : null}<p className="font-mono text-xs text-accent">{step.number}</p><p className="font-display font-900 text-navy-950">{step.title}</p><p className="text-xs text-gray-500">{step.body}</p></div>)}</div>}{section === "formOrCta" && <div className="bg-accent p-7 text-center text-navy-950" onClick={(event)=>{event.stopPropagation(); setSelected({ kind: "section", section: "formOrCta" });}}><h3 className="font-display text-2xl font-900">{page.ctaHeading || "Final call-to-action / form"}</h3><p className="mx-auto mt-2 max-w-2xl text-sm whitespace-pre-line">{page.ctaBody}</p><div className="mt-4 flex justify-center gap-2"><span className="rounded bg-navy-950 px-4 py-2 text-xs font-display font-800 text-white">{page.ctaPrimaryLabel || "Main action"}</span><span className="rounded border border-navy-900/20 px-4 py-2 text-xs font-display font-800">{page.ctaSecondaryLabel || "Second action"}</span></div></div>}</div>;
  }

  const selectedBlockIndex = selected.kind === "block" ? selected.index : -1;
  const selectedStepIndex = selected.kind === "step" ? selected.index : -1;
  const selectedHomeHeroIndex = selected.kind === "homeHero" ? selected.index : -1;
  const selectedBlock = selectedBlockIndex >= 0 ? page.blocks[selectedBlockIndex] : null;
  const selectedStep = selectedStepIndex >= 0 ? page.steps[selectedStepIndex] : null;
  const selectedHomeSlide = content?.heroSlides?.[homeHeroIndex] || null;
  const inspectorHomeSlide = selectedHomeHeroIndex >= 0 ? content?.heroSlides?.[selectedHomeHeroIndex] : null;

  if (!content) return <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Loading visual CMS builder…</div>;

  return <div className="-m-6 min-h-screen bg-gray-100">
    <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 px-5 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="font-mono text-[10px] uppercase tracking-widest text-accent">Visual CMS Builder</p><h1 className="font-display text-2xl font-900 text-navy-950">Edit the website visually</h1></div>
        <div className="flex flex-wrap gap-2"><Link href={previewHref} target="_blank" className="btn-outline">Open public page ↗</Link><button className="btn-primary" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save website changes"}</button></div>
      </div>
      {message ? <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">{message}</div> : null}
    </div>

    <div className="grid min-h-[calc(100vh-88px)] grid-cols-[260px_1fr_360px] gap-0">
      <aside className="border-r border-gray-200 bg-white p-4">
        <p className="mb-2 text-[11px] font-display font-900 uppercase tracking-wide text-gray-500">Pages</p>
        <div className="space-y-1">{PAGES.map((item)=><button key={item.key} onClick={()=>{setPageKey(item.key); setSelected({ kind: "hero" });}} className={`w-full rounded-lg px-3 py-2 text-left text-sm font-display font-800 ${pageKey === item.key ? "bg-navy-950 text-white" : "text-gray-600 hover:bg-gray-50"}`}>{item.label}</button>)}</div>
        <div className="my-5 border-t border-gray-200" />
        <p className="mb-2 text-[11px] font-display font-900 uppercase tracking-wide text-gray-500">Add elements</p>
        <div className="space-y-2">{ADD_BLOCKS.map((template)=><button key={template.label} onClick={()=>addBlock(template)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-xs font-display font-800 text-navy-900 hover:border-accent hover:bg-amber-50"><span className="mr-2">{template.icon}</span>{template.label}</button>)}<button onClick={addStep} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-xs font-display font-800 text-navy-900 hover:border-accent hover:bg-amber-50">➕ Process step</button></div>
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900"><strong>How this works:</strong><br/>Click a section or block on the page canvas, edit it on the right, drag it with your mouse, then save.</div>
      </aside>

      <main className="overflow-auto p-6">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-gray-300 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-5 py-3"><div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-red-300"/><span className="h-3 w-3 rounded-full bg-amber-300"/><span className="h-3 w-3 rounded-full bg-green-300"/></div><p className="text-xs font-display font-800 text-gray-500">Website preview: {previewHref}</p></div>
          <div className="border-b border-gray-200 bg-white px-6 py-4"><div className="flex items-center justify-between"><img src="/images/combay-doc-logo.png" alt="Combay" className="h-9 w-auto"/><div className="hidden gap-5 text-xs font-display font-800 text-gray-500 md:flex"><span>Shop</span><span>Repair</span><span>Asset Recovery</span><span>Contact</span></div></div></div>
          <div className="space-y-4 bg-gray-50 p-4">{pageKey === "home" ? <div className="rounded-2xl border border-gray-200 bg-white p-4"><div className="mb-3 flex gap-2">{content.heroSlides.map((_, index)=><button key={index} onClick={()=>{setHomeHeroIndex(index); setSelected({ kind: "homeHero", index });}} className={`rounded px-3 py-1 text-xs font-display font-800 ${homeHeroIndex === index ? "bg-navy-950 text-white" : "bg-gray-100 text-gray-600"}`}>Hero slide {index+1}</button>)}</div>{selectedHomeSlide ? <div onClick={()=>setSelected({ kind: "homeHero", index: homeHeroIndex })} className={`cursor-pointer rounded-xl bg-navy-950 p-7 text-white ${selected.kind === "homeHero" ? "ring-2 ring-accent" : ""}`} style={{ backgroundImage: selectedHomeSlide.backgroundImageUrl ? `linear-gradient(rgba(3,14,33,.88),rgba(3,14,33,.88)), url(${selectedHomeSlide.backgroundImageUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}><p className="font-mono text-[10px] uppercase tracking-widest text-accent">{selectedHomeSlide.eyebrow}</p><h2 className="mt-2 font-display text-3xl font-900">{selectedHomeSlide.heading} <span className="text-accent">{selectedHomeSlide.accent}</span></h2><p className="mt-3 max-w-2xl text-sm text-white/70">{selectedHomeSlide.body}</p></div> : null}</div> : null}{order.map((section, index)=>renderSection(section, index))}<div onClick={()=>setSelected({ kind: "footer" })} className={`cursor-pointer rounded-2xl bg-navy-950 p-6 text-white ${selected.kind === "footer" ? "ring-2 ring-accent" : ""}`}><p className="font-display font-900">Footer</p><p className="mt-1 text-sm text-white/60">{content.footer.description}</p></div></div>
        </div>
      </main>

      <aside className="border-l border-gray-200 bg-white p-5 overflow-auto">
        <div className="mb-4"><p className="font-mono text-[10px] uppercase tracking-widest text-accent">Inspector</p><h2 className="font-display text-lg font-900 text-navy-950">Edit selected item</h2></div>
        {selected.kind === "hero" && <div className="space-y-3"><Field label="Small label" value={page.eyebrow} onChange={(v)=>updatePagePatch({ eyebrow: v })}/><Field label="Main heading" value={page.heading} onChange={(v)=>updatePagePatch({ heading: v })}/><Field label="Highlighted heading" value={page.accent} onChange={(v)=>updatePagePatch({ accent: v })}/><Field label="Intro text" textarea value={page.body} onChange={(v)=>updatePagePatch({ body: v })}/><ImageField label="Hero background image" value={page.backgroundImageUrl} onChange={(v)=>updatePagePatch({ backgroundImageUrl: v })}/><ImageField label="Hero side image" value={page.heroImageUrl} onChange={(v)=>updatePagePatch({ heroImageUrl: v })}/><Field label="Main button text" value={page.primaryLabel} onChange={(v)=>updatePagePatch({ primaryLabel: v })}/><Field label="Main button link" value={page.primaryHref} onChange={(v)=>updatePagePatch({ primaryHref: v })}/><Field label="Second button text" value={page.secondaryLabel} onChange={(v)=>updatePagePatch({ secondaryLabel: v })}/><Field label="Second button link" value={page.secondaryHref} onChange={(v)=>updatePagePatch({ secondaryHref: v })}/></div>}
        {inspectorHomeSlide && <div className="space-y-3"><Field label="Small label" value={inspectorHomeSlide.eyebrow} onChange={(v)=>updateContent({ ...content, heroSlides: content.heroSlides.map((s,i)=>i===selectedHomeHeroIndex?{...s,eyebrow:v}:s) })}/><Field label="Main heading" value={inspectorHomeSlide.heading} onChange={(v)=>updateContent({ ...content, heroSlides: content.heroSlides.map((s,i)=>i===selectedHomeHeroIndex?{...s,heading:v}:s) })}/><Field label="Highlighted heading" value={inspectorHomeSlide.accent} onChange={(v)=>updateContent({ ...content, heroSlides: content.heroSlides.map((s,i)=>i===selectedHomeHeroIndex?{...s,accent:v}:s) })}/><Field label="Body text" textarea value={inspectorHomeSlide.body} onChange={(v)=>updateContent({ ...content, heroSlides: content.heroSlides.map((s,i)=>i===selectedHomeHeroIndex?{...s,body:v}:s) })}/><ImageField label="Background image" value={inspectorHomeSlide.backgroundImageUrl || ""} onChange={(v)=>updateContent({ ...content, heroSlides: content.heroSlides.map((s,i)=>i===selectedHomeHeroIndex?{...s,backgroundImageUrl:v}:s) })}/><ImageField label="Side image" value={inspectorHomeSlide.imageUrl || ""} onChange={(v)=>updateContent({ ...content, heroSlides: content.heroSlides.map((s,i)=>i===selectedHomeHeroIndex?{...s,imageUrl:v}:s) })}/></div>}
        {selected.kind === "section" && <div className="space-y-3"><div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm"><strong>{SECTION_META[selected.section]?.label}</strong><p className="mt-1 text-xs text-gray-500">Drag this section up/down on the canvas to change its public order.</p></div>{selected.section === "content" && <><Field label="Section small label" value={page.sectionEyebrow} onChange={(v)=>updatePagePatch({ sectionEyebrow: v })}/><Field label="Section heading" value={page.sectionHeading} onChange={(v)=>updatePagePatch({ sectionHeading: v })}/><Field label="Section body" textarea value={page.sectionBody} onChange={(v)=>updatePagePatch({ sectionBody: v })}/></>}{selected.section === "formOrCta" && <><Field label="CTA / form heading" value={page.ctaHeading} onChange={(v)=>updatePagePatch({ ctaHeading: v })}/><Field label="CTA body" textarea value={page.ctaBody} onChange={(v)=>updatePagePatch({ ctaBody: v })}/><Field label="Main CTA text" value={page.ctaPrimaryLabel} onChange={(v)=>updatePagePatch({ ctaPrimaryLabel: v })}/><Field label="Main CTA link" value={page.ctaPrimaryHref} onChange={(v)=>updatePagePatch({ ctaPrimaryHref: v })}/><Field label="Second CTA text" value={page.ctaSecondaryLabel} onChange={(v)=>updatePagePatch({ ctaSecondaryLabel: v })}/><Field label="Second CTA link" value={page.ctaSecondaryHref} onChange={(v)=>updatePagePatch({ ctaSecondaryHref: v })}/></>}</div>}
        {selectedBlock && <div className="space-y-3"><div className="flex justify-between gap-3"><strong className="text-sm text-navy-950">Content block</strong><button className="text-xs text-red-600" onClick={()=>removeBlock(selectedBlockIndex)}>Delete</button></div><SelectField label="Element type" value={selectedBlock.blockType} onChange={(v)=>updateBlock(selectedBlockIndex,{ blockType: v })} options={[["text","Text"],["image","Image"],["icon","Icon feature"],["promotion","Promotion banner"],["slider","Slider item"],["animation","Animation cue"]]}/><Field label="Icon / emoji" value={selectedBlock.icon} onChange={(v)=>updateBlock(selectedBlockIndex,{ icon: v })}/><Field label="Heading" value={selectedBlock.title} onChange={(v)=>updateBlock(selectedBlockIndex,{ title: v })}/><Field label="Sub-heading" value={selectedBlock.subtitle} onChange={(v)=>updateBlock(selectedBlockIndex,{ subtitle: v })}/><Field label="Body text" textarea value={selectedBlock.body} onChange={(v)=>updateBlock(selectedBlockIndex,{ body: v })}/><ImageField label="Image" value={selectedBlock.imageUrl} onChange={(v)=>updateBlock(selectedBlockIndex,{ imageUrl: v })}/><div className="grid grid-cols-2 gap-3"><Field label="Button text" value={selectedBlock.linkLabel} onChange={(v)=>updateBlock(selectedBlockIndex,{ linkLabel: v })}/><Field label="Button link" value={selectedBlock.linkHref} onChange={(v)=>updateBlock(selectedBlockIndex,{ linkHref: v })}/></div><div className="grid grid-cols-2 gap-3"><SelectField label="Width" value={selectedBlock.width} onChange={(v)=>updateBlock(selectedBlockIndex,{ width: v })} options={[["quarter","Small"],["half","Medium"],["full","Full width"]]}/><SelectField label="Text alignment" value={selectedBlock.align} onChange={(v)=>updateBlock(selectedBlockIndex,{ align: v })} options={[["left","Left"],["center","Centre"],["right","Right"]]}/><SelectField label="Background" value={selectedBlock.background} onChange={(v)=>updateBlock(selectedBlockIndex,{ background: v })} options={[["white","White"],["soft","Soft grey"],["accent","Accent"],["dark","Dark"]]}/><SelectField label="Animation" value={selectedBlock.animation} onChange={(v)=>updateBlock(selectedBlockIndex,{ animation: v })} options={[["none","None"],["float","Float on hover"],["pulse","Shadow on hover"],["slide","Slide on hover"]]}/></div></div>}
        {selectedStep && <div className="space-y-3"><div className="flex justify-between gap-3"><strong className="text-sm text-navy-950">Process step</strong><button className="text-xs text-red-600" onClick={()=>removeStep(selectedStepIndex)}>Delete</button></div><Field label="Step number" value={selectedStep.number} onChange={(v)=>updateStep(selectedStepIndex,{ number: v })}/><Field label="Heading" value={selectedStep.title} onChange={(v)=>updateStep(selectedStepIndex,{ title: v })}/><Field label="Body" textarea value={selectedStep.body} onChange={(v)=>updateStep(selectedStepIndex,{ body: v })}/><ImageField label="Step image" value={selectedStep.imageUrl} onChange={(v)=>updateStep(selectedStepIndex,{ imageUrl: v })}/></div>}
        {selected.kind === "contact" && <div className="space-y-3"><Field label="Order’s/Quotes email" value={content.contact.salesEmail} onChange={(v)=>updateContent({ ...content, contact: { ...content.contact, salesEmail: v } })}/><Field label="General/Media email" value={content.contact.infoEmail} onChange={(v)=>updateContent({ ...content, contact: { ...content.contact, infoEmail: v } })}/><Field label="Phone" value={content.contact.phone} onChange={(v)=>updateContent({ ...content, contact: { ...content.contact, phone: v } })}/><Field label="Location" value={content.contact.location} onChange={(v)=>updateContent({ ...content, contact: { ...content.contact, location: v } })}/><Field label="Google map embed URL" textarea value={content.contact.mapEmbedUrl} onChange={(v)=>updateContent({ ...content, contact: { ...content.contact, mapEmbedUrl: v } })}/></div>}
        {selected.kind === "footer" && <div className="space-y-3"><Field label="Footer description" textarea value={content.footer.description} onChange={(v)=>updateContent({ ...content, footer: { ...content.footer, description: v } })}/><ImageField label="Footer background" value={content.footer.backgroundImageUrl} onChange={(v)=>updateContent({ ...content, footer: { ...content.footer, backgroundImageUrl: v } })}/></div>}
      </aside>
    </div>
  </div>;
}
