"use client";
import { useState } from "react";
import { Search } from "lucide-react";

const DEMO_ORDERS = [
  { id:"CB1ACB2F", date:"28 Apr 2025", customer:"John Smith",    company:"Smith Industries",   items:"Siemens S7-400 CPU",    total:"£1,240.00", status:"DISPATCHED",       tracking:"RM123456789GB" },
  { id:"CB0D9E1A", date:"14 Apr 2025", customer:"Sarah Jones",   company:"TechCorp Ltd",        items:"ABB ACS550 Drive",       total:"£890.00",   status:"DELIVERED",        tracking:"DPD987654321" },
  { id:"CB2E7F3B", date:"02 May 2025", customer:"Ahmed Hassan",  company:"—",                  items:"Tektronix MDO3054",      total:"£875.00",   status:"PENDING_PAYMENT",  tracking:"" },
  { id:"CB3A1D9C", date:"30 Apr 2025", customer:"Lisa Chen",     company:"BioLabs UK",          items:"Thermo Scientific IS5",  total:"£2,450.00", status:"PROCESSING",       tracking:"" },
];

const STATUS_COLOR: Record<string,string> = {
  PENDING_PAYMENT: "text-yellow-700 bg-yellow-50 border-yellow-200",
  PAYMENT_RECEIVED:"text-blue-700 bg-blue-50 border-blue-200",
  PROCESSING:      "text-blue-700 bg-blue-50 border-blue-200",
  DISPATCHED:      "text-purple-700 bg-purple-50 border-purple-200",
  DELIVERED:       "text-green-700 bg-green-50 border-green-200",
  CANCELLED:       "text-red-700 bg-red-50 border-red-200",
};

export default function AdminOrders() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const filtered = DEMO_ORDERS.filter(o =>
    (filter === "ALL" || o.status === filter) &&
    (o.customer.toLowerCase().includes(search.toLowerCase()) || o.id.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-800 text-navy-900 text-2xl">Orders</h1>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search orders..." className="input pl-9 py-2 text-xs w-56"/>
          </div>
          <div className="flex gap-1 flex-wrap">
            {["ALL","PENDING_PAYMENT","PROCESSING","DISPATCHED","DELIVERED","CANCELLED"].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`text-xs font-display font-600 px-3 py-1.5 rounded border transition-colors ${filter===s ? "bg-navy-900 text-white border-navy-900" : "text-gray-600 border-gray-200 hover:border-navy-900"}`}>
                {s.replace(/_/g," ")}
              </button>
            ))}
          </div>
        </div>
        <table className="w-full admin-table">
          <thead>
            <tr><th>Order #</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Tracking</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id}>
                <td className="font-mono text-xs font-700 text-navy-900">{o.id}</td>
                <td className="text-xs text-gray-500">{o.date}</td>
                <td>
                  <div className="font-display font-600 text-sm text-navy-900">{o.customer}</div>
                  {o.company !== "—" && <div className="text-xs text-gray-400">{o.company}</div>}
                </td>
                <td className="text-xs text-gray-600 max-w-xs truncate">{o.items}</td>
                <td className="font-display font-700 text-navy-900">{o.total}</td>
                <td>
                  <select defaultValue={o.status} className="text-xs border border-gray-200 rounded px-2 py-1 bg-white font-display font-600">
                    {["PENDING_PAYMENT","PAYMENT_RECEIVED","PROCESSING","DISPATCHED","DELIVERED","CANCELLED"].map(s => (
                      <option key={s} value={s}>{s.replace(/_/g," ")}</option>
                    ))}
                  </select>
                </td>
                <td className="font-mono text-xs text-gray-400">{o.tracking || "—"}</td>
                <td>
                  <button className="text-xs text-accent hover:text-accent-dark font-600 transition-colors">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
