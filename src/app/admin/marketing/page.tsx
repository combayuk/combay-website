"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, Mail, Pencil, Plus, Trash2 } from "lucide-react";

type Trigger = "NEW_SIGNUP" | "FIRST_ORDER_COMPLETED" | "ORDER_COMPLETED";

type Rule = {
  id: string;
  name: string;
  trigger: Trigger;
  triggerLabel: string;
  isActive: boolean;
  subject: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  delayHours: number;
  sentCount: number;
  failedCount: number;
};

type Log = {
  id: string;
  ruleName: string;
  triggerLabel: string;
  recipientEmail: string;
  status: string;
  message: string;
  createdAt: string;
  sentAt: string | null;
};

type FormState = {
  id: string | null;
  name: string;
  trigger: Trigger;
  isActive: boolean;
  subject: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  delayHours: string;
};

const emptyForm: FormState = {
  id: null,
  name: "",
  trigger: "NEW_SIGNUP",
  isActive: true,
  subject: "",
  body: "",
  ctaLabel: "",
  ctaUrl: "",
  delayHours: "0",
};

const defaultText: Record<Trigger, Partial<FormState>> = {
  NEW_SIGNUP: {
    name: "Welcome new customer",
    subject: "Welcome to Combay",
    body: "Dear {{name}},\n\nThank you for creating a Combay account. You can now request quotes, place orders, track purchases, manage returns and raise support tickets from your customer portal.\n\nIf you need help sourcing industrial automation, scientific, test, AV or networking equipment, reply to this email with the SKU, MPN, manufacturer or application details.",
    ctaLabel: "Open customer portal",
    ctaUrl: "/portal",
  },
  FIRST_ORDER_COMPLETED: {
    name: "First order thank-you",
    subject: "Thank you for your first Combay order {{orderNumber}}",
    body: "Dear {{name}},\n\nThank you for placing your first order with Combay. Payment has been received for {{orderNumber}} and our team will now process the order for dispatch.\n\nYou can track the order from your customer portal once dispatch details are added.",
    ctaLabel: "View order",
    ctaUrl: "/portal/orders",
  },
  ORDER_COMPLETED: {
    name: "Any paid order follow-up",
    subject: "Combay order {{orderNumber}} confirmed",
    body: "Dear {{name}},\n\nPayment has been received for order {{orderNumber}}. We will prepare the goods and add dispatch/tracking details as soon as available.\n\nIf any delivery details need updating, please reply to this email immediately.",
    ctaLabel: "View order",
    ctaUrl: "/portal/orders",
  },
};

const triggers: Array<{ value: Trigger; label: string; help: string }> = [
  { value: "NEW_SIGNUP", label: "New signup", help: "Runs after a customer creates an account." },
  { value: "FIRST_ORDER_COMPLETED", label: "First paid order", help: "Runs only once per customer after their first paid order." },
  { value: "ORDER_COMPLETED", label: "Any paid order", help: "Runs after every Stripe-paid order." },
];

export default function MarketingAutomationPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeCount = useMemo(() => rules.filter((rule) => rule.isActive).length, [rules]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/marketing/automations", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not load automations.");
      setRules(data.rules || []);
      setLogs(data.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load automations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function applyDefault(trigger = form.trigger) {
    setForm((current) => ({ ...current, trigger, ...defaultText[trigger] }));
  }

  function edit(rule: Rule) {
    setForm({
      id: rule.id,
      name: rule.name,
      trigger: rule.trigger,
      isActive: rule.isActive,
      subject: rule.subject,
      body: rule.body,
      ctaLabel: rule.ctaLabel || "",
      ctaUrl: rule.ctaUrl || "",
      delayHours: String(rule.delayHours || 0),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(form.id ? `/api/marketing/automations/${form.id}` : "/api/marketing/automations", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, delayHours: Number(form.delayHours || 0) }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not save automation.");
      setMessage(form.id ? "Automation updated." : "Automation created.");
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save automation.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this automation rule?")) return;
    const response = await fetch(`/api/marketing/automations/${id}`, { method: "DELETE" });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      setError(data?.error || "Could not delete automation.");
      return;
    }
    setMessage("Automation deleted.");
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-widest uppercase text-gray-400 mb-2">Customer lifecycle</p>
          <h1 className="font-display font-900 text-3xl text-navy-950">Email automation</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-3xl">Create simple action-based customer emails. Supported triggers in this phase are new signup, first paid order and every paid order. Emails use Resend and remain server-side.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 min-w-[260px]">
          <div className="bg-white border border-gray-200 rounded-xl p-4"><p className="text-xs text-gray-400">Rules</p><p className="font-display font-900 text-2xl text-navy-950">{rules.length}</p></div>
          <div className="bg-white border border-gray-200 rounded-xl p-4"><p className="text-xs text-gray-400">Active</p><p className="font-display font-900 text-2xl text-green-700">{activeCount}</p></div>
        </div>
      </div>

      {message ? <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 text-sm flex gap-2"><CheckCircle2 size={16} />{message}</div> : null}
      {error ? <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm flex gap-2"><AlertTriangle size={16} />{error}</div> : null}

      <form onSubmit={save} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display font-800 text-xl text-navy-950">{form.id ? "Edit automation" : "Create automation"}</h2>
          <div className="flex gap-2">
            <button type="button" onClick={() => applyDefault()} className="btn-secondary">Use default copy</button>
            {form.id ? <button type="button" onClick={() => setForm(emptyForm)} className="btn-secondary">Cancel edit</button> : null}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <label className="block"><span className="label">Rule name *</span><input required className="input" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Welcome email" /></label>
          <label className="block"><span className="label">Trigger *</span><select className="input" value={form.trigger} onChange={(e) => { const trigger = e.target.value as Trigger; update("trigger", trigger); }}>
            {triggers.map((trigger) => <option key={trigger.value} value={trigger.value}>{trigger.label}</option>)}
          </select><span className="text-xs text-gray-400">{triggers.find((item) => item.value === form.trigger)?.help}</span></label>
          <label className="block"><span className="label">Delay hours</span><input className="input" type="number" min="0" value={form.delayHours} onChange={(e) => update("delayHours", e.target.value)} /><span className="text-xs text-gray-400">Currently sent immediately; this field is reserved for scheduled sending.</span></label>
          <label className="flex items-center gap-3"><input type="checkbox" checked={form.isActive} onChange={(e) => update("isActive", e.target.checked)} className="h-4 w-4" /><span className="text-sm font-display font-700 text-navy-950">Active</span></label>
          <label className="block lg:col-span-3"><span className="label">Subject *</span><input required className="input" value={form.subject} onChange={(e) => update("subject", e.target.value)} placeholder="Welcome to Combay" /></label>
          <label className="block lg:col-span-3"><span className="label">Body *</span><textarea required className="textarea min-h-[190px]" value={form.body} onChange={(e) => update("body", e.target.value)} placeholder="Dear {{name}}, ..." /></label>
          <label className="block"><span className="label">Button label</span><input className="input" value={form.ctaLabel} onChange={(e) => update("ctaLabel", e.target.value)} placeholder="Open customer portal" /></label>
          <label className="block lg:col-span-2"><span className="label">Button URL</span><input className="input" value={form.ctaUrl} onChange={(e) => update("ctaUrl", e.target.value)} placeholder="/portal/orders" /></label>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-600">
          <p className="font-display font-700 text-navy-950 mb-1">Available tokens</p>
          <p><code>{"{{name}}"}</code>, <code>{"{{email}}"}</code>, <code>{"{{company}}"}</code>, <code>{"{{orderNumber}}"}</code>, <code>{"{{orderTotal}}"}</code>, <code>{"{{portalUrl}}"}</code>, <code>{"{{orderUrl}}"}</code>, <code>{"{{shopUrl}}"}</code>, <code>{"{{promotionCode}}"}</code></p>
        </div>

        <button disabled={saving} className="btn-primary inline-flex items-center gap-2"><Plus size={16} />{saving ? "Saving..." : form.id ? "Save automation" : "Create automation"}</button>
      </form>

      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200"><h2 className="font-display font-800 text-xl text-navy-950">Automation rules</h2></div>
        {loading ? <div className="p-6 text-sm text-gray-500">Loading automations...</div> : rules.length === 0 ? <div className="p-8 text-center text-sm text-gray-400">No custom rules yet. Built-in fallback emails will still run for signup and paid orders unless you create active custom rules.</div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500"><tr><th className="px-5 py-3">Rule</th><th className="px-5 py-3">Trigger</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Sent/failed</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-gray-100">
            {rules.map((rule) => <tr key={rule.id} className="hover:bg-gray-50"><td className="px-5 py-4"><p className="font-display font-700 text-navy-950">{rule.name}</p><p className="text-xs text-gray-500">{rule.subject}</p></td><td className="px-5 py-4 text-xs text-gray-500">{rule.triggerLabel}</td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-xs font-display font-700 ${rule.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>{rule.isActive ? "Active" : "Inactive"}</span></td><td className="px-5 py-4 text-xs text-gray-500">{rule.sentCount} sent · {rule.failedCount} failed</td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => edit(rule)} className="btn-secondary py-2 px-3"><Pencil size={14} /></button><button type="button" onClick={() => remove(rule.id)} className="btn-secondary py-2 px-3 text-red-600"><Trash2 size={14} /></button></div></td></tr>)}
          </tbody></table></div>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2"><Mail size={17} /><h2 className="font-display font-800 text-xl text-navy-950">Recent automation log</h2></div>
        {logs.length === 0 ? <div className="p-6 text-sm text-gray-400">No automation emails logged yet.</div> : <div className="divide-y divide-gray-100">{logs.map((log) => <div key={log.id} className="px-6 py-4 text-sm"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2"><div><p className="font-display font-700 text-navy-950">{log.ruleName}</p><p className="text-xs text-gray-500">{log.triggerLabel} · {log.recipientEmail}</p>{log.message ? <p className="text-xs text-gray-400 mt-1">{log.message}</p> : null}</div><span className={`rounded-full px-2 py-1 text-xs font-display font-700 self-start ${log.status === "SENT" ? "bg-green-50 text-green-700" : log.status === "FAILED" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600"}`}>{log.status}</span></div></div>)}</div>}
      </section>
    </div>
  );
}
