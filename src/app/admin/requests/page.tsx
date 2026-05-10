"use client";
import { useEffect, useMemo, useState } from "react";

type Tab = "quote" | "support" | "repair" | "asset" | "contact";

type RequestRow = {
  id: string;
  type: Tab;
  date: string;
  name: string;
  email: string;
  company?: string;
  subject?: string;
  message?: string;
  productSku?: string;
  productTitle?: string;
  equipment?: string;
  service?: string;
  status: string;
};

const TAB_LABELS: Record<Tab, string> = {
  quote: "Quote Requests",
  support: "Support Tickets",
  repair: "Repair Requests",
  asset: "Asset Recovery",
  contact: "Contact Messages",
};

const ENDPOINTS: Record<Tab, string> = {
  quote: "/api/quotes",
  support: "/api/support",
  repair: "/api/repair",
  asset: "/api/asset-recovery",
  contact: "/api/contact",
};

const STATUS_COLOR: Record<string,string> = {
  NEW: "text-yellow-700 bg-yellow-50 border-yellow-200",
  IN_PROGRESS: "text-blue-700 bg-blue-50 border-blue-200",
  AWAITING_CUSTOMER: "text-purple-700 bg-purple-50 border-purple-200",
  RESOLVED: "text-green-700 bg-green-50 border-green-200",
  CLOSED: "text-gray-700 bg-gray-50 border-gray-200",
};

export default function AdminRequests() {
  const [tab, setTab] = useState<Tab>("quote");
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<RequestRow | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    fetch(ENDPOINTS[tab])
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setRows(Array.isArray(data.data) ? data.data : []);
      })
      .catch(() => {
        if (!active) return;
        setError("Unable to load request preview data.");
        setRows([]);
      })
      .finally(() => active && setLoading(false));

    return () => { active = false; };
  }, [tab]);

  const description = useMemo(() => {
    if (tab === "quote") return "Product quote requests captured from product pages and shop enquiries.";
    if (tab === "support") return "Customer support tickets from the portal and product question forms.";
    if (tab === "repair") return "Repair, calibration and service enquiries.";
    if (tab === "asset") return "Asset recovery and surplus stock clearance requests.";
    return "General contact form messages.";
  }, [tab]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-900 text-navy-950 text-2xl">Requests</h1>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
        <span className="badge bg-blue-50 text-blue-700 border-blue-200">Preview mode</span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm flex gap-1.5 flex-wrap">
        {(Object.keys(TAB_LABELS) as Tab[]).map((key) => (
          <button key={key} onClick={() => setTab(key)}
            className={`font-display font-800 text-xs px-3 py-1.5 rounded-full border transition-all ${tab===key ? "bg-navy-900 text-white border-navy-900" : "border-gray-200 text-gray-600 hover:border-navy-900"}`}>
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-900">
        Phase 4 connects all request forms to API routes and reference generation. Until PostgreSQL/email is connected, this admin table shows preview/API data rather than persistent live submissions.
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading requests...</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No preview requests found for this category.</div>
        ) : (
          <table className="w-full table-fixed text-xs">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="w-[16%] px-3 py-2">ID / Date</th>
                <th className="w-[24%] px-3 py-2">Customer</th>
                <th className="w-[30%] px-3 py-2">Subject / Item</th>
                <th className="w-[16%] px-3 py-2">Status</th>
                <th className="w-[14%] px-3 py-2 text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70">
                  <td className="px-3 py-3 align-top">
                    <p className="break-all font-mono text-[11px] font-900 text-navy-950">{r.id}</p>
                    <p className="mt-1 text-[11px] text-gray-500">{r.date}</p>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <p className="truncate font-display text-sm font-800 text-navy-950">{r.name}</p>
                    {r.company && <p className="truncate text-[11px] text-gray-400">{r.company}</p>}
                    <a href={`mailto:${r.email}`} className="break-all text-[11px] text-accent hover:text-accent-dark">{r.email}</a>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <p className="truncate font-display text-sm font-800 text-navy-950">{r.subject || r.productSku || r.equipment || r.service || "Request"}</p>
                    {(r.productTitle || r.equipment) && <p className="mt-1 truncate text-[11px] text-gray-400">{r.productTitle || r.equipment}</p>}
                    <p className="mt-1 line-clamp-2 text-[11px] text-gray-500">{r.message || "—"}</p>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <select defaultValue={r.status} className={`max-w-full truncate rounded border px-2 py-1 text-[11px] font-display font-800 ${STATUS_COLOR[r.status] || "bg-white border-gray-200"}`}>
                      {['NEW','IN_PROGRESS','AWAITING_CUSTOMER','RESOLVED','CLOSED'].map((status) => <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-3 align-top text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <a href={`mailto:${r.email}`} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-900 text-accent hover:bg-slate-50">Reply</a>
                      <button onClick={() => setSelectedRequest(r)} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-900 text-navy-950 hover:bg-slate-50" type="button">View</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/50">
          <div className="absolute right-0 top-0 h-full w-full max-w-[700px] overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 sticky top-0 bg-white z-10">
              <div>
                <p className="font-mono text-[11px] text-accent tracking-wider uppercase">{selectedRequest.id}</p>
                <h2 className="font-display font-900 text-lg text-navy-950 mt-1">
                  {selectedRequest.subject || selectedRequest.productSku || selectedRequest.equipment || selectedRequest.service || "Request details"}
                </h2>
                <p className="text-xs text-gray-400 mt-1">{selectedRequest.date} · {TAB_LABELS[selectedRequest.type]}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="text-gray-400 hover:text-navy-900 text-xl leading-none"
                aria-label="Close request details"
              >
                ×
              </button>
            </div>

            <div className="px-5 py-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <DetailBlock label="Customer" value={selectedRequest.name} />
                <DetailBlock label="Email" value={selectedRequest.email} href={`mailto:${selectedRequest.email}`} />
                {selectedRequest.company && <DetailBlock label="Company" value={selectedRequest.company} />}
                <DetailBlock label="Status" value={selectedRequest.status.replace(/_/g, " ")} />
              </div>

              {(selectedRequest.productSku || selectedRequest.productTitle) && (
                <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                  <h3 className="font-display font-800 text-sm text-navy-950 mb-2">Product context</h3>
                  {selectedRequest.productSku && <DetailBlock label="SKU" value={selectedRequest.productSku} />}
                  {selectedRequest.productTitle && <DetailBlock label="Product" value={selectedRequest.productTitle} />}
                </div>
              )}

              {(selectedRequest.equipment || selectedRequest.service) && (
                <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                  <h3 className="font-display font-800 text-sm text-navy-950 mb-2">Service context</h3>
                  {selectedRequest.equipment && <DetailBlock label="Equipment" value={selectedRequest.equipment} />}
                  {selectedRequest.service && <DetailBlock label="Service" value={selectedRequest.service} />}
                </div>
              )}

              <div>
                <h3 className="font-display font-800 text-sm text-navy-950 mb-2">Message</h3>
                <div className="border border-gray-200 rounded-xl p-3 text-sm text-gray-700 whitespace-pre-line bg-white">
                  {selectedRequest.message || "No message supplied."}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-end border-t border-gray-100 pt-4">
                <a href={`mailto:${selectedRequest.email}?subject=Re: ${encodeURIComponent(selectedRequest.id)}`} className="btn-primary py-2 text-xs">
                  Reply by email
                </a>
                <button type="button" onClick={() => setSelectedRequest(null)} className="btn-secondary py-2 text-xs">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function DetailBlock({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-gray-400 font-display font-700 mb-1">{label}</p>
      {href ? (
        <a href={href} className="text-sm text-accent hover:text-accent-dark break-words">{value}</a>
      ) : (
        <p className="text-sm text-navy-950 break-words">{value}</p>
      )}
    </div>
  );
}
