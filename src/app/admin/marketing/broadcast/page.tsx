"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Eye, Link2, MailPlus, Search, Send, ShieldCheck, Sparkles, UsersRound, X } from "lucide-react";

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

const QUICK_TEMPLATES = [
  {
    name: "New stock arrival",
    subject: "New Combay stock available for industrial buyers",
    body: "Dear {{name}},\n\nWe have added new industrial automation, scientific, test and networking stock to Combay.\n\nIf you are looking for a specific manufacturer, MPN, SKU or replacement part, reply to this email and our team will check availability.",
    ctaLabel: "Browse current stock",
    ctaUrl: "/shop",
  },
  {
    name: "Sourcing support",
    subject: "Send us your industrial sourcing list",
    body: "Dear {{name}},\n\nIf you are sourcing obsolete spares, replacement control parts, test equipment or scientific instruments, send us your buying list and we will check availability.\n\nPlease include any SKU, MPN, manufacturer, condition requirement and target delivery location.",
    ctaLabel: "Send an enquiry",
    ctaUrl: "/contact",
  },
  {
    name: "Customer portal reminder",
    subject: "Your Combay customer portal is ready",
    body: "Dear {{name}},\n\nYou can use your Combay customer portal to review orders, manage returns, raise support tickets and keep your account details up to date.\n\nFor urgent changes to an order or delivery address, please reply directly to this email.",
    ctaLabel: "Open customer portal",
    ctaUrl: "/portal",
  },
];

const RECIPIENT_MODES: Array<{ id: RecipientMode; title: string; desc: string }> = [
  { id: "customers", title: "Registered customers", desc: "Current customer accounts that can receive marketing." },
  { id: "all-leads", title: "All leads", desc: "Every deduplicated lead email in the leads database." },
  { id: "selected-leads", title: "Specific leads", desc: "Search and tick individual lead records." },
  { id: "manual-only", title: "Only new/manual emails", desc: "Send only to the addresses typed below." },
];

function previewTokens(value: string) {
  return value
    .replace(/{{\s*name\s*}}/gi, "John Smith")
    .replace(/{{\s*email\s*}}/gi, "john.smith@example.com")
    .replace(/{{\s*company\s*}}/gi, "Example Engineering Ltd")
    .replace(/{{\s*shopUrl\s*}}/gi, "https://combay.co.uk/shop")
    .replace(/{{\s*portalUrl\s*}}/gi, "https://combay.co.uk/portal")
    .replace(/{{\s*contactUrl\s*}}/gi, "https://combay.co.uk/contact");
}

function paragraphs(value: string) {
  return previewTokens(value || "")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
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

export default function BroadcastPage() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("Dear {{name}},\n\nWe have a Combay update for you.");
  const [ctaLabel, setCtaLabel] = useState("Browse current stock");
  const [ctaUrl, setCtaUrl] = useState("/shop");
  const [respect, setRespect] = useState(true);
  const [recipientMode, setRecipientMode] = useState<RecipientMode>("customers");
  const [manualEmails, setManualEmails] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadQuery, setLeadQuery] = useState("");
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const previewSubject = useMemo(() => previewTokens(subject || "Email subject"), [subject]);
  const previewBody = useMemo(() => paragraphs(body), [body]);
  const previewCtaUrl = useMemo(() => resolveUrl(ctaUrl), [ctaUrl]);
  const parsedManualEmails = useMemo(() => parseManualEmails(manualEmails), [manualEmails]);

  useEffect(() => {
    setLeadsLoading(true);
    fetch("/api/leads", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setLeads(Array.isArray(data.leads) ? data.leads : Array.isArray(data.data) ? data.data : []))
      .catch(() => setLeads([]))
      .finally(() => setLeadsLoading(false));
  }, []);

  const selectedLeadSet = useMemo(() => new Set(selectedLeadIds), [selectedLeadIds]);
  const selectedLeads = useMemo(() => leads.filter((lead) => selectedLeadSet.has(lead.id)), [leads, selectedLeadSet]);

  const filteredLeads = useMemo(() => {
    const q = leadQuery.trim().toLowerCase();
    const pool = q
      ? leads.filter((lead) => [lead.name, lead.email, lead.company, lead.country, lead.source, lead.productSku, lead.productTitle].filter(Boolean).join(" ").toLowerCase().includes(q))
      : leads;
    return pool.slice(0, 40);
  }, [leads, leadQuery]);

  const estimatedRecipients = useMemo(() => {
    if (recipientMode === "customers") return `Registered customers + ${parsedManualEmails.length} manual`;
    if (recipientMode === "all-leads") return `${leads.length} leads + ${parsedManualEmails.length} manual`;
    if (recipientMode === "selected-leads") return `${selectedLeadIds.length} selected leads + ${parsedManualEmails.length} manual`;
    return `${parsedManualEmails.length} manual emails`;
  }, [recipientMode, parsedManualEmails.length, leads.length, selectedLeadIds.length]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const warning =
      recipientMode === "manual-only"
        ? `Send this email to ${parsedManualEmails.length} manually entered address(es)?`
        : recipientMode === "all-leads"
          ? `Send this email to all leads plus any manually entered addresses?`
          : recipientMode === "selected-leads"
            ? `Send this email to selected leads plus any manually entered addresses?`
            : `Send this email to registered customers plus any manually entered addresses?`;

    if (!confirm(`${warning}\n\nThis cannot be undone.`)) return;

    setBusy(true);
    setMsg("");

    const response = await fetch("/api/marketing/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        body,
        ctaLabel,
        ctaUrl,
        respectPreferences: respect,
        recipientMode,
        selectedLeadIds,
        manualEmails,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    setMsg(data.ok ? `Checked ${data.checked}; sent ${data.sent}; skipped ${data.skipped}; failed ${data.failed}.` : data.error || "Broadcast failed.");
  }

  function applyTemplate(index: number) {
    const template = QUICK_TEMPLATES[index];
    if (!template) return;
    setSubject(template.subject);
    setBody(template.body);
    setCtaLabel(template.ctaLabel);
    setCtaUrl(template.ctaUrl);
  }

  function toggleLead(id: string) {
    setSelectedLeadIds((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  }

  function clearRecipients() {
    setSelectedLeadIds([]);
    setManualEmails("");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-xs tracking-widest uppercase text-gray-400 mb-2">Marketing broadcast</p>
            <h1 className="font-display font-900 text-3xl text-navy-950">Send custom email</h1>
            <p className="text-sm text-gray-500 mt-2 max-w-3xl">
              Send to registered customers, all leads, selected leads, extra manually typed addresses, or manual addresses only.
            </p>
          </div>
          <Link href="/admin/marketing" className="btn-secondary inline-flex text-sm py-2"><ArrowLeft size={14} /> Back to automation</Link>
        </div>
      </section>

      {msg && <div className={`border rounded-xl p-4 text-sm ${msg.toLowerCase().includes("failed") || msg.toLowerCase().includes("no valid") ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-800"}`}>{msg}</div>}

      <form onSubmit={send} className="grid xl:grid-cols-[minmax(0,1fr)_460px] gap-6 items-start">
        <section className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="border-b border-gray-100 p-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display font-900 text-lg text-navy-950">Recipients</h2>
                <p className="text-xs text-gray-500 mt-1">Choose one source, then optionally add extra addresses below.</p>
              </div>
              <span className="badge bg-blue-50 text-blue-700 border-blue-200">{estimatedRecipients}</span>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid md:grid-cols-4 gap-2">
                {RECIPIENT_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setRecipientMode(mode.id)}
                    className={`text-left rounded-xl border px-3 py-3 transition-colors ${recipientMode === mode.id ? "border-accent bg-amber-50" : "border-slate-200 bg-slate-50 hover:bg-white"}`}
                  >
                    <p className="font-display font-900 text-sm text-navy-950">{mode.title}</p>
                    <p className="text-[11px] leading-4 text-gray-500 mt-1">{mode.desc}</p>
                  </button>
                ))}
              </div>

              {recipientMode === "selected-leads" && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <label className="relative block flex-1">
                      <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                      <input className="input pl-9" value={leadQuery} onChange={(event) => setLeadQuery(event.target.value)} placeholder="Search leads by email, company, country, SKU…" />
                    </label>
                    <span className="text-xs text-gray-500">{selectedLeadIds.length} selected</span>
                  </div>

                  <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                    {filteredLeads.map((lead) => {
                      const checked = selectedLeadSet.has(lead.id);
                      return (
                        <button key={lead.id} type="button" onClick={() => toggleLead(lead.id)} className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-start gap-3">
                          <span className={`mt-1 flex h-4 w-4 items-center justify-center rounded border ${checked ? "bg-accent border-accent text-navy-950" : "border-slate-300 bg-white"}`}>{checked ? <Check size={12} /> : null}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-800 text-navy-950 truncate">{lead.name || lead.email}</span>
                            <span className="block text-xs text-gray-500 truncate">{lead.email}{lead.company ? ` · ${lead.company}` : ""}</span>
                            <span className="block text-[11px] text-gray-400 truncate">{lead.source || "lead"} · {lead.country || "—"} · {dateLabel(lead.lastContactAt)}</span>
                          </span>
                        </button>
                      );
                    })}
                    {leadsLoading && <p className="p-4 text-sm text-gray-400">Loading leads…</p>}
                    {!leadsLoading && !filteredLeads.length && <p className="p-4 text-sm text-gray-400">No leads found.</p>}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <label className="label mb-0">{recipientMode === "manual-only" ? "New/manual email addresses only" : "Add extra email addresses"}</label>
                  <button type="button" onClick={clearRecipients} className="text-xs font-800 text-gray-400 hover:text-red-600">Clear selected/manual</button>
                </div>
                <textarea
                  className="textarea min-h-[92px] font-mono text-sm"
                  value={manualEmails}
                  onChange={(event) => setManualEmails(event.target.value)}
                  placeholder="name@example.com, buyer@company.com&#10;one address per line also works"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Valid manual emails detected: <strong>{parsedManualEmails.length}</strong>. Duplicates across leads/customers/manual entries are automatically removed before sending.
                </p>
              </div>

              {selectedLeads.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedLeads.slice(0, 10).map((lead) => (
                    <span key={lead.id} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                      {lead.email}
                      <button type="button" onClick={() => toggleLead(lead.id)} className="text-gray-400 hover:text-red-600"><X size={12} /></button>
                    </span>
                  ))}
                  {selectedLeads.length > 10 && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-gray-500">+{selectedLeads.length - 10} more</span>}
                </div>
              )}

              <label className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                <input type="checkbox" checked={respect} onChange={(event) => setRespect(event.target.checked)} className="mt-1" />
                <span><strong>Respect unsubscribe and customer marketing preferences.</strong><br />Applies to registered customers. Lead/manual recipients are still deduplicated and logged.</span>
              </label>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="border-b border-gray-100 p-5">
              <h2 className="font-display font-900 text-lg text-navy-950">Email content</h2>
              <p className="text-xs text-gray-500 mt-1">Use tokens for personalisation. Preview shows realistic sample data.</p>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid md:grid-cols-3 gap-3">
                {QUICK_TEMPLATES.map((template, index) => (
                  <button key={template.name} type="button" onClick={() => applyTemplate(index)} className="text-left rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 hover:border-accent/50 hover:bg-white">
                    <Sparkles size={15} className="text-accent mb-2" />
                    <p className="font-display font-800 text-sm text-navy-950">{template.name}</p>
                    <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{template.subject}</p>
                  </button>
                ))}
              </div>

              <label className="block">
                <span className="label">Subject *</span>
                <input required className="input" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Clear customer-facing subject line" />
              </label>

              <label className="block">
                <span className="label">Body *</span>
                <textarea required className="textarea min-h-[300px] font-mono text-sm leading-6" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Dear {{name}},\n\n..." />
              </label>

              <div className="grid md:grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label className="block">
                  <span className="label">CTA button label</span>
                  <input className="input" value={ctaLabel} onChange={(event) => setCtaLabel(event.target.value)} placeholder="Browse current stock" />
                </label>
                <label className="block">
                  <span className="label">CTA button URL</span>
                  <div className="relative"><Link2 size={14} className="absolute left-3 top-3 text-gray-400" /><input className="input pl-9" value={ctaUrl} onChange={(event) => setCtaUrl(event.target.value)} placeholder="/shop or https://..." /></div>
                </label>
              </div>

              <button className="btn-primary inline-flex items-center gap-2" disabled={busy}>
                <Send size={16} />{busy ? "Sending..." : "Send custom email"}
              </button>
            </div>
          </div>
        </section>

        <aside className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm sticky top-24">
          <div className="p-5 border-b bg-slate-50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Eye size={16} className="text-accent" />
              <h2 className="font-display font-900 text-lg text-navy-950">Customer preview</h2>
            </div>
            <span className="text-[11px] text-gray-400 flex items-center gap-1"><UsersRound size={12} /> {estimatedRecipients}</span>
          </div>
          <div className="p-5 border-b">
            <img src="/images/combay-doc-logo.png" className="w-40 h-auto mb-4" alt="Combay" />
            <h3 className="font-display font-900 text-xl text-navy-950 leading-tight">{previewSubject}</h3>
          </div>
          <div className="p-5 text-sm leading-7 text-gray-700">
            {previewBody.length ? previewBody.map((part, index) => <p key={index} className="mb-4 whitespace-pre-line">{part}</p>) : <p className="text-gray-400">Body preview will appear here.</p>}
            {ctaLabel && previewCtaUrl ? <a href={previewCtaUrl} className="inline-flex rounded-lg bg-accent px-4 py-3 text-sm font-900 text-navy-950 no-underline">{ctaLabel}</a> : null}
            <p className="mt-5 mb-0">Kind regards,<br /><strong>Combay Limited</strong></p>
          </div>
          <div className="p-4 bg-gray-50 border-t text-xs text-gray-500 space-y-2">
            <p><ShieldCheck size={13} className="inline mr-1 text-green-600" /> Registered customer unsubscribes are handled by preferences and List-Unsubscribe headers.</p>
            <p><MailPlus size={13} className="inline mr-1 text-accent" /> Lead/manual sends are deduplicated and logged in broadcast email logs.</p>
          </div>
        </aside>
      </form>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
        <strong>Tokens:</strong> <code>{"{{name}}"}</code>, <code>{"{{email}}"}</code>, <code>{"{{company}}"}</code>, <code>{"{{shopUrl}}"}</code>, <code>{"{{portalUrl}}"}</code>, <code>{"{{contactUrl}}"}</code>
      </div>
    </div>
  );
}
