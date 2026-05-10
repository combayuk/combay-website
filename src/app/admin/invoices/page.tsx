"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
} from "lucide-react";

type DocLine = {
  id: string;
  description: string;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};
type DocType =
  | "QUOTE"
  | "PROFORMA_INVOICE"
  | "PACKING_LIST"
  | "COMMERCIAL_INVOICE"
  | "PAID_INVOICE"
  | "INVOICE";
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
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(Number(value ?? 0));
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
  RECEIVED: "text-green-700 bg-green-50 border-green-200",
  CANCELLED: "text-red-700 bg-red-50 border-red-200",
  EXPIRED: "text-gray-700 bg-gray-50 border-gray-200",
  VOID: "text-red-700 bg-red-50 border-red-200",
};

const VISIBLE_TYPES: DocType[] = ["QUOTE", "PROFORMA_INVOICE", "PACKING_LIST"];
const VAT_TOGGLE_TYPES: DocType[] = ["QUOTE", "PROFORMA_INVOICE"];

function canToggleVat(doc: Doc) {
  return VAT_TOGGLE_TYPES.includes(doc.type);
}

function isVatCharged(doc: Doc) {
  return Number(doc.tax ?? 0) > 0;
}

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
      const matchesQuery =
        !q ||
        [
          doc.documentNumber,
          doc.customerName,
          doc.customerEmail,
          doc.company ?? "",
          doc.orderNumber ?? "",
        ].some((value) => String(value).toLowerCase().includes(q));
      return matchesType && matchesQuery;
    });
  }, [docs, query, type]);

  async function markSent(doc: Doc) {
    setMessage("");
    const response = await fetch(`/api/invoices/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SENT" }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      setMessage(data.error || "Could not update document.");
      return;
    }
    setDocs((current) =>
      current.map((item) => (item.id === doc.id ? data.document : item)),
    );
    setMessage(`${doc.documentNumber} marked as sent.`);
  }

  async function markReceived(doc: Doc) {
    setMessage("");
    const response = await fetch(`/api/invoices/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "RECEIVED" }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      setMessage(data.error || "Could not mark as received.");
      return;
    }
    setDocs((current) =>
      current.map((item) => (item.id === doc.id ? data.document : item)),
    );
    setMessage(
      `${doc.documentNumber} marked as received and is now visible in Orders for tracking/dispatch management.`,
    );
  }

  async function sendDocument(doc: Doc) {
    setMessage("");
    const response = await fetch(`/api/invoices/${doc.id}/send`, {
      method: "POST",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.email?.sent) {
      setMessage(
        data.email?.error ||
          data.error ||
          "Email could not be sent. Check Resend environment variables/domain verification.",
      );
      return;
    }
    setDocs((current) =>
      current.map((item) =>
        item.id === doc.id
          ? {
              ...item,
              status: data.document?.status ?? item.status,
              sentAt: data.document?.sentAt ?? item.sentAt,
            }
          : item,
      ),
    );
    setMessage(`${doc.documentNumber} sent to ${doc.customerEmail}.`);
  }

  async function toggleVat(doc: Doc, chargeVat: boolean) {
    if (!canToggleVat(doc)) return;
    setMessage("");
    const response = await fetch(`/api/invoices/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taxRate: chargeVat ? 0.2 : 0,
        regeneratePaymentLink: doc.type === "PROFORMA_INVOICE",
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      setMessage(data.error || data.reason || "Could not update VAT setting.");
      return;
    }
    setDocs((current) =>
      current.map((item) => (item.id === doc.id ? data.document : item)),
    );
    setMessage(
      `${doc.documentNumber}: VAT ${chargeVat ? "enabled" : "removed"}.`,
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display font-900 text-navy-950 text-2xl">
            Quotes / Proformas / Packing Lists
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Source: {source || "database"}
            {loading ? " · loading…" : ""}. Paid commercial invoices are managed
            from Orders. Packing lists can be created here or from an order.
          </p>
        </div>
        <Link
          href="/admin/invoices/new"
          className="btn-primary text-xs py-2 flex items-center gap-1.5"
        >
          <Plus size={14} /> Create Quote / Proforma / Packing List
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search quote, proforma, packing list, customer, email..."
              className="h-9 w-80 rounded-lg border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-accent"
            />
          </div>
          {(["ALL", ...VISIBLE_TYPES] as const).map((item) => (
            <button
              key={item}
              onClick={() => setType(item)}
              className={`text-xs font-display font-800 px-2.5 py-1 rounded-full border transition-colors ${type === item ? "bg-navy-950 text-white border-navy-950" : "text-gray-600 border-gray-200 hover:border-navy-950"}`}
            >
              {item === "ALL" ? "All" : label(item)}
            </button>
          ))}
        </div>

        {message && (
          <div className="px-4 py-3 border-b border-gray-100 text-sm text-blue-700 bg-blue-50">
            {message}
          </div>
        )}

        <div className="overflow-hidden">
          <table className="w-full table-fixed text-xs">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="w-[18%] px-3 py-2">Document</th>
                <th className="w-[24%] px-3 py-2">Customer</th>
                <th className="w-[14%] px-3 py-2">Order / VAT</th>
                <th className="w-[15%] px-3 py-2">Amounts</th>
                <th className="w-[12%] px-3 py-2">Status</th>
                <th className="w-[17%] px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((doc) => (
                <tr key={doc.id} className="align-top hover:bg-slate-50/70">
                  <td className="px-3 py-3">
                    <p className="break-all font-mono text-[11px] font-900 text-navy-950">{doc.documentNumber}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <span className="rounded-full border border-slate-200 bg-gray-50 px-2 py-0.5 text-[10px] font-900 text-gray-700">{label(doc.type)}</span>
                      <span className="text-[11px] text-gray-400">{new Date(doc.createdAt).toLocaleDateString("en-GB")}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <p className="truncate font-display text-sm font-800 text-navy-950">{doc.customerName}</p>
                    <p className="break-all text-[11px] text-gray-400">{doc.customerEmail}</p>
                    {doc.company ? <p className="truncate text-[11px] text-gray-400">{doc.company}</p> : null}
                  </td>
                  <td className="px-3 py-3">
                    <p className="break-all font-mono text-[11px] text-gray-500">{doc.orderNumber ?? "—"}</p>
                    {canToggleVat(doc) ? (
                      <label className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-display font-700 text-navy-950">
                        <input
                          type="checkbox"
                          checked={isVatCharged(doc)}
                          onChange={(event) => toggleVat(doc, event.target.checked)}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-navy-950 focus:ring-navy-950"
                        />
                        <span>{isVatCharged(doc) ? "VAT 20%" : "No VAT"}</span>
                      </label>
                    ) : <span className="mt-2 block text-[11px] text-gray-400">VAT n/a</span>}
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-display text-sm font-900 text-navy-950">{fmt(doc.total)}</p>
                    <p className="text-[11px] text-gray-500">Balance {fmt(doc.balanceDue ?? doc.total)}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`badge ${STATUS_COLOUR[doc.status] ?? STATUS_COLOUR.DRAFT}`}>{label(doc.status)}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      <a href={`/api/invoices/${doc.id}/html`} target="_blank" rel="noopener noreferrer" className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-900 text-navy-950 hover:bg-slate-50">View</a>
                      <Link href={`/admin/invoices/${doc.id}/edit`} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-900 text-navy-950 hover:bg-slate-50">Edit</Link>
                      <button onClick={() => sendDocument(doc)} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-900 text-navy-950 hover:bg-slate-50">Send</button>
                      <button onClick={() => markSent(doc)} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-900 text-slate-600 hover:bg-slate-50">Sent</button>
                      <button onClick={() => markReceived(doc)} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-900 text-green-700 hover:bg-green-50">Received</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-sm text-gray-400 py-8">
                    No quotes, proformas or packing lists found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>        </div>
      </div>
    </div>
  );
}
