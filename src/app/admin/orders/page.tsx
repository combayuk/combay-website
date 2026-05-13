"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, FileText, Mail, Search, X } from "lucide-react";

const COURIERS: Record<string, string> = {
  "Royal Mail": "https://www.royalmail.com/track-your-item#/tracking-results/",
  DPD: "https://track.dpd.co.uk/tracking/",
  DHL: "https://www.dhl.com/gb-en/home/tracking/tracking-parcel.html?submit=1&tracking-id=",
  FedEx: "https://www.fedex.com/apps/fedextrack/?tracknumbers=",
  UPS: "https://www.ups.com/track?tracknum=",
  Evri: "https://www.evri.com/track-your-parcel/",
  Yodel: "https://www.yodel.co.uk/track/",
};

const ORDER_STATUSES = ["PENDING_PAYMENT", "PAYMENT_RECEIVED", "PROCESSING", "DISPATCHED", "DELIVERED", "CANCELLED", "REFUNDED"];
const COURIER_NAMES = ["Royal Mail", "DPD", "DHL", "FedEx", "UPS", "Evri", "Yodel", "Other"];

const S_COLOR: Record<string, string> = {
  PENDING_PAYMENT: "text-yellow-700 bg-yellow-50 border-yellow-200",
  PAYMENT_RECEIVED: "text-blue-700 bg-blue-50 border-blue-200",
  PROCESSING: "text-blue-700 bg-blue-50 border-blue-200",
  DISPATCHED: "text-purple-700 bg-purple-50 border-purple-200",
  DELIVERED: "text-green-700 bg-green-50 border-green-200",
  CANCELLED: "text-red-700 bg-red-50 border-red-200",
  REFUNDED: "text-gray-700 bg-gray-50 border-gray-200",
};

const PAY_COLOR: Record<string, string> = {
  UNPAID: "text-yellow-700 bg-yellow-50 border-yellow-200",
  PAID: "text-green-700 bg-green-50 border-green-200",
  REFUNDED: "text-gray-700 bg-gray-50 border-gray-200",
  PARTIAL: "text-blue-700 bg-blue-50 border-blue-200",
};

type Order = {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  company?: string | null;
  total: number | string;
  shipping: number | string;
  status: string;
  paymentStatus: string;
  trackingCarrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  trackingEmailSentAt?: string | null;
  trackingEmailAttemptedAt?: string | null;
  trackingEmailStatus?: string | null;
  trackingEmailProviderId?: string | null;
  trackingEmailRecipient?: string | null;
  trackingEmailType?: string | null;
  trackingEmailSubject?: string | null;
  trackingEmailTrigger?: string | null;
  trackingEmailLastError?: string | null;
  shippingAddress?: unknown;
  shippingSnapshot?: {
    shippingPolicyName?: string | null;
    shippingZoneName?: string | null;
    shippingCost?: number | string | null;
    dispatchMinDays?: number | null;
    dispatchMaxDays?: number | null;
    deliveryMinDays?: number | null;
    deliveryMaxDays?: number | null;
    manualQuoteRequired?: boolean;
    collectionOnly?: boolean;
    calculationMethod?: string | null;
  } | null;
  items?: { title: string; sku: string; quantity: number; unitPrice?: number; lineTotal?: number }[];
};


type CommercialInvoiceDraft = {
  email: string;
  hsCode: string;
  countryOfOrigin: string;
};

function addressCountry(address: unknown) {
  if (!address || typeof address !== "object") return "";
  const obj = address as Record<string, unknown>;
  return String(obj.country || obj.countryCode || obj.countryName || "").trim();
}

function defaultCommercialOrigin(order: Order) {
  const country = addressCountry(order.shippingAddress).toUpperCase();
  if (country === "GB" || country === "UK" || country === "UNITED KINGDOM") return "United Kingdom";
  return "United Kingdom";
}

function formatMoney(value: number | string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(value));
}

function getTrackUrl(courier?: string | null, num?: string | null, explicit?: string | null) {
  if (explicit) return explicit;
  if (!courier || !num) return "#";
  return COURIERS[courier] ? `${COURIERS[courier]}${num}` : "#";
}

function label(value: string) {
  return value.replace(/_/g, " ");
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function trackingEmailStatusValue(order: Order) {
  return order.trackingEmailStatus || (order.trackingEmailSentAt ? "SENT" : "NOT_SENT");
}

function trackingEmailBadge(status?: string | null) {
  const value = status || "NOT_SENT";
  if (value === "SENT") return "border-green-200 bg-green-50 text-green-700";
  if (value === "FAILED" || value === "NOT_CONFIGURED") return "border-red-200 bg-red-50 text-red-700";
  if (value === "ATTEMPTED") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function trackingEmailTypeLabel(value?: string | null) {
  if (!value || value === "TRACKING_DISPATCH") return "Dispatch / tracking email";
  return label(value);
}

function trackingEmailTriggerLabel(value?: string | null) {
  if (!value) return "Historical send / trigger not recorded";
  if (value === "admin-order-update") return "Automatic after admin tracking update";
  if (value === "manual-admin-resend") return "Manual admin resend";
  if (value === "manual-admin-send") return "Manual admin send";
  return label(value);
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [sendingTrackingEmail, setSendingTrackingEmail] = useState(false);
  const [commercialInvoiceDraft, setCommercialInvoiceDraft] = useState<CommercialInvoiceDraft | null>(null);

  function loadOrders() {
    setLoading(true);
    fetch("/api/orders", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setOrders(data.data ?? []);
        setSource(data.mode ?? data.source ?? "");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter((order) => {
      const matchesFilter = filter === "ALL" || order.status === filter;
      const matchesSearch = !q || [order.orderNumber, order.customerName, order.customerEmail, order.company ?? ""].some((v) => String(v).toLowerCase().includes(q));
      return matchesFilter && matchesSearch;
    });
  }, [filter, orders, search]);

  function openCommercialInvoicePrompt() {
    if (!selected) return;
    setMessage("");
    setCommercialInvoiceDraft({
      email: selected.customerEmail || "",
      hsCode: "",
      countryOfOrigin: defaultCommercialOrigin(selected),
    });
  }

  async function createInvoiceFromOrder(type: "COMMERCIAL_INVOICE" | "PAID_INVOICE" | "PACKING_LIST", extra: Record<string, string> = {}) {
    if (!selected) return;

    setCreatingInvoice(true);
    setMessage("");

    const response = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: selected.id, type, ...extra }),
    });
    const data = await response.json().catch(() => ({}));
    setCreatingInvoice(false);

    if (!response.ok || !data.ok) {
      setMessage(data.error || data.reason || "Could not create document from order.");
      return;
    }

    setCommercialInvoiceDraft(null);
    setMessage(`${data.document.documentNumber} created.`);
    window.open(`/api/invoices/${data.document.id}/html`, "_blank", "noopener,noreferrer");
  }

  async function submitCommercialInvoicePrompt() {
    if (!commercialInvoiceDraft) return;
    const email = commercialInvoiceDraft.email.trim();
    const hsCode = commercialInvoiceDraft.hsCode.trim();
    const countryOfOrigin = commercialInvoiceDraft.countryOfOrigin.trim();
    if (!email || !email.includes("@")) {
      setMessage("Customer email address is required before creating a commercial invoice.");
      return;
    }
    if (!hsCode) {
      setMessage("HS code is mandatory before creating a commercial invoice.");
      return;
    }
    if (!countryOfOrigin) {
      setMessage("Country of origin is mandatory before creating a commercial invoice.");
      return;
    }
    await createInvoiceFromOrder("COMMERCIAL_INVOICE", { customerEmail: email, hsCode, countryOfOrigin });
  }


  async function saveOrderUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;

    const form = new FormData(event.currentTarget);
    setSaving(true);
    setMessage("");

    const payload = {
      id: selected.id,
      status: String(form.get("status") ?? selected.status),
      trackingCarrier: String(form.get("trackingCarrier") ?? "").trim(),
      trackingNumber: String(form.get("trackingNumber") ?? "").trim(),
      trackingUrl: String(form.get("trackingUrl") ?? "").trim(),
    };

    const response = await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok || !data.ok) {
      setMessage(data.error || "Could not update order.");
      return;
    }

    setOrders((current) => current.map((order) => (order.id === selected.id ? data.order : order)));
    setSelected(data.order);
    const email = data.trackingEmail;
    if (email?.sent) {
      setMessage(`Order updated. Tracking email sent to ${email.recipient || data.order.customerEmail}${email.id ? ` (Resend ID: ${email.id})` : ""}.`);
    } else if (email) {
      setMessage(`Order updated. Tracking email not sent: ${email.reason || email.error || email.message || "unknown reason"}.`);
    } else {
      setMessage("Order updated.");
    }
  }

  async function resendTrackingEmail() {
    if (!selected) return;
    if (!selected.trackingNumber) {
      setMessage("Add a tracking number before sending a tracking email.");
      return;
    }
    const confirmed = window.confirm(`Send/resend the tracking email to ${selected.customerEmail}? This will contact the customer.`);
    if (!confirmed) return;
    setSendingTrackingEmail(true);
    setMessage("");
    const response = await fetch("/api/orders/tracking-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: selected.id, force: true }),
    });
    const data = await response.json().catch(() => ({}));
    setSendingTrackingEmail(false);
    if (!response.ok || !data.ok) {
      setMessage(data.reason || data.error || "Could not send tracking email.");
      return;
    }
    const nextOrder = { ...selected, ...(data.order || {}) };
    setSelected(nextOrder);
    setOrders((current) => current.map((order) => (order.id === selected.id ? { ...order, ...nextOrder } : order)));
    setMessage(data.trackingEmail?.sent ? `Tracking email sent to ${data.trackingEmail.recipient || nextOrder.customerEmail}${data.trackingEmail.id ? ` (Resend ID: ${data.trackingEmail.id})` : ""}.` : `Tracking email not sent: ${data.trackingEmail?.reason || data.trackingEmail?.message || "unknown reason"}.`);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-900 text-navy-950 text-2xl">Orders</h1>
          <p className="text-xs text-gray-500 mt-0.5">Source: {source || "database"}{loading ? " · loading…" : ""}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-slate-50 px-3 py-1.5 font-900 text-navy-950">{orders.length} orders</span>
          <span className="rounded-full bg-green-50 px-3 py-1.5 font-900 text-green-700">{orders.filter((o) => o.paymentStatus === "PAID").length} paid</span>
          <span className="rounded-full bg-blue-50 px-3 py-1.5 font-900 text-blue-700">{orders.filter((o) => o.status === "PROCESSING" || o.status === "PAYMENT_RECEIVED").length} to process</span>
          <span className="rounded-full bg-purple-50 px-3 py-1.5 font-900 text-purple-700">{orders.filter((o) => o.status === "DISPATCHED").length} dispatched</span>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by order #, customer or email..." className="h-9 w-80 rounded-lg border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-accent" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {["ALL", ...ORDER_STATUSES].map((s) => (
              <button key={s} onClick={() => setFilter(s)} className={`text-xs font-display font-800 px-2.5 py-1 rounded-full border transition-colors ${filter === s ? "bg-navy-950 text-white border-navy-950" : "text-gray-600 border-gray-200 hover:border-navy-950"}`}>
                {label(s)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden">
          <table className="w-full table-fixed text-xs">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="w-[16%] px-3 py-2">Order</th>
                <th className="w-[24%] px-3 py-2">Customer</th>
                <th className="w-[20%] px-3 py-2">Items</th>
                <th className="w-[16%] px-3 py-2">Payment / Status</th>
                <th className="w-[12%] px-3 py-2">Tracking</th>
                <th className="w-[12%] px-3 py-2 text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((order) => {
                const items = order.items?.map((item) => `${item.quantity}× ${item.sku}`).join(", ") || "—";
                const trackUrl = getTrackUrl(order.trackingCarrier, order.trackingNumber, order.trackingUrl);
                return (
                  <tr key={order.id || order.orderNumber} className="hover:bg-slate-50/70">
                    <td className="px-3 py-3 align-top">
                      <p className="break-all font-mono text-[11px] font-900 text-navy-950">{order.orderNumber}</p>
                      <p className="mt-1 text-[11px] text-gray-500">{new Date(order.createdAt).toLocaleDateString("en-GB")}</p>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <p className="truncate font-display text-sm font-800 text-navy-950">{order.customerName}</p>
                      <p className="break-all text-[11px] text-gray-400">{order.customerEmail}</p>
                      {order.company && <p className="truncate text-[11px] text-gray-400">{order.company}</p>}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <p className="truncate text-xs text-gray-600">{items}</p>
                      <p className="mt-1 font-display text-xs font-900 text-navy-950">{formatMoney(order.total)}</p>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-wrap gap-1">
                        <span className={`badge ${PAY_COLOR[order.paymentStatus] ?? ""}`}>{label(order.paymentStatus)}</span>
                        <span className={`badge ${S_COLOR[order.status] ?? ""}`}>{label(order.status)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      {trackUrl ? <a href={trackUrl} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 truncate text-[11px] text-accent transition-colors">{order.trackingNumber || "Track"} <ExternalLink size={10} className="shrink-0" /></a> : <span className="text-gray-300 text-[11px]">Not uploaded</span>}
                    </td>
                    <td className="px-3 py-3 align-top text-right">
                      <button onClick={() => { setSelected(order); setMessage(""); }} className="inline-flex whitespace-nowrap rounded-md border border-slate-200 px-2 py-1.5 text-[11px] font-900 text-navy-950 hover:bg-slate-50">Manage</button>
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && <tr><td colSpan={6} className="text-center text-sm text-gray-400 py-8">No orders found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50">
          <div className="absolute right-0 top-0 h-full w-full max-w-[680px] overflow-y-auto bg-white shadow-2xl">
            <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display font-800 text-xl text-navy-950">Manage order</h2>
                <p className="font-mono text-xs text-gray-400 mt-1">{selected.orderNumber}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-navy-900"><X size={20} /></button>
            </div>

            <form onSubmit={saveOrderUpdate} className="p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-gray-400">Customer</p><p className="font-display font-700 text-navy-950">{selected.customerName}</p><p className="text-gray-500 text-xs">{selected.customerEmail}</p>{selected.customerPhone ? <p className="text-gray-500 text-xs">Tel: {selected.customerPhone}</p> : null}</div>
                <div><p className="text-xs text-gray-400">Total</p><p className="font-display font-700 text-navy-950">{formatMoney(selected.total)}</p><p className="text-gray-500 text-xs">Payment: {label(selected.paymentStatus)}</p></div>
              </div>

              <div>
                <label className="label">Order status</label>
                <select name="status" defaultValue={selected.status} className="input py-2 text-sm">
                  {ORDER_STATUSES.map((status) => <option key={status} value={status}>{label(status)}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">Adding a tracking number will usually set the order to dispatched.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Courier</label>
                  <select name="trackingCarrier" defaultValue={selected.trackingCarrier ?? ""} className="input py-2 text-sm">
                    <option value="">Select courier</option>
                    {COURIER_NAMES.map((courier) => <option key={courier} value={courier}>{courier}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Tracking number</label>
                  <input name="trackingNumber" defaultValue={selected.trackingNumber ?? ""} className="input py-2 text-sm" placeholder="e.g. JD000225..." />
                </div>
              </div>

              <div>
                <label className="label">Tracking URL override optional</label>
                <input name="trackingUrl" defaultValue={selected.trackingUrl ?? ""} className="input py-2 text-sm" placeholder="Leave blank to use courier tracking URL" />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-navy-700" />
                    <h3 className="font-display text-sm font-900 text-navy-950">Tracking email status</h3>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-900 ${trackingEmailBadge(trackingEmailStatusValue(selected))}`}>{label(trackingEmailStatusValue(selected))}</span>
                  </div>
                  <button type="button" disabled={sendingTrackingEmail || !selected.trackingNumber} onClick={resendTrackingEmail} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-900 text-navy-950 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">
                    <Mail size={12} /> {sendingTrackingEmail ? "Sending..." : "Send/resend"}
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <p><span className="font-900 text-navy-950">Email type:</span> {trackingEmailTypeLabel(selected.trackingEmailType)}</p>
                  <p><span className="font-900 text-navy-950">Trigger/source:</span> {trackingEmailTriggerLabel(selected.trackingEmailTrigger)}</p>
                  <p><span className="font-900 text-navy-950">Subject:</span> {selected.trackingEmailSubject || `Your Combay order has been dispatched — ${selected.orderNumber}`}</p>
                  <p><span className="font-900 text-navy-950">Recipient:</span> {selected.trackingEmailRecipient || selected.customerEmail || "—"}</p>
                  <p><span className="font-900 text-navy-950">Last attempt:</span> {formatDateTime(selected.trackingEmailAttemptedAt)}</p>
                  <p><span className="font-900 text-navy-950">Last sent:</span> {formatDateTime(selected.trackingEmailSentAt)}</p>
                  <p><span className="font-900 text-navy-950">Resend ID:</span> {selected.trackingEmailProviderId || "—"}</p>
                </div>
                {selected.trackingEmailLastError ? <p className="mt-2 rounded-md border border-red-100 bg-white px-2 py-1 text-red-700"><span className="font-900">Last email issue:</span> {selected.trackingEmailLastError}</p> : null}
                <p className="mt-2 text-[11px] text-slate-500">This panel records whether Resend accepted the tracking email. If status is Sent but the customer still cannot find it, check the Resend message ID/delivery log before manually resending.</p>
              </div>

              {selected.shippingSnapshot ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <h3 className="mb-2 font-display text-sm font-900 text-navy-950">Shipping snapshot</h3>
                  <div className="grid gap-2 sm:grid-cols-2 text-xs text-gray-600">
                    <p><span className="font-900 text-navy-950">Policy:</span> {selected.shippingSnapshot.shippingPolicyName || "—"}</p>
                    <p><span className="font-900 text-navy-950">Zone:</span> {selected.shippingSnapshot.shippingZoneName || "—"}</p>
                    <p><span className="font-900 text-navy-950">Cost charged:</span> {selected.shippingSnapshot.manualQuoteRequired ? "Manual quote" : formatMoney(selected.shippingSnapshot.shippingCost ?? selected.shipping)}</p>
                    <p><span className="font-900 text-navy-950">Method:</span> {label(String(selected.shippingSnapshot.calculationMethod || "snapshot"))}</p>
                    <p><span className="font-900 text-navy-950">Dispatch:</span> {selected.shippingSnapshot.dispatchMinDays ? `${selected.shippingSnapshot.dispatchMinDays}${selected.shippingSnapshot.dispatchMaxDays && selected.shippingSnapshot.dispatchMaxDays !== selected.shippingSnapshot.dispatchMinDays ? `–${selected.shippingSnapshot.dispatchMaxDays}` : ""} working days` : "—"}</p>
                    <p><span className="font-900 text-navy-950">Delivery:</span> {selected.shippingSnapshot.deliveryMinDays ? `${selected.shippingSnapshot.deliveryMinDays}${selected.shippingSnapshot.deliveryMaxDays && selected.shippingSnapshot.deliveryMaxDays !== selected.shippingSnapshot.deliveryMinDays ? `–${selected.shippingSnapshot.deliveryMaxDays}` : ""} working days` : "—"}</p>
                  </div>
                </div>
              ) : null}
              <div>
                <h3 className="font-display font-700 text-sm text-navy-950 mb-2">Items</h3>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  {(selected.items ?? []).map((item) => <div key={`${item.sku}-${item.title}`} className="flex items-center justify-between gap-4 px-4 py-3 border-b last:border-b-0 text-sm"><span>{item.quantity}× {item.title}</span><span className="font-mono text-xs text-gray-500">{item.sku}</span></div>)}
                </div>
              </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h3 className="font-display font-700 text-sm text-navy-950 mb-2">Order documents</h3>
                <p className="text-xs text-gray-500 mb-3">Create a commercial/export invoice for customs, a paid invoice/receipt for accounts, or a packing list for dispatch/export paperwork.</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={creatingInvoice} onClick={openCommercialInvoicePrompt} className="btn-secondary px-3 py-2 text-xs flex items-center gap-1.5"><FileText size={13}/> {creatingInvoice ? "Creating..." : "Create commercial invoice"}</button>
                  <button type="button" disabled={creatingInvoice} onClick={() => createInvoiceFromOrder("PAID_INVOICE")} className="btn-secondary px-3 py-2 text-xs flex items-center gap-1.5"><FileText size={13}/> Create paid invoice</button>
                  <button type="button" disabled={creatingInvoice} onClick={() => createInvoiceFromOrder("PACKING_LIST")} className="btn-secondary px-3 py-2 text-xs flex items-center gap-1.5"><FileText size={13}/> Create packing list</button>
                </div>
              </div>

              {commercialInvoiceDraft && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-sm font-900 text-navy-950">Commercial invoice details</h3>
                      <p className="mt-1 text-xs text-slate-600">These details are required for customs/export paperwork. Combay exporter details remain locked.</p>
                    </div>
                    <button type="button" onClick={() => setCommercialInvoiceDraft(null)} className="rounded-md border border-amber-200 bg-white px-2 py-1 text-[11px] font-900 text-slate-600 hover:text-navy-950">Cancel</button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-3">
                      <label className="label">Customer email for document</label>
                      <input value={commercialInvoiceDraft.email} onChange={(event) => setCommercialInvoiceDraft((current) => current ? { ...current, email: event.target.value } : current)} className="input py-2 text-sm" placeholder="customer@example.com" />
                    </div>
                    <div>
                      <label className="label">HS code</label>
                      <input value={commercialInvoiceDraft.hsCode} onChange={(event) => setCommercialInvoiceDraft((current) => current ? { ...current, hsCode: event.target.value } : current)} className="input py-2 text-sm" placeholder="e.g. 9027.50.80" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Country of origin</label>
                      <input value={commercialInvoiceDraft.countryOfOrigin} onChange={(event) => setCommercialInvoiceDraft((current) => current ? { ...current, countryOfOrigin: event.target.value } : current)} className="input py-2 text-sm" placeholder="e.g. United Kingdom" />
                    </div>
                    <div className="sm:col-span-3 flex justify-end gap-2">
                      <button type="button" onClick={() => setCommercialInvoiceDraft(null)} className="btn-secondary px-3 py-2 text-xs">Cancel</button>
                      <button type="button" onClick={submitCommercialInvoicePrompt} disabled={creatingInvoice} className="btn-primary px-3 py-2 text-xs">{creatingInvoice ? "Creating..." : "Create commercial invoice"}</button>
                    </div>
                  </div>
                </div>
              )}

              {message && <p className={`text-sm ${message.includes("not sent") || message.includes("Could not") || message.includes("failed") || message.includes("unknown") ? "text-red-600" : "text-green-700"}`}>{message}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setSelected(null)} className="btn-secondary px-4 py-2">Close</button>
                <button disabled={saving} type="submit" className="btn-primary px-4 py-2">{saving ? "Saving..." : "Save order update"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
