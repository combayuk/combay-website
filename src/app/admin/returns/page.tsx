"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle, ExternalLink, FileUp, Mail, RefreshCw, Search, XCircle } from "lucide-react";

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
  returnLabelUrl?: string;
  returnLabelName?: string;
  returnCourier?: string;
  returnTrackingNumber?: string;
  returnTrackingUrl?: string;
  refundProofUrl?: string;
  refundProofName?: string;
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

  async function updateReturn(row: ReturnRow, nextStatus: string, adminNote = "", customerMessage = "", extra: Partial<ReturnRow> = {}) {
    setMessage("Updating return…");
    const response = await fetch(`/api/returns/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus, adminNote, customerMessage, notifyCustomer: true, ...extra }),
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
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-900 text-navy-950 text-2xl">Returns</h1>
          <p className="text-xs text-gray-500 mt-0.5">Approve returns, attach customer documents and update the customer-visible return timeline.</p>
        </div>
        <button onClick={loadReturns} className="btn-secondary text-xs py-2 flex items-center gap-1.5"><RefreshCw size={14}/> Refresh</button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-slate-50 px-3 py-1.5 font-900 text-navy-950">{returns.length} returns</span>
          <span className="rounded-full bg-amber-50 px-3 py-1.5 font-900 text-amber-700">{returns.filter((r) => r.status === "AWAITING_APPROVAL" || r.status === "REQUESTED").length} awaiting approval</span>
          <span className="rounded-full bg-blue-50 px-3 py-1.5 font-900 text-blue-700">{returns.filter((r) => r.status === "APPROVED" || r.status === "IN_TRANSIT" || r.status === "RECEIVED").length} in progress</span>
          <span className="rounded-full bg-green-50 px-3 py-1.5 font-900 text-green-700">{returns.filter((r) => r.status === "REFUNDED" || r.status === "CLOSED").length} closed/refunded</span>
        </div>
      </div>

      {message && <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg px-4 py-2.5">{message}</div>}

      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 grid lg:grid-cols-[1fr_220px] gap-2 shadow-sm">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={(e)=>setSearch(e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-accent" placeholder="Search by return ref, order, customer, email, SKU or reason…" />
        </div>
        <select value={status} onChange={(e)=>setStatus(e.target.value)} className="input py-2 text-sm">
          <option value="">All statuses</option>
          {RETURN_STATUSES.map((item) => <option key={item} value={item}>{label(item)}</option>)}
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-[140px_120px_1fr_140px_140px_200px] gap-3 px-4 py-2.5 bg-gray-50 text-[11px] font-display font-700 text-gray-500 uppercase tracking-widest">
          <div>Return #</div><div>Order</div><div>Customer / Item</div><div>Reason</div><div>Status</div><div>Actions</div>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading returns…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No returns found.</div>
        ) : filtered.map((row) => (
          <div key={row.id} className="grid grid-cols-[140px_120px_1fr_140px_140px_200px] gap-3 px-4 py-3 border-t border-gray-100 items-center text-sm">
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

function ReturnModal({ row, onClose, onSave }: { row: ReturnRow; onClose: () => void; onSave: (row: ReturnRow, status: string, note?: string, message?: string, extra?: Partial<ReturnRow>) => void }) {
  const [nextStatus, setNextStatus] = useState(row.status === "REQUESTED" ? "AWAITING_APPROVAL" : row.status);
  const [adminNote, setAdminNote] = useState("");
  const [customerMessage, setCustomerMessage] = useState("");
  const [returnLabelUrl, setReturnLabelUrl] = useState(row.returnLabelUrl || "");
  const [returnLabelName, setReturnLabelName] = useState(row.returnLabelName || "Return label");
  const [returnCourier, setReturnCourier] = useState(row.returnCourier || "");
  const [returnTrackingNumber, setReturnTrackingNumber] = useState(row.returnTrackingNumber || "");
  const [returnTrackingUrl, setReturnTrackingUrl] = useState(row.returnTrackingUrl || "");
  const [refundProofUrl, setRefundProofUrl] = useState(row.refundProofUrl || "");
  const [refundProofName, setRefundProofName] = useState(row.refundProofName || "Refund payment confirmation");
  const [uploading, setUploading] = useState("");
  const [uploadError, setUploadError] = useState("");

  async function uploadDocument(file: File | null, type: "label" | "refund") {
    if (!file) return;
    setUploading(type);
    setUploadError("");
    const form = new FormData();
    form.set("folder", "docs");
    form.set("file", file);
    const response = await fetch("/api/uploads", { method: "POST", body: form });
    const payload = await response.json().catch(() => ({}));
    setUploading("");
    if (!response.ok || !payload.ok) {
      setUploadError(payload.error || "Upload failed.");
      return;
    }
    if (type === "label") {
      setReturnLabelUrl(payload.url);
      setReturnLabelName(file.name || "Return label");
    } else {
      setRefundProofUrl(payload.url);
      setRefundProofName(file.name || "Refund payment confirmation");
    }
  }

  const extras: Partial<ReturnRow> = {
    returnLabelUrl,
    returnLabelName,
    returnCourier,
    returnTrackingNumber,
    returnTrackingUrl,
    refundProofUrl,
    refundProofName,
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto p-6 relative">
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
              <select value={nextStatus} onChange={(e)=>setNextStatus(e.target.value)} className="input py-2 text-sm">
                {RETURN_STATUSES.map((item) => <option key={item} value={item}>{label(item)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Customer notification</label>
              <input className="input py-2 text-sm" value={customerMessage} onChange={(e)=>setCustomerMessage(e.target.value)} placeholder="Optional note for customer email" />
            </div>
          </div>
          <div className="mt-3">
            <label className="label">Admin note</label>
            <textarea className="input min-h-[90px]" value={adminNote} onChange={(e)=>setAdminNote(e.target.value)} placeholder="Internal note, inspection detail or refund handling comment" />
          </div>
        </div>

        <div className="border border-gray-200 rounded-xl p-4 mb-5">
          <h3 className="font-display font-700 text-sm text-navy-950 mb-3">Customer portal documents / tracking</h3>
          <p className="text-xs text-gray-500 mb-4">Attach documents and tracking details here. They appear under the relevant return timeline stage in the customer portal.</p>
          {uploadError && <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{uploadError}</div>}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <label className="label">Return label / collection document</label>
              <input type="file" accept="application/pdf,image/*" className="input py-2 text-sm" onChange={(e) => uploadDocument(e.target.files?.[0] || null, "label")} />
              <input className="input mt-2" value={returnLabelName} onChange={(e)=>setReturnLabelName(e.target.value)} placeholder="Display name" />
              <input className="input mt-2" value={returnLabelUrl} onChange={(e)=>setReturnLabelUrl(e.target.value)} placeholder="Return label URL" />
              <div className="mt-2 flex gap-2 items-center text-xs">
                {uploading === "label" && <span className="text-gray-500">Uploading…</span>}
                {returnLabelUrl && <a href={returnLabelUrl} target="_blank" rel="noopener noreferrer" className="text-accent font-display font-700 inline-flex gap-1 items-center">Open label <ExternalLink size={11}/></a>}
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <label className="label">Refund paid proof</label>
              <input type="file" accept="application/pdf,image/*" className="input py-2 text-sm" onChange={(e) => uploadDocument(e.target.files?.[0] || null, "refund")} />
              <input className="input mt-2" value={refundProofName} onChange={(e)=>setRefundProofName(e.target.value)} placeholder="Display name" />
              <input className="input mt-2" value={refundProofUrl} onChange={(e)=>setRefundProofUrl(e.target.value)} placeholder="Refund proof URL" />
              <div className="mt-2 flex gap-2 items-center text-xs">
                {uploading === "refund" && <span className="text-gray-500">Uploading…</span>}
                {refundProofUrl && <a href={refundProofUrl} target="_blank" rel="noopener noreferrer" className="text-accent font-display font-700 inline-flex gap-1 items-center">Open proof <ExternalLink size={11}/></a>}
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 md:col-span-2">
              <label className="label">Return shipment tracking</label>
              <div className="grid md:grid-cols-3 gap-3">
                <input className="input py-2 text-sm" value={returnCourier} onChange={(e)=>setReturnCourier(e.target.value)} placeholder="Courier e.g. DHL / DPD" />
                <input className="input py-2 text-sm" value={returnTrackingNumber} onChange={(e)=>setReturnTrackingNumber(e.target.value)} placeholder="Tracking number" />
                <input className="input py-2 text-sm" value={returnTrackingUrl} onChange={(e)=>setReturnTrackingUrl(e.target.value)} placeholder="Tracking URL override" />
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 mt-4">Refund approval here does not automatically refund Stripe. Process the refund manually or add Stripe refund automation in a later payment-management phase.</div>
        </div>

        {row.notes && <div className="border border-gray-200 rounded-xl p-4 mb-5"><h3 className="font-display font-700 text-sm text-navy-950 mb-2">History / notes</h3><pre className="whitespace-pre-wrap text-xs text-gray-600 font-sans">{row.notes}</pre></div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={() => onSave(row, nextStatus, adminNote, customerMessage, extras)} className="btn-primary flex items-center gap-1.5"><Mail size={14}/> Save and notify customer</button>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[110px_1fr] gap-2 text-sm py-1"><span className="text-gray-400">{label}</span><span className="text-navy-950 font-display font-600 break-words">{value}</span></div>;
}
