"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, UserRound, Building2, MapPin, PackageSearch, Eye, CalendarClock, X } from "lucide-react";

type LeadInteraction = {
  id: string;
  source: string;
  sourceRef?: string | null;
  productSku?: string | null;
  productTitle?: string | null;
  orderId?: string | null;
  invoiceId?: string | null;
  notes?: string | null;
  createdAt: string;
};

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  company: string;
  source: string;
  sourceRef?: string | null;
  productSku?: string | null;
  productTitle?: string | null;
  orderId?: string | null;
  invoiceId?: string | null;
  notes?: string | null;
  contactCount?: number;
  lastContactAt?: string;
  interactions?: LeadInteraction[];
  createdAt: string;
};

function sourceLabel(source: string) {
  return source || "unknown";
}

function dateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("ALL");
  const [mode, setMode] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  function loadLeads() {
    setLoading(true);
    fetch("/api/leads", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setLeads(data.leads ?? data.data ?? []);
        setMode(data.mode ?? "");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadLeads(); }, []);

  const sources = useMemo(() => Array.from(new Set(leads.map((lead) => lead.source).filter(Boolean))).sort(), [leads]);
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return leads.filter((lead) => {
      const sourceMatch = source === "ALL" || lead.source === source;
      const historyText = (lead.interactions ?? []).map((item) => [item.source, item.sourceRef, item.productSku, item.productTitle, item.notes].join(" ")).join(" ");
      const queryMatch = !q || [lead.name, lead.email, lead.phone, lead.country, lead.company, lead.source, lead.sourceRef ?? "", lead.productSku ?? "", lead.productTitle ?? "", lead.notes ?? "", historyText].some((value) => String(value).toLowerCase().includes(q));
      return sourceMatch && queryMatch;
    });
  }, [leads, query, source]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-900 text-navy-950 text-2xl">Leads</h1>
          <p className="text-xs text-gray-500 mt-0.5">Deduplicated by email. Contact history captures RFQs, web forms, support/repair enquiries, paid Stripe orders and bank-transfer/proforma receipts. Source: {mode || "database"}{loading ? " · loading…" : ""}</p>
        </div>
        <button onClick={loadLeads} className="btn-secondary text-xs py-2">Refresh</button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-slate-50 px-3 py-1.5 font-900 text-navy-950">{leads.length} unique leads</span>
          <span className="rounded-full bg-blue-50 px-3 py-1.5 font-900 text-blue-700">{leads.filter((l) => l.source.includes("RFQ") || (l.interactions ?? []).some(i => i.source.includes("RFQ"))).length} RFQs</span>
          <span className="rounded-full bg-green-50 px-3 py-1.5 font-900 text-green-700">{leads.filter((l) => l.source.includes("paid") || (l.interactions ?? []).some(i => i.source.includes("paid"))).length} paid leads</span>
          <span className="rounded-full bg-amber-50 px-3 py-1.5 font-900 text-amber-700">{leads.reduce((sum, l) => sum + (l.contactCount || 1), 0)} total contacts</span>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, company, country, SKU, history…" className="h-9 w-80 rounded-lg border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-accent" />
          </div>
          <select value={source} onChange={(event) => setSource(event.target.value)} className="h-9 w-64 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-accent">
            <option value="ALL">All sources</option>
            {sources.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>

        <div className="overflow-hidden">
          <table className="w-full table-fixed text-xs">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="w-[16%] px-3 py-2">Last / Source</th>
                <th className="w-[25%] px-3 py-2">Lead</th>
                <th className="w-[22%] px-3 py-2">Company / Country</th>
                <th className="w-[25%] px-3 py-2">Product / History</th>
                <th className="w-[12%] px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50/70">
                  <td className="px-3 py-3 align-top">
                    <p className="text-[11px] text-gray-500">{dateTime(lead.lastContactAt || lead.createdAt)}</p>
                    <span className="mt-2 inline-flex max-w-full rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-900 text-blue-700">
                      <span className="truncate">{sourceLabel(lead.source)}</span>
                    </span>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="flex min-w-0 items-start gap-2">
                      <UserRound size={13} className="mt-0.5 shrink-0 text-accent" />
                      <div className="min-w-0">
                        <p className="truncate font-display text-sm font-800 text-navy-950">{lead.name || "Unnamed lead"}</p>
                        <p className="break-all text-[11px] text-gray-500">{lead.email || "—"}</p>
                        {lead.phone ? <p className="break-words text-[11px] text-gray-400">{lead.phone}</p> : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="space-y-1 text-[11px] text-gray-600">
                      <div className="flex min-w-0 items-center gap-1.5"><Building2 size={12} className="shrink-0" /><span className="truncate">{lead.company || "—"}</span></div>
                      <div className="flex min-w-0 items-center gap-1.5"><MapPin size={12} className="shrink-0" /><span className="truncate">{lead.country || "—"}</span></div>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="text-[11px] text-gray-600">
                      <div className="flex min-w-0 items-center gap-1.5"><PackageSearch size={12} className="shrink-0" /><span className="truncate font-mono">{lead.productSku || "—"}</span></div>
                      <p className="mt-1 truncate">{lead.productTitle || "—"}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="rounded-full border border-slate-200 bg-gray-50 px-2 py-0.5 text-[10px] font-900 text-gray-700">{lead.contactCount || 1} contact{(lead.contactCount || 1) === 1 ? "" : "s"}</span>
                        {lead.sourceRef ? <span className="max-w-full truncate rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-gray-400">Ref: {lead.sourceRef}</span> : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top text-right">
                    <button type="button" onClick={() => setSelectedLead(lead)} className="rounded-md border border-slate-200 px-2 py-1.5 text-[11px] font-900 text-navy-950 hover:bg-slate-50 inline-flex items-center gap-1"><Eye size={12}/> View</button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && <tr><td colSpan={5} className="text-center text-sm text-gray-400 py-8">No leads found.</td></tr>}
            </tbody>
          </table>
        </div>        </div>
      </div>

      {selectedLead && <LeadModal lead={selectedLead} onClose={() => setSelectedLead(null)} />}
    </div>
  );
}

function LeadModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const history = lead.interactions ?? [];
  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div className="absolute right-0 top-0 h-full w-full max-w-[720px] overflow-y-auto bg-white shadow-2xl">
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-4 sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-display font-800 text-xl text-navy-950">Lead details</h2>
            <p className="text-xs text-gray-400 mt-1">Deduplicated lead profile with full contact/source history.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-navy-900"><X size={18}/></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <Info label="Name" value={lead.name} />
            <Info label="Email" value={lead.email} />
            <Info label="Phone" value={lead.phone} />
            <Info label="Company" value={lead.company} />
            <Info label="Country" value={lead.country} />
            <Info label="Latest source" value={lead.source} />
            <Info label="Latest product SKU" value={lead.productSku || "—"} />
            <Info label="Latest product" value={lead.productTitle || "—"} />
          </div>

          <div className="bg-surface border border-gray-200 rounded-xl p-4">
            <h3 className="font-display font-800 text-sm text-navy-950 mb-2">Marketing automation notes</h3>
            <p className="text-xs text-gray-500 leading-relaxed">Use this history to segment customers by source, product interest, country, and buying intent. Strong segments include RFQ leads with product SKU, paid Stripe customers, repair enquiries by equipment type, asset recovery sellers, and inactive leads who have not converted after 14–30 days.</p>
          </div>

          <div>
            <h3 className="font-display font-800 text-sm text-navy-950 mb-3 flex items-center gap-2"><CalendarClock size={14}/> Contact history</h3>
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="badge bg-blue-50 text-blue-700 border-blue-200">{item.source}</span>
                    <span className="text-xs text-gray-400">{dateTime(item.createdAt)}</span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>Reference: <span className="font-mono">{item.sourceRef || "—"}</span></div>
                    <div>SKU: <span className="font-mono">{item.productSku || "—"}</span></div>
                    <div className="md:col-span-2">Product: {item.productTitle || "—"}</div>
                    <div className="md:col-span-2 whitespace-pre-wrap">Notes: {item.notes || "—"}</div>
                  </div>
                </div>
              ))}
              {history.length === 0 && <p className="text-sm text-gray-400">No contact history recorded.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return <div className="border border-gray-200 rounded-lg px-3 py-2"><p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">{label}</p><p className="text-sm text-navy-950 font-display font-600 break-words">{value || "—"}</p></div>;
}
