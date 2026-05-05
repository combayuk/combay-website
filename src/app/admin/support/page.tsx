"use client";

import { useEffect, useMemo, useState } from "react";

type SupportMessage = {
  id: string;
  authorType: "ADMIN" | "CUSTOMER" | "SYSTEM";
  authorName?: string;
  authorEmail?: string;
  message: string;
  isCustomerVisible: boolean;
  emailSent: boolean;
  createdAt: string;
};

type SupportTicket = {
  id: string;
  dbId?: string;
  date: string;
  name: string;
  email: string;
  phone?: string;
  country?: string;
  company?: string;
  orderId?: string;
  subject: string;
  message: string;
  productSku?: string;
  productTitle?: string;
  status: string;
  source?: string;
  adminNotes?: string;
  lastResponseAt?: string;
  createdAt?: string;
  updatedAt?: string;
  messages?: SupportMessage[];
};

const STATUSES = ["NEW", "IN_PROGRESS", "AWAITING_CUSTOMER", "RESOLVED", "CLOSED"];

const STATUS_COLOR: Record<string, string> = {
  NEW: "bg-yellow-50 text-yellow-700 border-yellow-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  AWAITING_CUSTOMER: "bg-purple-50 text-purple-700 border-purple-200",
  RESOLVED: "bg-green-50 text-green-700 border-green-200",
  CLOSED: "bg-gray-50 text-gray-700 border-gray-200",
};

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  function loadTickets() {
    setLoading(true);
    fetch("/api/support", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setTickets(Array.isArray(data.tickets) ? data.tickets : Array.isArray(data.data) ? data.data : []))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadTickets(); }, []);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const statusMatch = status === "ALL" || ticket.status === status;
      const haystack = [ticket.id, ticket.name, ticket.email, ticket.company, ticket.orderId, ticket.subject, ticket.message, ticket.productSku, ticket.productTitle, ticket.source].filter(Boolean).join(" ").toLowerCase();
      return statusMatch && (!text || haystack.includes(text));
    });
  }, [tickets, query, status]);

  async function refreshSelected(id: string) {
    const response = await fetch(`/api/support/${encodeURIComponent(id)}`, { cache: "no-store" });
    const data = await response.json();
    if (data.ok && data.ticket) {
      setSelected(data.ticket);
      setTickets((items) => items.map((item) => item.id === data.ticket.id ? data.ticket : item));
    }
  }

  async function updateStatus(ticket: SupportTicket, nextStatus: string) {
    const response = await fetch(`/api/support/${encodeURIComponent(ticket.dbId || ticket.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await response.json();
    if (data.ok && data.ticket) {
      setTickets((items) => items.map((item) => item.id === data.ticket.id ? data.ticket : item));
      if (selected?.id === data.ticket.id) setSelected(data.ticket);
      setNotice("Support ticket status updated.");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-800 text-navy-900 text-2xl">Support Tickets</h1>
          <p className="text-sm text-gray-500 mt-1">Manage portal support tickets, replies, internal notes and customer-visible updates.</p>
        </div>
        <button type="button" onClick={loadTickets} className="btn-secondary text-sm">Refresh</button>
      </div>

      {notice && <div className="mb-4 bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm">{notice}</div>}

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5 grid md:grid-cols-[1fr_220px] gap-3">
        <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by customer, email, order, product, subject…" />
        <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="ALL">All statuses</option>
          {STATUSES.map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-gray-500">Loading support tickets…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-sm text-gray-500">No support tickets found.</div>
        ) : (
          <table className="w-full admin-table">
            <thead>
              <tr><th>Ticket</th><th>Customer</th><th>Subject / Context</th><th>Last update</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((ticket) => (
                <tr key={ticket.id}>
                  <td className="font-mono text-xs text-gray-500">{ticket.id}</td>
                  <td>
                    <div className="font-display font-600 text-sm text-navy-900">{ticket.name}</div>
                    {ticket.company && <div className="text-xs text-gray-400">{ticket.company}</div>}
                    <a href={`mailto:${ticket.email}`} className="text-xs text-accent hover:text-accent-dark">{ticket.email}</a>
                  </td>
                  <td className="text-xs text-gray-600 max-w-sm">
                    <div className="font-display font-700 text-navy-900">{ticket.subject}</div>
                    <div className="text-gray-400 mt-1">{ticket.orderId ? `Order ${ticket.orderId}` : ticket.productSku ? `${ticket.productSku} · ${ticket.productTitle || "Product enquiry"}` : ticket.source || "Support"}</div>
                  </td>
                  <td className="text-xs text-gray-500">{ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString("en-GB") : ticket.date}</td>
                  <td><span className={`badge border ${STATUS_COLOR[ticket.status] || STATUS_COLOR.NEW}`}>{ticket.status.replace(/_/g, " ")}</span></td>
                  <td>
                    <button type="button" onClick={() => refreshSelected(ticket.dbId || ticket.id)} className="text-xs text-accent hover:text-accent-dark font-700 mr-3">Manage</button>
                    <button type="button" onClick={() => updateStatus(ticket, "RESOLVED")} className="text-xs text-gray-500 hover:text-green-700 font-700">Resolve</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && <SupportModal ticket={selected} onClose={() => setSelected(null)} onUpdated={(ticket) => { setSelected(ticket); setTickets((items) => items.map((item) => item.id === ticket.id ? ticket : item)); }} />}
    </div>
  );
}

function SupportModal({ ticket, onClose, onUpdated }: { ticket: SupportTicket; onClose: () => void; onUpdated: (ticket: SupportTicket) => void }) {
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState(ticket.status);
  const [visible, setVisible] = useState(true);
  const [emailCustomer, setEmailCustomer] = useState(true);
  const [adminNotes, setAdminNotes] = useState(ticket.adminNotes || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function saveStatus() {
    setSaving(true);
    const response = await fetch(`/api/support/${encodeURIComponent(ticket.dbId || ticket.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adminNotes }),
    });
    const data = await response.json();
    setSaving(false);
    if (data.ok && data.ticket) {
      onUpdated(data.ticket);
      setMessage("Ticket details saved.");
    }
  }

  async function sendReply() {
    if (!reply.trim()) return;
    setSaving(true);
    const response = await fetch(`/api/support/${encodeURIComponent(ticket.dbId || ticket.id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: reply, status, isCustomerVisible: visible, emailCustomer }),
    });
    const data = await response.json();
    setSaving(false);
    if (data.ok && data.ticket) {
      onUpdated(data.ticket);
      setReply("");
      setMessage(data.email?.sent ? "Reply saved and emailed to customer." : "Reply saved. Email was not sent or not configured.");
    } else {
      setMessage(data.error || "Unable to send reply.");
    }
  }

  const visibleMessages = ticket.messages || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4 sticky top-0 bg-white z-10">
          <div>
            <p className="font-mono text-[11px] text-accent tracking-wider uppercase">{ticket.id}</p>
            <h2 className="font-display font-800 text-xl text-navy-950 mt-1">{ticket.subject}</h2>
            <p className="text-xs text-gray-400 mt-1">{ticket.name} · {ticket.email}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-navy-900 text-xl leading-none">×</button>
        </div>

        <div className="grid lg:grid-cols-[1fr_310px] gap-6 px-6 py-5">
          <div className="space-y-5">
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
              <h3 className="font-display font-800 text-sm text-navy-950 mb-3">Ticket history</h3>
              <div className="space-y-3">
                {visibleMessages.length === 0 && <div className="text-sm text-gray-500">No message history yet.</div>}
                {visibleMessages.map((item) => (
                  <div key={item.id} className={`rounded-xl border p-4 ${item.authorType === "ADMIN" ? "bg-white border-blue-100" : "bg-white border-gray-200"}`}>
                    <div className="flex flex-wrap justify-between gap-2 mb-2">
                      <span className="font-display font-800 text-xs text-navy-950">{item.authorType === "ADMIN" ? "Combay" : item.authorName || ticket.name}</span>
                      <span className="text-[11px] text-gray-400">{new Date(item.createdAt).toLocaleString("en-GB")}</span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{item.message}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {!item.isCustomerVisible && <span className="badge bg-gray-50 text-gray-500 border-gray-200">Internal note</span>}
                      {item.emailSent && <span className="badge bg-green-50 text-green-700 border-green-200">Email sent</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="font-display font-800 text-sm text-navy-950 mb-3">Reply / internal note</h3>
              <textarea value={reply} onChange={(event) => setReply(event.target.value)} className="input min-h-[140px]" placeholder="Write a response or internal note…" />
              <div className="grid sm:grid-cols-2 gap-3 mt-3 text-sm text-gray-600">
                <label className="flex items-center gap-2"><input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} /> Customer-visible</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={emailCustomer} onChange={(event) => setEmailCustomer(event.target.checked)} disabled={!visible} /> Email customer</label>
              </div>
              <button type="button" disabled={saving || !reply.trim()} onClick={sendReply} className="btn-primary mt-4">{saving ? "Saving…" : "Save reply"}</button>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="border border-gray-200 rounded-xl p-4 bg-white">
              <h3 className="font-display font-800 text-sm text-navy-950 mb-3">Ticket details</h3>
              <Detail label="Name" value={ticket.name} />
              <Detail label="Email" value={ticket.email} />
              <Detail label="Phone" value={ticket.phone || "—"} />
              <Detail label="Country" value={ticket.country || "—"} />
              <Detail label="Company" value={ticket.company || "—"} />
              <Detail label="Order" value={ticket.orderId || "—"} />
              <Detail label="Product" value={ticket.productSku ? `${ticket.productSku} ${ticket.productTitle || ""}` : "—"} />
            </div>

            <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
              <label className="label">Status</label>
              <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
                {STATUSES.map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}
              </select>
              <label className="label">Admin notes</label>
              <textarea className="input min-h-[110px]" value={adminNotes} onChange={(event) => setAdminNotes(event.target.value)} placeholder="Internal admin notes…" />
              <button type="button" disabled={saving} onClick={saveStatus} className="btn-secondary w-full">Save status/notes</button>
            </div>

            {message && <div className="border border-blue-200 bg-blue-50 text-blue-900 rounded-xl p-4 text-sm">{message}</div>}
          </aside>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="mb-3"><p className="text-[10px] uppercase tracking-wide text-gray-400 font-display font-700 mb-0.5">{label}</p><p className="text-sm text-navy-950 break-words">{value}</p></div>;
}
