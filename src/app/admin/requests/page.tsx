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
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-800 text-navy-900 text-2xl">Requests</h1>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
        <span className="badge bg-blue-50 text-blue-700 border-blue-200">Preview mode</span>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {(Object.keys(TAB_LABELS) as Tab[]).map((key) => (
          <button key={key} onClick={() => setTab(key)}
            className={`font-display font-600 text-sm px-4 py-2.5 rounded-lg border transition-all ${tab===key ? "bg-navy-900 text-white border-navy-900" : "border-gray-200 text-gray-600 hover:border-navy-900"}`}>
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-900 mb-5">
        Phase 4 connects all request forms to API routes and reference generation. Until PostgreSQL/email is connected, this admin table shows preview/API data rather than persistent live submissions.
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-gray-500">Loading requests...</div>
        ) : error ? (
          <div className="p-8 text-sm text-red-600">{error}</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-sm text-gray-500">No preview requests found for this category.</div>
        ) : (
          <table className="w-full admin-table">
            <thead>
              <tr><th>ID</th><th>Date</th><th>Customer</th><th>Subject / Item</th><th>Message</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-xs text-gray-500">{r.id}</td>
                  <td className="text-xs text-gray-500">{r.date}</td>
                  <td>
                    <div className="font-display font-600 text-sm text-navy-900">{r.name}</div>
                    {r.company && <div className="text-xs text-gray-400">{r.company}</div>}
                    <a href={`mailto:${r.email}`} className="text-xs text-accent hover:text-accent-dark">{r.email}</a>
                  </td>
                  <td className="text-xs text-gray-600 max-w-xs">
                    <div className="font-display font-700 text-navy-900">{r.subject || r.productSku || r.equipment || r.service || "Request"}</div>
                    {(r.productTitle || r.equipment) && <div className="text-gray-400 mt-1">{r.productTitle || r.equipment}</div>}
                  </td>
                  <td className="text-xs text-gray-600 max-w-xs line-clamp-2">{r.message || "—"}</td>
                  <td>
                    <select defaultValue={r.status} className={`text-xs border rounded px-2 py-1 font-display font-600 ${STATUS_COLOR[r.status] || "bg-white border-gray-200"}`}>
                      {['NEW','IN_PROGRESS','AWAITING_CUSTOMER','RESOLVED','CLOSED'].map((status) => <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>)}
                    </select>
                  </td>
                  <td>
                    <a href={`mailto:${r.email}`} className="text-xs text-accent hover:text-accent-dark font-600 mr-2">Reply</a>
                    <button onClick={() => setSelectedRequest(r)} className="text-xs text-gray-400 hover:text-navy-900 font-600" type="button">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
              <div>
                <p className="font-mono text-[11px] text-accent tracking-wider uppercase">{selectedRequest.id}</p>
                <h2 className="font-display font-800 text-xl text-navy-950 mt-1">
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

            <div className="px-6 py-5 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <DetailBlock label="Customer" value={selectedRequest.name} />
                <DetailBlock label="Email" value={selectedRequest.email} href={`mailto:${selectedRequest.email}`} />
                {selectedRequest.company && <DetailBlock label="Company" value={selectedRequest.company} />}
                <DetailBlock label="Status" value={selectedRequest.status.replace(/_/g, " ")} />
              </div>

              {(selectedRequest.productSku || selectedRequest.productTitle) && (
                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                  <h3 className="font-display font-800 text-sm text-navy-950 mb-2">Product context</h3>
                  {selectedRequest.productSku && <DetailBlock label="SKU" value={selectedRequest.productSku} />}
                  {selectedRequest.productTitle && <DetailBlock label="Product" value={selectedRequest.productTitle} />}
                </div>
              )}

              {(selectedRequest.equipment || selectedRequest.service) && (
                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                  <h3 className="font-display font-800 text-sm text-navy-950 mb-2">Service context</h3>
                  {selectedRequest.equipment && <DetailBlock label="Equipment" value={selectedRequest.equipment} />}
                  {selectedRequest.service && <DetailBlock label="Service" value={selectedRequest.service} />}
                </div>
              )}

              <div>
                <h3 className="font-display font-800 text-sm text-navy-950 mb-2">Message</h3>
                <div className="border border-gray-200 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-line bg-white">
                  {selectedRequest.message || "No message supplied."}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-end border-t border-gray-100 pt-4">
                <a href={`mailto:${selectedRequest.email}?subject=Re: ${encodeURIComponent(selectedRequest.id)}`} className="btn-primary">
                  Reply by email
                </a>
                <button type="button" onClick={() => setSelectedRequest(null)} className="btn-secondary">
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
