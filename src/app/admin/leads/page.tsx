"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, UserRound, Mail, Phone, Building2, MapPin, PackageSearch, Eye, CalendarClock, X } from "lucide-react";

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
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-800 text-navy-950 text-2xl">Leads</h1>
          <p className="text-xs text-gray-400 mt-1">Deduplicated by email. Contact history captures RFQs, web forms, support/repair enquiries, paid Stripe orders and bank-transfer/proforma receipts. Source: {mode || "database"}{loading ? " · loading…" : ""}</p>
        </div>
        <button onClick={loadLeads} className="btn-secondary text-sm py-2">Refresh</button>
      </div>

      <div className="grid md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white border border-gray-200 rounded-xl p-4"><p className="text-xs text-gray-400">Unique leads</p><p className="font-display font-800 text-2xl text-navy-950">{leads.length}</p></div>
        <div className="bg-white border border-gray-200 rounded-xl p-4"><p className="text-xs text-gray-400">RFQs</p><p className="font-display font-800 text-2xl text-navy-950">{leads.filter((l) => l.source.includes("RFQ") || (l.interactions ?? []).some(i => i.source.includes("RFQ"))).length}</p></div>
        <div className="bg-white border border-gray-200 rounded-xl p-4"><p className="text-xs text-gray-400">Paid leads</p><p className="font-display font-800 text-2xl text-navy-950">{leads.filter((l) => l.source.includes("paid") || (l.interactions ?? []).some(i => i.source.includes("paid"))).length}</p></div>
        <div className="bg-white border border-gray-200 rounded-xl p-4"><p className="text-xs text-gray-400">Total contacts</p><p className="font-display font-800 text-2xl text-navy-950">{leads.reduce((sum, l) => sum + (l.contactCount || 1), 0)}</p></div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, company, country, SKU, history…" className="input pl-9 py-2 text-xs w-80" />
          </div>
          <select value={source} onChange={(event) => setSource(event.target.value)} className="input py-2 text-xs w-64">
            <option value="ALL">All sources</option>
            {sources.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead><tr><th>Last contact</th><th>Lead</th><th>Contact</th><th>Company / Country</th><th>Source</th><th>Product / Reference</th><th>History</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map((lead) => (
                <tr key={lead.id}>
                  <td className="text-xs text-gray-500 whitespace-nowrap">{dateTime(lead.lastContactAt || lead.createdAt)}</td>
                  <td><div className="flex items-center gap-2"><UserRound size={13} className="text-accent"/><span className="font-display font-700 text-sm text-navy-950">{lead.name}</span></div></td>
                  <td className="text-xs text-gray-600 space-y-1"><div className="flex items-center gap-1.5"><Mail size={12}/>{lead.email}</div><div className="flex items-center gap-1.5"><Phone size={12}/>{lead.phone}</div></td>
                  <td className="text-xs text-gray-600 space-y-1"><div className="flex items-center gap-1.5"><Building2 size={12}/>{lead.company}</div><div className="flex items-center gap-1.5"><MapPin size={12}/>{lead.country}</div></td>
                  <td><span className="badge bg-blue-50 text-blue-700 border-blue-200">{sourceLabel(lead.source)}</span></td>
                  <td className="text-xs text-gray-600"><div className="flex items-center gap-1.5"><PackageSearch size={12}/><span className="font-mono">{lead.productSku || "—"}</span></div><div className="mt-1 max-w-[220px] truncate">{lead.productTitle || "—"}</div>{lead.sourceRef && <div className="mt-1 text-gray-400">Ref: {lead.sourceRef}</div>}</td>
                  <td className="text-xs text-gray-500"><span className="badge bg-gray-50 text-gray-700 border-gray-200">{lead.contactCount || 1} contact{(lead.contactCount || 1) === 1 ? "" : "s"}</span></td>
                  <td><button type="button" onClick={() => setSelectedLead(lead)} className="btn-secondary text-xs py-1.5 flex items-center gap-1"><Eye size={12}/> View</button></td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && <tr><td colSpan={8} className="text-center text-sm text-gray-400 py-8">No leads found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLead && <LeadModal lead={selectedLead} onClose={() => setSelectedLead(null)} />}
    </div>
  );
}

function LeadModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const history = lead.interactions ?? [];
  return (
    <div className="fixed inset-0 z-50 bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl mx-auto my-8 border border-gray-200">
        <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display font-800 text-xl text-navy-950">Lead details</h2>
            <p className="text-xs text-gray-400 mt-1">Deduplicated lead profile with full contact/source history.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-navy-900"><X size={18}/></button>
        </div>
        <div className="p-5 space-y-5">
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
  return <div className="border border-gray-200 rounded-lg p-3"><p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">{label}</p><p className="text-sm text-navy-950 font-display font-600 break-words">{value || "—"}</p></div>;
}
