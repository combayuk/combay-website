"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Eye, ImagePlus, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";

type Resource = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  type: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  coverImageUrl: string;
  gallery: string[];
  videoUrl: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  isFeatured: boolean;
  publishedAt: string | null;
  updatedAt: string;
};

type FormState = {
  id: string | null;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  type: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  coverImageUrl: string;
  galleryText: string;
  videoUrl: string;
  tagsText: string;
  seoTitle: string;
  seoDescription: string;
  isFeatured: boolean;
};

const emptyForm: FormState = {
  id: null,
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  type: "technical-article",
  status: "DRAFT",
  coverImageUrl: "",
  galleryText: "",
  videoUrl: "",
  tagsText: "",
  seoTitle: "",
  seoDescription: "",
  isFeatured: false,
};

const resourceTypes = [
  { value: "technical-article", label: "Technical article" },
  { value: "product-guide", label: "Product guide" },
  { value: "installation-guide", label: "Installation guide" },
  { value: "working-demo", label: "Working product demo" },
  { value: "troubleshooting", label: "Troubleshooting" },
  { value: "buying-guide", label: "Buying guide" },
];

function toForm(resource: Resource): FormState {
  return {
    id: resource.id,
    title: resource.title || "",
    slug: resource.slug || "",
    excerpt: resource.excerpt || "",
    content: resource.content || "",
    type: resource.type || "technical-article",
    status: resource.status || "DRAFT",
    coverImageUrl: resource.coverImageUrl || "",
    galleryText: Array.isArray(resource.gallery) ? resource.gallery.join("\n") : "",
    videoUrl: resource.videoUrl || "",
    tagsText: Array.isArray(resource.tags) ? resource.tags.join(", ") : "",
    seoTitle: resource.seoTitle || "",
    seoDescription: resource.seoDescription || "",
    isFeatured: Boolean(resource.isFeatured),
  };
}

function formPayload(form: FormState) {
  return {
    title: form.title,
    slug: form.slug,
    excerpt: form.excerpt,
    content: form.content,
    type: form.type,
    status: form.status,
    coverImageUrl: form.coverImageUrl,
    gallery: form.galleryText.split(/\n|,/).map((item) => item.trim()).filter(Boolean),
    videoUrl: form.videoUrl,
    tags: form.tagsText.split(",").map((item) => item.trim()).filter(Boolean),
    seoTitle: form.seoTitle,
    seoDescription: form.seoDescription,
    isFeatured: form.isFeatured,
  };
}

function statusClass(status: string) {
  if (status === "PUBLISHED") return "bg-green-50 text-green-700 border-green-100";
  if (status === "ARCHIVED") return "bg-slate-100 text-slate-500 border-slate-200";
  return "bg-amber-50 text-amber-700 border-amber-100";
}

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const stats = useMemo(() => ({
    total: resources.length,
    published: resources.filter((item) => item.status === "PUBLISHED").length,
    draft: resources.filter((item) => item.status === "DRAFT").length,
    videos: resources.filter((item) => item.videoUrl).length,
  }), [resources]);

  async function load() {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (status !== "all") params.set("status", status);
    if (type !== "all") params.set("type", type);
    params.set("pageSize", "60");
    const response = await fetch(`/api/resources?${params.toString()}`, { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!result.ok) setError(result.error || "Could not load resources.");
    else setResources(result.resources || []);
    setLoading(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => { load().catch(() => setError("Could not load resources.")); }, 150);
    return () => clearTimeout(timer);
  }, [query, status, type]);

  function newResource() {
    setForm(emptyForm);
    setDrawerOpen(true);
    setMessage("");
    setError("");
  }

  function editResource(resource: Resource) {
    setForm(toForm(resource));
    setDrawerOpen(true);
    setMessage("");
    setError("");
  }

  async function save() {
    if (!form.title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    setMessage("");
    setError("");
    const method = form.id ? "PATCH" : "POST";
    const url = form.id ? `/api/resources/${form.id}` : "/api/resources";
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(formPayload(form)) });
    const result = await response.json().catch(() => ({}));
    setSaving(false);
    if (!result.ok) { setError(result.error || "Could not save resource."); return; }
    setDrawerOpen(false);
    setMessage("Resource saved.");
    await load();
  }

  async function remove(resource: Resource) {
    const confirmed = window.confirm(`Delete resource “${resource.title}”? This removes the public article and cannot be undone.`);
    if (!confirmed) return;
    const response = await fetch(`/api/resources/${resource.id}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    if (!result.ok) { setError(result.error || "Could not delete resource."); return; }
    setMessage("Resource deleted.");
    await load();
  }

  async function uploadCover(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError("");
    const data = new FormData();
    data.set("folder", "resources");
    data.set("file", file);
    const response = await fetch("/api/uploads", { method: "POST", body: data });
    const result = await response.json().catch(() => ({}));
    setUploading(false);
    if (!result.ok) { setError(result.error || "Upload failed. Check upload provider settings."); return; }
    setForm((current) => ({ ...current, coverImageUrl: result.url || current.coverImageUrl }));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-900 uppercase tracking-wide text-[#C9872F]">Content</p>
          <h1 className="font-display text-2xl font-900 text-[#1C334F]">Resources</h1>
          <p className="mt-1 text-sm text-slate-500">Create compact technical articles, working-product videos, installation guides and product guides.</p>
        </div>
        <button onClick={newResource} className="btn-primary py-2 text-xs"><Plus size={14} /> New resource</button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Total" value={stats.total} />
        <Stat label="Published" value={stats.published} />
        <Stat label="Drafts" value={stats.draft} />
        <Stat label="With video" value={stats.videos} />
      </div>

      {(message || error) ? <div className={`rounded-xl border px-4 py-3 text-sm font-800 ${error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>{error || message}</div> : null}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-2 border-b border-slate-100 p-3 lg:grid-cols-[1fr_180px_180px]">
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500">
            <Search size={15} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, content or type" className="min-w-0 flex-1 bg-transparent outline-none" />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="select h-10 text-sm">
            <option value="all">All statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <select value={type} onChange={(event) => setType(event.target.value)} className="select h-10 text-sm">
            <option value="all">All types</option>
            {resourceTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <tr><th className="px-3 py-2">Resource</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Updated</th><th className="px-3 py-2 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">Loading resources…</td></tr> : null}
              {!loading && resources.length === 0 ? <tr><td colSpan={5} className="px-3 py-10 text-center text-slate-400"><BookOpen className="mx-auto mb-2" /> No resources yet.</td></tr> : null}
              {resources.map((resource) => (
                <tr key={resource.id} className="hover:bg-slate-50/70">
                  <td className="max-w-md px-3 py-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                        {resource.coverImageUrl ? <img src={resource.coverImageUrl} alt="" className="h-full w-full object-cover" /> : <BookOpen size={18} className="text-slate-300" />}
                      </div>
                      <div className="min-w-0"><p className="truncate font-900 text-[#1C334F]">{resource.title}</p><p className="truncate text-xs text-slate-400">/{resource.slug}</p></div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs font-800 text-slate-500">{resourceTypes.find((item) => item.value === resource.type)?.label || resource.type}</td>
                  <td className="whitespace-nowrap px-3 py-2"><span className={`rounded-full border px-2 py-1 text-[11px] font-900 ${statusClass(resource.status)}`}>{resource.status}</span></td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-400">{resource.updatedAt ? new Date(resource.updatedAt).toLocaleDateString("en-GB") : "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      {resource.status === "PUBLISHED" ? <Link href={`/resources/${resource.slug}`} target="_blank" className="rounded-md border border-slate-200 p-2 text-slate-500 hover:text-[#2D4F7A]"><Eye size={14} /></Link> : null}
                      <button onClick={() => editResource(resource)} className="rounded-md border border-slate-200 p-2 text-slate-500 hover:text-[#2D4F7A]"><Pencil size={14} /></button>
                      <button onClick={() => remove(resource)} className="rounded-md border border-red-100 p-2 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30">
          <div className="h-full w-full max-w-3xl overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div><p className="text-[11px] font-900 uppercase tracking-wide text-[#C9872F]">Resource editor</p><h2 className="font-display text-lg font-900 text-[#1C334F]">{form.id ? "Edit resource" : "New resource"}</h2></div>
              <button onClick={() => setDrawerOpen(false)} className="rounded-lg border border-slate-200 p-2 text-slate-500"><X size={17} /></button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid gap-3 lg:grid-cols-2">
                <Field label="Title"><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="input" /></Field>
                <Field label="Slug"><input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} placeholder="auto-generated if blank" className="input" /></Field>
                <Field label="Type"><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className="select">{resourceTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
                <Field label="Status"><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as FormState["status"] })} className="select"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></Field>
              </div>

              <Field label="Excerpt"><textarea value={form.excerpt} onChange={(event) => setForm({ ...form, excerpt: event.target.value })} rows={3} className="textarea" /></Field>
              <Field label="Content"><textarea value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} rows={10} className="textarea" placeholder="Write the guide, article or product demo notes here." /></Field>

              <div className="grid gap-3 lg:grid-cols-2">
                <Field label="Cover image URL">
                  <div className="flex gap-2"><input value={form.coverImageUrl} onChange={(event) => setForm({ ...form, coverImageUrl: event.target.value })} className="input" /><label className="btn-secondary cursor-pointer py-2 text-xs"><ImagePlus size={14} /> {uploading ? "Uploading…" : "Upload"}<input type="file" accept="image/*" className="hidden" onChange={(event) => uploadCover(event.target.files?.[0] || null)} /></label></div>
                </Field>
                <Field label="Video URL"><input value={form.videoUrl} onChange={(event) => setForm({ ...form, videoUrl: event.target.value })} className="input" placeholder="YouTube/Vimeo/uploaded video URL" /></Field>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <Field label="Gallery URLs"><textarea value={form.galleryText} onChange={(event) => setForm({ ...form, galleryText: event.target.value })} rows={3} className="textarea" placeholder="One URL per line" /></Field>
                <Field label="Tags"><textarea value={form.tagsText} onChange={(event) => setForm({ ...form, tagsText: event.target.value })} rows={3} className="textarea" placeholder="installation, PLC, Siemens" /></Field>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-3 text-xs font-900 uppercase tracking-wide text-slate-500">SEO</p>
                <div className="grid gap-3 lg:grid-cols-2">
                  <Field label="SEO title"><input value={form.seoTitle} onChange={(event) => setForm({ ...form, seoTitle: event.target.value })} className="input" /></Field>
                  <Field label="SEO description"><input value={form.seoDescription} onChange={(event) => setForm({ ...form, seoDescription: event.target.value })} className="input" /></Field>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm font-800 text-slate-600"><input type="checkbox" checked={form.isFeatured} onChange={(event) => setForm({ ...form, isFeatured: event.target.checked })} /> Featured resource</label>
            </div>

            <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4">
              <button onClick={() => setDrawerOpen(false)} className="btn-secondary py-2 text-xs">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary py-2 text-xs disabled:opacity-50"><Upload size={14} /> {saving ? "Saving…" : "Save resource"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><p className="text-[11px] font-900 uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 font-display text-2xl font-900 text-[#1C334F]">{value}</p></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-900 text-slate-500">{label}</span>{children}</label>;
}
