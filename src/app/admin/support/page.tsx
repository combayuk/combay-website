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
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-900 text-navy-950 text-2xl">Support Tickets</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage portal support tickets, replies, internal notes and customer-visible updates.</p>
        </div>
        <button type="button" onClick={loadTickets} className="btn-secondary text-xs py-2">Refresh</button>
      </div>

      {notice && <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-2.5 text-sm">{notice}</div>}

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-slate-50 px-3 py-1.5 font-900 text-navy-950">{tickets.length} tickets</span>
          <span className="rounded-full bg-yellow-50 px-3 py-1.5 font-900 text-yellow-700">{tickets.filter((t) => t.status === "NEW").length} new</span>
          <span className="rounded-full bg-blue-50 px-3 py-1.5 font-900 text-blue-700">{tickets.filter((t) => t.status === "IN_PROGRESS").length} in progress</span>
          <span className="rounded-full bg-purple-50 px-3 py-1.5 font-900 text-purple-700">{tickets.filter((t) => t.status === "AWAITING_CUSTOMER").length} awaiting customer</span>
          <span className="rounded-full bg-green-50 px-3 py-1.5 font-900 text-green-700">{tickets.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED").length} resolved/closed</span>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 grid md:grid-cols-[1fr_220px] gap-2 shadow-sm">
        <input className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-accent" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by customer, email, order, product, subject…" />
        <select className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-accent" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="ALL">All statuses</option>
          {STATUSES.map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading support tickets…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No support tickets found.</div>
        ) : (
          <table className="w-full table-fixed text-xs">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="w-[15%] px-3 py-2">Ticket</th>
                <th className="w-[20%] px-3 py-2">Customer</th>
                <th className="w-[28%] px-3 py-2">Subject / context</th>
                <th className="w-[12%] px-3 py-2">Updated</th>
                <th className="w-[12%] px-3 py-2">Status</th>
                <th className="w-[13%] px-3 py-2 text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-slate-50/70">
                  <td className="px-3 py-3 align-top">
                    <p className="break-all font-mono text-[11px] font-900 text-navy-950">{ticket.id}</p>
                    <p className="mt-1 truncate text-[11px] text-gray-400">{ticket.source || "Support"}</p>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <p className="truncate font-display text-sm font-800 text-navy-950">{ticket.name}</p>
                    {ticket.company && <p className="truncate text-[11px] text-gray-400">{ticket.company}</p>}
                    <a href={`mailto:${ticket.email}`} className="break-all text-[11px] text-accent hover:text-accent-dark">{ticket.email}</a>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <p className="truncate font-display text-sm font-800 text-navy-950">{ticket.subject}</p>
                    <p className="mt-1 truncate text-[11px] text-gray-400">{ticket.orderId ? `Order ${ticket.orderId}` : ticket.productSku ? `${ticket.productSku} · ${ticket.productTitle || "Product enquiry"}` : ticket.message}</p>
                  </td>
                  <td className="px-3 py-3 align-top text-[11px] text-gray-500">{ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString("en-GB") : ticket.date}</td>
                  <td className="px-3 py-3 align-top"><span className={`inline-flex max-w-full rounded-full border px-2 py-1 text-[10px] font-900 ${STATUS_COLOR[ticket.status] || STATUS_COLOR.NEW}`}><span className="truncate">{ticket.status.replace(/_/g, " ")}</span></span></td>
                  <td className="px-3 py-3 align-top text-right">
                    <button type="button" onClick={() => refreshSelected(ticket.dbId || ticket.id)} className="inline-flex whitespace-nowrap rounded-md border border-slate-200 px-2 py-1 text-[11px] font-900 text-navy-950 hover:bg-slate-50">Manage</button>
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
    <div className="fixed inset-0 z-50 bg-black/50">
      <div className="absolute right-0 top-0 h-full w-full max-w-[780px] overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 sticky top-0 bg-white z-10">
          <div>
            <p className="font-mono text-[11px] text-accent tracking-wider uppercase">{ticket.id}</p>
            <h2 className="font-display font-900 text-lg text-navy-950 mt-1">{ticket.subject}</h2>
            <p className="text-xs text-gray-400 mt-1">{ticket.name} · {ticket.email}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-navy-900 text-xl leading-none">×</button>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-4 px-5 py-5">
          <div className="space-y-4">
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
              <textarea value={reply} onChange={(event) => setReply(event.target.value)} className="input min-h-[120px] text-sm" placeholder="Write a response or internal note…" />
              <div className="grid sm:grid-cols-2 gap-2 mt-3 text-xs text-gray-600">
                <label className="flex items-center gap-2"><input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} /> Customer-visible</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={emailCustomer} onChange={(event) => setEmailCustomer(event.target.checked)} disabled={!visible} /> Email customer</label>
              </div>
              <button type="button" disabled={saving || !reply.trim()} onClick={sendReply} className="btn-primary mt-3 py-2 text-xs">{saving ? "Saving…" : "Save reply"}</button>
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
              <select className="input py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
                {STATUSES.map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}
              </select>
              <label className="label">Admin notes</label>
              <textarea className="input min-h-[100px] py-2 text-sm" value={adminNotes} onChange={(event) => setAdminNotes(event.target.value)} placeholder="Internal admin notes…" />
              <button type="button" disabled={saving} onClick={saveStatus} className="btn-secondary w-full py-2 text-xs">Save status/notes</button>
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
