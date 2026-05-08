"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { CmsBlock, CmsPage, CmsStep, SiteContent } from "@/lib/siteContent";

type PageKey = keyof SiteContent["pages"];
type DeviceMode = "desktop" | "tablet" | "mobile";
type EditTarget =
  | { kind: "homeSlide"; index: number }
  | { kind: "pageHero" }
  | { kind: "pageBlock"; index: number }
  | { kind: "pageStep"; index: number }
  | { kind: "pageCta" }
  | { kind: "trust" }
  | { kind: "finalCta" }
  | { kind: "footer" };

type WidgetTemplate = { label: string; blockType: string; icon: string; title: string; subtitle: string; body: string; width?: string; background?: string; linkLabel?: string; linkHref?: string };

const PAGES: Array<{ key: PageKey; label: string; path: string; note: string }> = [
  { key: "home", label: "Home", path: "/", note: "Hero, service cards, trust, FAQ preview, final CTA and footer." },
  { key: "repair", label: "Repair", path: "/repair", note: "Hero, contact strip, service cards, process steps and repair form area." },
  { key: "assetRecovery", label: "Asset Recovery", path: "/asset-recovery", note: "Hero, contact strip, content cards, process steps and CTA." },
  { key: "about", label: "About", path: "/about", note: "Hero, contact strip, about/story cards and CTA." },
  { key: "contact", label: "Contact", path: "/contact", note: "Hero, contact details, form/map area and footer." },
];

const DEVICE_CANVAS: Record<DeviceMode, { label: string; width: number }> = {
  desktop: { label: "PC desktop", width: 1180 },
  tablet: { label: "Tablet", width: 820 },
  mobile: { label: "Mobile", width: 390 },
};

const WIDGETS: WidgetTemplate[] = [
  { label: "Text", blockType: "text", icon: "T", title: "New text heading", subtitle: "Supporting line", body: "Add text here.", width: "half", background: "white" },
  { label: "Image", blockType: "image", icon: "🖼", title: "Image block", subtitle: "Image with text", body: "Upload or paste an image URL.", width: "half", background: "white" },
  { label: "Video", blockType: "video", icon: "▶", title: "Video block", subtitle: "Video / demo", body: "Add a video URL in the link field.", width: "half", background: "dark" },
  { label: "Icon", blockType: "icon", icon: "⚙️", title: "Feature", subtitle: "Feature highlight", body: "Describe the feature or benefit.", width: "quarter", background: "white" },
  { label: "Promo banner", blockType: "promotion", icon: "🏷", title: "Promotion banner", subtitle: "Offer / campaign", body: "Highlight an offer, sale or stock campaign.", width: "full", background: "accent", linkLabel: "View offer", linkHref: "/shop" },
  { label: "Animation", blockType: "animation", icon: "✨", title: "Animated highlight", subtitle: "Motion cue", body: "Use subtle animation for a highlight.", width: "quarter", background: "soft" },
  { label: "Shape", blockType: "shape", icon: "■", title: "Shape / divider", subtitle: "Design element", body: "Visual spacing or divider.", width: "quarter", background: "soft" },
  { label: "Slider item", blockType: "slider", icon: "▣", title: "Slider item", subtitle: "Carousel content", body: "Add a slide item to a CMS-controlled section.", width: "half", background: "soft" },
];

const emptyPage: CmsPage = {
  eyebrow: "", heading: "", accent: "", body: "", backgroundImageUrl: "", heroImageUrl: "", primaryLabel: "", primaryHref: "#", secondaryLabel: "", secondaryHref: "#",
  sectionEyebrow: "", sectionHeading: "", sectionBody: "", blocks: [], steps: [], ctaHeading: "", ctaBody: "", ctaPrimaryLabel: "", ctaPrimaryHref: "#", ctaSecondaryLabel: "", ctaSecondaryHref: "#", sectionOrder: ["hero", "contactBar", "content", "process", "formOrCta"],
};

function pagePath(key: PageKey) { return PAGES.find((item) => item.key === key)?.path || "/"; }
function pageLabel(key: PageKey) { return PAGES.find((item) => item.key === key)?.label || "Page"; }
function pageNote(key: PageKey) { return PAGES.find((item) => item.key === key)?.note || ""; }
function makeBlock(template: WidgetTemplate): CmsBlock { return { icon: template.icon, title: template.title, subtitle: template.subtitle, body: template.body, imageUrl: "", linkLabel: template.linkLabel || "", linkHref: template.linkHref || "#", blockType: template.blockType, width: template.width || "quarter", align: "left", background: template.background || "white", animation: "none" }; }
function move<T>(items: T[], from: number, to: number) { const next = [...items]; if (from < 0 || from >= next.length || to < 0 || to >= next.length) return next; const [picked] = next.splice(from, 1); next.splice(to, 0, picked); return next; }

function Field({ label, value, onChange, textarea = false, help }: { label: string; value: string; onChange: (value: string) => void; textarea?: boolean; help?: string }) {
  return <label className="block"><span className="text-[11px] font-display font-800 uppercase tracking-wide text-gray-500">{label}</span>{textarea ? <textarea className="input mt-1 min-h-[92px] w-full text-sm" value={value || ""} onChange={(e) => onChange(e.target.value)} /> : <input className="input mt-1 w-full text-sm" value={value || ""} onChange={(e) => onChange(e.target.value)} />}{help ? <span className="mt-1 block text-[11px] text-gray-500">{help}</span> : null}</label>;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="block"><span className="text-[11px] font-display font-800 uppercase tracking-wide text-gray-500">{label}</span><select className="input mt-1 w-full text-sm" value={value || ""} onChange={(e) => onChange(e.target.value)}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

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

function ActionButton({ children, onClick }: { children: ReactNode; onClick: () => void }) { return <button type="button" onClick={onClick} className="rounded border border-gray-300 bg-white px-3 py-2 text-xs font-display font-800 text-navy-900 hover:border-accent hover:bg-accent/10">{children}</button>; }

export default function VisualCmsBuilder() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [pageKey, setPageKey] = useState<PageKey>("home");
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [zoom, setZoom] = useState(0.78);
  const [selected, setSelected] = useState<EditTarget>({ kind: "pageHero" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(Date.now());

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
  const iframeSrc = `${publicPath}${publicPath.includes("?") ? "&" : "?"}cmsPreview=1&cmsRefresh=${refreshKey}`;

  const editableItems = useMemo(() => {
    const items: Array<{ label: string; target: EditTarget }> = [];
    if (pageKey === "home") {
      content?.heroSlides.forEach((_, index) => items.push({ label: `Homepage hero slide ${index + 1}`, target: { kind: "homeSlide", index } }));
      items.push({ label: "Homepage service heading/cards", target: { kind: "pageHero" } });
      items.push({ label: "Trust section", target: { kind: "trust" } });
      items.push({ label: "Final call-to-action", target: { kind: "finalCta" } });
    } else {
      items.push({ label: `${pageLabel(pageKey)} hero`, target: { kind: "pageHero" } });
      page.blocks.forEach((block, index) => items.push({ label: `Card ${index + 1}: ${block.title || "Untitled"}`, target: { kind: "pageBlock", index } }));
      page.steps.forEach((step, index) => items.push({ label: `Step ${index + 1}: ${step.title || "Untitled"}`, target: { kind: "pageStep", index } }));
      items.push({ label: `${pageLabel(pageKey)} CTA / form intro`, target: { kind: "pageCta" } });
    }
    items.push({ label: "Footer & public contact details", target: { kind: "footer" } });
    return items;
  }, [content?.heroSlides, page.blocks, page.steps, pageKey]);

  function updateContent(next: SiteContent) { setContent(next); }
  function updatePage(next: CmsPage) { if (!content) return; updateContent({ ...content, pages: { ...content.pages, [pageKey]: next } }); }
  function updatePagePatch(patch: Partial<CmsPage>) { updatePage({ ...page, ...patch }); }
  function updateBlock(index: number, patch: Partial<CmsBlock>) { updatePage({ ...page, blocks: page.blocks.map((block, i) => (i === index ? { ...block, ...patch } : block)) }); }
  function updateStep(index: number, patch: Partial<CmsStep>) { updatePage({ ...page, steps: page.steps.map((step, i) => (i === index ? { ...step, ...patch } : step)) }); }

  function addBlock(template: WidgetTemplate) { const block = makeBlock(template); const blocks = [...page.blocks, block]; updatePage({ ...page, blocks }); setSelected({ kind: "pageBlock", index: blocks.length - 1 }); }
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
      setContent(data.content); setRefreshKey(Date.now()); setMessage("Saved. The live-site canvas has refreshed with the published design.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Could not save website content."); } finally { setSaving(false); }
  }

  function renderInspector() {
    if (!content) return null;
    if (selected.kind === "homeSlide") {
      const slide = content.heroSlides[selected.index];
      if (!slide) return null;
      const patch = (p: Partial<typeof slide>) => updateContent({ ...content, heroSlides: content.heroSlides.map((s, i) => i === selected.index ? { ...s, ...p } : s) });
      return <div className="space-y-3"><Field label="Eyebrow" value={slide.eyebrow} onChange={(v) => patch({ eyebrow: v })} /><Field label="Main heading" value={slide.heading} onChange={(v) => patch({ heading: v })} /><Field label="Highlighted heading" value={slide.accent} onChange={(v) => patch({ accent: v })} /><Field label="Body text" textarea value={slide.body} onChange={(v) => patch({ body: v })} /><Field label="Primary button text" value={slide.cta1Label} onChange={(v) => patch({ cta1Label: v })} /><Field label="Primary button link" value={slide.cta1Href} onChange={(v) => patch({ cta1Href: v })} /><Field label="Secondary button text" value={slide.cta2Label} onChange={(v) => patch({ cta2Label: v })} /><Field label="Secondary button link" value={slide.cta2Href} onChange={(v) => patch({ cta2Href: v })} /><Field label="Background image URL" value={slide.backgroundImageUrl} onChange={(v) => patch({ backgroundImageUrl: v })} /><ImageUploadButton onUploaded={(url) => patch({ backgroundImageUrl: url })} /></div>;
    }
    if (selected.kind === "pageHero") return <div className="space-y-3"><Field label="Eyebrow" value={page.eyebrow} onChange={(v) => updatePagePatch({ eyebrow: v })} /><Field label="Main heading" value={page.heading} onChange={(v) => updatePagePatch({ heading: v })} /><Field label="Highlighted heading" value={page.accent} onChange={(v) => updatePagePatch({ accent: v })} /><Field label="Body text" textarea value={page.body} onChange={(v) => updatePagePatch({ body: v })} /><Field label="Primary button text" value={page.primaryLabel} onChange={(v) => updatePagePatch({ primaryLabel: v })} /><Field label="Primary button link" value={page.primaryHref} onChange={(v) => updatePagePatch({ primaryHref: v })} /><Field label="Secondary button text" value={page.secondaryLabel} onChange={(v) => updatePagePatch({ secondaryLabel: v })} /><Field label="Secondary button link" value={page.secondaryHref} onChange={(v) => updatePagePatch({ secondaryHref: v })} /><Field label="Hero background URL" value={page.backgroundImageUrl} onChange={(v) => updatePagePatch({ backgroundImageUrl: v })} /><ImageUploadButton onUploaded={(url) => updatePagePatch({ backgroundImageUrl: url })} /><hr/><Field label="Section eyebrow" value={page.sectionEyebrow} onChange={(v) => updatePagePatch({ sectionEyebrow: v })} /><Field label="Section heading" value={page.sectionHeading} onChange={(v) => updatePagePatch({ sectionHeading: v })} /><Field label="Section body" textarea value={page.sectionBody} onChange={(v) => updatePagePatch({ sectionBody: v })} /></div>;
    if (selected.kind === "pageBlock") { const block = page.blocks[selected.index]; if (!block) return null; return <div className="space-y-3"><Field label="Icon / label" value={block.icon} onChange={(v) => updateBlock(selected.index, { icon: v })} /><Field label="Title" value={block.title} onChange={(v) => updateBlock(selected.index, { title: v })} /><Field label="Subtitle" value={block.subtitle} onChange={(v) => updateBlock(selected.index, { subtitle: v })} /><Field label="Body text" textarea value={block.body} onChange={(v) => updateBlock(selected.index, { body: v })} /><Field label="Image URL" value={block.imageUrl} onChange={(v) => updateBlock(selected.index, { imageUrl: v })} /><ImageUploadButton onUploaded={(url) => updateBlock(selected.index, { imageUrl: url })} /><Field label="Link text" value={block.linkLabel} onChange={(v) => updateBlock(selected.index, { linkLabel: v })} /><Field label="Link URL" value={block.linkHref} onChange={(v) => updateBlock(selected.index, { linkHref: v })} /><SelectField label="Width" value={block.width} onChange={(v) => updateBlock(selected.index, { width: v })} options={["quarter", "third", "half", "full"]} /><SelectField label="Background" value={block.background} onChange={(v) => updateBlock(selected.index, { background: v })} options={["white", "soft", "accent", "dark"]} /><SelectField label="Alignment" value={block.align} onChange={(v) => updateBlock(selected.index, { align: v })} options={["left", "center", "right"]} /></div>; }
    if (selected.kind === "pageStep") { const step = page.steps[selected.index]; if (!step) return null; return <div className="space-y-3"><Field label="Step number" value={step.number} onChange={(v) => updateStep(selected.index, { number: v })} /><Field label="Step title" value={step.title} onChange={(v) => updateStep(selected.index, { title: v })} /><Field label="Step body" textarea value={step.body} onChange={(v) => updateStep(selected.index, { body: v })} /><Field label="Image URL" value={step.imageUrl} onChange={(v) => updateStep(selected.index, { imageUrl: v })} /><ImageUploadButton onUploaded={(url) => updateStep(selected.index, { imageUrl: url })} /></div>; }
    if (selected.kind === "pageCta") return <div className="space-y-3"><Field label="CTA heading" value={page.ctaHeading} onChange={(v) => updatePagePatch({ ctaHeading: v })} /><Field label="CTA body" textarea value={page.ctaBody} onChange={(v) => updatePagePatch({ ctaBody: v })} /><Field label="Primary CTA text" value={page.ctaPrimaryLabel} onChange={(v) => updatePagePatch({ ctaPrimaryLabel: v })} /><Field label="Primary CTA link" value={page.ctaPrimaryHref} onChange={(v) => updatePagePatch({ ctaPrimaryHref: v })} /><Field label="Secondary CTA text" value={page.ctaSecondaryLabel} onChange={(v) => updatePagePatch({ ctaSecondaryLabel: v })} /><Field label="Secondary CTA link" value={page.ctaSecondaryHref} onChange={(v) => updatePagePatch({ ctaSecondaryHref: v })} /></div>;
    if (selected.kind === "trust") return <div className="space-y-3"><Field label="Trust eyebrow" value={content.trust.eyebrow} onChange={(v) => updateContent({ ...content, trust: { ...content.trust, eyebrow: v } })} /><Field label="Trust heading" value={content.trust.heading} onChange={(v) => updateContent({ ...content, trust: { ...content.trust, heading: v } })} /><Field label="Highlighted heading" value={content.trust.accent} onChange={(v) => updateContent({ ...content, trust: { ...content.trust, accent: v } })} /><Field label="Client names" textarea value={content.trust.clients.join("\n")} onChange={(v) => updateContent({ ...content, trust: { ...content.trust, clients: v.split(/\n/).map((x) => x.trim()).filter(Boolean) } })} /></div>;
    if (selected.kind === "finalCta") return <div className="space-y-3"><Field label="Eyebrow" value={content.finalCta.eyebrow} onChange={(v) => updateContent({ ...content, finalCta: { ...content.finalCta, eyebrow: v } })} /><Field label="Heading" value={content.finalCta.heading} onChange={(v) => updateContent({ ...content, finalCta: { ...content.finalCta, heading: v } })} /><Field label="Body" textarea value={content.finalCta.body} onChange={(v) => updateContent({ ...content, finalCta: { ...content.finalCta, body: v } })} /></div>;
    return <div className="space-y-3"><Field label="Footer description" textarea value={content.footer.description} onChange={(v) => updateContent({ ...content, footer: { ...content.footer, description: v } })} /><Field label="Orders / Quotes email" value={content.contact.salesEmail} onChange={(v) => updateContent({ ...content, contact: { ...content.contact, salesEmail: v } })} /><Field label="General / Media email" value={content.contact.infoEmail} onChange={(v) => updateContent({ ...content, contact: { ...content.contact, infoEmail: v } })} /><Field label="Phone" value={content.contact.phone} onChange={(v) => updateContent({ ...content, contact: { ...content.contact, phone: v } })} /><Field label="Location" value={content.contact.location} onChange={(v) => updateContent({ ...content, contact: { ...content.contact, location: v } })} /></div>;
  }

  if (!content) return <div className="p-8 text-sm text-gray-600">Loading live visual CMS…</div>;

  return <div className="fixed inset-0 z-40 flex bg-gray-100 text-navy-950">
    <aside className="flex w-[300px] shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-4"><p className="font-mono text-[10px] uppercase tracking-widest text-accent">Combay CMS</p><h1 className="font-display text-xl font-900">Live Visual CMS</h1><p className="mt-1 text-xs text-gray-500">The canvas is now the actual live page. Editable areas are controlled from the safe CMS controls so there are no missing/extra visual sections.</p></div>
      <div className="border-b border-gray-200 p-3"><p className="mb-2 text-[10px] font-display font-800 uppercase tracking-wide text-gray-500">Pages</p><div className="grid gap-1">{PAGES.map((item) => <button key={item.key} type="button" onClick={() => { setPageKey(item.key); setSelected({ kind: item.key === "home" ? "homeSlide" : "pageHero", index: 0 } as EditTarget); setRefreshKey(Date.now()); }} className={`rounded px-3 py-2 text-left text-sm font-display font-800 ${pageKey === item.key ? "bg-navy-950 text-white" : "bg-gray-50 text-navy-900 hover:bg-gray-100"}`}>{item.label}</button>)}</div><p className="mt-2 text-[11px] text-gray-500">{pageNote(pageKey)}</p></div>
      <div className="flex-1 overflow-auto p-3"><p className="mb-2 text-[10px] font-display font-800 uppercase tracking-wide text-gray-500">Editable areas</p><div className="space-y-1">{editableItems.map((item, index) => <button key={`${item.label}-${index}`} type="button" onClick={() => setSelected(item.target)} className={`w-full rounded px-3 py-2 text-left text-xs font-display font-800 ${JSON.stringify(selected) === JSON.stringify(item.target) ? "bg-accent text-navy-950" : "bg-gray-50 text-navy-900 hover:bg-gray-100"}`}>{item.label}</button>)}</div><p className="mb-2 mt-5 text-[10px] font-display font-800 uppercase tracking-wide text-gray-500">Add block to this page</p><div className="grid grid-cols-2 gap-2">{WIDGETS.map((w) => <button key={w.label} type="button" onClick={() => addBlock(w)} className="rounded-lg border border-gray-200 bg-white p-3 text-left shadow-sm hover:border-accent hover:bg-accent/10"><span className="block text-xl">{w.icon}</span><span className="mt-1 block text-xs font-display font-900 text-navy-950">{w.label}</span></button>)}</div></div>
    </aside>
    <main className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3"><div><span className="rounded bg-navy-950 px-3 py-1 text-xs font-display font-900 text-white">{DEVICE_CANVAS[deviceMode].label}</span><span className="ml-3 text-xs text-gray-500">Live-site canvas · same components, colours, spacing and sections as the public website.</span></div><div className="flex items-center gap-2"><select className="input h-9 w-32 text-xs" value={deviceMode} onChange={(e) => { const next = e.target.value as DeviceMode; setDeviceMode(next); setZoom(next === "desktop" ? 0.78 : next === "tablet" ? 0.9 : 1); }}><option value="desktop">PC desktop</option><option value="tablet">Tablet</option><option value="mobile">Mobile</option></select><select className="input h-9 w-28 text-xs" value={zoom} onChange={(e) => setZoom(Number(e.target.value))}><option value={0.65}>65%</option><option value={0.78}>78%</option><option value={0.9}>90%</option><option value={1}>100%</option></select><Link href={publicPath} target="_blank" className="btn-outline text-xs">Open live page</Link><button type="button" onClick={save} disabled={saving} className="btn-primary text-xs">{saving ? "Saving…" : "Save website"}</button></div></div>
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_360px]">
        <section className="overflow-auto bg-slate-200 p-6"><div className="mx-auto rounded-t-2xl border border-slate-400 bg-slate-800 p-3 shadow-2xl" style={{ width: DEVICE_CANVAS[deviceMode].width * zoom + 28 }}><div className="mb-2 flex items-center gap-2 px-2"><span className="h-3 w-3 rounded-full bg-red-400"/><span className="h-3 w-3 rounded-full bg-yellow-400"/><span className="h-3 w-3 rounded-full bg-green-400"/><div className="ml-3 flex-1 rounded bg-white/10 px-3 py-1 text-center text-[10px] text-white/70">{DEVICE_CANVAS[deviceMode].label} · {DEVICE_CANVAS[deviceMode].width}px · exact live page</div></div><div className="origin-top-left overflow-hidden rounded-lg bg-white" style={{ width: DEVICE_CANVAS[deviceMode].width, height: Math.round(1200 / zoom), transform: `scale(${zoom})`, transformOrigin: "top left" }}><iframe key={iframeSrc} src={iframeSrc} title="Live website CMS canvas" className="h-full w-full border-0" /></div></div></section>
        <aside className="min-h-0 overflow-auto border-l border-gray-200 bg-white p-4"><div className="mb-3"><p className="font-mono text-[10px] uppercase tracking-widest text-accent">Editing</p><h2 className="font-display text-lg font-900">Selected content</h2><p className="mt-1 text-xs text-gray-500">The preview remains exact. Changes appear after Save refreshes the live-site canvas.</p></div><div className="mb-4 flex flex-wrap gap-2"><ActionButton onClick={() => moveSelected("up")}>Move up</ActionButton><ActionButton onClick={() => moveSelected("down")}>Move down</ActionButton><ActionButton onClick={duplicateSelected}>Duplicate</ActionButton><ActionButton onClick={deleteSelected}>Delete</ActionButton></div>{renderInspector()}{message ? <div className="mt-4 rounded border border-accent/30 bg-accent/10 p-3 text-xs text-navy-900">{message}</div> : null}<div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600"><strong className="text-navy-950">Parity rule</strong><p className="mt-1">The canvas no longer recreates the site with separate fake styling. It loads the same live public page. Dynamic/ecommerce pages that are intentionally uneditable should be managed in their own admin modules.</p></div></aside>
      </div>
    </main>
  </div>;
}
