"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type CmsBlock = {
  icon: string;
  title: string;
  subtitle: string;
  body: string;
  imageUrl: string;
  linkLabel: string;
  linkHref: string;
};

type CmsStep = { number: string; title: string; body: string; imageUrl: string };

type CmsPage = {
  eyebrow: string;
  heading: string;
  accent: string;
  body: string;
  backgroundImageUrl: string;
  heroImageUrl: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  sectionEyebrow: string;
  sectionHeading: string;
  sectionBody: string;
  blocks: CmsBlock[];
  steps: CmsStep[];
  ctaHeading: string;
  ctaBody: string;
  ctaPrimaryLabel: string;
  ctaPrimaryHref: string;
  ctaSecondaryLabel: string;
  ctaSecondaryHref: string;
};

type SiteContent = {
  heroSlides: Array<Record<string, string>>;
  trust: Record<string, unknown>;
  finalCta: Record<string, unknown>;
  contact: Record<string, string>;
  footer: Record<string, string>;
  pages: {
    home: CmsPage;
    repair: CmsPage;
    assetRecovery: CmsPage;
    about: CmsPage;
    contact: CmsPage;
  };
  faq: Record<string, unknown>;
};

type PageKey = keyof SiteContent["pages"];
type BuilderKind = "block" | "step";

type DraftBlock = {
  name: string;
  icon: string;
  subtitle: string;
  body: string;
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

const ADD_BLOCKS: DraftBlock[] = [
  { name: "Text / info card", icon: "✦", subtitle: "Information block", body: "Add a short paragraph for this website section." },
  { name: "Image card", icon: "🖼", subtitle: "Image block", body: "Upload or paste an image URL, then add the supporting text." },
  { name: "Icon feature", icon: "⚙️", subtitle: "Feature highlight", body: "Use this for a service, benefit, category or trust point." },
  { name: "Promotion banner", icon: "🏷", subtitle: "Promotion", body: "Use this to highlight an offer, discount code, seasonal campaign or landing page CTA.", linkLabel: "View offer", linkHref: "/shop" },
  { name: "Slider item", icon: "▣", subtitle: "Slider / carousel item", body: "Use multiple blocks like this to build a simple slider-style content group." },
  { name: "Animation / visual cue", icon: "✨", subtitle: "Animation placeholder", body: "Use this to mark where a motion/animation asset should appear on the public page." },
];

const emptyBlock = (draft?: DraftBlock): CmsBlock => ({
  icon: draft?.icon || "✦",
  title: draft?.name || "New content block",
  subtitle: draft?.subtitle || "Editable section",
  body: draft?.body || "Add body text here.",
  imageUrl: "",
  linkLabel: draft?.linkLabel || "",
  linkHref: draft?.linkHref || "#",
});

const emptyStep = (): CmsStep => ({
  number: "01",
  title: "New step",
  body: "Describe this step.",
  imageUrl: "",
});

function imageUploadLabel(uploading: boolean) {
  return uploading ? "Uploading…" : "Upload image";
}

function MiniImageField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError("");
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
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input className="input text-xs" placeholder="Paste image URL" value={value || ""} onChange={(event) => onChange(event.target.value)} />
        <label className="btn-outline text-xs cursor-pointer whitespace-nowrap text-center">
          {imageUploadLabel(uploading)}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploading} onChange={(event) => upload(event.target.files?.[0] || null)} />
        </label>
      </div>
      {value ? (
        <div className="flex items-center gap-3">
          <img src={value} alt="Preview" className="h-12 w-20 object-cover rounded border border-gray-200" />
          <button type="button" className="text-xs text-red-600" onClick={() => onChange("")}>Remove image</button>
        </div>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function Field({ label, value, onChange, textarea = false }: { label: string; value: string; onChange: (value: string) => void; textarea?: boolean }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-display font-700 text-gray-500 uppercase tracking-wide">{label}</span>
      {textarea ? (
        <textarea className="textarea text-sm" rows={4} value={value || ""} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input className="input text-sm" value={value || ""} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

export default function VisualContentBuilderPage() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [pageKey, setPageKey] = useState<PageKey>("home");
  const [selected, setSelected] = useState<{ kind: BuilderKind; index: number } | null>(null);
  const [drag, setDrag] = useState<{ kind: BuilderKind; index: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/content", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && data?.content) setContent(data.content);
      })
      .catch(() => setMessage("Could not load website content."));
    return () => {
      cancelled = true;
    };
  }, []);

  const page = content?.pages[pageKey] || null;
  const pagePath = useMemo(() => PAGES.find((item) => item.key === pageKey)?.path || "/", [pageKey]);

  function updatePage(next: CmsPage) {
    setContent((current) => current ? { ...current, pages: { ...current.pages, [pageKey]: next } } : current);
  }

  function updateBlock(index: number, value: CmsBlock) {
    if (!page) return;
    updatePage({ ...page, blocks: page.blocks.map((block, position) => position === index ? value : block) });
  }

  function updateStep(index: number, value: CmsStep) {
    if (!page) return;
    updatePage({ ...page, steps: page.steps.map((step, position) => position === index ? value : step) });
  }

  function removeItem(kind: BuilderKind, index: number) {
    if (!page) return;
    if (kind === "block") updatePage({ ...page, blocks: page.blocks.filter((_, position) => position !== index) });
    if (kind === "step") updatePage({ ...page, steps: page.steps.filter((_, position) => position !== index) });
    setSelected(null);
  }

  function moveItem(kind: BuilderKind, from: number, to: number) {
    if (!page || from === to) return;
    const key = kind === "block" ? "blocks" : "steps";
    const items = [...page[key]] as Array<CmsBlock | CmsStep>;
    const [picked] = items.splice(from, 1);
    items.splice(to, 0, picked);
    updatePage({ ...page, [key]: items } as CmsPage);
    setSelected({ kind, index: to });
  }

  async function save() {
    if (!content) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.error || "Could not save visual layout.");
      setContent(data.content);
      setPreviewKey((value) => value + 1);
      setMessage("Visual CMS changes saved. The preview has been refreshed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save visual layout.");
    } finally {
      setSaving(false);
    }
  }

  function addBlock(draft?: DraftBlock) {
    if (!page) return;
    const next = emptyBlock(draft);
    updatePage({ ...page, blocks: [...page.blocks, next] });
    setSelected({ kind: "block", index: page.blocks.length });
  }

  function addStep() {
    if (!page) return;
    const next = emptyStep();
    updatePage({ ...page, steps: [...page.steps, next] });
    setSelected({ kind: "step", index: page.steps.length });
  }

  const selectedBlockIndex = selected?.kind === "block" ? selected.index : -1;
  const selectedStepIndex = selected?.kind === "step" ? selected.index : -1;
  const selectedBlock = selectedBlockIndex >= 0 && page ? page.blocks[selectedBlockIndex] : null;
  const selectedStep = selectedStepIndex >= 0 && page ? page.steps[selectedStepIndex] : null;

  if (!content || !page) {
    return <div className="bg-white border border-gray-200 rounded-xl p-6 text-sm text-gray-500">Loading visual website builder…</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent mb-1">Visual CMS</p>
          <h1 className="font-display font-800 text-navy-900 text-2xl">Website builder</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-3xl">View the live website inside admin, drag page cards/steps to reorder them, upload images, and add common website content blocks without editing code.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/content" className="btn-outline">Classic CMS</Link>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save & refresh preview"}</button>
        </div>
      </div>

      {message ? <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">{message}</div> : null}

      <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-wrap gap-2">
        {PAGES.map((item) => (
          <button
            key={item.key}
            onClick={() => { setPageKey(item.key); setSelected(null); setPreviewKey((value) => value + 1); }}
            className={`px-4 py-2 rounded-lg border text-sm font-display font-700 ${pageKey === item.key ? "bg-navy-950 text-white border-navy-950" : "bg-white text-gray-600 border-gray-200"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid xl:grid-cols-[420px_1fr] gap-5 items-start">
        <div className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-display font-800 text-navy-900 mb-1">Page structure</h2>
            <p className="text-xs text-gray-500 mb-4">Drag with your mouse to change the order of cards and process steps. Save to update the public website.</p>

            <div className="space-y-2">
              <div className="text-[11px] font-display font-800 text-gray-400 uppercase tracking-wide">Content cards</div>
              {page.blocks.length ? page.blocks.map((block, index) => (
                <div
                  key={`${block.title}-${index}`}
                  draggable
                  onDragStart={() => setDrag({ kind: "block", index })}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => { if (drag?.kind === "block") moveItem("block", drag.index, index); setDrag(null); }}
                  onClick={() => setSelected({ kind: "block", index })}
                  className={`cursor-move rounded-lg border p-3 transition-all ${selected?.kind === "block" && selected.index === index ? "border-accent bg-amber-50" : "border-gray-200 bg-gray-50 hover:border-accent/50"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display font-700 text-navy-900 text-sm truncate">☰ {block.title || `Card ${index + 1}`}</p>
                      <p className="text-xs text-gray-500 truncate">{block.subtitle || "No subtitle"}</p>
                    </div>
                    <button type="button" className="text-xs text-red-600" onClick={(event) => { event.stopPropagation(); removeItem("block", index); }}>Delete</button>
                  </div>
                </div>
              )) : <p className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg p-3">No cards yet. Add one below.</p>}

              <div className="pt-3 grid grid-cols-2 gap-2">
                {ADD_BLOCKS.map((draft) => (
                  <button key={draft.name} className="btn-outline text-xs text-left justify-start" onClick={() => addBlock(draft)}>{draft.icon} {draft.name}</button>
                ))}
              </div>
            </div>

            <div className="space-y-2 mt-6">
              <div className="text-[11px] font-display font-800 text-gray-400 uppercase tracking-wide">Process steps</div>
              {page.steps.length ? page.steps.map((step, index) => (
                <div
                  key={`${step.title}-${index}`}
                  draggable
                  onDragStart={() => setDrag({ kind: "step", index })}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => { if (drag?.kind === "step") moveItem("step", drag.index, index); setDrag(null); }}
                  onClick={() => setSelected({ kind: "step", index })}
                  className={`cursor-move rounded-lg border p-3 transition-all ${selected?.kind === "step" && selected.index === index ? "border-accent bg-amber-50" : "border-gray-200 bg-gray-50 hover:border-accent/50"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display font-700 text-navy-900 text-sm truncate">☰ {step.number} — {step.title}</p>
                      <p className="text-xs text-gray-500 truncate">{step.body || "No body text"}</p>
                    </div>
                    <button type="button" className="text-xs text-red-600" onClick={(event) => { event.stopPropagation(); removeItem("step", index); }}>Delete</button>
                  </div>
                </div>
              )) : <p className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg p-3">No process steps on this page.</p>}
              <button className="btn-outline text-xs" onClick={addStep}>Add process step</button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-display font-800 text-navy-900 mb-1">Edit selected item</h2>
            <p className="text-xs text-gray-500 mb-4">Click a card or step above, then edit its text and image here.</p>

            {!selected ? <p className="text-sm text-gray-400">No item selected.</p> : null}

            {selectedBlock ? (
              <div className="space-y-3">
                <Field label="Icon or emoji" value={selectedBlock.icon} onChange={(value) => updateBlock(selectedBlockIndex, { ...selectedBlock, icon: value })} />
                <Field label="Heading" value={selectedBlock.title} onChange={(value) => updateBlock(selectedBlockIndex, { ...selectedBlock, title: value })} />
                <Field label="Sub-heading" value={selectedBlock.subtitle} onChange={(value) => updateBlock(selectedBlockIndex, { ...selectedBlock, subtitle: value })} />
                <Field label="Body text" textarea value={selectedBlock.body} onChange={(value) => updateBlock(selectedBlockIndex, { ...selectedBlock, body: value })} />
                <MiniImageField value={selectedBlock.imageUrl} onChange={(value) => updateBlock(selectedBlockIndex, { ...selectedBlock, imageUrl: value })} />
                <div className="grid md:grid-cols-2 gap-3">
                  <Field label="Button text" value={selectedBlock.linkLabel} onChange={(value) => updateBlock(selectedBlockIndex, { ...selectedBlock, linkLabel: value })} />
                  <Field label="Button link" value={selectedBlock.linkHref} onChange={(value) => updateBlock(selectedBlockIndex, { ...selectedBlock, linkHref: value })} />
                </div>
              </div>
            ) : null}

            {selectedStep ? (
              <div className="space-y-3">
                <Field label="Step number" value={selectedStep.number} onChange={(value) => updateStep(selectedStepIndex, { ...selectedStep, number: value })} />
                <Field label="Heading" value={selectedStep.title} onChange={(value) => updateStep(selectedStepIndex, { ...selectedStep, title: value })} />
                <Field label="Body text" textarea value={selectedStep.body} onChange={(value) => updateStep(selectedStepIndex, { ...selectedStep, body: value })} />
                <MiniImageField value={selectedStep.imageUrl} onChange={(value) => updateStep(selectedStepIndex, { ...selectedStep, imageUrl: value })} />
              </div>
            ) : null}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden sticky top-6">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div>
              <p className="font-display font-800 text-navy-900 text-sm">Live website preview</p>
              <p className="text-xs text-gray-500">This shows the public website as customers see it. Save to refresh with your latest changes.</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-outline text-xs" onClick={() => setPreviewKey((value) => value + 1)}>Refresh preview</button>
              <Link href={pagePath} target="_blank" className="btn-outline text-xs">Open page ↗</Link>
            </div>
          </div>
          <div className="bg-gray-200 p-3">
            <div className="bg-white rounded-lg overflow-hidden border border-gray-300 shadow-sm" style={{ height: "72vh" }}>
              <iframe
                key={`${pagePath}-${previewKey}`}
                ref={iframeRef}
                src={pagePath}
                title="Website preview"
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-sm">
        <strong className="font-display">Note:</strong> this visual CMS safely controls the editable CMS sections already used by the public pages. Header/navigation, checkout, account areas, and admin-only pages remain protected code areas so the public site cannot be accidentally broken from the editor.
      </div>
    </div>
  );
}
