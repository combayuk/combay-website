"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, Mail, Pencil, Plus, Trash2, Eye, Bold, Italic, Underline, Type, Palette } from "lucide-react";

// The body editor stores a controlled, limited HTML/plain-text hybrid. The outgoing mailer sanitises again server-side.
type Trigger = "NEW_SIGNUP" | "FIRST_ORDER_COMPLETED" | "ORDER_COMPLETED";

type Rule = { id: string; name: string; trigger: Trigger; triggerLabel: string; isActive: boolean; subject: string; body: string; ctaLabel: string; ctaUrl: string; delayHours: number; sentCount: number; failedCount: number; };
type Log = { id: string; ruleName: string; triggerLabel: string; recipientEmail: string; status: string; message: string; createdAt: string; sentAt: string | null; };
type FormState = { id: string | null; name: string; trigger: Trigger; isActive: boolean; subject: string; body: string; ctaLabel: string; ctaUrl: string; delayHours: string; };

const emptyForm: FormState = { id: null, name: "", trigger: "NEW_SIGNUP", isActive: true, subject: "", body: "", ctaLabel: "", ctaUrl: "", delayHours: "0" };

const draftTemplates: Array<{ key: string; label: string; description: string; trigger: Trigger; form: Partial<FormState> }> = [
  { key: "welcome", label: "New user welcome", description: "Transactional welcome email for new account signups.", trigger: "NEW_SIGNUP", form: { name: "Welcome new customer", subject: "Welcome to Combay", body: "Dear {{name}},\n\nThank you for creating a Combay account. Your portal is ready for quotes, orders, returns and support.\n\nYou can reply to this email with any SKU, MPN, manufacturer or application details if you need help sourcing equipment.", ctaLabel: "Open customer portal", ctaUrl: "/portal" } },
  { key: "new-user-discount", label: "New user discount", description: "Welcome offer with code. Keep this active only when a public code exists.", trigger: "NEW_SIGNUP", form: { name: "New customer welcome offer", subject: "Your Combay account is ready", body: "Dear {{name}},\n\nWelcome to Combay. As a new customer, you can use code <strong>{{promotionCode}}</strong> at checkout where eligible.\n\nBrowse current stock or reply with the item details you need us to source.", ctaLabel: "Browse stock", ctaUrl: "/shop" } },
  { key: "first-order", label: "First order thank-you", description: "Runs once after a customer’s first paid order.", trigger: "FIRST_ORDER_COMPLETED", form: { name: "First order thank-you", subject: "Thank you for your first Combay order {{orderNumber}}", body: "Dear {{name}},\n\nThank you for placing your first order with Combay. Payment has been received for <strong>{{orderNumber}}</strong>.\n\nOur team will prepare the goods and add dispatch details to your portal once available.", ctaLabel: "View order", ctaUrl: "/portal/orders" } },
  { key: "seasonal-sale", label: "Seasonal sale", description: "General sales campaign template.", trigger: "ORDER_COMPLETED", form: { name: "Seasonal sales campaign", subject: "Selected industrial stock offers now available", body: "Dear {{name}},\n\nSelected industrial automation, test, laboratory and electronic stock is currently available at reduced pricing.\n\nUse code <strong>{{promotionCode}}</strong> at checkout where eligible, or send us a list of equipment you are trying to source.", ctaLabel: "Shop current offers", ctaUrl: "/shop" } },
  { key: "new-stock", label: "New stock arrival", description: "Announce new arrivals to recent buyers or selected customers.", trigger: "ORDER_COMPLETED", form: { name: "New stock arrival", subject: "New industrial stock has arrived at Combay", body: "Dear {{name}},\n\nWe have added further automation, controls, test and scientific equipment to the website.\n\nIf you are looking for a particular SKU, MPN, manufacturer or obsolete spare, reply to this email and our team will check availability.", ctaLabel: "View new stock", ctaUrl: "/shop" } },
  { key: "repair-followup", label: "Repair/service follow-up", description: "Useful for customers who may need repair or asset recovery support.", trigger: "ORDER_COMPLETED", form: { name: "Repair and support follow-up", subject: "Repair and sourcing support from Combay", body: "Dear {{name}},\n\nAlongside stock supply, Combay can help with repair, replacement sourcing and asset recovery for industrial and scientific equipment.\n\nReply with the model, serial number, fault details or photos and we will advise next steps.", ctaLabel: "Request support", ctaUrl: "/contact" } },
];

const triggers: Array<{ value: Trigger; label: string; help: string }> = [
  { value: "NEW_SIGNUP", label: "New signup", help: "Runs after a customer creates an account." },
  { value: "FIRST_ORDER_COMPLETED", label: "First paid order", help: "Runs only once per customer after their first paid order." },
  { value: "ORDER_COMPLETED", label: "Any paid order", help: "Runs after every Stripe-paid order." },
];

function previewTokens(value: string) {
  return value
    .replace(/{{\s*name\s*}}/gi, "John Smith")
    .replace(/{{\s*email\s*}}/gi, "john.smith@example.com")
    .replace(/{{\s*company\s*}}/gi, "Example Engineering Ltd")
    .replace(/{{\s*orderNumber\s*}}/gi, "CB-10024")
    .replace(/{{\s*orderTotal\s*}}/gi, "£420.00")
    .replace(/{{\s*portalUrl\s*}}/gi, "https://combay.co.uk/portal")
    .replace(/{{\s*orderUrl\s*}}/gi, "https://combay.co.uk/portal/orders")
    .replace(/{{\s*shopUrl\s*}}/gi, "https://combay.co.uk/shop")
    .replace(/{{\s*promotionCode\s*}}/gi, "TEST10");
}

function textToHtml(value: string) {
  const withTokens = previewTokens(value || "");
  const hasHtml = /<(strong|b|em|i|u|br|p|ul|ol|li|span|h2|h3|div)\b/i.test(withTokens);
  if (hasHtml) return withTokens.replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br/>");
  return withTokens.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`).join("");
}

export default function MarketingAutomationPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("welcome");
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const activeCount = useMemo(() => rules.filter((rule) => rule.isActive).length, [rules]);

  async function load() {
    setLoading(true); setError(null);
    try {
      const response = await fetch("/api/marketing/automations", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not load automations.");
      setRules(data.rules || []); setLogs(data.logs || []);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load automations."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function applyTemplate(key = selectedTemplate) { const template = draftTemplates.find((item) => item.key === key) || draftTemplates[0]; setSelectedTemplate(template.key); setForm((current) => ({ ...current, trigger: template.trigger, ...template.form } as FormState)); }
  function insertMarkup(before: string, after = "") {
    const textarea = bodyRef.current;
    if (!textarea) { update("body", `${form.body}${before}${after}`); return; }
    const start = textarea.selectionStart ?? form.body.length;
    const end = textarea.selectionEnd ?? form.body.length;
    const selected = form.body.slice(start, end) || "text";
    const next = `${form.body.slice(0, start)}${before}${selected}${after}${form.body.slice(end)}`;
    update("body", next);
    window.setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + before.length, start + before.length + selected.length); }, 0);
  }
  function insertColor(color: string) { insertMarkup(`<span style="color:${color};">`, "</span>"); }
  function insertSize(size: string) { insertMarkup(`<span style="font-size:${size};">`, "</span>"); }

  function edit(rule: Rule) { setForm({ id: rule.id, name: rule.name, trigger: rule.trigger, isActive: rule.isActive, subject: rule.subject, body: rule.body, ctaLabel: rule.ctaLabel || "", ctaUrl: rule.ctaUrl || "", delayHours: String(rule.delayHours || 0) }); window.scrollTo({ top: 0, behavior: "smooth" }); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage(null); setError(null);
    try {
      const response = await fetch(form.id ? `/api/marketing/automations/${form.id}` : "/api/marketing/automations", { method: form.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, delayHours: Number(form.delayHours || 0) }) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not save automation.");
      setMessage(form.id ? "Automation updated." : "Automation created."); setForm(emptyForm); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save automation."); }
    finally { setSaving(false); }
  }

  async function remove(id: string) { if (!confirm("Delete this automation rule?")) return; const response = await fetch(`/api/marketing/automations/${id}`, { method: "DELETE" }); const data = await response.json().catch(() => null); if (!response.ok || !data?.ok) { setError(data?.error || "Could not delete automation."); return; } setMessage("Automation deleted."); await load(); }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4"><div><p className="font-mono text-xs tracking-widest uppercase text-gray-400 mb-2">Customer lifecycle</p><h1 className="font-display font-900 text-3xl text-navy-950">Email automation</h1><p className="text-sm text-gray-500 mt-1 max-w-3xl">Create action-based customer emails. Names are title-cased automatically in outgoing emails. Gmail inbox tab placement cannot be guaranteed, but the template is now more transactional and less promotional.</p></div><div className="grid grid-cols-2 gap-3 min-w-[260px]"><div className="bg-white border border-gray-200 rounded-xl p-4"><p className="text-xs text-gray-400">Rules</p><p className="font-display font-900 text-2xl text-navy-950">{rules.length}</p></div><div className="bg-white border border-gray-200 rounded-xl p-4"><p className="text-xs text-gray-400">Active</p><p className="font-display font-900 text-2xl text-green-700">{activeCount}</p></div></div></div>
      {message ? <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 text-sm flex gap-2"><CheckCircle2 size={16} />{message}</div> : null}
      {error ? <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm flex gap-2"><AlertTriangle size={16} />{error}</div> : null}

      <form onSubmit={save} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"><h2 className="font-display font-800 text-xl text-navy-950">{form.id ? "Edit automation" : "Create automation"}</h2><div className="flex flex-wrap gap-2"><select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} className="select text-sm">{draftTemplates.map((template) => <option key={template.key} value={template.key}>{template.label}</option>)}</select><button type="button" onClick={() => applyTemplate()} className="btn-secondary">Apply draft template</button>{form.id ? <button type="button" onClick={() => setForm(emptyForm)} className="btn-secondary">Cancel edit</button> : null}</div></div>
        <div className="grid lg:grid-cols-3 gap-4"><label className="block"><span className="label">Rule name *</span><input required className="input" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Welcome email" /></label><label className="block"><span className="label">Trigger *</span><select className="input" value={form.trigger} onChange={(e) => update("trigger", e.target.value as Trigger)}>{triggers.map((trigger) => <option key={trigger.value} value={trigger.value}>{trigger.label}</option>)}</select><span className="text-xs text-gray-400">{triggers.find((item) => item.value === form.trigger)?.help}</span></label><label className="block"><span className="label">Delay hours</span><input className="input" type="number" min="0" value={form.delayHours} onChange={(e) => update("delayHours", e.target.value)} /><span className="text-xs text-gray-400">Reserved for scheduled sending.</span></label><label className="flex items-center gap-3"><input type="checkbox" checked={form.isActive} onChange={(e) => update("isActive", e.target.checked)} className="h-4 w-4" /><span className="text-sm font-display font-700 text-navy-950">Active</span></label><label className="block lg:col-span-3"><span className="label">Subject *</span><input required className="input" value={form.subject} onChange={(e) => update("subject", e.target.value)} placeholder="Welcome to Combay" /></label></div>

        <div className="grid xl:grid-cols-[1.05fr_.95fr] gap-5"><div className="space-y-3"><div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2"><button type="button" onClick={() => insertMarkup("<strong>", "</strong>")} className="btn-secondary py-2 px-3"><Bold size={14} /></button><button type="button" onClick={() => insertMarkup("<em>", "</em>")} className="btn-secondary py-2 px-3"><Italic size={14} /></button><button type="button" onClick={() => insertMarkup("<u>", "</u>")} className="btn-secondary py-2 px-3"><Underline size={14} /></button><button type="button" onClick={() => insertSize("16px")} className="btn-secondary py-2 px-3"><Type size={14} /> 16</button><button type="button" onClick={() => insertSize("18px")} className="btn-secondary py-2 px-3"><Type size={14} /> 18</button><button type="button" onClick={() => insertColor("#0f172a")} className="btn-secondary py-2 px-3"><Palette size={14} /> Navy</button><button type="button" onClick={() => insertColor("#b45309")} className="btn-secondary py-2 px-3"><Palette size={14} /> Amber</button></div><label className="block"><span className="label">Body *</span><textarea ref={bodyRef} required className="textarea min-h-[310px] font-mono text-sm" value={form.body} onChange={(e) => update("body", e.target.value)} placeholder="Dear {{name}}, ..." /></label><div className="grid sm:grid-cols-3 gap-4"><label className="block"><span className="label">Button label</span><input className="input" value={form.ctaLabel} onChange={(e) => update("ctaLabel", e.target.value)} placeholder="Open customer portal" /></label><label className="block sm:col-span-2"><span className="label">Button URL</span><input className="input" value={form.ctaUrl} onChange={(e) => update("ctaUrl", e.target.value)} placeholder="/portal/orders" /></label></div></div><div className="border border-gray-200 rounded-2xl overflow-hidden bg-gray-100"><div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center gap-2"><Eye size={16} /><p className="font-display font-800 text-sm text-navy-950">Live design preview</p></div><div className="p-4"><div className="mx-auto max-w-[520px] bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"><div className="p-5 border-b border-gray-200"><img src="/images/combay-doc-logo.png" alt="Combay" className="w-40 h-auto mb-4" /><h3 className="font-display font-800 text-lg text-navy-950">{previewTokens(form.subject || "Email subject")}</h3></div><div className="p-5 text-sm leading-7 text-gray-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: textToHtml(form.body || "Dear {{name}},\n\nYour email content preview will appear here.") }} />{form.ctaLabel ? <div className="px-5 pb-5"><span className="inline-block rounded-lg bg-accent px-4 py-2 text-sm font-display font-800 text-navy-950">{previewTokens(form.ctaLabel)}</span></div> : null}<div className="p-4 bg-gray-50 border-t border-gray-200 text-xs text-gray-500"><strong>Combay Limited</strong><br />sales@combay.co.uk · +44 7340 383334</div></div></div></div></div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-600"><p className="font-display font-700 text-navy-950 mb-1">Available tokens</p><p><code>{"{{name}}"}</code>, <code>{"{{email}}"}</code>, <code>{"{{company}}"}</code>, <code>{"{{orderNumber}}"}</code>, <code>{"{{orderTotal}}"}</code>, <code>{"{{portalUrl}}"}</code>, <code>{"{{orderUrl}}"}</code>, <code>{"{{shopUrl}}"}</code>, <code>{"{{promotionCode}}"}</code></p></div>
        <button disabled={saving} className="btn-primary inline-flex items-center gap-2"><Plus size={16} />{saving ? "Saving..." : form.id ? "Save automation" : "Create automation"}</button>
      </form>

      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden"><div className="px-6 py-4 border-b border-gray-200"><h2 className="font-display font-800 text-xl text-navy-950">Automation rules</h2></div>{loading ? <div className="p-6 text-sm text-gray-500">Loading automations...</div> : rules.length === 0 ? <div className="p-8 text-center text-sm text-gray-400">No custom rules yet. Built-in fallback emails will still run for signup and paid orders unless you create active custom rules.</div> : (<div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500"><tr><th className="px-5 py-3">Rule</th><th className="px-5 py-3">Trigger</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Sent/failed</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-gray-100">{rules.map((rule) => <tr key={rule.id} className="hover:bg-gray-50"><td className="px-5 py-4"><p className="font-display font-700 text-navy-950">{rule.name}</p><p className="text-xs text-gray-500">{rule.subject}</p></td><td className="px-5 py-4 text-xs text-gray-500">{rule.triggerLabel}</td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-xs font-display font-700 ${rule.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>{rule.isActive ? "Active" : "Inactive"}</span></td><td className="px-5 py-4 text-xs text-gray-500">{rule.sentCount} sent · {rule.failedCount} failed</td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => edit(rule)} className="btn-secondary py-2 px-3"><Pencil size={14} /></button><button type="button" onClick={() => remove(rule.id)} className="btn-secondary py-2 px-3 text-red-600"><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div>)}</section>
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden"><div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2"><Mail size={17} /><h2 className="font-display font-800 text-xl text-navy-950">Recent automation log</h2></div>{logs.length === 0 ? <div className="p-6 text-sm text-gray-400">No automation emails logged yet.</div> : <div className="divide-y divide-gray-100">{logs.map((log) => <div key={log.id} className="px-6 py-4 text-sm"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2"><div><p className="font-display font-700 text-navy-950">{log.ruleName}</p><p className="text-xs text-gray-500">{log.triggerLabel} · {log.recipientEmail}</p>{log.message ? <p className="text-xs text-gray-400 mt-1">{log.message}</p> : null}</div><span className={`rounded-full px-2 py-1 text-xs font-display font-700 self-start ${log.status === "SENT" ? "bg-green-50 text-green-700" : log.status === "FAILED" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600"}`}>{log.status}</span></div></div>)}</div>}</section>
    </div>
  );
}
