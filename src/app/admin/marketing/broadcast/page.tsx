"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Bold,
  Check,
  Eye,
  Italic,
  Link2,
  List,
  ListOrdered,
  Paperclip,
  Palette,
  Search,
  Send,
  ShieldCheck,
  Type,
  X,
} from "lucide-react";

type RecipientMode = "customers" | "all-leads" | "selected-leads" | "manual-only";

type Lead = {
  id: string;
  name?: string | null;
  email: string;
  company?: string | null;
  country?: string | null;
  source?: string | null;
  productSku?: string | null;
  productTitle?: string | null;
  lastContactAt?: string | null;
};

type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  isSystem?: boolean;
  trigger?: string | null;
};

type AttachmentDraft = {
  filename: string;
  content: string;
  contentType?: string;
  size: number;
};

type BroadcastLog = {
  id: string;
  recipientEmail: string;
  subject: string;
  preview?: string;
  category?: string;
  status: string;
  message?: string;
  providerId?: string | null;
  sentAt?: string | null;
  createdAt?: string | null;
};

const FALLBACK_TEMPLATES: EmailTemplate[] = [
  {
    id: "local:new-stock",
    name: "New stock arrival",
    subject: "New Combay stock available for industrial buyers",
    body: "Dear {{name}},\n\nWe have added new industrial automation, scientific, test and networking stock to Combay.\n\nIf you are looking for a specific manufacturer, MPN, SKU or replacement part, reply to this email and our team will check availability.",
    ctaLabel: "Browse current stock",
    ctaUrl: "/shop",
    isSystem: true,
  },
  {
    id: "local:sourcing",
    name: "Sourcing support",
    subject: "Send us your industrial sourcing list",
    body: "Dear {{name}},\n\nIf you are sourcing obsolete spares, replacement control parts, test equipment or scientific instruments, send us your buying list and we will check availability.\n\nPlease include any SKU, MPN, manufacturer, condition requirement and target delivery location.",
    ctaLabel: "Send an enquiry",
    ctaUrl: "/contact",
    isSystem: true,
  },
  {
    id: "local:portal",
    name: "Customer portal reminder",
    subject: "Your Combay customer portal is ready",
    body: "Dear {{name}},\n\nYou can use your Combay customer portal to review orders, manage returns, raise support tickets and keep your account details up to date.\n\nFor urgent changes to an order or delivery address, please reply directly to this email.",
    ctaLabel: "Open customer portal",
    ctaUrl: "/portal",
    isSystem: true,
  },
];

const MODE_LABELS: Record<RecipientMode, string> = {
  customers: "Registered customers",
  "all-leads": "All registered leads",
  "selected-leads": "Specific leads",
  "manual-only": "Only new emails",
};

function previewTokens(value: string) {
  return value
    .replace(/{{\s*name\s*}}/gi, "John Smith")
    .replace(/{{\s*email\s*}}/gi, "john.smith@example.com")
    .replace(/{{\s*company\s*}}/gi, "Example Engineering Ltd")
    .replace(/{{\s*shopUrl\s*}}/gi, "https://combay.co.uk/shop")
    .replace(/{{\s*portalUrl\s*}}/gi, "https://combay.co.uk/portal")
    .replace(/{{\s*contactUrl\s*}}/gi, "https://combay.co.uk/contact");
}

function resolveUrl(value: string) {
  if (!value.trim()) return "";
  if (/^https?:\/\//i.test(value)) return value.trim();
  return `https://combay.co.uk${value.startsWith("/") ? "" : "/"}${value.trim()}`;
}

function parseManualEmails(value: string) {
  return Array.from(new Set(value.split(/[\s,;]+/).map((item) => item.trim().toLowerCase()).filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item))));
}

function dateLabel(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB");
}

function dateTimeLabel(value?: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function logStatusClass(status: string) {
  if (status === "SENT") return "border-green-200 bg-green-50 text-green-700";
  if (status === "FAILED") return "border-red-200 bg-red-50 text-red-700";
  if (status === "SKIPPED") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function plainToHtml(value: string) {
  return value
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${part.replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

function htmlToPlain(value: string) {
  if (typeof window === "undefined") return value;
  const div = document.createElement("div");
  div.innerHTML = value;
  return div.innerText.trim();
}

function fileToAttachment(file: File): Promise<AttachmentDraft> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve({
        filename: file.name,
        content: result.includes(",") ? result.split(",").pop() || "" : result,
        contentType: file.type || undefined,
        size: file.size,
      });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function formatSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export default function BroadcastPage() {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState(plainToHtml("Dear {{name}},\n\nWe have a Combay update for you."));
  const [ctaLabel, setCtaLabel] = useState("Browse current stock");
  const [ctaUrl, setCtaUrl] = useState("/shop");
  const [respect, setRespect] = useState(true);
  const [recipientMode, setRecipientMode] = useState<RecipientMode>("all-leads");
  const [manualEmails, setManualEmails] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>(FALLBACK_TEMPLATES);
  const [leadQuery, setLeadQuery] = useState("");
  const [templateQuery, setTemplateQuery] = useState("");
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [excludedLeadIds, setExcludedLeadIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [recipientOpen, setRecipientOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [newTemplateOpen, setNewTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<BroadcastLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsOpen, setLogsOpen] = useState(true);

  const parsedManualEmails = useMemo(() => parseManualEmails(manualEmails), [manualEmails]);
  const selectedLeadSet = useMemo(() => new Set(selectedLeadIds), [selectedLeadIds]);
  const excludedLeadSet = useMemo(() => new Set(excludedLeadIds), [excludedLeadIds]);
  const selectedLeads = useMemo(() => leads.filter((lead) => selectedLeadSet.has(lead.id)), [leads, selectedLeadSet]);
  const excludedLeads = useMemo(() => leads.filter((lead) => excludedLeadSet.has(lead.id)), [leads, excludedLeadSet]);

  function loadBroadcastLogs() {
    setLogsLoading(true);
    fetch("/api/marketing/broadcast", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setLogs(Array.isArray(data.logs) ? data.logs : []))
      .catch(() => setLogs([]))
      .finally(() => setLogsLoading(false));
  }

  useEffect(() => {
    setLeadsLoading(true);
    fetch("/api/leads", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setLeads(Array.isArray(data.leads) ? data.leads : Array.isArray(data.data) ? data.data : []))
      .catch(() => setLeads([]))
      .finally(() => setLeadsLoading(false));

    fetch("/api/marketing/templates", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        const rows = Array.isArray(data.templates) ? data.templates : [];
        if (rows.length) setTemplates(rows);
      })
      .catch(() => undefined);

    loadBroadcastLogs();
  }, []);

  const filteredLeads = useMemo(() => {
    const q = leadQuery.trim().toLowerCase();
    const pool = q
      ? leads.filter((lead) => [lead.name, lead.email, lead.company, lead.country, lead.source, lead.productSku, lead.productTitle].filter(Boolean).join(" ").toLowerCase().includes(q))
      : leads;
    return pool.slice(0, 80);
  }, [leads, leadQuery]);

  const filteredTemplates = useMemo(() => {
    const q = templateQuery.trim().toLowerCase();
    return templates.filter((template) => !q || [template.name, template.subject, template.trigger].filter(Boolean).join(" ").toLowerCase().includes(q)).slice(0, 40);
  }, [templates, templateQuery]);

  const includedLeadIds = useMemo(() => {
    if (recipientMode === "all-leads") return leads.map((lead) => lead.id).filter((id) => !excludedLeadSet.has(id));
    if (recipientMode === "selected-leads") return selectedLeadIds;
    return [];
  }, [recipientMode, leads, excludedLeadSet, selectedLeadIds]);

  const estimatedRecipients = useMemo(() => {
    if (recipientMode === "customers") return `Registered customers + ${parsedManualEmails.length} manual`;
    if (recipientMode === "all-leads") return `${Math.max(leads.length - excludedLeadIds.length, 0)} leads + ${parsedManualEmails.length} manual`;
    if (recipientMode === "selected-leads") return `${selectedLeadIds.length} selected leads + ${parsedManualEmails.length} manual`;
    return `${parsedManualEmails.length} manual emails`;
  }, [recipientMode, parsedManualEmails.length, leads.length, selectedLeadIds.length, excludedLeadIds.length]);

  const previewSubject = useMemo(() => previewTokens(subject || "Email subject"), [subject]);
  const previewHtml = useMemo(() => previewTokens(bodyHtml), [bodyHtml]);
  const previewCtaUrl = useMemo(() => resolveUrl(ctaUrl), [ctaUrl]);

  function command(name: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(name, false, value);
    setBodyHtml(editorRef.current?.innerHTML || "");
  }

  function syncEditor() {
    setBodyHtml(editorRef.current?.innerHTML || "");
  }

  function applyTemplate(template: EmailTemplate) {
    setSubject(template.subject || "");
    const html = /<[^>]+>/.test(template.body || "") ? template.body : plainToHtml(template.body || "");
    setBodyHtml(html);
    if (editorRef.current) editorRef.current.innerHTML = html;
    setCtaLabel(template.ctaLabel || "");
    setCtaUrl(template.ctaUrl || "");
    setTemplateOpen(false);
  }

  async function saveCurrentAsTemplate() {
    if (!newTemplateName.trim()) return;
    const payload = {
      name: newTemplateName.trim(),
      type: "broadcast",
      trigger: "ORDER_COMPLETED",
      subject: subject || "Untitled broadcast",
      body: htmlToPlain(bodyHtml) || "Dear {{name}},",
      ctaLabel,
      ctaUrl,
    };
    const response = await fetch("/api/marketing/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (data.ok && data.template) {
      setTemplates((items) => [...items, data.template]);
      setNewTemplateName("");
      setNewTemplateOpen(false);
      setTemplateOpen(false);
    } else {
      setMsg(data.error || "Could not save template.");
    }
  }

  function toggleLead(id: string) {
    if (recipientMode === "all-leads") {
      setExcludedLeadIds((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
    } else {
      setSelectedLeadIds((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
    }
  }

  function toggleAllVisibleLeads(checked: boolean) {
    if (recipientMode === "all-leads") {
      if (checked) setExcludedLeadIds([]);
      else setExcludedLeadIds(leads.map((lead) => lead.id));
    } else if (recipientMode === "selected-leads") {
      setSelectedLeadIds(checked ? filteredLeads.map((lead) => lead.id) : []);
    }
  }

  async function onAttach(files: FileList | null) {
    if (!files?.length) return;
    const next: AttachmentDraft[] = [];
    for (const file of Array.from(files).slice(0, 5)) {
      if (file.size > 5 * 1024 * 1024) {
        setMsg(`${file.name} is larger than 5MB and was not attached.`);
        continue;
      }
      next.push(await fileToAttachment(file));
    }
    setAttachments((items) => [...items, ...next].slice(0, 5));
    if (fileRef.current) fileRef.current.value = "";
  }

  function removeAttachment(filename: string) {
    setAttachments((items) => items.filter((item) => item.filename !== filename));
  }

  function removeManualEmail(email: string) {
    setManualEmails((value) => parseManualEmails(value).filter((item) => item !== email).join(", "));
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!subject.trim() || !htmlToPlain(bodyHtml)) {
      setMsg("Subject and body are required.");
      return;
    }
    if (!confirm(`Send this email to ${estimatedRecipients}? This cannot be undone.`)) return;

    setBusy(true);
    setMsg("");

    const response = await fetch("/api/marketing/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        body: htmlToPlain(bodyHtml),
        bodyHtml,
        ctaLabel,
        ctaUrl,
        respectPreferences: respect,
        recipientMode,
        selectedLeadIds: includedLeadIds,
        manualEmails,
        attachments,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    setMsg(data.ok ? `Checked ${data.checked}; sent ${data.sent}; skipped ${data.skipped}; failed ${data.failed}.` : data.error || "Broadcast failed.");
    loadBroadcastLogs();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-[11px] tracking-widest uppercase text-gray-400">Marketing broadcast</p>
            <h1 className="font-display font-900 text-2xl text-navy-950">Send custom email</h1>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPreviewOpen(true)} className="btn-secondary text-xs py-2"><Eye size={14} /> Preview</button>
            <Link href="/admin/marketing" className="btn-secondary text-xs py-2"><ArrowLeft size={14} /> Automation</Link>
          </div>
        </div>
      </section>

      {msg && <div className={`border rounded-xl px-4 py-3 text-sm ${msg.toLowerCase().includes("failed") || msg.toLowerCase().includes("required") || msg.toLowerCase().includes("could not") ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-800"}`}>{msg}</div>}

      <form onSubmit={send} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-visible">
        <div className="border-b border-slate-100 px-4 py-3 space-y-2.5">
          <div className="grid gap-2 md:grid-cols-[78px_1fr] md:items-start">
            <label className="text-xs font-900 uppercase tracking-wide text-gray-400 pt-2">To</label>
            <div className="relative">
              <button type="button" onClick={() => setRecipientOpen((value) => !value)} className="w-full min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:border-accent/60">
                <span className="font-800 text-navy-950">{MODE_LABELS[recipientMode]}</span>
                <span className="text-gray-400"> · {estimatedRecipients}</span>
              </button>

              {recipientOpen && (
                <div className="absolute left-0 right-0 top-[44px] z-30 rounded-xl border border-slate-200 bg-white shadow-xl">
                  <div className="border-b border-slate-100 p-3">
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                      {(Object.keys(MODE_LABELS) as RecipientMode[]).map((mode) => (
                        <button key={mode} type="button" onClick={() => setRecipientMode(mode)} className={`rounded-lg border px-2 py-2 text-left text-xs ${recipientMode === mode ? "border-accent bg-amber-50 text-navy-950" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"}`}>
                          <span className="block font-900">{MODE_LABELS[mode]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {recipientMode !== "customers" && recipientMode !== "manual-only" && (
                    <>
                      <div className="flex items-center gap-2 border-b border-slate-100 p-3">
                        <label className="flex min-w-24 items-center gap-2 text-xs font-900 text-navy-950">
                          <input type="checkbox" checked={recipientMode === "all-leads" ? excludedLeadIds.length === 0 : selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0} onChange={(event) => toggleAllVisibleLeads(event.target.checked)} />
                          All
                        </label>
                        <div className="relative flex-1">
                          <Search size={13} className="absolute left-3 top-2.5 text-gray-400" />
                          <input className="input py-2 pl-8 text-xs" value={leadQuery} onChange={(event) => setLeadQuery(event.target.value)} placeholder="Search name, company, email, SKU…" />
                        </div>
                      </div>
                      <div className="max-h-72 overflow-y-auto py-1">
                        {filteredLeads.map((lead) => {
                          const checked = recipientMode === "all-leads" ? !excludedLeadSet.has(lead.id) : selectedLeadSet.has(lead.id);
                          return (
                            <label key={lead.id} className="flex cursor-pointer items-start gap-3 px-3 py-2 text-sm hover:bg-slate-50">
                              <input className="mt-1" type="checkbox" checked={checked} onChange={() => toggleLead(lead.id)} />
                              <span className="min-w-0">
                                <span className="block font-800 text-navy-950">{lead.name || lead.company || lead.email}</span>
                                <span className="block truncate text-xs text-gray-500">{lead.email}{lead.company ? ` · ${lead.company}` : ""}</span>
                                <span className="block truncate text-[11px] text-gray-400">{lead.source || "lead"} · {lead.country || "—"} · {dateLabel(lead.lastContactAt)}</span>
                              </span>
                            </label>
                          );
                        })}
                        {leadsLoading && <p className="px-3 py-3 text-sm text-gray-400">Loading leads…</p>}
                        {!leadsLoading && !filteredLeads.length && <p className="px-3 py-3 text-sm text-gray-400">No leads found.</p>}
                      </div>
                    </>
                  )}

                  <div className="border-t border-slate-100 p-3">
                    <label className="text-[11px] font-900 uppercase tracking-wide text-gray-400">+ Add new email address</label>
                    <textarea className="textarea mt-1 min-h-[70px] font-mono text-xs" value={manualEmails} onChange={(event) => setManualEmails(event.target.value)} placeholder="buyer@example.com, accounts@company.com" />
                    <p className="mt-1 text-[11px] text-gray-500">{parsedManualEmails.length} valid manual email(s). Manual emails show as chips below.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {(parsedManualEmails.length > 0 || selectedLeads.length > 0 || excludedLeads.length > 0) && (
            <div className="grid gap-2 md:grid-cols-[78px_1fr]">
              <span className="text-xs font-900 uppercase tracking-wide text-gray-400 pt-1">Selected</span>
              <div className="flex flex-wrap gap-1.5">
                {recipientMode === "all-leads" && excludedLeads.slice(0, 8).map((lead) => <span key={lead.id} className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700">Excluded: {lead.email}</span>)}
                {recipientMode === "selected-leads" && selectedLeads.slice(0, 8).map((lead) => <span key={lead.id} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600">{lead.email}</span>)}
                {parsedManualEmails.map((email) => <span key={email} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600">{email}<button type="button" onClick={() => removeManualEmail(email)}><X size={11} /></button></span>)}
              </div>
            </div>
          )}

          <div className="grid gap-2 md:grid-cols-[78px_1fr] md:items-center">
            <label className="text-xs font-900 uppercase tracking-wide text-gray-400">Template</label>
            <div className="relative">
              <button type="button" onClick={() => setTemplateOpen((value) => !value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:border-accent/60">
                Choose or search saved template
              </button>
              {templateOpen && (
                <div className="absolute left-0 right-0 top-[40px] z-20 rounded-xl border border-slate-200 bg-white shadow-xl">
                  <div className="border-b border-slate-100 p-3">
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-2.5 text-gray-400" />
                      <input className="input py-2 pl-8 text-xs" value={templateQuery} onChange={(event) => setTemplateQuery(event.target.value)} placeholder="Search templates…" />
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {filteredTemplates.map((template) => (
                      <button key={template.id} type="button" onClick={() => applyTemplate(template)} className="block w-full px-3 py-2 text-left hover:bg-slate-50">
                        <span className="block text-sm font-900 text-navy-950">{template.name}</span>
                        <span className="block truncate text-xs text-gray-500">{template.subject}</span>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-slate-100 p-3">
                    {newTemplateOpen ? (
                      <div className="flex gap-2">
                        <input className="input py-2 text-xs" value={newTemplateName} onChange={(event) => setNewTemplateName(event.target.value)} placeholder="Template name" />
                        <button type="button" onClick={saveCurrentAsTemplate} className="btn-primary py-2 text-xs">Save</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setNewTemplateOpen(true)} className="text-xs font-900 text-[#2D4F7A] hover:text-accent">+ Add new template from current email</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-[78px_1fr] md:items-center">
            <label className="text-xs font-900 uppercase tracking-wide text-gray-400">Subject</label>
            <input required className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-accent" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Clear customer-facing subject line" />
          </div>
        </div>

        <div className="border-b border-slate-100 bg-slate-50 px-3 py-2">
          <div className="flex flex-wrap items-center gap-1">
            <ToolbarButton title="Bold" onClick={() => command("bold")}><Bold size={14} /></ToolbarButton>
            <ToolbarButton title="Italic" onClick={() => command("italic")}><Italic size={14} /></ToolbarButton>
            <select className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs" onChange={(event) => command("fontName", event.target.value)} defaultValue="">
              <option value="" disabled>Font</option>
              <option value="Arial">Arial</option>
              <option value="Georgia">Georgia</option>
              <option value="Verdana">Verdana</option>
              <option value="Tahoma">Tahoma</option>
            </select>
            <select className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs" onChange={(event) => command("fontSize", event.target.value)} defaultValue="">
              <option value="" disabled>Size</option>
              <option value="2">Small</option>
              <option value="3">Normal</option>
              <option value="4">Large</option>
              <option value="5">XL</option>
            </select>
            <label className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-600">
              <Palette size={13} />
              <input type="color" className="h-5 w-5" onChange={(event) => command("foreColor", event.target.value)} />
            </label>
            <ToolbarButton title="Align left" onClick={() => command("justifyLeft")}><AlignLeft size={14} /></ToolbarButton>
            <ToolbarButton title="Align centre" onClick={() => command("justifyCenter")}><AlignCenter size={14} /></ToolbarButton>
            <ToolbarButton title="Align right" onClick={() => command("justifyRight")}><AlignRight size={14} /></ToolbarButton>
            <ToolbarButton title="Bulleted list" onClick={() => command("insertUnorderedList")}><List size={14} /></ToolbarButton>
            <ToolbarButton title="Numbered list" onClick={() => command("insertOrderedList")}><ListOrdered size={14} /></ToolbarButton>
            <ToolbarButton title="Insert link" onClick={() => { const url = prompt("Paste link URL"); if (url) command("createLink", url); }}><Link2 size={14} /></ToolbarButton>
            <ToolbarButton title="Clear formatting" onClick={() => command("removeFormat")}><Type size={14} /></ToolbarButton>
            <ToolbarButton title="Attach file" onClick={() => fileRef.current?.click()}><Paperclip size={14} /></ToolbarButton>
            <input ref={fileRef} type="file" multiple className="hidden" onChange={(event) => onAttach(event.target.files)} />
          </div>
        </div>

        <div className="min-h-[360px] px-4 py-4">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={syncEditor}
            onBlur={syncEditor}
            className="min-h-[320px] rounded-lg border border-transparent px-2 py-1 text-sm leading-7 text-slate-700 outline-none focus:border-slate-200"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </div>

        <div className="border-t border-slate-100 px-4 py-3 space-y-3">
          <div className="grid gap-2 md:grid-cols-[78px_1fr_1fr] md:items-center">
            <span className="text-xs font-900 uppercase tracking-wide text-gray-400">CTA</span>
            <input className="h-9 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-accent" value={ctaLabel} onChange={(event) => setCtaLabel(event.target.value)} placeholder="Button label" />
            <div className="relative">
              <Link2 size={13} className="absolute left-3 top-2.5 text-gray-400" />
              <input className="h-9 w-full rounded-lg border border-slate-200 px-3 pl-8 text-xs outline-none focus:border-accent" value={ctaUrl} onChange={(event) => setCtaUrl(event.target.value)} placeholder="/shop or https://..." />
            </div>
          </div>

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((item) => (
                <span key={item.filename} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                  <Paperclip size={12} /> {item.filename} <span className="text-gray-400">{formatSize(item.size)}</span>
                  <button type="button" onClick={() => removeAttachment(item.filename)} className="text-gray-400 hover:text-red-600"><X size={12} /></button>
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-start gap-2 text-xs text-green-900">
              <input type="checkbox" checked={respect} onChange={(event) => setRespect(event.target.checked)} className="mt-0.5" />
              <span><strong>Respect unsubscribe/preferences</strong> for registered customers.</span>
            </label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPreviewOpen(true)} className="btn-secondary py-2 text-xs"><Eye size={14} /> Preview</button>
              <button className="btn-primary py-2 text-xs" disabled={busy}><Send size={14} />{busy ? "Sending..." : "Send"}</button>
            </div>
          </div>
        </div>
      </form>

      <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-900 text-navy-950">Custom email logs</h2>
            <p className="text-xs text-gray-500">Recent sends from this custom email page. Use this to confirm recipient, subject, status and Resend message ID.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setLogsOpen((value) => !value)} className="btn-secondary py-2 text-xs">{logsOpen ? "Hide logs" : "Show logs"}</button>
            <button type="button" onClick={loadBroadcastLogs} className="btn-secondary py-2 text-xs">Refresh logs</button>
          </div>
        </div>
        {logsOpen && (
          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
            <div className="grid grid-cols-[120px_1.2fr_1.4fr_120px_150px] gap-2 bg-slate-50 px-3 py-2 text-[11px] font-900 uppercase tracking-wide text-slate-500">
              <span>Status</span><span>Recipient</span><span>Subject / type</span><span>Resend ID</span><span>Time</span>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {logs.map((log) => (
                <div key={log.id} className="grid grid-cols-[120px_1.2fr_1.4fr_120px_150px] gap-2 px-3 py-2 text-xs">
                  <span><span className={`rounded-full border px-2 py-0.5 font-900 ${logStatusClass(log.status)}`}>{log.status}</span></span>
                  <span className="truncate text-slate-700" title={log.recipientEmail}>{log.recipientEmail}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-800 text-navy-950" title={log.subject}>{log.subject || "—"}</span>
                    <span className="block truncate text-[11px] text-slate-400" title={log.message || log.category || ""}>{log.category || "broadcast"}{log.message ? ` · ${log.message}` : ""}</span>
                  </span>
                  <span className="truncate font-mono text-[11px] text-slate-500" title={log.providerId || ""}>{log.providerId || "—"}</span>
                  <span className="text-slate-500">{dateTimeLabel(log.sentAt || log.createdAt)}</span>
                </div>
              ))}
              {logsLoading && <p className="px-3 py-4 text-sm text-gray-400">Loading email logs…</p>}
              {!logsLoading && logs.length === 0 && <p className="px-3 py-4 text-sm text-gray-400">No custom email logs found yet.</p>}
            </div>
          </div>
        )}
      </section>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        <strong>Tokens:</strong> <code>{"{{name}}"}</code>, <code>{"{{email}}"}</code>, <code>{"{{company}}"}</code>, <code>{"{{shopUrl}}"}</code>, <code>{"{{portalUrl}}"}</code>, <code>{"{{contactUrl}}"}</code>
      </div>

      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <h2 className="font-display text-lg font-900 text-navy-950">Email preview</h2>
              <button type="button" onClick={() => setPreviewOpen(false)} className="text-gray-400 hover:text-navy-950"><X size={18} /></button>
            </div>
            <div className="border-b px-5 py-4">
              <img src="/images/combay-doc-logo.png" className="mb-4 h-auto w-40" alt="Combay" />
              <h3 className="font-display text-xl font-900 leading-tight text-navy-950">{previewSubject}</h3>
            </div>
            <div className="px-5 py-5 text-sm leading-7 text-gray-700" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            {ctaLabel && previewCtaUrl ? <div className="px-5 pb-5"><a href={previewCtaUrl} className="inline-flex rounded-lg bg-accent px-4 py-3 text-sm font-900 text-navy-950 no-underline">{ctaLabel}</a></div> : null}
            <div className="border-t bg-slate-50 px-5 py-3 text-xs text-gray-500">
              <ShieldCheck size={13} className="inline mr-1 text-green-600" /> Sent to {estimatedRecipients}. Attachments: {attachments.length}.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolbarButton({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" title={title} onClick={onClick} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:border-accent/60 hover:text-navy-950">
      {children}
    </button>
  );
}
