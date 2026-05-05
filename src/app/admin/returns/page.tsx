"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Mail, RefreshCw, RotateCcw, Search, XCircle } from "lucide-react";

const RETURN_STATUSES = [
  "AWAITING_APPROVAL",
  "APPROVED",
  "COLLECTION_BOOKED",
  "IN_TRANSIT",
  "INSPECTING",
  "REFUND_APPROVED",
  "REJECTED",
];

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: "Awaiting approval",
  AWAITING_APPROVAL: "Awaiting approval",
  APPROVED: "Approved",
  COLLECTION_BOOKED: "Collection booked",
  IN_TRANSIT: "In transit",
  INSPECTING: "Inspecting",
  REFUND_APPROVED: "Refund approved",
  REJECTED: "Rejected",
};

const STATUS_COLOUR: Record<string, string> = {
  REQUESTED: "text-amber-700 bg-amber-50 border-amber-200",
  AWAITING_APPROVAL: "text-amber-700 bg-amber-50 border-amber-200",
  APPROVED: "text-blue-700 bg-blue-50 border-blue-200",
  COLLECTION_BOOKED: "text-purple-700 bg-purple-50 border-purple-200",
  IN_TRANSIT: "text-purple-700 bg-purple-50 border-purple-200",
  INSPECTING: "text-indigo-700 bg-indigo-50 border-indigo-200",
  REFUND_APPROVED: "text-green-700 bg-green-50 border-green-200",
  REJECTED: "text-red-700 bg-red-50 border-red-200",
};

type ReturnRow = {
  id: string;
  reference: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  company?: string;
  item: string;
  sku?: string;
  reason: string;
  status: string;
  statusLabel: string;
  notes?: string;
  orderTotal?: number;
  createdAt: string;
  updatedAt: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function label(value: string) {
  return STATUS_LABELS[value] || value.replace(/_/g, " ");
}

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<ReturnRow | null>(null);
  const [message, setMessage] = useState("");

  async function loadReturns() {
    setLoading(true);
    const response = await fetch("/api/returns?admin=1", { cache: "no-store" });
    const data = await response.json();
    setReturns(Array.isArray(data.returns) ? data.returns : Array.isArray(data.data) ? data.data : []);
    setLoading(false);
  }

  useEffect(() => { loadReturns(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return returns.filter((row) => {
      const haystack = [row.reference, row.orderId, row.customerName, row.customerEmail, row.item, row.sku, row.reason].join(" ").toLowerCase();
      return (!q || haystack.includes(q)) && (!status || row.status === status);
    });
  }, [returns, search, status]);

  async function updateReturn(row: ReturnRow, nextStatus: string, adminNote = "", customerMessage = "") {
    setMessage("Updating return…");
    const response = await fetch(`/api/returns/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus, adminNote, customerMessage, notifyCustomer: true }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      setMessage(data.error || "Unable to update return.");
      return;
    }
    setMessage(data.email?.sent ? "Return updated and customer notified." : "Return updated. Email was not sent or not configured.");
    setSelected(null);
    await loadReturns();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display font-800 text-navy-900 text-2xl">Returns</h1>
          <p className="text-sm text-gray-500 mt-1">Approve, reject and update customer return requests. Customer portal reflects these statuses live.</p>
        </div>
        <button onClick={loadReturns} className="btn-secondary flex items-center gap-1.5"><RefreshCw size={14}/> Refresh</button>
      </div>

      {message && <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg px-4 py-3">{message}</div>}

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5 grid lg:grid-cols-[1fr_220px] gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={(e)=>setSearch(e.target.value)} className="input pl-9" placeholder="Search by return ref, order, customer, email, SKU or reason…" />
        </div>
        <select value={status} onChange={(e)=>setStatus(e.target.value)} className="input">
          <option value="">All statuses</option>
          {RETURN_STATUSES.map((item) => <option key={item} value={item}>{label(item)}</option>)}
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[150px_140px_1fr_160px_150px_220px] gap-4 px-5 py-3 bg-gray-50 text-[11px] font-display font-700 text-gray-500 uppercase tracking-widest">
          <div>Return #</div><div>Order</div><div>Customer / Item</div><div>Reason</div><div>Status</div><div>Actions</div>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading returns…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No returns found.</div>
        ) : filtered.map((row) => (
          <div key={row.id} className="grid grid-cols-[150px_140px_1fr_160px_150px_220px] gap-4 px-5 py-4 border-t border-gray-100 items-center text-sm">
            <div className="font-mono text-xs font-700 text-navy-950 break-all">{row.reference}</div>
            <div className="font-display font-700 text-navy-950">{row.orderId}</div>
            <div>
              <p className="font-display font-700 text-navy-950">{row.customerName}</p>
              <p className="text-gray-400 text-xs">{row.customerEmail}</p>
              <p className="text-gray-600 text-xs mt-1 truncate">{row.item}</p>
              {row.sku && <p className="text-gray-400 text-[11px] font-mono">{row.sku}</p>}
            </div>
            <div className="text-xs text-gray-600 line-clamp-2">{row.reason}</div>
            <div><span className={`badge border ${STATUS_COLOUR[row.status] || "text-gray-700 bg-gray-50 border-gray-200"}`}>{label(row.status)}</span></div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setSelected(row)} className="btn-secondary text-xs py-1.5 px-3">View / update</button>
              {(row.status === "AWAITING_APPROVAL" || row.status === "REQUESTED") && <button onClick={() => updateReturn(row, "APPROVED")} className="text-xs bg-green-50 border border-green-200 text-green-700 rounded-md px-3 py-1.5 font-display font-700 flex items-center gap-1"><CheckCircle size={12}/> Approve</button>}
              {(row.status === "AWAITING_APPROVAL" || row.status === "REQUESTED") && <button onClick={() => updateReturn(row, "REJECTED")} className="text-xs bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-1.5 font-display font-700 flex items-center gap-1"><XCircle size={12}/> Reject</button>}
            </div>
          </div>
        ))}
      </div>

      {selected && <ReturnModal row={selected} onClose={() => setSelected(null)} onSave={updateReturn} />}
    </div>
  );
}

function ReturnModal({ row, onClose, onSave }: { row: ReturnRow; onClose: () => void; onSave: (row: ReturnRow, status: string, note?: string, message?: string) => void }) {
  const [nextStatus, setNextStatus] = useState(row.status === "REQUESTED" ? "AWAITING_APPROVAL" : row.status);
  const [adminNote, setAdminNote] = useState("");
  const [customerMessage, setCustomerMessage] = useState("");
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-auto p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">✕</button>
        <div className="mb-5">
          <p className="font-mono text-[10px] text-accent tracking-widest uppercase mb-1">{row.reference}</p>
          <h2 className="font-display font-800 text-xl text-navy-950">Return management</h2>
          <p className="text-sm text-gray-500">Order {row.orderId} · Created {formatDate(row.createdAt)}</p>
        </div>
        <div className="grid md:grid-cols-2 gap-5 mb-5">
          <div className="border border-gray-200 rounded-xl p-4">
            <h3 className="font-display font-700 text-sm text-navy-950 mb-3">Customer</h3>
            <Detail label="Name" value={row.customerName}/>
            <Detail label="Email" value={row.customerEmail}/>
            <Detail label="Phone" value={row.customerPhone || "—"}/>
            <Detail label="Company" value={row.company || "—"}/>
          </div>
          <div className="border border-gray-200 rounded-xl p-4">
            <h3 className="font-display font-700 text-sm text-navy-950 mb-3">Item</h3>
            <Detail label="Product" value={row.item}/>
            <Detail label="SKU" value={row.sku || "—"}/>
            <Detail label="Reason" value={row.reason}/>
            <Detail label="Current status" value={label(row.status)}/>
          </div>
        </div>
        <div className="border border-gray-200 rounded-xl p-4 mb-5">
          <h3 className="font-display font-700 text-sm text-navy-950 mb-3">Update return</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Return status</label>
              <select value={nextStatus} onChange={(e)=>setNextStatus(e.target.value)} className="input">
                {RETURN_STATUSES.map((item) => <option key={item} value={item}>{label(item)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Customer notification</label>
              <input className="input" value={customerMessage} onChange={(e)=>setCustomerMessage(e.target.value)} placeholder="Optional note for customer email" />
            </div>
          </div>
          <div className="mt-3">
            <label className="label">Admin note</label>
            <textarea className="input min-h-[90px]" value={adminNote} onChange={(e)=>setAdminNote(e.target.value)} placeholder="Internal note, inspection detail or refund handling comment" />
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 mt-3">Refund approval here does not automatically refund Stripe. Process the refund manually or add Stripe refund automation in a later payment-management phase.</div>
        </div>
        {row.notes && <div className="border border-gray-200 rounded-xl p-4 mb-5"><h3 className="font-display font-700 text-sm text-navy-950 mb-2">History / notes</h3><pre className="whitespace-pre-wrap text-xs text-gray-600 font-sans">{row.notes}</pre></div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={() => onSave(row, nextStatus, adminNote, customerMessage)} className="btn-primary flex items-center gap-1.5"><Mail size={14}/> Save and notify customer</button>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[110px_1fr] gap-2 text-sm py-1"><span className="text-gray-400">{label}</span><span className="text-navy-950 font-display font-600 break-words">{value}</span></div>;
}
