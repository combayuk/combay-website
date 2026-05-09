"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CmsBlock, CmsStep, CmsTextStyle, FaqItem, SiteContent, VisualWidget } from "@/lib/siteContent";

type PageKey = "home" | "repair" | "assetRecovery" | "about" | "contact" | "faq" | "shop" | "cart" | "checkout" | "portal" | "manufacturers" | "terms" | "privacy" | "returns" | "warranty" | "payment";
type DeviceMode = "desktop" | "tablet" | "mobile";
type LeftTab = "pages" | "widgets" | "style";
type PageConfig = { key: PageKey; label: string; path: string; editable: boolean; note?: string };
type CollectionKey = "page.blocks" | "page.steps" | "faq.previewItems" | "home.promotionStrip" | "trust.clients" | `faq.groupItems:${string}`;
type WidgetKind = "section" | "card" | "button" | "text" | "image" | "video" | "promotion" | "spacer" | "divider" | "faq";
type WidgetTemplate = { label: string; icon: string; blockType: WidgetKind; title: string; subtitle?: string; body?: string; width?: string; columns?: number; textKind?: VisualWidget["textKind"]; linkLabel?: string; linkHref?: string };
type DropTarget = { kind: "zone"; zone: string; index?: number } | { kind: "collection"; collection: CollectionKey; index?: number };
type DropPreview = { target: DropTarget; label: string; y: number; mode: "before" | "inside" | "after" };
type SelectedLink = { text: string; href: string };
type SelectedWidget = { zone: string; index: number; widget: VisualWidget };

const HIDDEN = "__HIDDEN__";
const PAGES: PageConfig[] = [
  { key: "home", label: "Home", path: "/", editable: true },
  { key: "repair", label: "Repair", path: "/repair", editable: true },
  { key: "assetRecovery", label: "Asset Recovery", path: "/asset-recovery", editable: true },
  { key: "about", label: "About", path: "/about", editable: true },
  { key: "contact", label: "Contact", path: "/contact", editable: true },
  { key: "faq", label: "FAQs", path: "/faq", editable: true },
  { key: "terms", label: "Terms", path: "/terms", editable: true },
  { key: "privacy", label: "Privacy", path: "/privacy-policy", editable: true },
  { key: "returns", label: "Returns Policy", path: "/returns-policy", editable: true },
  { key: "warranty", label: "Warranty", path: "/warranty", editable: true },
  { key: "payment", label: "Payment Policy", path: "/payment-policy", editable: true },
  { key: "shop", label: "Shop", path: "/shop", editable: false, note: "Product data is managed in Products/Promotions." },
  { key: "cart", label: "Cart", path: "/cart", editable: false, note: "Cart logic is protected." },
  { key: "checkout", label: "Checkout", path: "/checkout", editable: false, note: "Checkout/payment logic is protected." },
  { key: "portal", label: "Customer Portal", path: "/portal/login", editable: false, note: "Portal/auth logic is protected." },
  { key: "manufacturers", label: "Manufacturers", path: "/manufacturers", editable: false, note: "Manufacturer/catalogue data is managed elsewhere." },
];
const DEVICE_WIDTH: Record<DeviceMode, number> = { desktop: 1180, tablet: 820, mobile: 390 };
const HOME_SECTIONS = [
  ["hero", "Hero carousel"],
  ["promotionStrip", "Promotion banner strip"],
  ["industryStrip", "Industry/category strip"],
  ["serviceCards", "What We Do cards"],
  ["trust", "Why Businesses Use Combay"],
  ["faqPreview", "FAQ preview"],
  ["finalCta", "Final CTA"],
] as const;
const PAGE_SECTIONS = [
  ["hero", "Hero section"],
  ["contactBar", "Contact cards"],
  ["content", "Content/cards section"],
  ["process", "Process/steps section"],
  ["formOrCta", "Form or CTA section"],
] as const;

const WIDGETS: WidgetTemplate[] = [
  { label: "1-column section", icon: "+", blockType: "section", title: "New section", body: "Add text, images, buttons or cards into this section.", width: "full", columns: 1 },
  { label: "2-column section", icon: "▦", blockType: "section", title: "Two-column section", body: "Use this for image next to text, CTA copy, or feature layouts.", width: "full", columns: 2 },
  { label: "Card", icon: "▣", blockType: "card", title: "New card", subtitle: "Editable card", body: "Use this card for a service, benefit, process item or content block.", width: "third", linkLabel: "Learn more", linkHref: "/contact" },
  { label: "Button", icon: "⬚", blockType: "button", title: "Button", body: "", width: "quarter", linkHref: "/contact" },
  { label: "Heading", icon: "H", blockType: "text", title: "New heading", body: "", width: "full", textKind: "heading" },
  { label: "Text", icon: "T", blockType: "text", title: "New paragraph text", body: "", width: "half", textKind: "paragraph" },
  { label: "Image", icon: "🖼", blockType: "image", title: "Image", body: "", width: "half" },
  { label: "Video", icon: "▶", blockType: "video", title: "Video block", body: "Add a video URL, thumbnail and caption from the Style panel.", width: "half" },
  { label: "Promotion banner", icon: "🏷", blockType: "promotion", title: "Promotion banner", body: "Highlight an offer, stock arrival or customer campaign.", width: "full", linkLabel: "View offer", linkHref: "/shop" },
  { label: "Spacer", icon: "↕", blockType: "spacer", title: "Spacer", width: "full" },
  { label: "Divider", icon: "─", blockType: "divider", title: "Divider", width: "full" },
  { label: "FAQ", icon: "?", blockType: "faq", title: "New FAQ question", body: "Add the answer here.", width: "full" },
];
const GRADIENTS = [
  { label: "Combay navy", value: "linear-gradient(135deg,#203A5E 0%,#2D4F7A 58%,#355F8E 100%)" },
  { label: "Navy / amber", value: "linear-gradient(135deg,#203A5E 0%,#2D4F7A 62%,#E8A44A 100%)" },
  { label: "Amber wash", value: "linear-gradient(135deg,#2D4F7A 0%,#446F9E 58%,#E8A44A 100%)" },
  { label: "Clean light", value: "linear-gradient(135deg,#FFFFFF 0%,#F8FAFC 58%,#F6E3BE 100%)" },
];
const COLOURS = ["#2D4F7A", "#203A5E", "#355F8E", "#E8A44A", "#C9872F", "#FFFFFF", "#F8FAFC", "#111827"];

function pageConfig(key: PageKey) { return PAGES.find((p) => p.key === key) || PAGES[0]; }
function previewUrl(path: string, refreshKey: number) { return `${path}${path.includes("?") ? "&" : "?"}vcms=1&v=${refreshKey}`; }
function cloneContent(content: SiteContent): SiteContent { return JSON.parse(JSON.stringify(content)); }
function cmsPageKey(pageKey: PageKey): keyof SiteContent["pages"] | null { if (["home", "repair", "assetRecovery", "about", "contact"].includes(pageKey)) return pageKey as keyof SiteContent["pages"]; return null; }
function policyKey(pageKey: PageKey): keyof SiteContent["policies"] | null { if (["terms", "privacy", "returns", "warranty", "payment"].includes(pageKey)) return pageKey as keyof SiteContent["policies"]; return null; }
function widgetByType(type: string) { return WIDGETS.find((widget) => widget.blockType === type) || WIDGETS[2]; }
function uid(prefix = "vw") { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
function safeHrefInput(value: string) { const clean = value.trim(); if (!clean) return "#"; if (clean.startsWith("/") || clean.startsWith("#") || clean.startsWith("mailto:") || clean.startsWith("tel:") || clean.startsWith("http://") || clean.startsWith("https://")) return clean; return `/${clean.replace(/^\/+/, "")}`; }
function autoWidth(count: number) { if (count <= 1) return "full"; if (count === 2) return "half"; if (count === 3) return "third"; return "quarter"; }
function normaliseBlockWidths(blocks: CmsBlock[]) { const width = autoWidth(blocks.length); return blocks.map((b) => (b.blockType === "promotion" ? { ...b, width: "full" } : { ...b, width })); }
function faqFromWidget(widget?: WidgetTemplate): FaqItem { return { question: widget?.blockType === "faq" ? widget.title : "New FAQ question", answer: widget?.blockType === "faq" ? widget.body || "Add the answer here." : "Add the answer here." }; }
function stepFromWidget(widget?: WidgetTemplate, index = 0): CmsStep { return { number: String(index + 1).padStart(2, "0"), title: widget?.title || "New step", body: widget?.body || "Describe this step.", imageUrl: "" }; }
function blockFromWidget(widget: WidgetTemplate): CmsBlock { return { icon: widget.icon, title: widget.title, subtitle: widget.subtitle || "", body: widget.body || "", imageUrl: "", linkLabel: widget.linkLabel || "", linkHref: widget.linkHref || "#", blockType: widget.blockType === "faq" ? "card" : widget.blockType, width: widget.width || "third", align: "left", background: widget.blockType === "promotion" ? "accent" : "white", animation: "none" }; }
function visualWidgetFromTemplate(widget: WidgetTemplate): VisualWidget {
  const base: VisualWidget = { id: uid(), type: widget.blockType === "faq" ? "card" : widget.blockType, title: widget.title, subtitle: widget.subtitle || "", body: widget.body || "", text: widget.title, textKind: widget.textKind || (widget.blockType === "text" ? "paragraph" : "paragraph"), icon: widget.icon, url: widget.linkHref || "/contact", linkLabel: widget.linkLabel || "", buttonStyle: "primary", width: widget.width || "third", align: "left", visible: true, marginTop: 0, marginBottom: 0 };
  if (widget.blockType === "section") return { ...base, type: "section", width: "full", columns: widget.columns || 1, sectionVariant: "plain", title: widget.title, body: widget.body || "" };
  if (widget.blockType === "video") return { ...base, type: "video", caption: "Add a video URL, thumbnail and caption from the Style panel.", width: "half", muted: true };
  if (widget.blockType === "promotion") return { ...base, type: "promotion", promoCode: "", linkLabel: "View offer", url: "/shop", width: "full", copyCodeEnabled: true };
  if (widget.blockType === "spacer") return { ...base, type: "spacer", height: 48, width: "full", title: "Spacer" };
  if (widget.blockType === "divider") return { ...base, type: "divider", width: "full", title: "Divider", thickness: 1, colour: "#E5E7EB" };
  if (widget.blockType === "button") return { ...base, type: "button", text: "Button", title: "Button", url: "/contact", width: "quarter" };
  if (widget.blockType === "image") return { ...base, type: "image", width: "half", title: "Image" };
  return base;
}

function updateFirstStringMatch(target: unknown, oldText: string, newText: string): boolean {
  if (!target || typeof target !== "object") return false;
  for (const key of Object.keys(target as Record<string, unknown>)) {
    const value = (target as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim() === oldText.trim()) { (target as Record<string, unknown>)[key] = newText; return true; }
    if (Array.isArray(value)) { for (const item of value) if (updateFirstStringMatch(item, oldText, newText)) return true; }
    else if (value && typeof value === "object" && updateFirstStringMatch(value, oldText, newText)) return true;
  }
  return false;
}
function updateFirstHrefMatch(target: unknown, oldHref: string, newHref: string): boolean {
  if (!target || typeof target !== "object") return false;
  for (const key of Object.keys(target as Record<string, unknown>)) {
    const value = (target as Record<string, unknown>)[key];
    const lower = key.toLowerCase();
    if (typeof value === "string" && (lower.includes("href") || lower === "url") && value.trim() === oldHref.trim()) { (target as Record<string, unknown>)[key] = newHref; return true; }
    if (Array.isArray(value)) { for (const item of value) if (updateFirstHrefMatch(item, oldHref, newHref)) return true; }
    else if (value && typeof value === "object" && updateFirstHrefMatch(value, oldHref, newHref)) return true;
  }
  return false;
}

function textStyleKey(pageKey: string, text: string) {
  const normalised = String(text || "").trim().toLowerCase().replace(/\s+/g, " ");
  let hash = 0;
  for (let i = 0; i < normalised.length; i += 1) hash = ((hash << 5) - hash + normalised.charCodeAt(i)) | 0;
  return `${pageKey}:${Math.abs(hash).toString(36)}`;
}

const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Inter", value: "Inter, Arial, sans-serif" },
  { label: "IBM Plex Sans", value: "'IBM Plex Sans', Inter, Arial, sans-serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
];

const FONT_SIZES = [
  { label: "Default", value: "" },
  { label: "12px", value: "12px" },
  { label: "14px", value: "14px" },
  { label: "16px", value: "16px" },
  { label: "18px", value: "18px" },
  { label: "22px", value: "22px" },
  { label: "28px", value: "28px" },
  { label: "36px", value: "36px" },
];

function UploadButton({ accept, label, onUploaded }: { accept: string; label: string; onUploaded: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  async function upload(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData(); form.set("folder", "company-docs"); form.set("file", file);
      const response = await fetch("/api/uploads", { method: "POST", body: form });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok || !data?.url) throw new Error(data?.error || "Upload failed");
      onUploaded(data.url);
    } catch (err) { alert(err instanceof Error ? err.message : "Upload failed"); }
    finally { setUploading(false); }
  }
  return <label className="inline-flex cursor-pointer items-center justify-center rounded bg-navy-950 px-3 py-2 text-xs font-display font-900 text-white hover:bg-accent hover:text-navy-950">{uploading ? "Uploading…" : label}<input className="hidden" type="file" accept={accept} disabled={uploading} onChange={(e) => upload(e.target.files?.[0] || null)} /></label>;
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
  const [selectedTextStyleKey, setSelectedTextStyleKey] = useState<string | null>(null);
  const [selectedLink, setSelectedLink] = useState<SelectedLink | null>(null);
  const [selectedWidget, setSelectedWidget] = useState<SelectedWidget | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<CollectionKey | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [draggingWidget, setDraggingWidget] = useState<WidgetTemplate | null>(null);
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [selectedHeroSlide, setSelectedHeroSlide] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const config = pageConfig(pageKey);
  const canvasWidth = DEVICE_WIDTH[device];

  useEffect(() => { let cancelled = false; fetch("/api/admin/content", { cache: "no-store" }).then((r) => r.json()).then((data) => { if (!cancelled && data?.content) setContent(data.content); }).catch(() => setMessage("Could not load CMS content.")); return () => { cancelled = true; }; }, []);
  useEffect(() => { if (iframeRef.current?.contentDocument) injectEditorStable(); }, [selectedCollection, selectedZone, selectedWidget, pageKey, content]);
  useEffect(() => {
    if (!content) return;
    if (pageKey === "home") setBackgroundUrl(content.heroSlides?.[selectedHeroSlide]?.backgroundImageUrl || "");
    else if (pageKey === "faq") setBackgroundUrl(content.faq?.backgroundImageUrl || "");
    else { const key = cmsPageKey(pageKey); setBackgroundUrl(key ? content.pages[key]?.backgroundImageUrl || "" : ""); }
  }, [content, pageKey, selectedHeroSlide]);

  const selectedWidgetLive = useMemo(() => {
    if (!content || !selectedWidget) return null;
    const live = content.visualWidgets?.[selectedWidget.zone]?.[selectedWidget.index];
    return live ? { ...selectedWidget, widget: live } : null;
  }, [content, selectedWidget]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data || {};
      if (data.type === "VCMS_TEXT_SELECTED") {
        setSelectedText(String(data.text || ""));
        setSelectedTextStyleKey(String(data.styleKey || "") || null);
        setSelectedWidget(null);
        setSelectedLink(data.href ? { text: String(data.text || "Button/link"), href: String(data.href || "#") } : null);
        setLeftTab("style");
      }
      if (data.type === "VCMS_COLLECTION_SELECTED") { setSelectedCollection(String(data.collection || "page.blocks") as CollectionKey); setSelectedZone(null); setSelectedWidget(null); setSelectedTextStyleKey(null); setMessage(`Target selected: ${String(data.label || data.collection || "section")}.`); }
      if (data.type === "VCMS_ZONE_SELECTED") { setSelectedZone(String(data.zone || `${pageKey}:beforeFooter`)); setSelectedCollection(null); setSelectedWidget(null); setSelectedTextStyleKey(null); setMessage(`Placement selected: ${String(data.zone || "page area")}.`); }
      if (data.type === "VCMS_WIDGET_SELECTED") {
        const zone = String(data.zone || "");
        const index = Number(data.index);
        const widget = content?.visualWidgets?.[zone]?.[index];
        if (zone && Number.isFinite(index) && widget) { setSelectedWidget({ zone, index, widget }); setSelectedZone(zone); setSelectedCollection(null); setSelectedTextStyleKey(null); setLeftTab("style"); setMessage(`Selected ${widget.type || "widget"}. Edit it in the Style panel.`); }
      }
      if (data.type === "VCMS_TEXT_UPDATE" && content && data.oldText && data.newText && String(data.oldText).trim() !== String(data.newText).trim()) {
        const next = cloneContent(content);
        const oldKey = textStyleKey(pageKey, String(data.oldText));
        const newKey = textStyleKey(pageKey, String(data.newText));
        if (next.textStyles?.[oldKey]) {
          next.textStyles = { ...(next.textStyles || {}), [newKey]: next.textStyles[oldKey] };
          if (oldKey !== newKey) delete next.textStyles[oldKey];
          setSelectedTextStyleKey(newKey);
        }
        if (updateFirstStringMatch(next, String(data.oldText), String(data.newText))) { setContent(next); setMessage("Text changed on canvas. Click Save website to publish."); }
        else setMessage("This text is visible for exact preview but is not linked to CMS storage yet.");
      }
      if (data.type === "VCMS_ADD_ITEM") addCollectionItem(String(data.collection || "page.blocks") as CollectionKey, data.widget as WidgetTemplate | undefined);
      if (data.type === "VCMS_DELETE_ITEM") deleteCollectionItem(String(data.collection || "page.blocks") as CollectionKey, Number(data.index));
      if (data.type === "VCMS_DUPLICATE_ITEM") duplicateCollectionItem(String(data.collection || "page.blocks") as CollectionKey, Number(data.index));
      if (data.type === "VCMS_ADD_SECTION") addVisualWidget(String(data.zone || `${pageKey}:beforeFooter`), { ...WIDGETS[0], columns: Number(data.columns || 1), title: Number(data.columns || 1) === 2 ? "Two-column section" : "New section" });
      if (data.type === "VCMS_DELETE_WIDGET") deleteVisualWidget(String(data.zone || ""), Number(data.index));
      if (data.type === "VCMS_DUPLICATE_WIDGET") duplicateVisualWidget(String(data.zone || ""), Number(data.index));
    }
    window.addEventListener("message", onMessage); return () => window.removeEventListener("message", onMessage);
  }, [content, pageKey]);

  function mutateContent(mutator: (draft: SiteContent) => void, auto = false) {
    if (!content) return;
    const draft = cloneContent(content);
    mutator(draft);
    setContent(draft);
    if (auto) void autoSaveDraft(draft);
  }
  async function autoSaveDraft(draft: SiteContent) {
    try {
      const response = await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: draft }) });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.error || "Save failed");
      setContent(data.content); setRefreshKey(Date.now()); setMessage("Canvas updated and saved. Live preview refreshed.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Save failed."); }
  }
  async function save() {
    if (!content) return;
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.error || "Save failed");
      setContent(data.content); setRefreshKey(Date.now()); setMessage("Saved. Live canvas refreshed.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Save failed."); }
    finally { setSaving(false); }
  }

  function pageBlocks(c = content): CmsBlock[] { const key = cmsPageKey(pageKey); return key && c ? c.pages[key].blocks : []; }
  function defaultZone() { return selectedZone || `${pageKey}:beforeFooter`; }
  function shouldUseNativeCollection(target: DropTarget, widget: WidgetTemplate) { if (target.kind !== "collection") return false; if (widget.blockType === "faq") return target.collection.includes("faq"); if (widget.blockType === "card") return target.collection === "page.blocks"; if (widget.blockType === "promotion") return target.collection === "home.promotionStrip"; return false; }
  function collectionForWidget(collection: CollectionKey, widget?: WidgetTemplate | null): CollectionKey { if (!widget) return collection; if (widget.blockType === "faq") return collection.includes("faq") ? collection : (pageKey === "faq" ? "faq.groupItems:sales" : "faq.previewItems"); if (collection.includes("faq") || collection === "trust.clients") return "page.blocks"; return collection; }
  function addWidget(widget: WidgetTemplate) { if (selectedCollection && shouldUseNativeCollection({ kind: "collection", collection: selectedCollection }, widget)) addCollectionItem(collectionForWidget(selectedCollection, widget), widget); else addVisualWidget(defaultZone(), widget); }

  function addVisualWidget(zone: string, widget: WidgetTemplate, index?: number) {
    if (!content || !config.editable) { setMessage("This page is visible for accuracy but protected from widget editing."); return; }
    const fullZone = zone.includes(":") ? zone : `${pageKey}:${zone}`;
    const item = visualWidgetFromTemplate(widget);
    mutateContent((draft) => {
      draft.visualWidgets = draft.visualWidgets || {};
      const existing = [...(draft.visualWidgets[fullZone] || [])];
      const insertAt = typeof index === "number" && index >= 0 ? Math.min(index, existing.length) : existing.length;
      existing.splice(insertAt, 0, item);
      draft.visualWidgets[fullZone] = existing;
    }, true);
    setSelectedZone(fullZone); setSelectedCollection(null); setSelectedWidget({ zone: fullZone, index: typeof index === "number" ? index : (content.visualWidgets?.[fullZone]?.length || 0), widget: item });
  }
  function deleteVisualWidget(zone: string, index: number) { if (!zone || !Number.isFinite(index)) return; mutateContent((draft) => { draft.visualWidgets = draft.visualWidgets || {}; draft.visualWidgets[zone] = (draft.visualWidgets[zone] || []).filter((_, i) => i !== index); }, true); setSelectedWidget(null); setMessage("Widget deleted and saved."); }
  function duplicateVisualWidget(zone: string, index: number) { if (!zone || !Number.isFinite(index)) return; mutateContent((draft) => { draft.visualWidgets = draft.visualWidgets || {}; const items = draft.visualWidgets[zone] || []; const source = items[index]; if (!source) return; const clone = { ...source, id: uid(), title: source.title ? `${source.title} copy` : source.title }; draft.visualWidgets[zone] = [...items.slice(0, index + 1), clone, ...items.slice(index + 1)]; }, true); setMessage("Widget duplicated and saved."); }
  function updateSelectedWidget(changes: Partial<VisualWidget>) {
    if (!selectedWidgetLive) return;
    mutateContent((draft) => {
      const items = draft.visualWidgets?.[selectedWidgetLive.zone];
      if (!items?.[selectedWidgetLive.index]) return;
      items[selectedWidgetLive.index] = { ...items[selectedWidgetLive.index], ...changes };
    }, false);
    setSelectedWidget({ ...selectedWidgetLive, widget: { ...selectedWidgetLive.widget, ...changes } });
    setMessage("Widget updated in draft. Click Save website to publish.");
  }

  function updateSelectedTextStyle(changes: CmsTextStyle) {
    if (!selectedTextStyleKey) return;
    mutateContent((draft) => {
      draft.textStyles = draft.textStyles || {};
      const next = { ...(draft.textStyles[selectedTextStyleKey] || {}), ...changes };
      if (!next.fontSize && !next.fontFamily && !next.fontWeight && !next.italic && !next.colour) delete draft.textStyles[selectedTextStyleKey];
      else draft.textStyles[selectedTextStyleKey] = next;
    }, false);
    setMessage("Text style updated in draft. Click Save website to publish.");
  }

  function addCollectionItem(collection: CollectionKey, widget?: WidgetTemplate) {
    if (!content || !config.editable) { setMessage("This page is visible for accuracy but protected from widget editing."); return; }
    const key = cmsPageKey(pageKey);
    mutateContent((draft) => {
      if (collection === "page.blocks") { if (!key) return; draft.pages[key].blocks = normaliseBlockWidths([...(draft.pages[key].blocks || []), blockFromWidget(widget || widgetByType("card"))]); }
      else if (collection === "page.steps") { if (!key) return; const next = [...(draft.pages[key].steps || []), stepFromWidget(widget, draft.pages[key].steps?.length || 0)]; draft.pages[key].steps = next.map((step, index) => ({ ...step, number: String(index + 1).padStart(2, "0") })); }
      else if (collection === "faq.previewItems") draft.faq.previewItems = [...(draft.faq.previewItems || []), faqFromWidget(widget)];
      else if (collection === "home.promotionStrip") { const block = blockFromWidget(widget || widgetByType("promotion")); block.blockType = "promotion"; block.background = "accent"; block.width = "full"; draft.pages.home.blocks = normaliseBlockWidths([...(draft.pages.home.blocks || []), block]); draft.hiddenSections = draft.hiddenSections || {}; draft.hiddenSections.home = (draft.hiddenSections.home || []).filter((x) => x !== "promotionStrip"); }
      else if (collection === "trust.clients") { draft.trust.clients = [...(draft.trust.clients || []), "New company"]; }
      else if (collection.startsWith("faq.groupItems:")) { const groupKey = collection.split(":")[1] || draft.faq.groups[0]?.key; const group = draft.faq.groups.find((g) => g.key === groupKey) || draft.faq.groups[0]; if (group) group.items = [...(group.items || []), faqFromWidget(widget)]; }
    }, true);
    setSelectedCollection(collection); setSelectedZone(null); setMessage("Item added. The layout auto-adjusted and saved.");
  }
  function deleteCollectionItem(collection: CollectionKey, index: number) { if (!Number.isFinite(index) || index < 0) return; const key = cmsPageKey(pageKey); mutateContent((draft) => { if (collection === "page.blocks") { if (!key) return; draft.pages[key].blocks = normaliseBlockWidths((draft.pages[key].blocks || []).filter((_, i) => i !== index)); } else if (collection === "page.steps") { if (!key) return; draft.pages[key].steps = (draft.pages[key].steps || []).filter((_, i) => i !== index).map((step, i) => ({ ...step, number: String(i + 1).padStart(2, "0") })); } else if (collection === "faq.previewItems") draft.faq.previewItems = (draft.faq.previewItems || []).filter((_, i) => i !== index); else if (collection === "home.promotionStrip") { draft.hiddenSections = draft.hiddenSections || {}; const existing = new Set(draft.hiddenSections.home || []); existing.add("promotionStrip"); draft.hiddenSections.home = Array.from(existing); } else if (collection === "trust.clients") { draft.trust.clients = (draft.trust.clients || []).filter((_, i) => i !== index); } else if (collection.startsWith("faq.groupItems:")) { const groupKey = collection.split(":")[1]; const group = draft.faq.groups.find((g) => g.key === groupKey) || draft.faq.groups[0]; if (group) group.items = (group.items || []).filter((_, i) => i !== index); } }, true); setMessage("Item deleted and saved."); }
  function duplicateCollectionItem(collection: CollectionKey, index: number) { const key = cmsPageKey(pageKey); mutateContent((draft) => { if (collection === "page.blocks") { if (!key) return; const items = draft.pages[key].blocks || []; const source = items[index]; if (!source) return; draft.pages[key].blocks = normaliseBlockWidths([...items.slice(0, index + 1), { ...source, title: `${source.title} copy` }, ...items.slice(index + 1)]); } else if (collection === "page.steps") { if (!key) return; const items = draft.pages[key].steps || []; const source = items[index]; if (!source) return; draft.pages[key].steps = [...items.slice(0, index + 1), { ...source, title: `${source.title} copy` }, ...items.slice(index + 1)].map((step, i) => ({ ...step, number: String(i + 1).padStart(2, "0") })); } else if (collection === "faq.previewItems") { const items = draft.faq.previewItems || []; const source = items[index]; if (!source) return; draft.faq.previewItems = [...items.slice(0, index + 1), { ...source, question: `${source.question} copy` }, ...items.slice(index + 1)]; } else if (collection === "trust.clients") { const source = draft.trust.clients?.[index]; if (!source) return; draft.trust.clients = [...draft.trust.clients.slice(0, index + 1), `${source} copy`, ...draft.trust.clients.slice(index + 1)]; } else if (collection.startsWith("faq.groupItems:")) { const groupKey = collection.split(":")[1]; const group = draft.faq.groups.find((g) => g.key === groupKey) || draft.faq.groups[0]; if (!group) return; const source = group.items[index]; if (!source) return; group.items = [...group.items.slice(0, index + 1), { ...source, question: `${source.question} copy` }, ...group.items.slice(index + 1)]; } }, true); setMessage("Item duplicated and saved."); }

  function updateSelectedLinkHref(hrefValue: string) {
    if (!content || !selectedLink) return;
    const nextHref = safeHrefInput(hrefValue);
    const draft = cloneContent(content);
    if (updateFirstHrefMatch(draft, selectedLink.href, nextHref)) { setSelectedLink({ ...selectedLink, href: nextHref }); setContent(draft); setMessage("Button/link URL updated in draft. Click Save website to publish."); }
    else setMessage("This button/link is visible but its URL is not linked to CMS storage yet.");
  }
  function isHomeHidden(section: string) { return Boolean(content?.hiddenSections?.home?.includes(section)); }
  function toggleHomeSection(section: string) { mutateContent((draft) => { draft.hiddenSections = draft.hiddenSections || {}; const current = new Set(draft.hiddenSections.home || []); current.has(section) ? current.delete(section) : current.add(section); draft.hiddenSections.home = Array.from(current); }, true); }
  function togglePageSection(section: string) { const key = cmsPageKey(pageKey); if (!key) return; mutateContent((draft) => { const page = draft.pages[key]; const current = Array.isArray(page.sectionOrder) && page.sectionOrder.length ? [...page.sectionOrder] : PAGE_SECTIONS.map(([s]) => s); page.sectionOrder = current.includes(section) ? current.filter((s) => s !== section) : [...current, section]; }, true); }
  function pageSectionVisible(section: string) { const key = cmsPageKey(pageKey); if (!key || !content) return false; const order = content.pages[key].sectionOrder || PAGE_SECTIONS.map(([s]) => s); return order.includes(section); }
  function deleteHeroButton(slot: "primary" | "secondary") { mutateContent((draft) => { const key = cmsPageKey(pageKey); if (pageKey === "home") { if (slot === "primary") draft.heroSlides[0].cta1Label = HIDDEN; else draft.heroSlides[0].cta2Label = HIDDEN; } else if (key) { if (slot === "primary") draft.pages[key].primaryLabel = HIDDEN; else draft.pages[key].secondaryLabel = HIDDEN; } }, true); }

  function applyBackgroundToPreview(value: string) { const doc = iframeRef.current?.contentDocument; const section = doc?.querySelector<HTMLElement>("main section"); if (!section) return; section.style.backgroundSize = "cover"; section.style.backgroundPosition = "center"; if (value.startsWith("linear-gradient")) { section.style.backgroundImage = value; section.style.backgroundColor = ""; } else if (value.startsWith("#") || value.startsWith("rgb")) { section.style.backgroundImage = "none"; section.style.backgroundColor = value; } else { section.style.backgroundImage = `url(${value})`; section.style.backgroundColor = ""; } }
  function setHeroBackground(value: string) {
    if (!content) return;
    const clean = value.trim();
    if (!clean) return;
    mutateContent((draft) => {
      if (pageKey === "home") {
        const slides = Array.isArray(draft.heroSlides) ? draft.heroSlides : [];
        if (slides[selectedHeroSlide]) slides[selectedHeroSlide].backgroundImageUrl = clean;
      }
      if (pageKey === "faq") draft.faq.backgroundImageUrl = clean;
      const key = cmsPageKey(pageKey);
      if (key && key !== "home") draft.pages[key].backgroundImageUrl = clean;
    });
    setBackgroundUrl(clean);
    applyBackgroundToPreview(clean);
  }

  function setTrustBackground(value: string) {
    if (!content) return;
    const clean = value.trim();
    if (!clean) return;
    mutateContent((draft) => { draft.trust.backgroundImageUrl = clean; });
    setMessage("Built for Engineers background updated. Click Save website to publish.");
  }

  function postCanvasMessage(payload: Record<string, unknown>) { window.postMessage(payload, window.location.origin); }
  function injectEditor() {
    const iframe = iframeRef.current; const doc = iframe?.contentDocument; const win = iframe?.contentWindow; if (!doc || !win) return;
    const send = (payload: Record<string, unknown>) => { try { win.parent?.postMessage(payload, window.location.origin); } catch { postCanvasMessage(payload); } };
    let style = doc.getElementById("vcms-live-editor-style") as HTMLStyleElement | null;
    if (!style) { style = doc.createElement("style"); style.id = "vcms-live-editor-style"; doc.head.appendChild(style); }
    style.textContent = `[data-vcms-text="1"]{outline:1px dashed transparent;cursor:text}[data-vcms-text="1"]:hover{outline-color:#E8A44A;outline-offset:3px}[data-vcms-text="1"]:focus{outline:2px solid #E8A44A!important;outline-offset:3px;box-shadow:0 0 0 3px rgba(238,179,44,.18)}[data-vcms-protected="1"]{position:relative;cursor:not-allowed!important}[data-vcms-protected="1"]:hover:after{content:"🚫 protected system area";position:absolute;z-index:2147483647;top:8px;right:8px;background:#111827;color:#fff;border-radius:999px;padding:6px 10px;font:700 11px Arial;pointer-events:none}[data-vcms-dropzone]{position:relative!important;min-height:18px;outline:1px dashed transparent;outline-offset:-1px}[data-vcms-dropzone]:hover{outline-color:rgba(238,179,44,.65);background:rgba(238,179,44,.035)}[data-vcms-dropzone].vcms-zone-selected{outline:2px solid #E8A44A;background:rgba(238,179,44,.08)}[data-vcms-collection]{position:relative!important;outline:2px dashed transparent;outline-offset:6px;min-height:44px}[data-vcms-collection]:hover{outline-color:rgba(238,179,44,.75)}[data-vcms-collection].vcms-target-selected{outline-color:#E8A44A!important;box-shadow:0 0 0 5px rgba(238,179,44,.15)}[data-vcms-widget-item],[data-vcms-item]{position:relative!important;outline:1px dashed transparent;outline-offset:5px}[data-vcms-widget-item]:hover,[data-vcms-item]:hover{outline-color:#E8A44A}.vcms-item-tools{position:absolute;right:8px;top:8px;z-index:2147483646;display:flex;gap:4px;opacity:0;pointer-events:none;transform:translateY(-4px);transition:opacity .15s ease,transform .15s ease}.vcms-widget-selected>.vcms-item-tools,[data-vcms-widget-item]:hover>.vcms-item-tools,[data-vcms-item]:hover>.vcms-item-tools{opacity:1;pointer-events:auto;transform:translateY(0)}.vcms-mini-btn{border:0;border-radius:999px;background:#203A5E;color:#fff;font:800 10px Arial;padding:6px 8px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.2)}.vcms-mini-btn-danger{background:#991B1B}.vcms-add{position:absolute;right:12px;top:12px;z-index:2147483647;border:0;border-radius:999px;background:#E8A44A;color:#203A5E;font:900 12px Arial;padding:8px 12px;box-shadow:0 6px 20px rgba(0,0,0,.22);cursor:pointer;opacity:0;pointer-events:none;transform:translateY(-4px);transition:opacity .15s ease,transform .15s ease}[data-vcms-collection]:hover>.vcms-add,[data-vcms-collection].vcms-target-selected>.vcms-add{opacity:1;pointer-events:auto;transform:translateY(0)}.vcms-section-plus{position:absolute;left:50%;top:0;transform:translate(-50%,-50%);z-index:2147483644;border:0;border-radius:999px;background:#E8A44A;color:#203A5E;font:900 11px Arial;padding:6px 10px;box-shadow:0 6px 20px rgba(0,0,0,.2);opacity:0;pointer-events:none;cursor:pointer}.vcms-section-menu{position:absolute;left:50%;top:0;transform:translate(-50%,20px);z-index:2147483647;display:none;gap:4px;border-radius:999px;background:#203A5E;padding:5px;box-shadow:0 10px 24px rgba(0,0,0,.24)}.vcms-section-menu button{border:0;border-radius:999px;background:#fff;color:#203A5E;font:800 10px Arial;padding:6px 8px;cursor:pointer}[data-vcms-dropzone]:hover>.vcms-section-plus,[data-vcms-dropzone].vcms-zone-selected>.vcms-section-plus{opacity:1;pointer-events:auto}[data-vcms-dropzone]:hover>.vcms-section-menu{display:flex}.vcms-drop-hint{position:absolute;left:12px;top:12px;z-index:2147483645;border-radius:999px;background:#203A5E;color:#fff;font:800 11px Arial;padding:7px 10px;box-shadow:0 4px 14px rgba(0,0,0,.16);pointer-events:none;opacity:0}[data-vcms-collection]:hover>.vcms-drop-hint,[data-vcms-collection].vcms-target-selected>.vcms-drop-hint{opacity:1}.vcms-edit-link{outline:1px dotted rgba(238,179,44,.75);outline-offset:2px}`;
    if (!config.editable) { doc.querySelectorAll<HTMLElement>("main section, main form, main a, main button").forEach((el) => { el.dataset.vcmsProtected = "1"; }); return; }

    doc.querySelectorAll<HTMLElement>("main section").forEach((section) => {
      const text = (section.textContent || "").toLowerCase();
      if (!section.dataset.vcmsCollection) {
        if (text.includes("frequently asked questions")) section.dataset.vcmsCollection = pageKey === "faq" ? "faq.groupItems:sales" : "faq.previewItems";
        else if (text.includes("what we do") || text.includes("everything you need")) section.dataset.vcmsCollection = "page.blocks";
        else if (text.includes("current combay offers") || text.includes("copy the code")) section.dataset.vcmsCollection = "home.promotionStrip";
        else if (text.includes("how it works")) section.dataset.vcmsCollection = "page.steps";
      }
    });

    doc.querySelectorAll<HTMLElement>("[data-vcms-dropzone]").forEach((zoneEl) => {
      const zone = zoneEl.dataset.vcmsDropzone || `${pageKey}:beforeFooter`;
      zoneEl.classList.toggle("vcms-zone-selected", selectedZone === zone);
      zoneEl.addEventListener("click", (event) => { if ((event.target as HTMLElement).closest(".vcms-section-plus,.vcms-section-menu,.vcms-item-tools")) return; send({ type: "VCMS_ZONE_SELECTED", zone }); });
      if (!zoneEl.querySelector(":scope > .vcms-section-plus")) {
        const plus = doc.createElement("button"); plus.type = "button"; plus.className = "vcms-section-plus"; plus.textContent = "+"; plus.title = "Add a new section or choose this drop area"; plus.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); send({ type: "VCMS_ZONE_SELECTED", zone }); }); zoneEl.appendChild(plus);
      }
      if (!zoneEl.querySelector(":scope > .vcms-section-menu")) {
        const menu = doc.createElement("div"); menu.className = "vcms-section-menu";
        [["1 col",1],["2 col",2],["3 col",3]].forEach(([label, columns]) => { const btn = doc.createElement("button"); btn.type = "button"; btn.textContent = String(label); btn.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); send({ type: "VCMS_ADD_SECTION", zone, columns }); }); menu.appendChild(btn); });
        zoneEl.appendChild(menu);
      }
    });

    doc.querySelectorAll<HTMLElement>("[data-vcms-widget-item]").forEach((item) => {
      const zone = item.dataset.vcmsWidgetItem || ""; const index = Number(item.dataset.vcmsIndex || "0");
      item.classList.toggle("vcms-widget-selected", selectedWidget?.zone === zone && selectedWidget?.index === index);
      item.addEventListener("click", (event) => { if ((event.target as HTMLElement).closest(".vcms-item-tools")) return; event.preventDefault(); event.stopPropagation(); send({ type: "VCMS_WIDGET_SELECTED", zone, index }); });
      if (!item.querySelector(":scope > .vcms-item-tools")) {
        const tools = doc.createElement("div"); tools.className = "vcms-item-tools";
        const duplicate = doc.createElement("button"); duplicate.type = "button"; duplicate.className = "vcms-mini-btn"; duplicate.textContent = "Copy"; duplicate.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); send({ type: "VCMS_DUPLICATE_WIDGET", zone, index }); });
        const del = doc.createElement("button"); del.type = "button"; del.className = "vcms-mini-btn vcms-mini-btn-danger"; del.textContent = "Delete"; del.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); send({ type: "VCMS_DELETE_WIDGET", zone, index }); });
        tools.appendChild(duplicate); tools.appendChild(del); item.appendChild(tools);
      }
    });

    doc.querySelectorAll<HTMLElement>("[data-vcms-collection]").forEach((section) => {
      const collection = (section.dataset.vcmsCollection || "page.blocks") as CollectionKey;
      section.classList.toggle("vcms-target-selected", selectedCollection === collection);
      section.addEventListener("click", (event) => { if ((event.target as HTMLElement).closest(".vcms-add,.vcms-item-tools")) return; send({ type: "VCMS_COLLECTION_SELECTED", collection, label: collection }); });
      if (!section.querySelector(":scope > .vcms-add")) { const add = doc.createElement("button"); add.type = "button"; add.className = "vcms-add"; add.textContent = collection.includes("faq") ? "+ Add FAQ" : "+ Add similar item"; add.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); send({ type: "VCMS_ADD_ITEM", collection }); }); section.appendChild(add); }
      if (!section.querySelector(":scope > .vcms-drop-hint")) { const hint = doc.createElement("div"); hint.className = "vcms-drop-hint"; hint.textContent = collection.includes("faq") ? "FAQ group" : "Editable collection"; section.appendChild(hint); }
      if (!section.querySelector("[data-vcms-item]")) {
        const candidates = Array.from(section.querySelectorAll<HTMLElement>(".rounded-xl,.rounded-lg,details,article")).filter((el) => !el.closest(".vcms-add,.vcms-drop-hint") && (el.textContent || "").trim().length > 8);
        candidates.slice(0, 12).forEach((el, index) => { el.dataset.vcmsItem = collection; el.dataset.vcmsIndex = String(index); });
      }
    });

    doc.querySelectorAll<HTMLElement>("[data-vcms-item]").forEach((item) => {
      const collection = item.dataset.vcmsItem || "page.blocks"; const index = Number(item.dataset.vcmsIndex || "0");
      if (!item.querySelector(":scope > .vcms-item-tools")) { const tools = doc.createElement("div"); tools.className = "vcms-item-tools"; const add = doc.createElement("button"); add.type = "button"; add.className = "vcms-mini-btn"; add.textContent = "+"; add.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); send({ type: "VCMS_ADD_ITEM", collection }); }); const duplicate = doc.createElement("button"); duplicate.type = "button"; duplicate.className = "vcms-mini-btn"; duplicate.textContent = "Copy"; duplicate.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); send({ type: "VCMS_DUPLICATE_ITEM", collection, index }); }); const del = doc.createElement("button"); del.type = "button"; del.className = "vcms-mini-btn vcms-mini-btn-danger"; del.textContent = "Delete"; del.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); send({ type: "VCMS_DELETE_ITEM", collection, index }); }); tools.appendChild(add); tools.appendChild(duplicate); tools.appendChild(del); item.appendChild(tools); }
    });

    const textSelector = "main h1,main h2,main h3,main h4,main p,main li,main label,main a,main button,footer p,footer a,footer span,footer h4";
    doc.querySelectorAll<HTMLElement>(textSelector).forEach((el) => {
      if (!el.textContent?.trim() || el.closest("script,style,svg,.vcms-item-tools,.vcms-add,.vcms-drop-hint,.vcms-section-menu")) return;
      el.dataset.vcmsText = "1";
      const linkEl = (el.closest("a") || (el.tagName.toLowerCase() === "a" ? el : null)) as HTMLAnchorElement | null;
      if (linkEl?.href) el.classList.add("vcms-edit-link");
      const initial = el.textContent.trim();
      const styleKey = textStyleKey(pageKey, initial);
      el.dataset.vcmsStyleKey = styleKey;
      const cmsStyle = content?.textStyles?.[styleKey];
      if (cmsStyle) {
        el.style.fontSize = cmsStyle.fontSize || "";
        el.style.fontFamily = cmsStyle.fontFamily || "";
        el.style.fontWeight = cmsStyle.fontWeight || "";
        el.style.fontStyle = cmsStyle.italic ? "italic" : "";
        el.style.color = cmsStyle.colour || "";
      }
      el.setAttribute("contenteditable", "true");
      el.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); send({ type: "VCMS_TEXT_SELECTED", text: el.textContent?.trim() || "", href: linkEl?.getAttribute("href") || "", styleKey }); });
      el.addEventListener("focus", () => send({ type: "VCMS_TEXT_SELECTED", text: el.textContent?.trim() || "", href: linkEl?.getAttribute("href") || "", styleKey }));
      el.addEventListener("blur", () => { const next = el.textContent?.trim() || ""; if (next && next !== initial) send({ type: "VCMS_TEXT_UPDATE", oldText: initial, newText: next }); });
    });
    doc.querySelectorAll<HTMLElement>("[data-system-protected], [data-admin-only], .stripe, .checkout, [href*='/checkout'], [href*='/cart']").forEach((el) => { el.dataset.vcmsProtected = "1"; });
  }
  function injectEditorStable() { injectEditor(); window.setTimeout(injectEditor, 250); window.setTimeout(injectEditor, 800); window.setTimeout(injectEditor, 1600); }

  function targetLabel(target: DropTarget) { return target.kind === "zone" ? target.zone : target.collection.includes("faq") ? "FAQ items" : target.collection === "page.steps" ? "Process/steps" : target.collection === "home.promotionStrip" ? "Promotion banner" : "Cards/content"; }
  function dropPreviewAtCanvasPoint(clientX: number, clientY: number): DropPreview {
    const iframe = iframeRef.current; const doc = iframe?.contentDocument; const fallback: DropTarget = { kind: "zone", zone: defaultZone() };
    if (!iframe || !doc) return { target: fallback, label: `Drop into ${targetLabel(fallback)}`, y: 120, mode: "inside" };
    const rect = iframe.getBoundingClientRect(); const scale = rect.width / Math.max(iframe.offsetWidth, 1);
    const x = Math.max(0, Math.min(iframe.offsetWidth, (clientX - rect.left) / Math.max(scale, 0.01)));
    const y = Math.max(0, Math.min(iframe.offsetHeight, (clientY - rect.top) / Math.max(scale, 0.01)));
    const elements = doc.elementsFromPoint(x, y) as HTMLElement[];
    const item = elements.map((el) => el.closest?.("[data-vcms-widget-item],[data-vcms-item]") as HTMLElement | null).find(Boolean) || null;
    const collectionEl = elements.map((el) => el.closest?.("[data-vcms-collection]") as HTMLElement | null).find(Boolean) || null;
    const zoneEl = elements.map((el) => el.closest?.("[data-vcms-dropzone]") as HTMLElement | null).find(Boolean) || null;
    let target: DropTarget = fallback; let host: HTMLElement | null = null;
    if (zoneEl?.dataset.vcmsDropzone) { target = { kind: "zone", zone: zoneEl.dataset.vcmsDropzone }; host = zoneEl; }
    if (item?.dataset.vcmsWidgetItem) { const idx = Number(item.dataset.vcmsIndex || "0"); target = { kind: "zone", zone: item.dataset.vcmsWidgetItem, index: Number.isFinite(idx) ? idx : undefined }; host = item; }
    else if (item?.dataset.vcmsItem) { const idx = Number(item.dataset.vcmsIndex || "0"); target = { kind: "collection", collection: item.dataset.vcmsItem as CollectionKey, index: Number.isFinite(idx) ? idx : undefined }; host = item; }
    else if (!zoneEl && collectionEl?.dataset.vcmsCollection) { target = { kind: "collection", collection: collectionEl.dataset.vcmsCollection as CollectionKey }; host = collectionEl; }
    if (!host) {
      const hosts = Array.from(doc.querySelectorAll<HTMLElement>("[data-vcms-dropzone],[data-vcms-collection]")).map((el) => { const r = el.getBoundingClientRect(); return { el, center: r.top + (r.height || 1) / 2, height: r.height || 1 }; }).filter((entry) => entry.height > 4).sort((a, b) => Math.abs(a.center - y) - Math.abs(b.center - y));
      if (hosts[0]) { host = hosts[0].el; const z = host.dataset.vcmsDropzone; const c = host.dataset.vcmsCollection; target = z ? { kind: "zone", zone: z } : c ? { kind: "collection", collection: c as CollectionKey } : fallback; }
    }
    const r = host?.getBoundingClientRect(); const rel = r ? (y - r.top) / Math.max(r.height, 1) : 0.5; const mode: DropPreview["mode"] = rel < 0.25 ? "before" : rel > 0.75 ? "after" : "inside";
    const lineY = r ? (mode === "before" ? r.top : mode === "after" ? r.bottom : Math.max(r.top + 8, Math.min(y, r.bottom - 8))) : y;
    return { target, label: `${mode === "before" ? "Add above" : mode === "after" ? "Add below" : "Add inside"} ${targetLabel(target)}`, y: lineY, mode };
  }
  function nearestZone(clientX?: number, clientY?: number) { const p = typeof clientX === "number" && typeof clientY === "number" ? dropPreviewAtCanvasPoint(clientX, clientY) : null; return p?.target.kind === "zone" ? p.target.zone : defaultZone(); }
  function dropWidgetOnCanvas(widget: WidgetTemplate | null, clientX?: number, clientY?: number) {
    if (!widget) return;
    const preview = typeof clientX === "number" && typeof clientY === "number" ? dropPreviewAtCanvasPoint(clientX, clientY) : null;
    const target = preview?.target || { kind: "zone", zone: defaultZone() } as DropTarget;
    if (preview?.mode === "inside" && shouldUseNativeCollection(target, widget)) addCollectionItem(collectionForWidget((target as { kind: "collection"; collection: CollectionKey }).collection, widget), widget);
    else if (target.kind === "zone") addVisualWidget(target.zone, widget, target.index !== undefined && preview?.mode === "before" ? target.index : target.index !== undefined && preview?.mode === "after" ? target.index + 1 : undefined);
    else addVisualWidget(nearestZone(clientX, clientY), widget);
    setDraggingWidget(null); setDropPreview(null);
  }

  if (!content) return <div className="p-8 text-sm text-slate-600">Loading Visual CMS…</div>;
  const pageBlockItems = pageBlocks();
  return <div className="fixed inset-0 z-40 flex bg-slate-200 text-navy-950">
    <aside className="flex w-[370px] shrink-0 flex-col border-r border-slate-200 bg-white shadow-xl">
      <div className="border-b border-slate-200 p-4"><p className="font-mono text-[10px] uppercase tracking-widest text-accent">Combay Visual CMS</p><h1 className="font-display text-xl font-900">Live Website Editor</h1><p className="mt-1 text-xs leading-5 text-slate-500">Real widget zones, hover controls, section creation, and widget inspector. Drag to the yellow line; click a widget to edit.</p></div>
      <div className="grid grid-cols-3 gap-1 border-b border-slate-200 p-2">{(["pages", "widgets", "style"] as LeftTab[]).map((tab) => <button key={tab} type="button" onClick={() => setLeftTab(tab)} className={`rounded py-2 text-xs font-display font-900 capitalize ${leftTab === tab ? "bg-navy-950 text-white" : "bg-slate-50 text-navy-950"}`}>{tab}</button>)}</div>
      <div className="flex-1 overflow-auto p-3">
        {leftTab === "pages" ? <div className="space-y-2">{PAGES.map((page) => <button key={page.key} type="button" onClick={() => { setPageKey(page.key); setRefreshKey(Date.now()); setSelectedWidget(null); }} className={`w-full rounded px-3 py-2 text-left text-sm font-display font-800 ${pageKey === page.key ? "bg-navy-950 text-white" : "bg-gray-50 text-navy-900 hover:bg-gray-100"}`}><span>{page.label}</span>{!page.editable ? <span className="ml-2 text-xs">🚫</span> : null}<span className="block text-[10px] font-normal opacity-70">{page.editable ? "Editable page" : page.note || "Visible but protected"}</span></button>)}</div> : null}
        {leftTab === "widgets" ? <div className="space-y-3"><p className="text-xs text-slate-500">Drag a widget onto the live page. Use the yellow placement line to add between sections, inside sections, or into section columns. Current target: <strong>{selectedZone || selectedCollection || defaultZone()}</strong>.</p><div className="grid grid-cols-2 gap-2">{WIDGETS.map((widget) => <button key={widget.label} type="button" draggable onDragStart={(event) => { setDraggingWidget(widget); event.dataTransfer.setData("application/x-combay-widget", JSON.stringify(widget)); event.dataTransfer.effectAllowed = "copy"; }} onDragEnd={() => { setDraggingWidget(null); setDropPreview(null); }} onClick={() => addWidget(widget)} className="rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-accent hover:bg-accent/5"><span className="text-xl">{widget.icon}</span><span className="mt-2 block text-xs font-display font-900 text-navy-950">{widget.label}</span><span className="mt-1 block text-[10px] text-slate-500">Click or drag</span></button>)}</div><div className="rounded-xl border border-accent/30 bg-accent/10 p-3 text-xs leading-5 text-navy-950">To place image next to text: add a 2-column section, then drag Image into one column and Text/Button into the other. This is saved in CMS JSON and rendered on the live site.</div></div> : null}
        {leftTab === "style" ? <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-display font-900">Selected</p><p className="mt-1 break-words text-xs text-slate-600">{selectedWidgetLive ? `${selectedWidgetLive.widget.type} widget in ${selectedWidgetLive.zone}` : selectedText || "Click text, a link, or a widget on the website screen."}</p>{selectedLink ? <div className="mt-3 rounded-lg border border-accent/30 bg-white p-2"><label className="block text-[10px] font-display font-900 uppercase tracking-wide text-slate-500">Button/link URL</label><input className="input mt-1 h-9 w-full text-xs" value={selectedLink.href} onChange={(e) => updateSelectedLinkHref(e.target.value)} placeholder="/contact, /shop, mailto:, tel:, https://..." /></div> : null}</div>
          {selectedTextStyleKey && !selectedWidgetLive ? <TextStyleInspector value={content.textStyles?.[selectedTextStyleKey] || {}} update={updateSelectedTextStyle} /> : null}
          {selectedWidgetLive ? <WidgetInspector selected={selectedWidgetLive} update={updateSelectedWidget} deleteWidget={() => deleteVisualWidget(selectedWidgetLive.zone, selectedWidgetLive.index)} duplicateWidget={() => duplicateVisualWidget(selectedWidgetLive.zone, selectedWidgetLive.index)} /> : null}
          {pageKey === "about" ? <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3"><p className="text-xs font-display font-900">About: Built to solve a real problem</p><p className="mt-1 text-[10px] text-slate-500">Controls the balanced image/staff/quote and editorial text section.</p><div className="mt-3 space-y-2"><Field label="Section label"><input className="input h-9 w-full text-xs" value={content.pages.about.sectionEyebrow || ""} onChange={(e) => mutateContent((draft) => { draft.pages.about.sectionEyebrow = e.target.value; })} /></Field><Field label="Heading"><textarea className="input min-h-16 w-full text-xs" value={content.pages.about.sectionHeading || ""} onChange={(e) => mutateContent((draft) => { draft.pages.about.sectionHeading = e.target.value; })} /></Field><Field label="Body text"><textarea className="input min-h-28 w-full text-xs" value={content.pages.about.sectionBody || ""} onChange={(e) => mutateContent((draft) => { draft.pages.about.sectionBody = e.target.value; })} /></Field><Field label="Proof points — one per line"><textarea className="input min-h-20 w-full text-xs" value={(content.pages.about.proofPoints || []).join("\n")} onChange={(e) => mutateContent((draft) => { draft.pages.about.proofPoints = e.target.value.split(/\n+/).map((x) => x.trim()).filter(Boolean).slice(0, 5); })} /></Field><Field label="Image URL"><input className="input h-9 w-full text-xs" value={content.pages.about.quoteImageUrl || ""} onChange={(e) => mutateContent((draft) => { draft.pages.about.quoteImageUrl = e.target.value; })} /></Field><UploadButton accept="image/png,image/jpeg,image/webp,image/svg+xml" label="Upload/replace image" onUploaded={(url) => mutateContent((draft) => { draft.pages.about.quoteImageUrl = url; })} /><Field label="Name"><input className="input h-9 w-full text-xs" value={content.pages.about.quoteName || ""} onChange={(e) => mutateContent((draft) => { draft.pages.about.quoteName = e.target.value; })} /></Field><Field label="Designation"><input className="input h-9 w-full text-xs" value={content.pages.about.quoteDesignation || ""} onChange={(e) => mutateContent((draft) => { draft.pages.about.quoteDesignation = e.target.value; })} /></Field><Field label="Quote text"><textarea className="input min-h-20 w-full text-xs" value={content.pages.about.quoteText || ""} onChange={(e) => mutateContent((draft) => { draft.pages.about.quoteText = e.target.value; })} /></Field></div></div> : null}
                    {pageKey === "home" ? <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3"><p className="text-xs font-display font-900">Built for Engineers background</p><p className="mt-1 text-[10px] text-slate-500">Use this for the light trust/engineering section background.</p><div className="mt-3 flex gap-2"><input className="input h-9 flex-1 text-xs" value={content.trust.backgroundImageUrl || ""} onChange={(e) => mutateContent((draft) => { draft.trust.backgroundImageUrl = e.target.value; })} placeholder="Image URL, colour or gradient" /><button type="button" className="rounded bg-navy-950 px-3 py-2 text-xs font-display font-900 text-white" onClick={() => setTrustBackground(content.trust.backgroundImageUrl || "")}>Use</button></div><div className="mt-3 flex flex-wrap gap-2">{COLOURS.map((colour) => <button key={`trust-${colour}`} type="button" title={colour} onClick={() => setTrustBackground(colour)} className="h-8 w-8 rounded-full border border-slate-300" style={{ background: colour }} />)}</div><div className="mt-2 space-y-2">{GRADIENTS.map((g) => <button key={`trust-${g.label}`} type="button" onClick={() => setTrustBackground(g.value)} className="h-8 w-full rounded border border-slate-200 px-3 text-left text-xs font-display font-800 text-[#2D4F7A]" style={{ backgroundImage: g.value }}>{g.label}</button>)}</div></div> : null}
          <div className="rounded-xl border border-slate-200 p-3"><div className="mb-3 flex items-center justify-between gap-2"><p className="text-xs font-display font-900">Replace background</p><span className="rounded-full bg-accent/20 px-2 py-1 text-[10px] font-800">{pageKey === "home" ? `Hero slide ${selectedHeroSlide + 1}` : "Page hero"}</span></div>{pageKey === "home" ? <label className="mb-3 block"><span className="mb-1 block text-[10px] font-display font-900 uppercase tracking-wide text-slate-500">Home hero slide</span><select className="input h-9 w-full text-xs" value={selectedHeroSlide} onChange={(e) => setSelectedHeroSlide(Number(e.target.value))}>{content.heroSlides.map((slide, index) => <option key={index} value={index}>{index + 1}. {slide.eyebrow || slide.heading || `Hero slide ${index + 1}`}</option>)}</select><span className="mt-1 block text-[10px] text-slate-500">This edits the selected slide background, not only the first slide.</span></label> : null}<div className="flex gap-2"><input className="input h-9 flex-1 text-xs" placeholder="Paste image URL, hex colour or CSS gradient" value={backgroundUrl} onChange={(e) => setBackgroundUrl(e.target.value)} /><button type="button" className="rounded bg-navy-950 px-3 py-2 text-xs font-display font-900 text-white" onClick={() => setHeroBackground(backgroundUrl)}>Use</button></div><div className="mt-3"><UploadButton accept="image/png,image/jpeg,image/webp,image/gif" label="Upload image" onUploaded={(url) => { setBackgroundUrl(url); setHeroBackground(url); }} /></div><p className="mt-4 text-[10px] font-display font-900 uppercase tracking-wide text-slate-500">Brand colours</p><div className="mt-2 flex flex-wrap gap-2">{COLOURS.map((colour) => <button key={colour} type="button" title={colour} onClick={() => setHeroBackground(colour)} className="h-8 w-8 rounded-full border border-slate-300" style={{ background: colour }} />)}</div><p className="mt-4 text-[10px] font-display font-900 uppercase tracking-wide text-slate-500">Brand gradients</p><div className="mt-2 space-y-2">{GRADIENTS.map((g) => <button key={g.label} type="button" onClick={() => setHeroBackground(g.value)} className="h-10 w-full rounded border border-slate-200 px-3 text-left text-xs font-display font-800 text-white" style={{ backgroundImage: g.value }}>{g.label}</button>)}</div></div>
          <div className="rounded-xl border border-slate-200 p-3"><p className="mb-3 text-xs font-display font-900">Delete / restore whole sections</p>{pageKey === "home" ? <div className="space-y-2">{HOME_SECTIONS.map(([key,label]) => <div key={key} className="flex items-center justify-between gap-2 rounded bg-slate-50 p-2"><span className="text-xs">{label}</span><button type="button" onClick={() => toggleHomeSection(key)} className={`rounded px-2 py-1 text-[11px] font-800 ${isHomeHidden(key) ? "bg-accent text-navy-950" : "bg-red-50 text-red-700"}`}>{isHomeHidden(key) ? "Restore" : "Delete"}</button></div>)}</div> : cmsPageKey(pageKey) ? <div className="space-y-2">{PAGE_SECTIONS.map(([key,label]) => <div key={key} className="flex items-center justify-between gap-2 rounded bg-slate-50 p-2"><span className="text-xs">{label}</span><button type="button" onClick={() => togglePageSection(key)} className={`rounded px-2 py-1 text-[11px] font-800 ${pageSectionVisible(key) ? "bg-red-50 text-red-700" : "bg-accent text-navy-950"}`}>{pageSectionVisible(key) ? "Delete" : "Restore"}</button></div>)}</div> : <p className="text-xs text-slate-500">This page has policy text editing only.</p>}</div>
          {cmsPageKey(pageKey) ? <div className="rounded-xl border border-slate-200 p-3"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-display font-900">Native cards / section items</p><button type="button" onClick={() => addCollectionItem("page.blocks", widgetByType("card"))} className="rounded bg-navy-950 px-2 py-1 text-[11px] font-800 text-white">+ Add card</button></div><div className="space-y-2">{pageBlockItems.map((block, index) => <div key={`${block.title}-${index}`} className="rounded bg-slate-50 p-2"><p className="text-xs font-800">{block.title}</p><p className="text-[10px] text-slate-500">Auto width: {block.width || "quarter"}</p><div className="mt-2 flex gap-2"><button type="button" onClick={() => duplicateCollectionItem("page.blocks", index)} className="rounded bg-white px-2 py-1 text-[11px] font-800 text-navy-950 ring-1 ring-slate-200">Duplicate</button><button type="button" onClick={() => deleteCollectionItem("page.blocks", index)} className="rounded bg-red-50 px-2 py-1 text-[11px] font-800 text-red-700">Delete</button></div></div>)}</div></div> : null}
          {cmsPageKey(pageKey) || pageKey === "home" ? <div className="rounded-xl border border-slate-200 p-3"><p className="mb-3 text-xs font-display font-900">Hero buttons</p><div className="flex gap-2"><button type="button" onClick={() => deleteHeroButton("primary")} className="rounded bg-red-50 px-2 py-1 text-[11px] font-800 text-red-700">Delete primary</button><button type="button" onClick={() => deleteHeroButton("secondary")} className="rounded bg-red-50 px-2 py-1 text-[11px] font-800 text-red-700">Delete secondary</button></div></div> : null}
          {policyKey(pageKey) ? <div className="rounded-xl border border-slate-200 bg-accent/10 p-3 text-xs leading-5 text-navy-950">This policy page is CMS-backed. Edit heading, date and paragraphs directly on the page, then save.</div> : null}
        </div> : null}
      </div>
      <div className="border-t border-slate-200 p-3"><button type="button" onClick={save} disabled={saving} className="w-full rounded bg-accent px-4 py-3 text-sm font-display font-900 text-navy-950 hover:bg-accent-dark disabled:opacity-60">{saving ? "Saving…" : "Save website"}</button>{message ? <p className="mt-2 text-xs text-slate-600">{message}</p> : null}</div>
    </aside>
    <main className="flex min-w-0 flex-1 flex-col"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-white px-4 py-3"><div><p className="text-xs text-slate-500">Editing</p><h2 className="font-display text-lg font-900 text-navy-950">{config.label} {config.editable ? "" : "— protected"}</h2></div><div className="flex flex-wrap items-center gap-2"><select className="input h-9 w-36 text-xs" value={device} onChange={(e) => setDevice(e.target.value as DeviceMode)}><option value="desktop">PC desktop</option><option value="tablet">Tablet</option><option value="mobile">Mobile</option></select><select className="input h-9 w-28 text-xs" value={String(zoom)} onChange={(e) => setZoom(Number(e.target.value))}><option value="0.65">65%</option><option value="0.78">78%</option><option value="0.9">90%</option><option value="1">100%</option></select><a href={config.path} target="_blank" rel="noreferrer" className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-display font-900 text-navy-950 hover:border-accent">Open live page</a></div></div><div className="flex-1 overflow-auto bg-slate-300 p-6"><div className="mx-auto origin-top rounded-xl bg-white shadow-2xl ring-1 ring-slate-400/40" style={{ width: canvasWidth, minHeight: 760, transform: `scale(${zoom})`, transformOrigin: "top center", marginBottom: -(760 * (1 - zoom)) }}><div className="relative h-[760px] overflow-hidden rounded-xl bg-white" onDragOver={(event) => { if (draggingWidget) { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; setDropPreview(dropPreviewAtCanvasPoint(event.clientX, event.clientY)); } }} onDragLeave={() => setDropPreview(null)} onDrop={(event) => { if (!draggingWidget) return; event.preventDefault(); dropWidgetOnCanvas(draggingWidget, event.clientX, event.clientY); }}>
      {!config.editable ? <div className="pointer-events-none absolute right-4 top-4 z-20 rounded-full bg-navy-950 px-3 py-2 text-xs font-display font-900 text-white shadow-lg">🚫 Visible only — managed elsewhere</div> : null}
      {draggingWidget && config.editable ? <div className="pointer-events-none absolute inset-0 z-30 bg-navy-950/5"><div className="absolute left-0 right-0 h-[3px] bg-accent shadow-[0_0_0_4px_rgba(238,179,44,.22)]" style={{ top: dropPreview?.y ?? 120 }} /><div className="absolute left-1/2 -translate-x-1/2 rounded-full bg-navy-950 px-4 py-2 text-xs font-display font-900 text-white shadow-2xl" style={{ top: Math.max(16, (dropPreview?.y ?? 120) - 42) }}>{dropPreview?.label || `Drop to add ${draggingWidget.label}`}</div></div> : null}
      <iframe ref={iframeRef} key={`${pageKey}-${refreshKey}-${device}`} src={previewUrl(config.path, refreshKey)} title={`${config.label} visual CMS`} className={`h-full w-full border-0 bg-white ${draggingWidget ? "pointer-events-none" : ""}`} onLoad={injectEditorStable} />
    </div></div></div></main>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1 block text-[10px] font-display font-900 uppercase tracking-wide text-slate-500">{label}</span>{children}</label>; }
function TextStyleInspector({ value, update }: { value: CmsTextStyle; update: (changes: CmsTextStyle) => void }) {
  const input = "input h-9 w-full text-xs";
  return <div className="rounded-xl border border-accent/30 bg-white p-3">
    <p className="text-xs font-display font-900">Selected text style</p>
    <p className="mt-1 text-[10px] text-slate-500">Applies to this CMS-linked text on the live page after saving.</p>
    <div className="mt-3 grid grid-cols-2 gap-2">
      <Field label="Font size"><select className={input} value={value.fontSize || ""} onChange={(e) => update({ fontSize: e.target.value })}>{FONT_SIZES.map((size) => <option key={size.label} value={size.value}>{size.label}</option>)}</select></Field>
      <Field label="Font family"><select className={input} value={value.fontFamily || ""} onChange={(e) => update({ fontFamily: e.target.value })}>{FONT_FAMILIES.map((font) => <option key={font.label} value={font.value}>{font.label}</option>)}</select></Field>
      <Field label="Weight"><select className={input} value={value.fontWeight || ""} onChange={(e) => update({ fontWeight: e.target.value })}><option value="">Default</option><option value="400">Regular</option><option value="600">Semi-bold</option><option value="700">Bold</option><option value="900">Heavy</option></select></Field>
      <Field label="Colour"><input className={input} value={value.colour || ""} onChange={(e) => update({ colour: e.target.value })} placeholder="#2D4F7A" /></Field>
    </div>
    <label className="mt-3 flex items-center gap-2 text-xs font-800 text-navy-950"><input type="checkbox" checked={!!value.italic} onChange={(e) => update({ italic: e.target.checked })} /> Italic</label>
  </div>;
}

function WidgetInspector({ selected, update, deleteWidget, duplicateWidget }: { selected: SelectedWidget; update: (changes: Partial<VisualWidget>) => void; deleteWidget: () => void; duplicateWidget: () => void }) {
  const w = selected.widget;
  const input = "input h-9 w-full text-xs";
  return <div className="rounded-xl border border-accent/30 bg-white p-3"><div className="mb-3 flex items-center justify-between gap-2"><div><p className="text-xs font-display font-900 capitalize">{w.type} widget</p><p className="text-[10px] text-slate-500">{selected.zone}</p></div><div className="flex gap-1"><button type="button" onClick={duplicateWidget} className="rounded bg-slate-100 px-2 py-1 text-[10px] font-800">Copy</button><button type="button" onClick={deleteWidget} className="rounded bg-red-50 px-2 py-1 text-[10px] font-800 text-red-700">Delete</button></div></div><div className="space-y-3">
    {w.type !== "spacer" && w.type !== "divider" ? <Field label="Title / button text"><input className={input} value={w.type === "button" ? (w.text || "") : (w.title || "")} onChange={(e) => update(w.type === "button" ? { text: e.target.value, title: e.target.value } : { title: e.target.value })} /></Field> : null}
    {["card","promotion","section","video","image"].includes(w.type) ? <Field label="Body / caption"><textarea className="input min-h-20 w-full text-xs" value={w.type === "video" || w.type === "image" ? (w.caption || "") : (w.body || "")} onChange={(e) => update(w.type === "video" || w.type === "image" ? { caption: e.target.value } : { body: e.target.value })} /></Field> : null}
    {w.type === "text" ? <><Field label="Text content"><textarea className="input min-h-20 w-full text-xs" value={w.text || ""} onChange={(e) => update({ text: e.target.value })} /></Field><Field label="Text type"><select className={input} value={w.textKind || "paragraph"} onChange={(e) => update({ textKind: e.target.value as VisualWidget["textKind"] })}><option value="heading">Heading</option><option value="subheading">Subheading</option><option value="paragraph">Paragraph/body</option><option value="caption">Small caption</option></select></Field></> : null}
    {["button","card","promotion"].includes(w.type) ? <><Field label="Button / CTA label"><input className={input} value={w.type === "button" ? (w.text || "") : (w.linkLabel || "")} onChange={(e) => update(w.type === "button" ? { text: e.target.value, title: e.target.value } : { linkLabel: e.target.value })} /></Field><Field label="Button / URL"><input className={input} value={w.url || ""} onChange={(e) => update({ url: safeHrefInput(e.target.value) })} /></Field><div className="grid grid-cols-2 gap-2"><Field label="Style"><select className={input} value={w.buttonStyle || "primary"} onChange={(e) => update({ buttonStyle: e.target.value as VisualWidget["buttonStyle"] })}><option value="primary">Primary</option><option value="secondary">Secondary</option><option value="outline">Outline</option></select></Field><Field label="New tab"><select className={input} value={w.openInNewTab ? "yes" : "no"} onChange={(e) => update({ openInNewTab: e.target.value === "yes" })}><option value="no">Same tab</option><option value="yes">New tab</option></select></Field></div></> : null}
    {w.type === "promotion" ? <Field label="Promo code"><input className={input} value={w.promoCode || ""} onChange={(e) => update({ promoCode: e.target.value })} /></Field> : null}
    {w.type === "video" ? <><Field label="Video URL"><input className={input} value={w.videoUrl || ""} onChange={(e) => update({ videoUrl: e.target.value })} /></Field><div className="flex gap-2"><UploadButton accept="video/mp4,video/webm,video/quicktime" label="Upload video" onUploaded={(url) => update({ videoUrl: url })} /><UploadButton accept="image/png,image/jpeg,image/webp" label="Upload thumbnail" onUploaded={(url) => update({ thumbnailUrl: url })} /></div><div className="grid grid-cols-3 gap-2 text-xs"><label><input type="checkbox" checked={!!w.autoplay} onChange={(e) => update({ autoplay: e.target.checked })} /> Autoplay</label><label><input type="checkbox" checked={!!w.muted} onChange={(e) => update({ muted: e.target.checked })} /> Muted</label><label><input type="checkbox" checked={!!w.loop} onChange={(e) => update({ loop: e.target.checked })} /> Loop</label></div></> : null}
    {w.type === "image" || w.type === "card" ? <><Field label="Image URL"><input className={input} value={w.imageUrl || ""} onChange={(e) => update({ imageUrl: e.target.value })} /></Field><UploadButton accept="image/png,image/jpeg,image/webp,image/gif" label="Upload image" onUploaded={(url) => update({ imageUrl: url })} /></> : null}
    {w.type === "section" ? <div className="grid grid-cols-2 gap-2"><Field label="Columns"><select className={input} value={String(w.columns || 1)} onChange={(e) => update({ columns: Number(e.target.value) })}><option value="1">1 column</option><option value="2">2 columns</option><option value="3">3 columns</option><option value="4">4 columns</option></select></Field><Field label="Background"><select className={input} value={w.sectionVariant || "plain"} onChange={(e) => update({ sectionVariant: e.target.value as VisualWidget["sectionVariant"] })}><option value="plain">Plain</option><option value="soft">Soft grey</option><option value="accent">Accent tint</option><option value="dark">Dark</option></select></Field></div> : null}
    {w.type === "spacer" ? <Field label="Height"><input className={input} type="number" min={8} max={260} value={w.height || 48} onChange={(e) => update({ height: Number(e.target.value) })} /></Field> : null}
    {w.type === "divider" ? <div className="grid grid-cols-2 gap-2"><Field label="Thickness"><input className={input} type="number" min={1} max={8} value={w.thickness || 1} onChange={(e) => update({ thickness: Number(e.target.value) })} /></Field><Field label="Colour"><input className={input} value={w.colour || "#E5E7EB"} onChange={(e) => update({ colour: e.target.value })} /></Field></div> : null}
    {["text","button","card","promotion","section"].includes(w.type) ? <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><p className="mb-2 text-[10px] font-display font-900 uppercase tracking-wide text-slate-500">Text style</p><div className="grid grid-cols-2 gap-2"><Field label="Font size"><select className={input} value={w.fontSize || ""} onChange={(e) => update({ fontSize: e.target.value })}>{FONT_SIZES.map((size) => <option key={size.label} value={size.value}>{size.label}</option>)}</select></Field><Field label="Font family"><select className={input} value={w.fontFamily || ""} onChange={(e) => update({ fontFamily: e.target.value })}>{FONT_FAMILIES.map((font) => <option key={font.label} value={font.value}>{font.label}</option>)}</select></Field><Field label="Weight"><select className={input} value={w.fontWeight || ""} onChange={(e) => update({ fontWeight: e.target.value })}><option value="">Default</option><option value="400">Regular</option><option value="600">Semi-bold</option><option value="700">Bold</option><option value="900">Heavy</option></select></Field><Field label="Colour"><input className={input} value={w.textColour || ""} onChange={(e) => update({ textColour: e.target.value })} placeholder="#2D4F7A" /></Field></div><label className="mt-2 flex items-center gap-2 text-xs font-800 text-navy-950"><input type="checkbox" checked={!!w.italic} onChange={(e) => update({ italic: e.target.checked })} /> Italic</label></div> : null}
    <div className="grid grid-cols-2 gap-2"><Field label="Width"><select className={input} value={w.width || "third"} onChange={(e) => update({ width: e.target.value })}><option value="full">Full</option><option value="threeQuarter">3/4</option><option value="twoThird">2/3</option><option value="half">1/2</option><option value="third">1/3</option><option value="quarter">1/4</option></select></Field><Field label="Align"><select className={input} value={w.align || "left"} onChange={(e) => update({ align: e.target.value as VisualWidget["align"] })}><option value="left">Left</option><option value="center">Centre</option><option value="right">Right</option></select></Field></div>
    <div className="grid grid-cols-2 gap-2"><Field label="Top spacing"><input className={input} type="number" value={w.marginTop || 0} onChange={(e) => update({ marginTop: Number(e.target.value) })} /></Field><Field label="Bottom spacing"><input className={input} type="number" value={w.marginBottom || 0} onChange={(e) => update({ marginBottom: Number(e.target.value) })} /></Field></div>
  </div></div>;
}
