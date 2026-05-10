"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, Link2, Send, ShieldCheck, Sparkles } from "lucide-react";

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

export default function BroadcastPage() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("Dear {{name}},\n\nWe have a Combay update for registered customers.");
  const [ctaLabel, setCtaLabel] = useState("Browse current stock");
  const [ctaUrl, setCtaUrl] = useState("/shop");
  const [respect, setRespect] = useState(true);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const previewSubject = useMemo(() => previewTokens(subject || "Email subject"), [subject]);
  const previewBody = useMemo(() => paragraphs(body), [body]);
  const previewCtaUrl = useMemo(() => resolveUrl(ctaUrl), [ctaUrl]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!confirm("Send this email to registered customers? This can email thousands of customers and cannot be undone.")) return;
    setBusy(true);
    setMsg("");
    const r = await fetch("/api/marketing/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, body, ctaLabel, ctaUrl, respectPreferences: respect }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    setMsg(d.ok ? `Checked ${d.checked}; sent ${d.sent}; skipped ${d.skipped}; failed ${d.failed}.` : d.error || "Broadcast failed.");
  }

  function applyTemplate(index: number) {
    const template = QUICK_TEMPLATES[index];
    if (!template) return;
    setSubject(template.subject);
    setBody(template.body);
    setCtaLabel(template.ctaLabel);
    setCtaUrl(template.ctaUrl);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-xs tracking-widest uppercase text-gray-400 mb-2">Marketing broadcast</p>
            <h1 className="font-display font-900 text-3xl text-navy-950">Send custom email</h1>
            <p className="text-sm text-gray-500 mt-2 max-w-3xl">
              Send a one-off email to registered customers. CTA buttons are enabled for launch; keep the wording operational, relevant and low-spam.
            </p>
          </div>
          <Link href="/admin/marketing" className="btn-secondary inline-flex text-sm py-2"><ArrowLeft size={14} /> Back to automation</Link>
        </div>
      </section>

      {msg && <div className={`border rounded-xl p-4 text-sm ${msg.toLowerCase().includes("failed") ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-800"}`}>{msg}</div>}

      <form onSubmit={send} className="grid xl:grid-cols-[1fr_460px] gap-6 items-start">
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
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
              <input required className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Clear customer-facing subject line" />
            </label>

            <label className="block">
              <span className="label">Body *</span>
              <textarea required className="textarea min-h-[320px] font-mono text-sm leading-6" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Dear {{name}},\n\n..." />
            </label>

            <div className="grid md:grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="block">
                <span className="label">CTA button label</span>
                <input className="input" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Browse current stock" />
              </label>
              <label className="block">
                <span className="label">CTA button URL</span>
                <div className="relative"><Link2 size={14} className="absolute left-3 top-3 text-gray-400" /><input className="input pl-9" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="/shop or https://..." /></div>
              </label>
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
              <input type="checkbox" checked={respect} onChange={(e) => setRespect(e.target.checked)} className="mt-1" />
              <span><strong>Respect unsubscribe and marketing preferences.</strong><br />Recommended for all launch broadcasts unless the email is strictly transactional.</span>
            </label>

            <button className="btn-primary inline-flex items-center gap-2" disabled={busy}>
              <Send size={16} />{busy ? "Sending..." : "Send custom email"}
            </button>
          </div>
        </section>

        <aside className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm sticky top-24">
          <div className="p-5 border-b bg-slate-50 flex items-center gap-2">
            <Eye size={16} className="text-accent" />
            <h2 className="font-display font-900 text-lg text-navy-950">Customer preview</h2>
          </div>
          <div className="p-5 border-b">
            <img src="/images/combay-doc-logo.png" className="w-40 h-auto mb-4" alt="Combay" />
            <h3 className="font-display font-900 text-xl text-navy-950 leading-tight">{previewSubject}</h3>
          </div>
          <div className="p-5 text-sm leading-7 text-gray-700">
            {previewBody.length ? previewBody.map((part, index) => <p key={index} className="mb-4 whitespace-pre-line">{part}</p>) : <p className="text-gray-400">Body preview will appear here.</p>}
            {ctaLabel && previewCtaUrl ? <a href={previewCtaUrl} className="inline-flex rounded-lg bg-accent px-4 py-3 text-sm font-900 text-navy-950 no-underline"> {ctaLabel} </a> : null}
            <p className="mt-5 mb-0">Kind regards,<br /><strong>Combay Limited</strong></p>
          </div>
          <div className="p-4 bg-gray-50 border-t text-xs text-gray-500">
            <ShieldCheck size={13} className="inline mr-1 text-green-600" />
            Unsubscribe footer and List-Unsubscribe headers are handled by the send API.
          </div>
        </aside>
      </form>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
        <strong>Tokens:</strong> <code>{"{{name}}"}</code>, <code>{"{{email}}"}</code>, <code>{"{{company}}"}</code>, <code>{"{{shopUrl}}"}</code>, <code>{"{{portalUrl}}"}</code>, <code>{"{{contactUrl}}"}</code>
      </div>
    </div>
  );
}
