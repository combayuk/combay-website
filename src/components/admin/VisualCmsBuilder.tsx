"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SiteContent, SiteHeroSlide, CmsPage, CmsBlock } from "@/lib/siteContent";

type PageKey = "home" | "repair" | "assetRecovery" | "about" | "contact" | "faq" | "shop" | "cart" | "checkout" | "portal" | "manufacturers" | "terms" | "privacy" | "returns" | "warranty" | "payment";
type DeviceMode = "desktop" | "tablet" | "mobile";
type LeftTab = "pages" | "widgets" | "style";

type PageConfig = { key: PageKey; label: string; path: string; editable: boolean; note?: string };
type WidgetTemplate = { label: string; icon: string; blockType: string; title: string; subtitle: string; body: string; background: string; width: string };

const PAGES: PageConfig[] = [
  { key: "home", label: "Home", path: "/", editable: true },
  { key: "repair", label: "Repair", path: "/repair", editable: true },
  { key: "assetRecovery", label: "Asset Recovery", path: "/asset-recovery", editable: true },
  { key: "about", label: "About", path: "/about", editable: true },
  { key: "contact", label: "Contact", path: "/contact", editable: true },
  { key: "faq", label: "FAQs", path: "/faq", editable: true },
  { key: "shop", label: "Shop", path: "/shop", editable: false, note: "Product data is managed in Products/Promotions." },
  { key: "cart", label: "Cart", path: "/cart", editable: false, note: "Cart logic is protected." },
  { key: "checkout", label: "Checkout", path: "/checkout", editable: false, note: "Checkout/payment logic is protected." },
  { key: "portal", label: "Customer Portal", path: "/portal/login", editable: false, note: "Portal/auth logic is protected." },
  { key: "manufacturers", label: "Manufacturers", path: "/manufacturers", editable: false, note: "Manufacturer/catalogue data is managed elsewhere." },
  { key: "terms", label: "Terms", path: "/terms", editable: false },
  { key: "privacy", label: "Privacy", path: "/privacy-policy", editable: false },
  { key: "returns", label: "Returns Policy", path: "/returns-policy", editable: false },
  { key: "warranty", label: "Warranty", path: "/warranty", editable: false },
  { key: "payment", label: "Payment Policy", path: "/payment-policy", editable: false },
];

const DEVICE_WIDTH: Record<DeviceMode, number> = { desktop: 1180, tablet: 820, mobile: 390 };

const WIDGETS: WidgetTemplate[] = [
  { label: "Text", icon: "T", blockType: "text", title: "New text block", subtitle: "Editable heading", body: "Click text on the canvas to edit it.", background: "white", width: "half" },
  { label: "Image", icon: "🖼", blockType: "image", title: "Image block", subtitle: "Upload or paste image", body: "Use Replace background or widget image upload.", background: "white", width: "half" },
  { label: "Video", icon: "▶", blockType: "video", title: "Video block", subtitle: "Video area", body: "Add a video URL from the styling tab.", background: "dark", width: "half" },
  { label: "Icon feature", icon: "⚙️", blockType: "icon", title: "Feature", subtitle: "Short benefit", body: "Describe the feature or service.", background: "white", width: "quarter" },
  { label: "Shape", icon: "■", blockType: "shape", title: "Visual shape", subtitle: "Design element", body: "Use as a divider or visual spacer.", background: "soft", width: "quarter" },
  { label: "Animation", icon: "✨", blockType: "animation", title: "Animated highlight", subtitle: "Subtle motion", body: "Use for small highlight sections.", background: "soft", width: "quarter" },
  { label: "Slider item", icon: "▣", blockType: "slider", title: "Slider item", subtitle: "Carousel slide", body: "Add an editable slide/panel.", background: "soft", width: "half" },
  { label: "Promotion banner", icon: "🏷", blockType: "promotion", title: "Promotion banner", subtitle: "Offer / campaign", body: "Highlight an offer, stock arrival or customer campaign.", background: "accent", width: "full" },
  { label: "Spacer", icon: "↕", blockType: "spacer", title: "Spacer", subtitle: "Spacing block", body: "Use to add breathing room.", background: "soft", width: "full" },
];

const GRADIENTS = [
  { label: "Combay navy", value: "linear-gradient(135deg,#030E21 0%,#0B2545 55%,#162D4F 100%)" },
  { label: "Navy / amber", value: "linear-gradient(135deg,#030E21 0%,#1B2638 60%,#EEB32C 100%)" },
  { label: "Industrial steel", value: "linear-gradient(135deg,#111827 0%,#334155 52%,#64748B 100%)" },
  { label: "Dark green", value: "linear-gradient(135deg,#03140E 0%,#0F2A1E 55%,#17452F 100%)" },
  { label: "Clean light", value: "linear-gradient(135deg,#FFFFFF 0%,#F8FAFC 55%,#E2E8F0 100%)" },
];

const COLOURS = ["#030E21", "#0B2545", "#EEB32C", "#FFFFFF", "#F8FAFC", "#111827", "#334155"];

function pageConfig(key: PageKey) { return PAGES.find((p) => p.key === key) || PAGES[0]; }
function previewUrl(path: string, refreshKey: number) { return `${path}${path.includes("?") ? "&" : "?"}vcms=1&v=${refreshKey}`; }
function cloneContent(content: SiteContent): SiteContent { return JSON.parse(JSON.stringify(content)); }
function blockFromWidget(widget: WidgetTemplate): CmsBlock { return { icon: widget.icon, title: widget.title, subtitle: widget.subtitle, body: widget.body, imageUrl: "", linkLabel: "", linkHref: "#", blockType: widget.blockType, width: widget.width, align: "left", background: widget.background, animation: "none" }; }

function updateFirstStringMatch(target: unknown, oldText: string, newText: string): boolean {
  if (!target || typeof target !== "object") return false;
  for (const key of Object.keys(target as Record<string, unknown>)) {
    const value = (target as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim() === oldText.trim()) {
      (target as Record<string, unknown>)[key] = newText;
      return true;
    }
    if (Array.isArray(value)) {
      for (const item of value) if (updateFirstStringMatch(item, oldText, newText)) return true;
    } else if (value && typeof value === "object") {
      if (updateFirstStringMatch(value, oldText, newText)) return true;
    }
  }
  return false;
}

function ImageUploadButton({ onUploaded }: { onUploaded: (url: string) => void }) {
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
  return <label className="inline-flex cursor-pointer items-center justify-center rounded bg-navy-950 px-3 py-2 text-xs font-display font-900 text-white hover:bg-accent hover:text-navy-950">{uploading ? "Uploading…" : "Upload image"}<input className="hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={uploading} onChange={(e) => upload(e.target.files?.[0] || null)} /></label>;
}

export default function VisualCmsBuilder() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [pageKey, setPageKey] = useState<PageKey>("home");
  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [zoom, setZoom] = useState(0.78);
  const [leftTab, setLeftTab] = useState<LeftTab>("widgets");
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [selectedText, setSelectedText] = useState("");
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const config = pageConfig(pageKey);
  const canvasWidth = DEVICE_WIDTH[device];
  const scale = zoom;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/content", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => { if (!cancelled && data?.content) setContent(data.content); })
      .catch(() => setMessage("Could not load CMS content."));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data || {};
      if (data.type === "VCMS_TEXT_SELECTED") setSelectedText(String(data.text || ""));
      if (data.type === "VCMS_TEXT_UPDATE" && content && data.oldText && data.newText && String(data.oldText).trim() !== String(data.newText).trim()) {
        const next = cloneContent(content);
        const changed = updateFirstStringMatch(next, String(data.oldText), String(data.newText));
        if (changed) {
          setContent(next);
          setMessage("Text changed on canvas. Click Save website to publish.");
        } else {
          setMessage("This visible text is not linked to CMS storage yet, so it is shown exactly but locked from publishing.");
        }
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [content]);

  const selectedEditableCmsPage = useMemo(() => pageKey === "repair" || pageKey === "assetRecovery" || pageKey === "about" || pageKey === "contact" || pageKey === "home", [pageKey]);

  function mutateContent(mutator: (draft: SiteContent) => void) {
    if (!content) return;
    const draft = cloneContent(content);
    mutator(draft);
    setContent(draft);
  }

  function addWidget(widget: WidgetTemplate) {
    if (!content) return;
    if (pageKey === "home") {
      mutateContent((draft) => { draft.pages.home.blocks = [...draft.pages.home.blocks, blockFromWidget(widget)]; });
      setMessage("Widget added to homepage service/content blocks. Save and refresh to see it on the live canvas.");
      return;
    }
    if (!selectedEditableCmsPage) {
      setMessage("This page is visible for accuracy but its dynamic sections are intentionally protected from widget editing.");
      return;
    }
    mutateContent((draft) => {
      const pageMap = { repair: "repair", assetRecovery: "assetRecovery", about: "about", contact: "contact" } as const;
      const key = pageMap[pageKey as keyof typeof pageMap];
      if (key) draft.pages[key].blocks = [...draft.pages[key].blocks, blockFromWidget(widget)];
    });
    setMessage("Widget added. Save and refresh to see it on the live canvas.");
  }

  function setHeroBackground(value: string) {
    if (!content) return;
    mutateContent((draft) => {
      if (pageKey === "home") draft.heroSlides[0].backgroundImageUrl = value;
      if (pageKey === "faq") draft.faq.backgroundImageUrl = value;
      if (pageKey === "repair") draft.pages.repair.backgroundImageUrl = value;
      if (pageKey === "assetRecovery") draft.pages.assetRecovery.backgroundImageUrl = value;
      if (pageKey === "about") draft.pages.about.backgroundImageUrl = value;
      if (pageKey === "contact") draft.pages.contact.backgroundImageUrl = value;
    });
    setMessage("Background changed in CMS draft. Save website to publish.");
  }

  async function save() {
    if (!content) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.error || "Save failed");
      setContent(data.content);
      setRefreshKey(Date.now());
      setMessage("Saved. Live canvas refreshed.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function injectEditor() {
    const iframe = iframeRef.current;
    if (!iframe || !config.editable) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    const style = doc.createElement("style");
    style.textContent = `
      [data-vcms-text="1"]{outline:1px dashed transparent; cursor:text;}
      [data-vcms-text="1"]:hover{outline-color:#EEB32C; outline-offset:3px;}
      [data-vcms-text="1"]:focus{outline:2px solid #EEB32C!important; outline-offset:3px; box-shadow:0 0 0 3px rgba(238,179,44,.18);}
      [data-vcms-protected="1"]{position:relative; cursor:not-allowed!important;}
      [data-vcms-protected="1"]:hover:after{content:"🚫 protected system area"; position:absolute; z-index:999999; top:8px; right:8px; background:#111827; color:#fff; border-radius:999px; padding:6px 10px; font:700 11px Arial; pointer-events:none;}
    `;
    doc.head.appendChild(style);
    const textSelector = "main h1,main h2,main h3,main h4,main p,main li,main label,main a,main button,footer p,footer a,footer span,footer h4";
    doc.querySelectorAll<HTMLElement>(textSelector).forEach((el) => {
      if (!el.textContent?.trim()) return;
      if (el.closest("script,style,svg")) return;
      el.dataset.vcmsText = "1";
      const initial = el.textContent.trim();
      el.setAttribute("contenteditable", "true");
      el.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        window.postMessage({ type: "VCMS_TEXT_SELECTED", text: el.textContent?.trim() || "" }, window.location.origin);
      });
      el.addEventListener("focus", () => window.postMessage({ type: "VCMS_TEXT_SELECTED", text: el.textContent?.trim() || "" }, window.location.origin));
      el.addEventListener("blur", () => {
        const next = el.textContent?.trim() || "";
        if (next && next !== initial) window.postMessage({ type: "VCMS_TEXT_UPDATE", oldText: initial, newText: next }, window.location.origin);
      });
    });
    doc.querySelectorAll<HTMLElement>("[data-system-protected], [data-admin-only], .stripe, .checkout, [href*='/checkout'], [href*='/cart']").forEach((el) => { el.dataset.vcmsProtected = "1"; });
  }

  if (!content) return <div className="p-8 text-sm text-slate-600">Loading Visual CMS…</div>;

  return <div className="fixed inset-0 z-40 flex bg-slate-200 text-navy-950">
    <aside className="flex w-[330px] shrink-0 flex-col border-r border-slate-200 bg-white shadow-xl">
      <div className="border-b border-slate-200 p-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Combay Visual CMS</p>
        <h1 className="font-display text-xl font-900">Live Website Editor</h1>
        <p className="mt-1 text-xs leading-5 text-slate-500">The screen on the right is the actual live website page. Edit text directly on the page. Protected ecommerce logic shows a no-entry marker.</p>
      </div>
      <div className="grid grid-cols-3 gap-1 border-b border-slate-200 p-2">
        {(["pages", "widgets", "style"] as LeftTab[]).map((tab) => <button key={tab} type="button" onClick={() => setLeftTab(tab)} className={`rounded py-2 text-xs font-display font-900 capitalize ${leftTab === tab ? "bg-navy-950 text-white" : "bg-slate-50 text-navy-950"}`}>{tab}</button>)}
      </div>
      <div className="flex-1 overflow-auto p-3">
        {leftTab === "pages" ? <div className="space-y-2">{PAGES.map((page) => <button key={page.key} type="button" onClick={() => { setPageKey(page.key); setRefreshKey(Date.now()); }} className={`w-full rounded px-3 py-2 text-left text-sm font-display font-800 ${pageKey === page.key ? "bg-navy-950 text-white" : "bg-gray-50 text-navy-900 hover:bg-gray-100"}`}><span>{page.label}</span>{!page.editable ? <span className="ml-2 text-xs">🚫</span> : null}<span className="block text-[10px] font-normal opacity-70">{page.editable ? "Editable page" : page.note || "Visible but protected"}</span></button>)}</div> : null}
        {leftTab === "widgets" ? <div className="space-y-3"><p className="text-xs text-slate-500">Add widgets to editable CMS sections. Save and refresh to publish them into the live page.</p><div className="grid grid-cols-2 gap-2">{WIDGETS.map((widget) => <button key={widget.label} type="button" draggable onDragStart={(e) => e.dataTransfer.setData("widget", widget.label)} onClick={() => addWidget(widget)} className="rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-accent hover:bg-accent/5"><span className="text-xl">{widget.icon}</span><span className="mt-2 block text-xs font-display font-900 text-navy-950">{widget.label}</span></button>)}</div></div> : null}
        {leftTab === "style" ? <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-display font-900 text-navy-950">Selected text</p><p className="mt-1 break-words text-xs text-slate-600">{selectedText || "Click text on the website screen."}</p></div>
          <div className="rounded-xl border border-slate-200 p-3"><div className="mb-3 flex items-center justify-between gap-2"><p className="text-xs font-display font-900 text-navy-950">Replace background</p><span className="rounded-full bg-accent/20 px-2 py-1 text-[10px] font-800 text-navy-950">Hero</span></div><p className="mb-3 text-[11px] leading-5 text-slate-500">Replace the current page hero background with an uploaded image, pasted image URL, flat colour or colour gradient.</p><div className="flex gap-2"><input className="input h-9 flex-1 text-xs" placeholder="Paste image URL" value={backgroundUrl} onChange={(e) => setBackgroundUrl(e.target.value)} /><button type="button" className="rounded bg-navy-950 px-3 py-2 text-xs font-display font-900 text-white" onClick={() => setHeroBackground(backgroundUrl)}>Use</button></div><div className="mt-3"><ImageUploadButton onUploaded={(url) => { setBackgroundUrl(url); setHeroBackground(url); }} /></div><p className="mt-4 text-[10px] font-display font-900 uppercase tracking-wide text-slate-500">Colours</p><div className="mt-2 flex flex-wrap gap-2">{COLOURS.map((colour) => <button key={colour} type="button" title={colour} onClick={() => setHeroBackground(colour)} className="h-8 w-8 rounded-full border border-slate-300" style={{ background: colour }} />)}</div><p className="mt-4 text-[10px] font-display font-900 uppercase tracking-wide text-slate-500">Gradients</p><div className="mt-2 space-y-2">{GRADIENTS.map((g) => <button key={g.label} type="button" onClick={() => setHeroBackground(g.value)} className="h-10 w-full rounded border border-slate-200 px-3 text-left text-xs font-display font-800 text-white" style={{ backgroundImage: g.value }}>{g.label}</button>)}</div></div>
        </div> : null}
      </div>
      <div className="border-t border-slate-200 p-3"><button type="button" onClick={save} disabled={saving} className="w-full rounded bg-accent px-4 py-3 text-sm font-display font-900 text-navy-950 hover:bg-accent-dark disabled:opacity-60">{saving ? "Saving…" : "Save website"}</button>{message ? <p className="mt-2 text-xs text-slate-600">{message}</p> : null}</div>
    </aside>
    <main className="flex min-w-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-white px-4 py-3">
        <div><p className="text-xs text-slate-500">Editing</p><h2 className="font-display text-lg font-900 text-navy-950">{config.label} {config.editable ? "" : "— protected"}</h2></div>
        <div className="flex flex-wrap items-center gap-2"><select className="input h-9 w-36 text-xs" value={device} onChange={(e) => setDevice(e.target.value as DeviceMode)}><option value="desktop">PC desktop</option><option value="tablet">Tablet</option><option value="mobile">Mobile</option></select><select className="input h-9 w-28 text-xs" value={String(zoom)} onChange={(e) => setZoom(Number(e.target.value))}><option value="0.65">65%</option><option value="0.78">78%</option><option value="0.9">90%</option><option value="1">100%</option></select><a href={config.path} target="_blank" rel="noreferrer" className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-display font-900 text-navy-950 hover:border-accent">Open live page</a></div>
      </div>
      <div className="flex-1 overflow-auto bg-slate-300 p-6">
        <div className="mx-auto origin-top rounded-xl bg-white shadow-2xl ring-1 ring-slate-400/40" style={{ width: canvasWidth, minHeight: 760, transform: `scale(${scale})`, transformOrigin: "top center", marginBottom: -(760 * (1 - scale)) }}>
          <div className="relative h-[760px] overflow-hidden rounded-xl bg-white">
            {!config.editable ? <div className="pointer-events-none absolute right-4 top-4 z-20 rounded-full bg-navy-950 px-3 py-2 text-xs font-display font-900 text-white shadow-lg">🚫 Visible only — managed elsewhere</div> : null}
            <iframe ref={iframeRef} key={`${pageKey}-${refreshKey}-${device}`} src={previewUrl(config.path, refreshKey)} title={`${config.label} visual CMS`} className="h-full w-full border-0 bg-white" onLoad={injectEditor} />
          </div>
        </div>
      </div>
    </main>
  </div>;
}
