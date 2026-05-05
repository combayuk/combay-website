"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, UserRound, Mail, Phone, Building2, MapPin, PackageSearch } from "lucide-react";

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
  notes?: string | null;
  createdAt: string;
};

function sourceLabel(source: string) {
  return source || "unknown";
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("ALL");
  const [mode, setMode] = useState("");

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
      const queryMatch = !q || [lead.name, lead.email, lead.phone, lead.country, lead.company, lead.source, lead.sourceRef ?? "", lead.productSku ?? "", lead.productTitle ?? "", lead.notes ?? ""].some((value) => String(value).toLowerCase().includes(q));
      return sourceMatch && queryMatch;
    });
  }, [leads, query, source]);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-800 text-navy-950 text-2xl">Leads</h1>
          <p className="text-xs text-gray-400 mt-1">Captures lead details from RFQs, contact forms, repair requests, paid orders and received bank-transfer/proforma documents. Source: {mode || "database"}{loading ? " · loading…" : ""}</p>
        </div>
        <button onClick={loadLeads} className="btn-secondary text-sm py-2">Refresh</button>
      </div>

      <div className="grid md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white border border-gray-200 rounded-xl p-4"><p className="text-xs text-gray-400">Total leads</p><p className="font-display font-800 text-2xl text-navy-950">{leads.length}</p></div>
        <div className="bg-white border border-gray-200 rounded-xl p-4"><p className="text-xs text-gray-400">RFQs</p><p className="font-display font-800 text-2xl text-navy-950">{leads.filter((l) => l.source.includes("RFQ")).length}</p></div>
        <div className="bg-white border border-gray-200 rounded-xl p-4"><p className="text-xs text-gray-400">Paid orders</p><p className="font-display font-800 text-2xl text-navy-950">{leads.filter((l) => l.source.includes("paid")).length}</p></div>
        <div className="bg-white border border-gray-200 rounded-xl p-4"><p className="text-xs text-gray-400">With product context</p><p className="font-display font-800 text-2xl text-navy-950">{leads.filter((l) => l.productSku || l.productTitle).length}</p></div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, company, country, SKU…" className="input pl-9 py-2 text-xs w-80" />
          </div>
          <select value={source} onChange={(event) => setSource(event.target.value)} className="input py-2 text-xs w-64">
            <option value="ALL">All sources</option>
            {sources.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead><tr><th>Date</th><th>Lead</th><th>Contact</th><th>Company / Country</th><th>Source</th><th>Product / Reference</th><th>Notes</th></tr></thead>
            <tbody>
              {filtered.map((lead) => (
                <tr key={lead.id}>
                  <td className="text-xs text-gray-500 whitespace-nowrap">{new Date(lead.createdAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td><div className="flex items-center gap-2"><UserRound size={13} className="text-accent"/><span className="font-display font-700 text-sm text-navy-950">{lead.name}</span></div></td>
                  <td className="text-xs text-gray-600 space-y-1"><div className="flex items-center gap-1.5"><Mail size={12}/>{lead.email}</div><div className="flex items-center gap-1.5"><Phone size={12}/>{lead.phone}</div></td>
                  <td className="text-xs text-gray-600 space-y-1"><div className="flex items-center gap-1.5"><Building2 size={12}/>{lead.company}</div><div className="flex items-center gap-1.5"><MapPin size={12}/>{lead.country}</div></td>
                  <td><span className="badge bg-blue-50 text-blue-700 border-blue-200">{sourceLabel(lead.source)}</span></td>
                  <td className="text-xs text-gray-600"><div className="flex items-center gap-1.5"><PackageSearch size={12}/><span className="font-mono">{lead.productSku || "—"}</span></div><div className="mt-1 max-w-[220px] truncate">{lead.productTitle || "—"}</div>{lead.sourceRef && <div className="mt-1 text-gray-400">Ref: {lead.sourceRef}</div>}</td>
                  <td className="text-xs text-gray-500 max-w-[260px] whitespace-pre-wrap">{lead.notes || "—"}</td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && <tr><td colSpan={7} className="text-center text-sm text-gray-400 py-8">No leads found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
