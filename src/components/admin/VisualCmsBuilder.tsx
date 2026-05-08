"use client";

import { useEffect, useRef, useState } from "react";
import type { SiteContent, CmsBlock, CmsStep, FaqItem } from "@/lib/siteContent";

type PageKey = "home" | "repair" | "assetRecovery" | "about" | "contact" | "faq" | "shop" | "cart" | "checkout" | "portal" | "manufacturers" | "terms" | "privacy" | "returns" | "warranty" | "payment";
type DeviceMode = "desktop" | "tablet" | "mobile";
type LeftTab = "pages" | "widgets" | "style";
type PageConfig = { key: PageKey; label: string; path: string; editable: boolean; note?: string };
type WidgetTemplate = { label: string; icon: string; blockType: string; title: string; subtitle: string; body: string; background: string; width: string; linkLabel?: string; linkHref?: string };

type CollectionKey = "page.blocks" | "page.steps" | "faq.previewItems" | "home.promotionStrip" | `faq.groupItems:${string}`;
type DropPreview = { collection: CollectionKey; label: string; y: number; mode: "before" | "inside" | "after" };
type SelectedLink = { text: string; href: string };

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

const DEVICE_WIDTH: Record<DeviceMode, number> = { desktop: 1180, tablet: 820, mobile: 390 };
const WIDGETS: WidgetTemplate[] = [
  { label: "Card", icon: "▣", blockType: "card", title: "New card", subtitle: "Editable card", body: "Use this card for a service, benefit, process item or content block.", background: "white", width: "quarter", linkLabel: "Learn more", linkHref: "/contact" },
  { label: "FAQ", icon: "?", blockType: "faq", title: "New FAQ question", subtitle: "FAQ", body: "Add the answer here. This answer is visible in Visual CMS and appears as a dropdown on the public page.", background: "white", width: "full" },
  { label: "Button", icon: "⬚", blockType: "button", title: "Call to action", subtitle: "Button block", body: "Use the button link below for enquiries, quote requests or page navigation.", background: "accent", width: "half", linkLabel: "Button link", linkHref: "/contact" },
  { label: "Text", icon: "T", blockType: "text", title: "New text block", subtitle: "Editable heading", body: "Click text on the canvas to edit it.", background: "white", width: "half" },
  { label: "Image", icon: "🖼", blockType: "image", title: "Image block", subtitle: "Upload or paste image", body: "Use Replace background or widget image upload.", background: "white", width: "half" },
  { label: "Video", icon: "▶", blockType: "video", title: "Video block", subtitle: "Video area", body: "Add a video URL from the styling tab.", background: "dark", width: "half" },
  { label: "Promotion banner", icon: "🏷", blockType: "promotion", title: "Promotion banner", subtitle: "Offer / campaign", body: "Highlight an offer, stock arrival or customer campaign.", background: "accent", width: "full", linkLabel: "View offer", linkHref: "/shop" },
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
function cmsPageKey(pageKey: PageKey): keyof SiteContent["pages"] | null { if (["home", "repair", "assetRecovery", "about", "contact"].includes(pageKey)) return pageKey as keyof SiteContent["pages"]; return null; }
function policyKey(pageKey: PageKey): keyof SiteContent["policies"] | null { if (["terms", "privacy", "returns", "warranty", "payment"].includes(pageKey)) return pageKey as keyof SiteContent["policies"]; return null; }
function blockFromWidget(widget: WidgetTemplate): CmsBlock { return { icon: widget.icon, title: widget.title, subtitle: widget.subtitle, body: widget.body, imageUrl: "", linkLabel: widget.linkLabel || "", linkHref: widget.linkHref || "#", blockType: widget.blockType === "faq" ? "card" : widget.blockType, width: widget.width, align: "left", background: widget.background, animation: "none" }; }
function widgetByType(type: string): WidgetTemplate { return WIDGETS.find((widget) => widget.blockType === type) || WIDGETS[0]; }
function faqFromWidget(widget?: WidgetTemplate): FaqItem {
  const title = widget?.blockType === "faq" ? widget.title : "New FAQ question";
  const body = widget?.blockType === "faq" ? widget.body : "Add the answer here. This answer is visible in Visual CMS so you can edit it before publishing.";
  return { question: title, answer: body };
}
function stepFromWidget(widget?: WidgetTemplate, index = 0): CmsStep { return { number: String(index + 1).padStart(2, "0"), title: widget?.title || "New step", body: widget?.body || "Describe this step.", imageUrl: "" }; }
function autoWidth(count: number) { if (count <= 1) return "full"; if (count === 2) return "half"; if (count === 3) return "third"; return "quarter"; }
function normaliseBlockWidths(blocks: CmsBlock[]) { const width = autoWidth(blocks.length); return blocks.map((b) => b.blockType === "promotion" || b.width === "full" && blocks.length > 1 ? { ...b, width: blocks.length > 4 ? "half" : width } : { ...b, width }); }

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
    if (typeof value === "string" && lower.includes("href") && value.trim() === oldHref.trim()) {
      (target as Record<string, unknown>)[key] = newHref;
      return true;
    }
    if (Array.isArray(value)) {
      for (const item of value) if (updateFirstHrefMatch(item, oldHref, newHref)) return true;
    } else if (value && typeof value === "object" && updateFirstHrefMatch(value, oldHref, newHref)) return true;
  }
  return false;
}

function safeHrefInput(value: string) {
  const clean = value.trim();
  if (!clean) return "#";
  if (clean.startsWith("/") || clean.startsWith("#") || clean.startsWith("mailto:") || clean.startsWith("tel:") || clean.startsWith("http://") || clean.startsWith("https://")) return clean;
  return `/${clean.replace(/^\/+/, "")}`;
}

function ImageUploadButton({ onUploaded }: { onUploaded: (url: string) => void }) {
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
  const [selectedLink, setSelectedLink] = useState<SelectedLink | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<CollectionKey | null>(null);
  const [draggingWidget, setDraggingWidget] = useState<WidgetTemplate | null>(null);
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const config = pageConfig(pageKey);
  const canvasWidth = DEVICE_WIDTH[device];

  useEffect(() => { let cancelled = false; fetch("/api/admin/content", { cache: "no-store" }).then((r) => r.json()).then((data) => { if (!cancelled && data?.content) setContent(data.content); }).catch(() => setMessage("Could not load CMS content.")); return () => { cancelled = true; }; }, []);


  useEffect(() => { if (iframeRef.current?.contentDocument) injectEditorStable(); }, [selectedCollection, pageKey, content]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data || {};
      if (data.type === "VCMS_TEXT_SELECTED") {
        setSelectedText(String(data.text || ""));
        if (data.href) setSelectedLink({ text: String(data.text || "Button/link"), href: String(data.href || "#") });
      }
      if (data.type === "VCMS_COLLECTION_SELECTED") { setSelectedCollection(String(data.collection || "page.blocks") as CollectionKey); setMessage(`Target selected: ${String(data.label || data.collection || "section")}. Click or drop a widget to add it here.`); }
      if (data.type === "VCMS_TEXT_UPDATE" && content && data.oldText && data.newText && String(data.oldText).trim() !== String(data.newText).trim()) {
        const next = cloneContent(content);
        if (updateFirstStringMatch(next, String(data.oldText), String(data.newText))) { setContent(next); setMessage("Text changed on canvas. Click Save website to publish."); }
        else setMessage("This text is visible for exact preview but is not linked to CMS storage yet.");
      }
      if (data.type === "VCMS_ADD_ITEM") {
        const incomingCollection = String(data.collection || "page.blocks") as CollectionKey;
        const incomingWidget = data.widget as WidgetTemplate | undefined;
        addCollectionItem(collectionForWidget(incomingCollection, incomingWidget), incomingWidget);
      }
      if (data.type === "VCMS_DELETE_ITEM") deleteCollectionItem(String(data.collection || "page.blocks") as CollectionKey, Number(data.index));
      if (data.type === "VCMS_DUPLICATE_ITEM") duplicateCollectionItem(String(data.collection || "page.blocks") as CollectionKey, Number(data.index));
    }
    window.addEventListener("message", onMessage); return () => window.removeEventListener("message", onMessage);
  }, [content, pageKey]);

  function updateSelectedLinkHref(hrefValue: string) {
    if (!content || !selectedLink) return;
    const nextHref = safeHrefInput(hrefValue);
    const draft = cloneContent(content);
    if (updateFirstHrefMatch(draft, selectedLink.href, nextHref)) {
      setSelectedLink({ ...selectedLink, href: nextHref });
      setContent(draft);
      setMessage("Button/link URL updated in draft. Click Save website to publish.");
      const doc = iframeRef.current?.contentDocument;
      doc?.querySelectorAll<HTMLAnchorElement>(`a[href=\"${CSS.escape(selectedLink.href)}\"]`).forEach((a) => a.setAttribute("href", nextHref));
    } else {
      setMessage("This button/link is visible on the page but its URL is not linked to CMS storage yet.");
    }
  }

  async function autoSaveDraft(draft: SiteContent) {
    try {
      const response = await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: draft }) });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.error || "Save failed");
      setContent(data.content);
      setRefreshKey(Date.now());
      setMessage("Canvas updated and saved. Live preview refreshed.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed.");
    }
  }

  function mutateContent(mutator: (draft: SiteContent) => void, refresh = false) {
    if (!content) return;
    const draft = cloneContent(content);
    mutator(draft);
    setContent(draft);
    if (refresh) void autoSaveDraft(draft);
  }
  function currentBlocks(c = content): CmsBlock[] { const key = cmsPageKey(pageKey); return key && c ? c.pages[key].blocks : []; }
  function setBlocks(blocks: CmsBlock[]) { const key = cmsPageKey(pageKey); if (!key) return; mutateContent((draft) => { draft.pages[key].blocks = normaliseBlockWidths(blocks); }, true); setMessage("Cards changed and layout was auto-adjusted. Save website to publish."); }
  function defaultCollection(): CollectionKey {
    if (selectedCollection) return selectedCollection;
    if (pageKey === "faq") return "faq.groupItems:sales";
    if (pageKey === "home") return "page.blocks";
    return "page.blocks";
  }
  function collectionForWidget(collection: CollectionKey, widget?: WidgetTemplate | null): CollectionKey {
    if (!widget) return collection;
    if (widget.blockType === "faq") return collection.includes("faq") ? collection : (pageKey === "faq" ? "faq.groupItems:sales" : "faq.previewItems");
    if (collection.includes("faq")) return "page.blocks";
    return collection;
  }
  function addWidget(widget: WidgetTemplate) { addCollectionItem(collectionForWidget(defaultCollection(), widget), widget); }
  function duplicateBlock(index: number) { duplicateCollectionItem("page.blocks", index); }
  function deleteBlock(index: number) { deleteCollectionItem("page.blocks", index); }
  function addSameSizeCard() { addCollectionItem("page.blocks", WIDGETS[0]); }

  function addCollectionItem(collection: CollectionKey, widget?: WidgetTemplate) {
    if (!content || !config.editable) { setMessage("This page is visible for accuracy but protected from widget editing."); return; }
    const key = cmsPageKey(pageKey);
    mutateContent((draft) => {
      if (collection === "page.blocks") {
        if (!key) return;
        draft.pages[key].blocks = normaliseBlockWidths([...(draft.pages[key].blocks || []), blockFromWidget(widget || WIDGETS[0])]);
      } else if (collection === "page.steps") {
        if (!key) return;
        const next = [...(draft.pages[key].steps || []), stepFromWidget(widget, draft.pages[key].steps?.length || 0)];
        draft.pages[key].steps = next.map((step, index) => ({ ...step, number: String(index + 1).padStart(2, "0") }));
      } else if (collection === "faq.previewItems") {
        draft.faq.previewItems = [...(draft.faq.previewItems || []), faqFromWidget(widget)];
      } else if (collection === "home.promotionStrip") {
        const block = blockFromWidget(widget || widgetByType("promotion"));
        block.blockType = "promotion";
        block.background = "accent";
        block.width = "full";
        draft.pages.home.blocks = normaliseBlockWidths([...(draft.pages.home.blocks || []), block]);
        draft.hiddenSections = draft.hiddenSections || {};
        draft.hiddenSections.home = (draft.hiddenSections.home || []).filter((x) => x !== "promotionStrip");
      } else if (collection.startsWith("faq.groupItems:")) {
        const groupKey = collection.split(":")[1] || draft.faq.groups[0]?.key;
        const group = draft.faq.groups.find((g) => g.key === groupKey) || draft.faq.groups[0];
        if (group) group.items = [...(group.items || []), faqFromWidget(widget)];
      }
    }, true);
    setMessage("Item added. The layout auto-adjusted; save website to publish.");
  }

  function deleteCollectionItem(collection: CollectionKey, index: number) {
    if (!Number.isFinite(index) || index < 0) return;
    const key = cmsPageKey(pageKey);
    mutateContent((draft) => {
      if (collection === "page.blocks") {
        if (!key) return;
        draft.pages[key].blocks = normaliseBlockWidths((draft.pages[key].blocks || []).filter((_, i) => i !== index));
      } else if (collection === "page.steps") {
        if (!key) return;
        draft.pages[key].steps = (draft.pages[key].steps || []).filter((_, i) => i !== index).map((step, i) => ({ ...step, number: String(i + 1).padStart(2, "0") }));
      } else if (collection === "faq.previewItems") {
        draft.faq.previewItems = (draft.faq.previewItems || []).filter((_, i) => i !== index);
      } else if (collection === "home.promotionStrip") {
        draft.hiddenSections = draft.hiddenSections || {};
        const existing = new Set(draft.hiddenSections.home || []);
        existing.add("promotionStrip");
        draft.hiddenSections.home = Array.from(existing);
      } else if (collection.startsWith("faq.groupItems:")) {
        const groupKey = collection.split(":")[1];
        const group = draft.faq.groups.find((g) => g.key === groupKey) || draft.faq.groups[0];
        if (group) group.items = (group.items || []).filter((_, i) => i !== index);
      }
    }, true);
    setMessage("Item deleted. Remaining items were auto-adjusted; save website to publish.");
  }

  function duplicateCollectionItem(collection: CollectionKey, index: number) {
    const key = cmsPageKey(pageKey);
    mutateContent((draft) => {
      if (collection === "page.blocks") {
        if (!key) return;
        const items = draft.pages[key].blocks || [];
        const source = items[index];
        if (!source) return;
        const clone = { ...source, title: `${source.title} copy` };
        draft.pages[key].blocks = normaliseBlockWidths([...items.slice(0, index + 1), clone, ...items.slice(index + 1)]);
      } else if (collection === "page.steps") {
        if (!key) return;
        const items = draft.pages[key].steps || [];
        const source = items[index];
        if (!source) return;
        draft.pages[key].steps = [...items.slice(0, index + 1), { ...source, title: `${source.title} copy` }, ...items.slice(index + 1)].map((step, i) => ({ ...step, number: String(i + 1).padStart(2, "0") }));
      } else if (collection === "faq.previewItems") {
        const items = draft.faq.previewItems || [];
        const source = items[index];
        if (!source) return;
        draft.faq.previewItems = [...items.slice(0, index + 1), { ...source, question: `${source.question} copy` }, ...items.slice(index + 1)];
      } else if (collection === "home.promotionStrip") {
        const block = blockFromWidget(widgetByType("promotion"));
        block.title = "Promotion banner copy";
        block.width = "full";
        draft.pages.home.blocks = normaliseBlockWidths([...(draft.pages.home.blocks || []), block]);
      } else if (collection.startsWith("faq.groupItems:")) {
        const groupKey = collection.split(":")[1];
        const group = draft.faq.groups.find((g) => g.key === groupKey) || draft.faq.groups[0];
        if (!group) return;
        const source = group.items[index];
        if (!source) return;
        group.items = [...group.items.slice(0, index + 1), { ...source, question: `${source.question} copy` }, ...group.items.slice(index + 1)];
      }
    }, true);
    setMessage("Item duplicated. Layout auto-adjusted; save website to publish.");
  }

  function isHomeHidden(section: string) { return Boolean(content?.hiddenSections?.home?.includes(section)); }
  function toggleHomeSection(section: string) { mutateContent((draft) => { draft.hiddenSections = draft.hiddenSections || {}; const current = new Set(draft.hiddenSections.home || []); current.has(section) ? current.delete(section) : current.add(section); draft.hiddenSections.home = Array.from(current); }, true); setMessage("Section visibility changed. Save website to publish."); }
  function togglePageSection(section: string) { const key = cmsPageKey(pageKey); if (!key) return; mutateContent((draft) => { const page = draft.pages[key]; const current = Array.isArray(page.sectionOrder) && page.sectionOrder.length ? [...page.sectionOrder] : PAGE_SECTIONS.map(([s]) => s); page.sectionOrder = current.includes(section) ? current.filter((s) => s !== section) : [...current, section]; }, true); setMessage("Section changed. Save website to publish."); }
  function pageSectionVisible(section: string) { const key = cmsPageKey(pageKey); if (!key || !content) return false; const order = content.pages[key].sectionOrder || PAGE_SECTIONS.map(([s]) => s); return order.includes(section); }
  function deleteHeroButton(slot: "primary" | "secondary") { mutateContent((draft) => { const key = cmsPageKey(pageKey); if (pageKey === "home") { if (slot === "primary") draft.heroSlides[0].cta1Label = HIDDEN; else draft.heroSlides[0].cta2Label = HIDDEN; } else if (key) { if (slot === "primary") draft.pages[key].primaryLabel = HIDDEN; else draft.pages[key].secondaryLabel = HIDDEN; } }, true); setMessage("Button removed. Save website to publish."); }

  function applyBackgroundToPreview(value: string) {
    const doc = iframeRef.current?.contentDocument; if (!doc) return;
    const section = doc.querySelector<HTMLElement>("main section"); if (!section) return;
    section.style.backgroundSize = "cover"; section.style.backgroundPosition = "center";
    if (value.startsWith("linear-gradient") || value.startsWith("radial-gradient")) { section.style.setProperty("background-image", value, "important"); section.style.backgroundColor = ""; return; }
    if (value.startsWith("#") || value.startsWith("rgb") || value.startsWith("hsl")) { section.style.setProperty("background-image", "none", "important"); section.style.setProperty("background-color", value, "important"); return; }
    section.style.setProperty("background-image", `linear-gradient(rgba(3,14,33,.88),rgba(3,14,33,.88)), url(${value})`, "important");
  }
  function setHeroBackground(value: string) { if (!content) return; const clean = value.trim(); if (!clean) return; mutateContent((draft) => { if (pageKey === "home") draft.heroSlides[0].backgroundImageUrl = clean; if (pageKey === "faq") draft.faq.backgroundImageUrl = clean; const key = cmsPageKey(pageKey); if (key && key !== "home") draft.pages[key].backgroundImageUrl = clean; }); applyBackgroundToPreview(clean); setMessage("Background changed on screen and in CMS draft. Save website to publish."); }
  async function save() { if (!content) return; setSaving(true); setMessage(""); try { const response = await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) }); const data = await response.json().catch(() => null); if (!response.ok || !data?.ok) throw new Error(data?.error || "Save failed"); setContent(data.content); setRefreshKey(Date.now()); setMessage("Saved. Live canvas refreshed."); } catch (err) { setMessage(err instanceof Error ? err.message : "Save failed."); } finally { setSaving(false); } }

  function postCanvasMessage(message: Record<string, unknown>) {
    window.postMessage(message, window.location.origin);
  }

  function injectEditor() {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) return;
    const targetWindow = doc.defaultView;
    const send = (payload: Record<string, unknown>) => {
      try { targetWindow?.parent?.postMessage(payload, window.location.origin); }
      catch { postCanvasMessage(payload); }
    };

    let style = doc.getElementById("vcms-live-editor-style") as HTMLStyleElement | null;
    if (!style) {
      style = doc.createElement("style");
      style.id = "vcms-live-editor-style";
      doc.head.appendChild(style);
    }
    style.textContent = `[data-vcms-text="1"]{outline:1px dashed transparent;cursor:text}[data-vcms-text="1"]:hover{outline-color:#EEB32C;outline-offset:3px}[data-vcms-text="1"]:focus{outline:2px solid #EEB32C!important;outline-offset:3px;box-shadow:0 0 0 3px rgba(238,179,44,.18)}[data-vcms-protected="1"]{position:relative;cursor:not-allowed!important}[data-vcms-protected="1"]:hover:after{content:"🚫 protected system area";position:absolute;z-index:2147483647;top:8px;right:8px;background:#111827;color:#fff;border-radius:999px;padding:6px 10px;font:700 11px Arial;pointer-events:none}[data-vcms-collection]{position:relative!important;outline:2px dashed transparent;outline-offset:6px;min-height:44px}[data-vcms-collection]:hover{outline-color:rgba(238,179,44,.75)}[data-vcms-collection].vcms-target-selected{outline-color:#EEB32C!important;box-shadow:0 0 0 5px rgba(238,179,44,.15)}.vcms-add{position:absolute;right:12px;top:12px;z-index:2147483647;border:0;border-radius:999px;background:#EEB32C;color:#030E21;font:900 12px Arial;padding:8px 12px;box-shadow:0 6px 20px rgba(0,0,0,.22);cursor:pointer;opacity:0;pointer-events:none;transform:translateY(-4px);transition:opacity .15s ease,transform .15s ease}.vcms-item-tools{position:absolute;right:8px;top:8px;z-index:2147483646;display:flex;gap:4px;opacity:0;pointer-events:none;transform:translateY(-4px);transition:opacity .15s ease,transform .15s ease}.vcms-item-wrap{position:relative!important}.vcms-item-wrap:hover>.vcms-item-tools,[data-vcms-collection]:hover>.vcms-add,[data-vcms-collection].vcms-target-selected>.vcms-add{opacity:1;pointer-events:auto;transform:translateY(0)}.vcms-mini-btn{border:0;border-radius:999px;background:#030E21;color:#fff;font:800 10px Arial;padding:6px 8px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.2)}.vcms-mini-btn-danger{background:#991B1B}.vcms-drop-hint{position:absolute;left:12px;top:12px;z-index:2147483645;border-radius:999px;background:#030E21;color:#fff;font:800 11px Arial;padding:7px 10px;box-shadow:0 4px 14px rgba(0,0,0,.16);pointer-events:none;opacity:0;transform:translateY(-4px);transition:opacity .15s ease,transform .15s ease}[data-vcms-collection]:hover>.vcms-drop-hint,[data-vcms-collection].vcms-target-selected>.vcms-drop-hint{opacity:1;transform:translateY(0)}.vcms-placement-zone{position:absolute;left:0;right:0;height:3px;background:#EEB32C;box-shadow:0 0 0 3px rgba(238,179,44,.18);z-index:2147483647;pointer-events:none}.vcms-edit-link{outline:1px dotted rgba(238,179,44,.75);outline-offset:2px}`;

    if (!config.editable) {
      doc.querySelectorAll<HTMLElement>("main section, main form, main a, main button").forEach((el) => { el.dataset.vcmsProtected = "1"; });
      return;
    }

    // Defensive fallback: older/public components may not yet have explicit markers after deployment.
    // Mark obvious live sections so Visual CMS controls are not silently missing.
    doc.querySelectorAll<HTMLElement>("main section").forEach((section) => {
      const text = (section.textContent || "").toLowerCase();
      if (!section.dataset.vcmsCollection) {
        if (text.includes("frequently asked questions")) section.dataset.vcmsCollection = pageKey === "faq" ? "faq.groupItems:sales" : "faq.previewItems";
        else if (text.includes("what we do") || text.includes("everything you need")) section.dataset.vcmsCollection = "page.blocks";
        else if (text.includes("current combay offers") || text.includes("copy the code")) section.dataset.vcmsCollection = "home.promotionStrip";
        else if (text.includes("how it works")) section.dataset.vcmsCollection = "page.steps";
      }
    });

    doc.querySelectorAll<HTMLElement>("[data-vcms-collection]").forEach((section) => {
      const collection = (section.dataset.vcmsCollection || "page.blocks") as CollectionKey;
      section.classList.toggle("vcms-target-selected", selectedCollection === collection);
      section.addEventListener("click", (event) => {
        if ((event.target as HTMLElement).closest(".vcms-add,.vcms-item-tools")) return;
        send({ type: "VCMS_COLLECTION_SELECTED", collection, label: collection });
      });
      if (!section.querySelector(":scope > .vcms-add")) {
        const add = doc.createElement("button");
        add.type = "button";
        add.className = "vcms-add";
        add.textContent = collection.includes("faq") ? "+ Add FAQ" : "+ Add similar item";
        add.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          send({ type: "VCMS_ADD_ITEM", collection });
        });
        section.appendChild(add);
      }
      if (!section.querySelector(":scope > .vcms-drop-hint")) {
        const hint = doc.createElement("div");
        hint.className = "vcms-drop-hint";
        hint.textContent = collection.includes("faq") ? "FAQ group" : "Editable section";
        section.appendChild(hint);
      }
      section.addEventListener("dragover", (event) => {
        event.preventDefault();
        section.style.outlineColor = "#EEB32C";
      });
      section.addEventListener("dragleave", () => { section.style.outlineColor = ""; });
      section.addEventListener("drop", (event) => {
        event.preventDefault();
        section.style.outlineColor = "";
        const raw = event.dataTransfer?.getData("application/x-combay-widget");
        let widget: WidgetTemplate | null = null;
        try { widget = raw ? JSON.parse(raw) : null; } catch { widget = null; }
        send({ type: "VCMS_ADD_ITEM", collection, widget });
      });
    });

    // If public cards have not been marked individually, mark common direct children as editable items.
    doc.querySelectorAll<HTMLElement>("[data-vcms-collection]").forEach((section) => {
      const collection = section.dataset.vcmsCollection || "page.blocks";
      if (section.querySelector("[data-vcms-item]")) return;
      const candidates = Array.from(section.querySelectorAll<HTMLElement>(".rounded-xl,.rounded-lg,details,article,button")).filter((el) => !el.closest(".vcms-add,.vcms-drop-hint") && (el.textContent || "").trim().length > 8);
      candidates.slice(0, 12).forEach((el, index) => {
        el.dataset.vcmsItem = collection;
        el.dataset.vcmsIndex = String(index);
      });
    });

    doc.querySelectorAll<HTMLElement>("[data-vcms-item]").forEach((item) => {
      const collection = item.dataset.vcmsItem || "page.blocks";
      const index = Number(item.dataset.vcmsIndex || "0");
      item.classList.add("vcms-item-wrap");
      if (!item.querySelector(":scope > .vcms-item-tools")) {
        const tools = doc.createElement("div");
        tools.className = "vcms-item-tools";
        const add = doc.createElement("button");
        add.type = "button";
        add.className = "vcms-mini-btn";
        add.textContent = "+";
        add.title = "Add another item in this same style";
        add.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); send({ type: "VCMS_ADD_ITEM", collection }); });
        const duplicate = doc.createElement("button");
        duplicate.type = "button";
        duplicate.className = "vcms-mini-btn";
        duplicate.textContent = "Copy";
        duplicate.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); send({ type: "VCMS_DUPLICATE_ITEM", collection, index }); });
        const del = doc.createElement("button");
        del.type = "button";
        del.className = "vcms-mini-btn vcms-mini-btn-danger";
        del.textContent = "Delete";
        del.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); send({ type: "VCMS_DELETE_ITEM", collection, index }); });
        tools.appendChild(add); tools.appendChild(duplicate); tools.appendChild(del); item.appendChild(tools);
      }
    });

    const textSelector = "main h1,main h2,main h3,main h4,main p,main li,main label,main a,main button,footer p,footer a,footer span,footer h4";
    doc.querySelectorAll<HTMLElement>(textSelector).forEach((el) => {
      if (!el.textContent?.trim() || el.closest("script,style,svg,.vcms-item-tools,.vcms-add,.vcms-drop-hint")) return;
      el.dataset.vcmsText = "1";
      const linkEl = (el.closest("a") || (el.tagName.toLowerCase() === "a" ? el : null)) as HTMLAnchorElement | null;
      if (linkEl?.href) el.classList.add("vcms-edit-link");
      const initial = el.textContent.trim();
      el.setAttribute("contenteditable", "true");
      el.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        send({ type: "VCMS_TEXT_SELECTED", text: el.textContent?.trim() || "", href: linkEl?.getAttribute("href") || "" });
      });
      el.addEventListener("focus", () => send({ type: "VCMS_TEXT_SELECTED", text: el.textContent?.trim() || "", href: linkEl?.getAttribute("href") || "" }));
      el.addEventListener("blur", () => {
        const next = el.textContent?.trim() || "";
        if (next && next !== initial) send({ type: "VCMS_TEXT_UPDATE", oldText: initial, newText: next });
      });
    });
    doc.querySelectorAll<HTMLElement>("[data-system-protected], [data-admin-only], .stripe, .checkout, [href*='/checkout'], [href*='/cart']").forEach((el) => { el.dataset.vcmsProtected = "1"; });
  }

  function injectEditorStable() {
    injectEditor();
    window.setTimeout(injectEditor, 250);
    window.setTimeout(injectEditor, 800);
    window.setTimeout(injectEditor, 1600);
  }

  function pageDefaultCollection(): CollectionKey {
    if (pageKey === "faq") return "faq.groupItems:sales";
    return "page.blocks";
  }

  function collectionLabel(collection: CollectionKey) {
    if (collection.includes("faq")) return "FAQ items";
    if (collection === "page.steps") return "Process/steps";
    if (collection === "home.promotionStrip") return "Promotion banner";
    return "Cards/content";
  }

  function dropPreviewAtCanvasPoint(clientX: number, clientY: number): DropPreview {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc) return { collection: pageDefaultCollection(), label: collectionLabel(pageDefaultCollection()), y: 120, mode: "inside" };
    const rect = iframe.getBoundingClientRect();
    if (!rect.width || !rect.height) return { collection: pageDefaultCollection(), label: collectionLabel(pageDefaultCollection()), y: 120, mode: "inside" };
    const scaleX = iframe.offsetWidth / rect.width;
    const scaleY = iframe.offsetHeight / rect.height;
    const x = Math.max(0, Math.min(iframe.offsetWidth, (clientX - rect.left) * scaleX));
    const y = Math.max(0, Math.min(iframe.offsetHeight, (clientY - rect.top) * scaleY));
    const elements = doc.elementsFromPoint(x, y) as HTMLElement[];
    let collectionElement = elements.map((el) => el.closest?.("[data-vcms-item],[data-vcms-collection]") as HTMLElement | null).find(Boolean) || null;

    const collections = Array.from(doc.querySelectorAll<HTMLElement>("[data-vcms-collection]")).map((el) => {
      const r = el.getBoundingClientRect();
      return { el, top: r.top, bottom: r.bottom, height: r.height || 1, center: r.top + (r.height || 1) / 2 };
    }).filter((entry) => entry.height > 20);

    if (!collectionElement && collections.length) {
      const containing = collections.find((entry) => y >= entry.top && y <= entry.bottom);
      const nearest = containing || collections.sort((a, b) => Math.abs(a.center - y) - Math.abs(b.center - y))[0];
      collectionElement = nearest.el;
    }

    const itemCollection = collectionElement?.dataset?.vcmsItem;
    const sectionCollection = collectionElement?.dataset?.vcmsCollection;
    let collection = (itemCollection || sectionCollection || pageDefaultCollection()) as CollectionKey;

    // Only use FAQ when the pointer is genuinely in an FAQ section. This prevents accidental FAQ drops.
    if (collection.includes("faq")) {
      const faqHost = collectionElement?.closest?.("[data-vcms-collection*='faq']") as HTMLElement | null;
      if (!faqHost) collection = pageDefaultCollection();
    }

    const host = (collectionElement?.closest?.("[data-vcms-collection]") as HTMLElement | null) || collections.find((entry) => (entry.el.dataset.vcmsCollection || "") === collection)?.el || null;
    const hostRect = host?.getBoundingClientRect();
    const rel = hostRect ? (y - hostRect.top) / Math.max(hostRect.height, 1) : 0.5;
    const mode: DropPreview["mode"] = rel < 0.18 ? "before" : rel > 0.82 ? "after" : "inside";
    const lineY = hostRect ? (mode === "before" ? hostRect.top : mode === "after" ? hostRect.bottom : Math.max(hostRect.top + 8, Math.min(y, hostRect.bottom - 8))) : y;

    return { collection, label: `${mode === "inside" ? "Add inside" : mode === "before" ? "Add near top of" : "Add near bottom of"} ${collectionLabel(collection)}`, y: lineY, mode };
  }

  function collectionAtCanvasPoint(clientX: number, clientY: number): CollectionKey {
    return dropPreviewAtCanvasPoint(clientX, clientY).collection;
  }

  function dropWidgetOnCanvas(widget: WidgetTemplate | null, clientX?: number, clientY?: number) {
    if (!widget) return;
    const preview = typeof clientX === "number" && typeof clientY === "number" ? dropPreviewAtCanvasPoint(clientX, clientY) : null;
    const target = preview ? preview.collection : defaultCollection();
    const resolved = collectionForWidget(target, widget);
    setSelectedCollection(resolved);
    addCollectionItem(resolved, widget);
    setDraggingWidget(null);
    setDropPreview(null);
  }

  if (!content) return <div className="p-8 text-sm text-slate-600">Loading Visual CMS…</div>;
  const pageBlocks = currentBlocks();
  return <div className="fixed inset-0 z-40 flex bg-slate-200 text-navy-950">
    <aside className="flex w-[350px] shrink-0 flex-col border-r border-slate-200 bg-white shadow-xl">
      <div className="border-b border-slate-200 p-4"><p className="font-mono text-[10px] uppercase tracking-widest text-accent">Combay Visual CMS</p><h1 className="font-display text-xl font-900">Live Website Editor</h1><p className="mt-1 text-xs leading-5 text-slate-500">Click or drag widgets into a matching section. Use the + signs on the live canvas to add more items of the same style.</p></div>
      <div className="grid grid-cols-3 gap-1 border-b border-slate-200 p-2">{(["pages", "widgets", "style"] as LeftTab[]).map((tab) => <button key={tab} type="button" onClick={() => setLeftTab(tab)} className={`rounded py-2 text-xs font-display font-900 capitalize ${leftTab === tab ? "bg-navy-950 text-white" : "bg-slate-50 text-navy-950"}`}>{tab}</button>)}</div>
      <div className="flex-1 overflow-auto p-3">
        {leftTab === "pages" ? <div className="space-y-2">{PAGES.map((page) => <button key={page.key} type="button" onClick={() => { setPageKey(page.key); setRefreshKey(Date.now()); }} className={`w-full rounded px-3 py-2 text-left text-sm font-display font-800 ${pageKey === page.key ? "bg-navy-950 text-white" : "bg-gray-50 text-navy-900 hover:bg-gray-100"}`}><span>{page.label}</span>{!page.editable ? <span className="ml-2 text-xs">🚫</span> : null}<span className="block text-[10px] font-normal opacity-70">{page.editable ? "Editable page" : page.note || "Visible but protected"}</span></button>)}</div> : null}
        {leftTab === "widgets" ? <div className="space-y-3"><p className="text-xs text-slate-500">Click a widget to add to the selected section, or drag it onto the page. A yellow placement line shows where it will land. Current target: <strong>{selectedCollection || defaultCollection()}</strong>.</p><div className="grid grid-cols-2 gap-2">{WIDGETS.map((widget) => <button key={widget.label} type="button" draggable onDragStart={(event) => { setDraggingWidget(widget); event.dataTransfer.setData("application/x-combay-widget", JSON.stringify(widget)); event.dataTransfer.effectAllowed = "copy"; }} onDragEnd={() => { setDraggingWidget(null); setDropPreview(null); }} onClick={() => addWidget(widget)} className="rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-accent hover:bg-accent/5"><span className="text-xl">{widget.icon}</span><span className="mt-2 block text-xs font-display font-900 text-navy-950">{widget.label}</span><span className="mt-1 block text-[10px] text-slate-500">Click or drag</span></button>)}</div><div className="rounded-xl border border-accent/30 bg-accent/10 p-3 text-xs leading-5 text-navy-950">Card and button widgets now adapt to the target section. If 3 cards become 4, the layout changes to a consistent four-column row on desktop; larger sets wrap cleanly into rows.</div></div> : null}
        {leftTab === "style" ? <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-display font-900">Selected text</p><p className="mt-1 break-words text-xs text-slate-600">{selectedText || "Click text on the website screen."}</p>{selectedLink ? <div className="mt-3 rounded-lg border border-accent/30 bg-white p-2"><label className="block text-[10px] font-display font-900 uppercase tracking-wide text-slate-500">Button/link URL</label><input className="input mt-1 h-9 w-full text-xs" value={selectedLink.href} onChange={(e) => updateSelectedLinkHref(e.target.value)} placeholder="/contact, /shop, mailto:, tel:, https://..." /><p className="mt-1 text-[10px] text-slate-500">Works for all CMS-linked buttons and text links.</p></div> : null}</div>
          <div className="rounded-xl border border-slate-200 p-3"><div className="mb-3 flex items-center justify-between gap-2"><p className="text-xs font-display font-900">Replace background</p><span className="rounded-full bg-accent/20 px-2 py-1 text-[10px] font-800">Hero</span></div><div className="flex gap-2"><input className="input h-9 flex-1 text-xs" placeholder="Paste image URL" value={backgroundUrl} onChange={(e) => setBackgroundUrl(e.target.value)} /><button type="button" className="rounded bg-navy-950 px-3 py-2 text-xs font-display font-900 text-white" onClick={() => setHeroBackground(backgroundUrl)}>Use</button></div><div className="mt-3"><ImageUploadButton onUploaded={(url) => { setBackgroundUrl(url); setHeroBackground(url); }} /></div><p className="mt-4 text-[10px] font-display font-900 uppercase tracking-wide text-slate-500">Colours</p><div className="mt-2 flex flex-wrap gap-2">{COLOURS.map((colour) => <button key={colour} type="button" title={colour} onClick={() => setHeroBackground(colour)} className="h-8 w-8 rounded-full border border-slate-300" style={{ background: colour }} />)}</div><p className="mt-4 text-[10px] font-display font-900 uppercase tracking-wide text-slate-500">Gradients</p><div className="mt-2 space-y-2">{GRADIENTS.map((g) => <button key={g.label} type="button" onClick={() => setHeroBackground(g.value)} className="h-10 w-full rounded border border-slate-200 px-3 text-left text-xs font-display font-800 text-white" style={{ backgroundImage: g.value }}>{g.label}</button>)}</div></div>
          <div className="rounded-xl border border-slate-200 p-3"><p className="mb-3 text-xs font-display font-900">Delete / restore whole sections</p>{pageKey === "home" ? <div className="space-y-2">{HOME_SECTIONS.map(([key,label]) => <div key={key} className="flex items-center justify-between gap-2 rounded bg-slate-50 p-2"><span className="text-xs">{label}</span><button type="button" onClick={() => toggleHomeSection(key)} className={`rounded px-2 py-1 text-[11px] font-800 ${isHomeHidden(key) ? "bg-accent text-navy-950" : "bg-red-50 text-red-700"}`}>{isHomeHidden(key) ? "Restore" : "Delete"}</button></div>)}</div> : cmsPageKey(pageKey) ? <div className="space-y-2">{PAGE_SECTIONS.map(([key,label]) => <div key={key} className="flex items-center justify-between gap-2 rounded bg-slate-50 p-2"><span className="text-xs">{label}</span><button type="button" onClick={() => togglePageSection(key)} className={`rounded px-2 py-1 text-[11px] font-800 ${pageSectionVisible(key) ? "bg-red-50 text-red-700" : "bg-accent text-navy-950"}`}>{pageSectionVisible(key) ? "Delete" : "Restore"}</button></div>)}</div> : <p className="text-xs text-slate-500">This page has policy text editing only.</p>}</div>
          {cmsPageKey(pageKey) ? <div className="rounded-xl border border-slate-200 p-3"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-display font-900">Cards / section items</p><button type="button" onClick={addSameSizeCard} className="rounded bg-navy-950 px-2 py-1 text-[11px] font-800 text-white">+ Add card</button></div><div className="space-y-2">{pageBlocks.map((block, index) => <div key={`${block.title}-${index}`} className="rounded bg-slate-50 p-2"><p className="text-xs font-800">{block.title}</p><p className="text-[10px] text-slate-500">Auto width: {block.width || "quarter"}</p><div className="mt-2 flex gap-2"><button type="button" onClick={() => duplicateBlock(index)} className="rounded bg-white px-2 py-1 text-[11px] font-800 text-navy-950 ring-1 ring-slate-200">Duplicate</button><button type="button" onClick={() => deleteBlock(index)} className="rounded bg-red-50 px-2 py-1 text-[11px] font-800 text-red-700">Delete</button></div></div>)}</div></div> : null}
          {pageKey === "faq" ? <div className="rounded-xl border border-slate-200 p-3"><p className="mb-3 text-xs font-display font-900">FAQ items</p><div className="flex flex-wrap gap-2"><button type="button" onClick={() => addCollectionItem("faq.groupItems:sales")} className="rounded bg-navy-950 px-2 py-1 text-[11px] font-800 text-white">+ Add FAQ</button><button type="button" onClick={() => addCollectionItem("faq.previewItems")} className="rounded bg-white px-2 py-1 text-[11px] font-800 text-navy-950 ring-1 ring-slate-200">+ Add homepage FAQ preview</button></div></div> : null}
          {cmsPageKey(pageKey) || pageKey === "home" ? <div className="rounded-xl border border-slate-200 p-3"><p className="mb-3 text-xs font-display font-900">Buttons</p><div className="flex gap-2"><button type="button" onClick={() => deleteHeroButton("primary")} className="rounded bg-red-50 px-2 py-1 text-[11px] font-800 text-red-700">Delete primary button</button><button type="button" onClick={() => deleteHeroButton("secondary")} className="rounded bg-red-50 px-2 py-1 text-[11px] font-800 text-red-700">Delete secondary button</button></div></div> : null}
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
