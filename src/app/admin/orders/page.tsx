"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";

const COURIERS: Record<string, string> = {
  "Royal Mail": "https://www.royalmail.com/track-your-item#/tracking-results/",
  DPD: "https://track.dpd.co.uk/tracking/",
  DHL: "https://www.dhl.com/gb-en/home/tracking/tracking-parcel.html?submit=1&tracking-id=",
  FedEx: "https://www.fedex.com/apps/fedextrack/?tracknumbers=",
  UPS: "https://www.ups.com/track?tracknum=",
  Evri: "https://www.evri.com/track-your-parcel/",
  Yodel: "https://www.yodel.co.uk/track/",
};

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
  company?: string | null;
  total: number | string;
  status: string;
  paymentStatus: string;
  trackingCarrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  items?: { title: string; sku: string; quantity: number }[];
};

function formatMoney(value: number | string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(value));
}

function getTrackUrl(courier?: string | null, num?: string | null, explicit?: string | null) {
  if (explicit) return explicit;
  if (!courier || !num) return "#";
  return COURIERS[courier] ? `${COURIERS[courier]}${num}` : "#";
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("");

  useEffect(() => {
    fetch("/api/orders", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setOrders(data.data ?? []);
        setSource(data.mode ?? data.source ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter((order) => {
      const matchesFilter = filter === "ALL" || order.status === filter;
      const matchesSearch = !q || [order.orderNumber, order.customerName, order.customerEmail, order.company ?? ""].some((v) => String(v).toLowerCase().includes(q));
      return matchesFilter && matchesSearch;
    });
  }, [filter, orders, search]);

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
            {["ALL", "PENDING_PAYMENT", "PAYMENT_RECEIVED", "PROCESSING", "DISPATCHED", "DELIVERED", "CANCELLED"].map((s) => (
              <button key={s} onClick={() => setFilter(s)} className={`text-xs font-display font-600 px-3 py-1.5 rounded-md border transition-colors ${filter === s ? "bg-navy-950 text-white border-navy-950" : "text-gray-600 border-gray-200 hover:border-navy-950"}`}>
                {s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr><th>Order #</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Tracking</th></tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const items = order.items?.map((item) => `${item.quantity}× ${item.sku}`).join(", ") || "—";
                const trackUrl = getTrackUrl(order.trackingCarrier, order.trackingNumber, order.trackingUrl);
                return (
                  <tr key={order.id || order.orderNumber}>
                    <td className="font-mono text-xs font-700 text-navy-950">{order.orderNumber}</td>
                    <td className="text-xs text-gray-500 whitespace-nowrap">{new Date(order.createdAt).toLocaleDateString("en-GB")}</td>
                    <td><div className="font-display font-600 text-sm text-navy-950">{order.customerName}</div><div className="text-xs text-gray-400">{order.customerEmail}</div>{order.company && <div className="text-xs text-gray-400">{order.company}</div>}</td>
                    <td className="text-xs text-gray-600 max-w-[220px] truncate">{items}</td>
                    <td className="font-display font-700 text-navy-950 whitespace-nowrap">{formatMoney(order.total)}</td>
                    <td><span className={`badge ${PAY_COLOR[order.paymentStatus] ?? ""}`}>{order.paymentStatus.replace(/_/g, " ")}</span></td>
                    <td><span className={`badge ${S_COLOR[order.status] ?? ""}`}>{order.status.replace(/_/g, " ")}</span></td>
                    <td>{order.trackingNumber ? <a href={trackUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-accent hover:text-accent-dark flex items-center gap-1 transition-colors">{order.trackingNumber} <ExternalLink size={10} /></a> : <span className="text-gray-300 text-xs">—</span>}</td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && <tr><td colSpan={8} className="text-center text-sm text-gray-400 py-8">No orders found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
