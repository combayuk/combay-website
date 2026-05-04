"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, FileText, Search, X } from "lucide-react";

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
  status: string;
  paymentStatus: string;
  trackingCarrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  shippingAddress?: unknown;
  items?: { title: string; sku: string; quantity: number; unitPrice?: number; lineTotal?: number }[];
};

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

  async function createInvoiceFromOrder(type: "COMMERCIAL_INVOICE" | "PAID_INVOICE" | "ADDITIONAL_PAYMENT_REQUEST") {
    if (!selected) return;
    setCreatingInvoice(true);
    setMessage("");

    const response = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: selected.id, type }),
    });
    const data = await response.json().catch(() => ({}));
    setCreatingInvoice(false);

    if (!response.ok || !data.ok) {
      setMessage(data.error || data.reason || "Could not create document from order.");
      return;
    }

    setMessage(`${data.document.documentNumber} created.`);
    window.open(`/api/invoices/${data.document.id}/html`, "_blank", "noopener,noreferrer");
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
    setMessage("Order updated.");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-800 text-navy-950 text-2xl">Orders</h1>
          <p className="text-xs text-gray-400 mt-1">Source: {source || "database"}{loading ? " · loading…" : ""}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by order #, customer or email..." className="input pl-9 py-2 text-xs w-72" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {["ALL", ...ORDER_STATUSES].map((s) => (
              <button key={s} onClick={() => setFilter(s)} className={`text-xs font-display font-600 px-3 py-1.5 rounded-md border transition-colors ${filter === s ? "bg-navy-950 text-white border-navy-950" : "text-gray-600 border-gray-200 hover:border-navy-950"}`}>
                {label(s)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr><th>Order #</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Tracking</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const items = order.items?.map((item) => `${item.quantity}× ${item.sku}`).join(", ") || "—";
                const trackUrl = getTrackUrl(order.trackingCarrier, order.trackingNumber, order.trackingUrl);
                return (
                  <tr key={order.id || order.orderNumber}>
                    <td className="font-mono text-xs font-700 text-navy-950 break-all max-w-[130px]">{order.orderNumber}</td>
                    <td className="text-xs text-gray-500 whitespace-nowrap">{new Date(order.createdAt).toLocaleDateString("en-GB")}</td>
                    <td><div className="font-display font-600 text-sm text-navy-950">{order.customerName}</div><div className="text-xs text-gray-400">{order.customerEmail}</div>{order.company && <div className="text-xs text-gray-400">{order.company}</div>}</td>
                    <td className="text-xs text-gray-600 max-w-[220px] truncate">{items}</td>
                    <td className="font-display font-700 text-navy-950 whitespace-nowrap">{formatMoney(order.total)}</td>
                    <td><span className={`badge ${PAY_COLOR[order.paymentStatus] ?? ""}`}>{label(order.paymentStatus)}</span></td>
                    <td><span className={`badge ${S_COLOR[order.status] ?? ""}`}>{label(order.status)}</span></td>
                    <td>{order.trackingNumber ? <a href={trackUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-accent hover:text-accent-dark flex items-center gap-1 transition-colors">{order.trackingNumber} <ExternalLink size={10} /></a> : <span className="text-gray-300 text-xs">Not uploaded</span>}</td>
                    <td><button onClick={() => { setSelected(order); setMessage(""); }} className="btn-secondary px-3 py-1.5 text-xs">Manage</button></td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && <tr><td colSpan={9} className="text-center text-sm text-gray-400 py-8">No orders found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display font-800 text-xl text-navy-950">Manage order</h2>
                <p className="font-mono text-xs text-gray-400 mt-1">{selected.orderNumber}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-navy-900"><X size={20} /></button>
            </div>

            <form onSubmit={saveOrderUpdate} className="p-5 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-gray-400">Customer</p><p className="font-display font-700 text-navy-950">{selected.customerName}</p><p className="text-gray-500 text-xs">{selected.customerEmail}</p></div>
                <div><p className="text-xs text-gray-400">Total</p><p className="font-display font-700 text-navy-950">{formatMoney(selected.total)}</p><p className="text-gray-500 text-xs">Payment: {label(selected.paymentStatus)}</p></div>
              </div>

              <div>
                <label className="label">Order status</label>
                <select name="status" defaultValue={selected.status} className="input">
                  {ORDER_STATUSES.map((status) => <option key={status} value={status}>{label(status)}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">Adding a tracking number will usually set the order to dispatched.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Courier</label>
                  <select name="trackingCarrier" defaultValue={selected.trackingCarrier ?? ""} className="input">
                    <option value="">Select courier</option>
                    {COURIER_NAMES.map((courier) => <option key={courier} value={courier}>{courier}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Tracking number</label>
                  <input name="trackingNumber" defaultValue={selected.trackingNumber ?? ""} className="input" placeholder="e.g. JD000225..." />
                </div>
              </div>

              <div>
                <label className="label">Tracking URL override optional</label>
                <input name="trackingUrl" defaultValue={selected.trackingUrl ?? ""} className="input" placeholder="Leave blank to use courier tracking URL" />
              </div>

              <div>
                <h3 className="font-display font-700 text-sm text-navy-950 mb-2">Items</h3>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  {(selected.items ?? []).map((item) => <div key={`${item.sku}-${item.title}`} className="flex items-center justify-between gap-4 px-4 py-3 border-b last:border-b-0 text-sm"><span>{item.quantity}× {item.title}</span><span className="font-mono text-xs text-gray-500">{item.sku}</span></div>)}
                </div>
              </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h3 className="font-display font-700 text-sm text-navy-950 mb-2">Order documents</h3>
                <p className="text-xs text-gray-500 mb-3">Create a commercial/export invoice for customs, a paid invoice/receipt for accounts, or an additional payment request only for underpaid shipping, extra service fees, or other supplementary charges.</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={creatingInvoice} onClick={() => createInvoiceFromOrder("COMMERCIAL_INVOICE")} className="btn-secondary px-3 py-2 text-xs flex items-center gap-1.5"><FileText size={13}/> {creatingInvoice ? "Creating..." : "Create commercial invoice"}</button>
                  <button type="button" disabled={creatingInvoice} onClick={() => createInvoiceFromOrder("PAID_INVOICE")} className="btn-secondary px-3 py-2 text-xs flex items-center gap-1.5"><FileText size={13}/> Create paid invoice</button>
                  <button type="button" disabled={creatingInvoice} onClick={() => createInvoiceFromOrder("ADDITIONAL_PAYMENT_REQUEST")} className="btn-secondary px-3 py-2 text-xs flex items-center gap-1.5"><FileText size={13}/> Additional payment request</button>
                </div>
              </div>

              {message && <p className={`text-sm ${message === "Order updated." ? "text-green-700" : "text-red-600"}`}>{message}</p>}

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
