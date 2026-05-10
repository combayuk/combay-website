"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bold,
  CheckCircle2,
  ChevronDown,
  Eye,
  Italic,
  Mail,
  Palette,
  Pencil,
  Plus,
  Save,
  Search,
  Send,
  Trash2,
  Type,
  Underline,
  X,
} from "lucide-react";

type Trigger = string;
type TriggerOption = { value: Trigger; label: string; type: string };
type Rule = { id: string; name: string; trigger: Trigger; triggerLabel: string; triggerType: string; isActive: boolean; subject: string; body: string; ctaLabel: string; ctaUrl: string; delayHours: number; sentCount: number; failedCount: number; };
type Log = { id: string; ruleName: string; triggerLabel: string; triggerType: string; recipientEmail: string; subject?: string; preview?: string; category?: string; status: string; message: string; createdAt: string; sentAt: string | null; };
type Stats = { customerCount: number; optedInCount: number; unsubscribedCount: number; recentSent: number; recentFailed: number; recentSkipped: number; };
type Template = { id: string; name: string; type: string; trigger: Trigger; triggerLabel: string; triggerType: string; subject: string; body: string; ctaLabel: string; ctaUrl: string; isSystem: boolean; };
type TemplateType = { value: string; label: string };
type FormState = { id: string | null; name: string; trigger: Trigger; isActive: boolean; subject: string; body: string; ctaLabel: string; ctaUrl: string; delayHours: string; };
type DraftState = { id: string | null; name: string; type: string; trigger: Trigger; subject: string; body: string; ctaLabel: string; ctaUrl: string; };

const emptyForm: FormState = { id: null, name: "", trigger: "NEW_SIGNUP", isActive: true, subject: "", body: "", ctaLabel: "", ctaUrl: "", delayHours: "0" };
const emptyDraft: DraftState = { id: null, name: "", type: "general", trigger: "NEW_SIGNUP", subject: "", body: "", ctaLabel: "", ctaUrl: "" };

const FALLBACK_TRIGGERS: TriggerOption[] = [
  { value: "NEW_SIGNUP", label: "New signup", type: "Customer action" },
  { value: "FIRST_ORDER_COMPLETED", label: "First paid order", type: "Customer action" },
  { value: "ORDER_COMPLETED", label: "Any paid order", type: "Customer action" },
  ...["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"].map((month) => ({ value: `MONTHLY_${month}`, label: `${month[0]}${month.slice(1).toLowerCase()} — first Tuesday`, type: "Monthly campaign" })),
  { value: "NEW_YEAR", label: "New Year — 31 December", type: "Seasonal campaign" },
  { value: "SUMMER", label: "Summer — first Friday in June and July", type: "Seasonal campaign" },
  { value: "EASTER", label: "Easter — 3 days before Easter", type: "Seasonal campaign" },
  { value: "CHRISTMAS", label: "Christmas — 20 and 25 December", type: "Seasonal campaign" },
  { value: "BOXING_DAY", label: "Boxing Day — 20 and 26 December", type: "Seasonal campaign" },
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
    .replace(/{{\s*contactUrl\s*}}/gi, "https://combay.co.uk/contact")
    .replace(/{{\s*promotionCode\s*}}/gi, "TEST10")
    .replace(/{{\s*month\s*}}/gi, "January")
    .replace(/{{\s*year\s*}}/gi, "2027");
}

function textToHtml(value: string) {
  const withTokens = previewTokens(value || "");
  const hasHtml = /<(strong|b|em|i|u|br|p|ul|ol|li|span|h2|h3|div)\b/i.test(withTokens);
  if (hasHtml) return withTokens.replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br/>");
  return withTokens.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean).map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br/>")}</p>`).join("");
}

function groupOptions(options: TriggerOption[]) {
  return options.reduce<Record<string, TriggerOption[]>>((acc, item) => {
    const key = item.type || "Other";
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
}

function triggerTypeFor(trigger: string, options: TriggerOption[]) {
  return options.find((item) => item.value === trigger)?.type || "Automation";
}

function triggerLabelFor(trigger: string, options: TriggerOption[]) {
  return options.find((item) => item.value === trigger)?.label || trigger;
}

export default function MarketingAutomationPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [stats, setStats] = useState<Stats>({ customerCount: 0, optedInCount: 0, unsubscribedCount: 0, recentSent: 0, recentFailed: 0, recentSkipped: 0 });
  const [triggers, setTriggers] = useState<TriggerOption[]>(FALLBACK_TRIGGERS);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateTypes, setTemplateTypes] = useState<TemplateType[]>([{ value: "general", label: "General" }]);
  const [templateFilter, setTemplateFilter] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateQuery, setTemplateQuery] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [draft, setDraft] = useState<DraftState>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const activeCount = useMemo(() => rules.filter((rule) => rule.isActive).length, [rules]);
  const triggerGroups = useMemo(() => groupOptions(triggers), [triggers]);
  const selectedTemplateRecord = templates.find((template) => template.id === selectedTemplate) || null;
  const triggerType = triggerTypeFor(form.trigger, triggers);
  const filteredTemplates = useMemo(() => {
    const q = templateQuery.trim().toLowerCase();
    return templates
      .filter((template) => templateFilter === "all" || template.type === templateFilter)
      .filter((template) => !q || [template.name, template.subject, template.triggerLabel, template.type].join(" ").toLowerCase().includes(q))
      .slice(0, 60);
  }, [templates, templateFilter, templateQuery]);

  async function load() {
    setLoading(true);
    const [rulesResponse, templatesResponse] = await Promise.all([
      fetch("/api/marketing/automations", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/marketing/templates", { cache: "no-store" }).then((response) => response.json()).catch(() => ({ templates: [], types: [] })),
    ]);

    if (rulesResponse.ok) {
      setRules(rulesResponse.rules || []);
      setLogs(rulesResponse.logs || []);
      if (rulesResponse.stats) setStats(rulesResponse.stats);
      if (Array.isArray(rulesResponse.triggers) && rulesResponse.triggers.length) setTriggers(rulesResponse.triggers);
    } else {
      setError(rulesResponse.error || "Could not load automations.");
    }

    if (Array.isArray(templatesResponse.templates)) {
      setTemplates(templatesResponse.templates);
      if (!selectedTemplate && templatesResponse.templates[0]) setSelectedTemplate(templatesResponse.templates[0].id);
    }
    if (Array.isArray(templatesResponse.types) && templatesResponse.types.length) setTemplateTypes(templatesResponse.types);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateDraft<K extends keyof DraftState>(key: K, value: DraftState[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function insertMarkup(before: string, after: string) {
    const textarea = bodyRef.current;
    const current = form.body;
    if (!textarea) {
      update("body", `${current}${before}${after}`);
      return;
    }
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const selected = current.slice(start, end);
    const next = `${current.slice(0, start)}${before}${selected}${after}${current.slice(end)}`;
    update("body", next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  function applyTemplate(templateArg?: Template) {
    const template = templateArg || selectedTemplateRecord;
    if (!template) return;
    setForm({
      id: form.id,
      name: template.name,
      trigger: template.trigger,
      isActive: true,
      subject: template.subject,
      body: template.body,
      ctaLabel: template.ctaLabel || "",
      ctaUrl: template.ctaUrl || "",
      delayHours: form.delayHours || "0",
    });
    setSelectedTemplate(template.id);
    setTemplateOpen(false);
    setMessage(`Applied template: ${template.name}`);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const response = await fetch(form.id ? `/api/marketing/automations/${form.id}` : "/api/marketing/automations", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, delayHours: Number(form.delayHours || 0) }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok || !data.ok) {
      setError(data.error || "Could not save automation.");
      return;
    }
    setForm(emptyForm);
    setMessage(form.id ? "Automation updated." : "Automation created.");
    load();
  }

  function edit(rule: Rule) {
    setForm({ id: rule.id, name: rule.name, trigger: rule.trigger, isActive: rule.isActive, subject: rule.subject, body: rule.body, ctaLabel: rule.ctaLabel || "", ctaUrl: rule.ctaUrl || "", delayHours: String(rule.delayHours || 0) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(id: string) {
    if (!confirm("Delete this automation rule?")) return;
    const response = await fetch(`/api/marketing/automations/${id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) setError(data.error || "Could not delete automation.");
    else {
      setMessage("Automation deleted.");
      load();
    }
  }

  function draftFromTemplate(template: Template) {
    setDraft({ id: template.isSystem ? null : template.id, name: template.name, type: template.type || "general", trigger: template.trigger, subject: template.subject, body: template.body, ctaLabel: template.ctaLabel || "", ctaUrl: template.ctaUrl || "" });
    setDraftOpen(true);
  }

  async function saveDraft(event: FormEvent) {
    event.preventDefault();
    setDraftSaving(true);
    setError(null);
    setMessage(null);

    const response = await fetch(draft.id ? `/api/marketing/templates/${draft.id}` : "/api/marketing/templates", {
      method: draft.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await response.json().catch(() => ({}));
    setDraftSaving(false);

    if (!response.ok || !data.ok) {
      setError(data.error || "Could not save template.");
      return;
    }

    setDraft(emptyDraft);
    setDraftOpen(false);
    setMessage(draft.id ? "Template updated." : "Template created.");
    load();
  }

  async function deleteDraft(template: Template) {
    if (template.isSystem) {
      setError("Built-in templates cannot be deleted. Create a custom copy if you want to edit it.");
      return;
    }
    if (!confirm("Delete this template?")) return;
    const response = await fetch(`/api/marketing/templates/${template.id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) setError(data.error || "Could not delete template.");
    else {
      setMessage("Template deleted.");
      load();
    }
  }

  function saveCurrentAsDraft() {
    setDraft({ id: null, name: form.name || "New automation template", type: "general", trigger: form.trigger, subject: form.subject, body: form.body, ctaLabel: form.ctaLabel, ctaUrl: form.ctaUrl });
    setDraftOpen(true);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-[11px] tracking-widest uppercase text-accent">Marketing</p>
            <h1 className="font-display text-2xl font-900 text-navy-950">Email automation</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <StatPill label="Rules" value={rules.length} />
            <StatPill label="Active" value={activeCount} tone="green" />
            <StatPill label="Opted-in" value={stats.optedInCount} />
            <Link href="/admin/marketing/broadcast" className="btn-secondary py-2 text-xs"><Send size={14} /> Custom email</Link>
          </div>
        </div>
      </section>

      {message ? <Notice tone="green"><CheckCircle2 size={16} />{message}</Notice> : null}
      {error ? <Notice tone="red"><AlertTriangle size={16} />{error}</Notice> : null}

      <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-display text-lg font-900 text-navy-950">{form.id ? "Edit automation" : "Create automation"}</h2>
              <p className="text-xs text-gray-500">Compact campaign builder using the same email system as Custom Email.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-900 ${form.isActive ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>{form.isActive ? "Active" : "Draft/paused"}</span>
              {form.id ? <button type="button" onClick={() => setForm(emptyForm)} className="btn-secondary py-2 text-xs"><X size={14} /> Cancel edit</button> : null}
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-100 px-4 py-3 md:grid-cols-[140px_1fr] md:items-center">
          <label className="text-xs font-900 uppercase tracking-wide text-gray-400">Automation name</label>
          <input required className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-accent" value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="e.g. New Year Campaign" />

          <label className="text-xs font-900 uppercase tracking-wide text-gray-400">Trigger</label>
          <div className="grid gap-2 md:grid-cols-[1fr_190px_130px]">
            <select className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-accent" value={form.trigger} onChange={(event) => update("trigger", event.target.value)}>
              {(Object.entries(triggerGroups) as Array<[string, TriggerOption[]]>).map(([type, items]) => (
                <optgroup key={type} label={type}>
                  {items.map((trigger) => <option key={trigger.value} value={trigger.value}>{trigger.label}</option>)}
                </optgroup>
              ))}
            </select>
            <input className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-accent" type="number" min="0" value={form.delayHours} onChange={(event) => update("delayHours", event.target.value)} title="Delay hours" />
            <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(event) => update("isActive", event.target.checked)} />
              Active
            </label>
          </div>

          <label className="text-xs font-900 uppercase tracking-wide text-gray-400">Recipients</label>
          <button type="button" className="flex h-10 items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 text-left text-sm text-slate-600" title="Automation audiences are controlled by trigger, customer account and marketing preferences. Lead/manual audience targeting will be handled by Custom Email until persistent automation audience rules are added.">
            <span><strong className="text-navy-950">{triggerType}</strong> · trigger audience + marketing preferences</span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          <label className="text-xs font-900 uppercase tracking-wide text-gray-400">Template</label>
          <div className="relative">
            <button type="button" onClick={() => setTemplateOpen((value) => !value)} className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-left text-sm hover:border-accent/60">
              <span>{selectedTemplateRecord ? selectedTemplateRecord.name : "Choose saved template"}</span>
              <ChevronDown size={14} className="text-gray-400" />
            </button>

            {templateOpen && (
              <div className="absolute left-0 right-0 top-[44px] z-30 rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="grid gap-2 border-b border-slate-100 p-3 md:grid-cols-[180px_1fr]">
                  <select className="h-9 rounded-lg border border-slate-200 px-2 text-xs" value={templateFilter} onChange={(event) => setTemplateFilter(event.target.value)}>
                    <option value="all">All template types</option>
                    {templateTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-2.5 text-gray-400" />
                    <input className="h-9 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-xs outline-none focus:border-accent" value={templateQuery} onChange={(event) => setTemplateQuery(event.target.value)} placeholder="Search templates…" />
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto py-1">
                  {filteredTemplates.map((template) => (
                    <button key={template.id} type="button" onClick={() => applyTemplate(template)} className="block w-full px-3 py-2 text-left hover:bg-slate-50">
                      <span className="block text-sm font-900 text-navy-950">{template.name}</span>
                      <span className="block truncate text-xs text-gray-500">{template.isSystem ? "Built-in" : "Custom"} · {template.triggerLabel} · {template.subject}</span>
                    </button>
                  ))}
                  {!filteredTemplates.length && <p className="px-3 py-3 text-sm text-gray-400">No templates found.</p>}
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 p-3">
                  <button type="button" onClick={saveCurrentAsDraft} className="text-xs font-900 text-[#2D4F7A] hover:text-accent">+ Add new template from current email</button>
                  <button type="button" onClick={() => selectedTemplateRecord && draftFromTemplate(selectedTemplateRecord)} className="text-xs font-900 text-slate-500 hover:text-navy-950">Edit/manage selected</button>
                </div>
              </div>
            )}
          </div>

          <label className="text-xs font-900 uppercase tracking-wide text-gray-400">Subject</label>
          <input required className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-accent" value={form.subject} onChange={(event) => update("subject", event.target.value)} placeholder="Email subject" />
        </div>

        <div className="border-b border-slate-100 bg-slate-50 px-3 py-2">
          <div className="flex flex-wrap items-center gap-1">
            <ToolbarButton title="Bold" onClick={() => insertMarkup("<strong>", "</strong>")}><Bold size={14} /></ToolbarButton>
            <ToolbarButton title="Italic" onClick={() => insertMarkup("<em>", "</em>")}><Italic size={14} /></ToolbarButton>
            <ToolbarButton title="Underline" onClick={() => insertMarkup("<u>", "</u>")}><Underline size={14} /></ToolbarButton>
            <ToolbarButton title="Font size 16" onClick={() => insertMarkup('<span style="font-size:16px;">', "</span>")}><Type size={14} /></ToolbarButton>
            <ToolbarButton title="Navy text" onClick={() => insertMarkup('<span style="color:#0f172a;">', "</span>")}><Palette size={14} /></ToolbarButton>
            <ToolbarButton title="Accent text" onClick={() => insertMarkup('<span style="color:#b45309;">', "</span>")}><Palette size={14} /></ToolbarButton>
            <ToolbarButton title="Preview" onClick={() => setPreviewOpen(true)}><Eye size={14} /></ToolbarButton>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1fr_380px]">
          <div className="p-4">
            <textarea ref={bodyRef} required className="min-h-[330px] w-full resize-y rounded-lg border border-transparent px-2 py-1 font-mono text-sm leading-7 text-slate-700 outline-none focus:border-slate-200" value={form.body} onChange={(event) => update("body", event.target.value)} placeholder="Dear {{name}},&#10;&#10;Write the automation email here…" />
            <div className="mt-3 grid gap-2 md:grid-cols-[180px_1fr]">
              <input className="h-9 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-accent" value={form.ctaLabel} onChange={(event) => update("ctaLabel", event.target.value)} placeholder="Button label" />
              <input className="h-9 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-accent" value={form.ctaUrl} onChange={(event) => update("ctaUrl", event.target.value)} placeholder="/shop or https://..." />
            </div>
          </div>

          <aside className="border-l border-slate-100 bg-slate-50 p-4">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-4">
                <img src="/images/combay-doc-logo.png" alt="Combay" className="mb-3 h-auto w-36" />
                <h3 className="font-display text-base font-900 leading-tight text-navy-950">{previewTokens(form.subject || "Email subject")}</h3>
              </div>
              <div className="prose prose-sm max-w-none p-4 text-sm leading-7 text-gray-700" dangerouslySetInnerHTML={{ __html: textToHtml(form.body || "Dear {{name}},\n\nYour email content preview will appear here.") }} />
              {form.ctaLabel && form.ctaUrl ? <div className="px-4 pb-4"><span className="inline-flex rounded-lg bg-accent px-4 py-2.5 text-xs font-900 text-navy-950">{form.ctaLabel}</span></div> : null}
              <div className="border-t bg-slate-50 p-3 text-xs text-gray-500"><strong>Combay Limited</strong><br />sales@combay.co.uk · +44 7340 383334</div>
            </div>
          </aside>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">
            Tokens: <code>{"{{name}}"}</code>, <code>{"{{email}}"}</code>, <code>{"{{orderNumber}}"}</code>, <code>{"{{shopUrl}}"}</code>, <code>{"{{promotionCode}}"}</code>, <code>{"{{month}}"}</code>
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPreviewOpen(true)} className="btn-secondary py-2 text-xs"><Eye size={14} /> Preview</button>
            <button disabled={saving} className="btn-primary py-2 text-xs"><Save size={14} />{saving ? "Saving..." : form.id ? "Save automation" : "Activate/save"}</button>
          </div>
        </div>
      </form>

      {draftOpen && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-900 text-navy-950">{draft.id ? "Edit template" : "Add new template"}</h2>
              <p className="text-xs text-gray-500">Saved templates appear inside the Template dropdown.</p>
            </div>
            <button type="button" onClick={() => setDraftOpen(false)} className="text-gray-400 hover:text-navy-950"><X size={18} /></button>
          </div>
          <form onSubmit={saveDraft} className="grid gap-3 lg:grid-cols-2">
            <label><span className="label">Template name *</span><input className="input" required value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} /></label>
            <label><span className="label">Template type *</span><select className="input" value={draft.type} onChange={(event) => updateDraft("type", event.target.value)}>{templateTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
            <label><span className="label">Trigger *</span><select className="input" value={draft.trigger} onChange={(event) => updateDraft("trigger", event.target.value)}>{(Object.entries(triggerGroups) as Array<[string, TriggerOption[]]>).map(([type, items]) => <optgroup key={type} label={type}>{items.map((trigger) => <option key={trigger.value} value={trigger.value}>{trigger.label}</option>)}</optgroup>)}</select></label>
            <label><span className="label">Subject *</span><input className="input" required value={draft.subject} onChange={(event) => updateDraft("subject", event.target.value)} /></label>
            <label className="lg:col-span-2"><span className="label">Body *</span><textarea className="textarea min-h-[140px] font-mono text-sm" required value={draft.body} onChange={(event) => updateDraft("body", event.target.value)} /></label>
            <input className="input" value={draft.ctaLabel} onChange={(event) => updateDraft("ctaLabel", event.target.value)} placeholder="Button label" />
            <input className="input" value={draft.ctaUrl} onChange={(event) => updateDraft("ctaUrl", event.target.value)} placeholder="Button URL" />
            <div className="lg:col-span-2 flex gap-2">
              <button disabled={draftSaving} className="btn-primary py-2 text-xs"><Save size={14} /> {draftSaving ? "Saving..." : draft.id ? "Save template" : "Create template"}</button>
              <button type="button" onClick={() => setDraft(emptyDraft)} className="btn-secondary py-2 text-xs">Clear</button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="font-display text-lg font-900 text-navy-950">Automation rules</h2>
            <p className="text-xs text-gray-500">Compact list of active and draft rules.</p>
          </div>
          <button type="button" onClick={() => setForm(emptyForm)} className="btn-secondary py-2 text-xs"><Plus size={14} /> New</button>
        </div>
        {loading ? <div className="p-5 text-sm text-gray-500">Loading automations...</div> : rules.length === 0 ? <div className="p-6 text-center text-sm text-gray-400">No custom rules yet.</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-gray-500">
                <tr><th className="px-4 py-2">Rule</th><th className="px-4 py-2">Trigger</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Sent/failed</th><th className="px-4 py-2 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><p className="font-display font-800 text-navy-950">{rule.name}</p><p className="max-w-[420px] truncate text-xs text-gray-500">{rule.subject}</p></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{rule.triggerLabel}<br /><span className="text-gray-400">{rule.triggerType}</span></td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-900 ${rule.isActive ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>{rule.isActive ? "Active" : "Paused"}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{rule.sentCount} sent · {rule.failedCount} failed</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => edit(rule)} className="btn-secondary px-2 py-1.5 text-xs"><Pencil size={13} /></button>
                        <button type="button" onClick={() => remove(rule.id)} className="btn-secondary px-2 py-1.5 text-xs text-red-600"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3"><Mail size={16} /><h2 className="font-display text-lg font-900 text-navy-950">Recent automation log</h2></div>
        {logs.length === 0 ? <div className="p-5 text-sm text-gray-400">No automation emails logged yet.</div> : (
          <div className="divide-y divide-slate-100">
            {logs.slice(0, 12).map((log) => (
              <div key={log.id} className="px-4 py-3 text-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-display font-800 text-navy-950">{log.ruleName}</p>
                    <p className="text-xs text-gray-500">{log.triggerLabel} · {log.recipientEmail}</p>
                    {log.subject ? <p className="mt-1 text-xs text-gray-600">{log.subject}</p> : null}
                    {log.preview ? <p className="mt-1 line-clamp-2 text-xs text-gray-400">{log.preview}</p> : null}
                  </div>
                  <span className={`self-start rounded-full px-2 py-1 text-xs font-900 ${log.status === "SENT" ? "bg-green-50 text-green-700" : log.status === "FAILED" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>{log.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <h2 className="font-display text-lg font-900 text-navy-950">Automation preview</h2>
              <button type="button" onClick={() => setPreviewOpen(false)} className="text-gray-400 hover:text-navy-950"><X size={18} /></button>
            </div>
            <div className="border-b px-5 py-4">
              <img src="/images/combay-doc-logo.png" className="mb-4 h-auto w-40" alt="Combay" />
              <h3 className="font-display text-xl font-900 leading-tight text-navy-950">{previewTokens(form.subject || "Email subject")}</h3>
            </div>
            <div className="prose prose-sm max-w-none px-5 py-5 text-sm leading-7 text-gray-700" dangerouslySetInnerHTML={{ __html: textToHtml(form.body || "Dear {{name}},\n\nYour email content preview will appear here.") }} />
            {form.ctaLabel && form.ctaUrl ? <div className="px-5 pb-5"><span className="inline-flex rounded-lg bg-accent px-4 py-3 text-sm font-900 text-navy-950">{form.ctaLabel}</span></div> : null}
            <div className="border-t bg-slate-50 px-5 py-3 text-xs text-gray-500">{triggerLabelFor(form.trigger, triggers)} · {form.isActive ? "Active" : "Draft/paused"}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolbarButton({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) {
  return <button type="button" title={title} onClick={onClick} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:border-accent/60 hover:text-navy-950">{children}</button>;
}

function StatPill({ label, value, tone }: { label: string; value: number; tone?: "green" }) {
  return <span className={`rounded-full border px-3 py-1.5 font-display font-900 ${tone === "green" ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-navy-950"}`}>{label}: {value}</span>;
}

function Notice({ tone, children }: { tone: "green" | "red"; children: ReactNode }) {
  return <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${tone === "green" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>{children}</div>;
}
