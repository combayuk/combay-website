"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, FileText, Plus, Search, Send } from "lucide-react";

type DocLine = { id: string; description: string; sku?: string | null; quantity: number; unitPrice: number; lineTotal: number };
type DocType = "QUOTE" | "PROFORMA_INVOICE" | "ADDITIONAL_PAYMENT_REQUEST" | "COMMERCIAL_INVOICE" | "PAID_INVOICE" | "INVOICE";
type Doc = {
  id: string;
  documentNumber: string;
  type: DocType;
  status: string;
  orderNumber?: string | null;
  customerName: string;
  customerEmail: string;
  company?: string | null;
  subtotal: number;
  tax: number;
  total: number;
  amountPaid?: number;
  balanceDue?: number;
  sentAt?: string | null;
  createdAt: string;
  lines?: DocLine[];
};

function fmt(value: number | string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(value ?? 0));
}

function label(value: string) {
  return value.replace(/_/g, " ");
}

const STATUS_COLOUR: Record<string, string> = {
  DRAFT: "text-gray-700 bg-gray-50 border-gray-200",
  SENT: "text-blue-700 bg-blue-50 border-blue-200",
  AWAITING_PAYMENT: "text-yellow-700 bg-yellow-50 border-yellow-200",
  ACCEPTED: "text-green-700 bg-green-50 border-green-200",
  PAID: "text-green-700 bg-green-50 border-green-200",
  CANCELLED: "text-red-700 bg-red-50 border-red-200",
  EXPIRED: "text-gray-700 bg-gray-50 border-gray-200",
  VOID: "text-red-700 bg-red-50 border-red-200",
};

const VISIBLE_TYPES: DocType[] = ["QUOTE", "PROFORMA_INVOICE", "ADDITIONAL_PAYMENT_REQUEST"];

export default function InvoicesPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("ALL");
  const [message, setMessage] = useState("");

  function loadDocs() {
    setLoading(true);
    fetch("/api/invoices?area=quotes", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setDocs(data.data ?? []);
        setSource(data.mode ?? "");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadDocs();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return docs.filter((doc) => {
      const matchesType = type === "ALL" || doc.type === type;
      const matchesQuery = !q || [doc.documentNumber, doc.customerName, doc.customerEmail, doc.company ?? "", doc.orderNumber ?? ""].some((value) => String(value).toLowerCase().includes(q));
      return matchesType && matchesQuery;
    });
  }, [docs, query, type]);

  async function markSent(doc: Doc) {
    setMessage("");
    const response = await fetch(`/api/invoices/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: doc.type === "QUOTE" ? "SENT" : doc.status === "PAID" ? "PAID" : "AWAITING_PAYMENT" }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      setMessage(data.error || "Could not update document.");
      return;
    }
    setDocs((current) => current.map((item) => (item.id === doc.id ? data.document : item)));
    setMessage(`${doc.documentNumber} updated. Email sending is handled in the email phase.`);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-800 text-navy-950 text-2xl">Quotes / Proformas</h1>
          <p className="text-xs text-gray-400 mt-1">Source: {source || "database"}{loading ? " · loading…" : ""}. Paid commercial invoices are managed from Orders.</p>
        </div>
        <Link href="/admin/invoices/new" className="btn-primary text-sm py-2 flex items-center gap-1.5"><Plus size={14}/> Create Quote / Proforma</Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search quote, proforma, customer, email..." className="input pl-9 py-2 text-xs w-80" />
          </div>
          {(["ALL", ...VISIBLE_TYPES] as const).map((item) => <button key={item} onClick={() => setType(item)} className={`text-xs font-display font-600 px-3 py-1.5 rounded-md border transition-colors ${type === item ? "bg-navy-950 text-white border-navy-950" : "text-gray-600 border-gray-200 hover:border-navy-950"}`}>{item === "ALL" ? "All" : label(item)}</button>)}
        </div>

        {message && <div className="px-4 py-3 border-b border-gray-100 text-sm text-blue-700 bg-blue-50">{message}</div>}

        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead><tr><th>Document #</th><th>Type</th><th>Date</th><th>Customer</th><th>Order</th><th>Total</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map((doc) => (
                <tr key={doc.id}>
                  <td className="font-mono text-xs font-700 text-navy-950 break-all max-w-[160px]">{doc.documentNumber}</td>
                  <td><span className="badge bg-gray-50 text-gray-700 border-gray-200">{label(doc.type)}</span></td>
                  <td className="text-xs text-gray-500 whitespace-nowrap">{new Date(doc.createdAt).toLocaleDateString("en-GB")}</td>
                  <td><div className="font-display font-600 text-sm text-navy-950">{doc.customerName}</div><div className="text-xs text-gray-400">{doc.customerEmail}</div>{doc.company && <div className="text-xs text-gray-400">{doc.company}</div>}</td>
                  <td className="font-mono text-xs text-gray-500">{doc.orderNumber ?? "—"}</td>
                  <td className="font-display font-700 text-navy-950 whitespace-nowrap">{fmt(doc.total)}</td>
                  <td className="font-display font-700 text-navy-950 whitespace-nowrap">{fmt(doc.balanceDue ?? doc.total)}</td>
                  <td><span className={`badge ${STATUS_COLOUR[doc.status] ?? STATUS_COLOUR.DRAFT}`}>{label(doc.status)}</span></td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <a href={`/api/invoices/${doc.id}/html`} target="_blank" rel="noopener noreferrer" className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1"><FileText size={12}/> View</a>
                      <button onClick={() => markSent(doc)} className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1"><Send size={12}/> Mark sent</button>
                      <a href={`/api/invoices/${doc.id}/html`} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-dark px-2 py-1.5"><ExternalLink size={14}/></a>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && <tr><td colSpan={9} className="text-center text-sm text-gray-400 py-8">No quotes or proformas found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
