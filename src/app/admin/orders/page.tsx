"use client";
import { useState } from "react";
import { Search, ExternalLink } from "lucide-react";

const COURIERS: Record<string,string> = {
  "Royal Mail":  "https://www.royalmail.com/track-your-item#/tracking-results/",
  "DPD":         "https://track.dpd.co.uk/tracking/",
  "DHL":         "https://www.dhl.com/gb-en/home/tracking/tracking-parcel.html?submit=1&tracking-id=",
  "FedEx":       "https://www.fedex.com/apps/fedextrack/?tracknumbers=",
  "UPS":         "https://www.ups.com/track?tracknum=",
  "Evri":        "https://www.evri.com/track-your-parcel/",
  "Yodel":       "https://www.yodel.co.uk/track/",
};

const DEMO_ORDERS = [
  { id:"CB1ACB2F", date:"28 Apr 2025", customer:"John Smith",   company:"Smith Industries",  items:"Siemens S7-400 CPU 412-2", total:"£1,240.00", status:"DISPATCHED",      courier:"Royal Mail",  tracking:"RM123456789GB" },
  { id:"CB0D9E1A", date:"14 Apr 2025", customer:"Sarah Jones",  company:"TechCorp Ltd",       items:"ABB ACS550 Drive 75kW",    total:"£890.00",   status:"DELIVERED",       courier:"DPD",         tracking:"DPD987654321" },
  { id:"CB2E7F3B", date:"02 May 2025", customer:"Ahmed Hassan", company:"—",                  items:"Tektronix MDO3054",        total:"£875.00",   status:"PENDING_PAYMENT", courier:"",            tracking:"" },
  { id:"CB3A1D9C", date:"30 Apr 2025", customer:"Lisa Chen",    company:"BioLabs UK",          items:"Thermo Scientific IS5",   total:"£2,450.00", status:"PROCESSING",      courier:"",            tracking:"" },
];

const S_COLOR: Record<string,string> = {
  PENDING_PAYMENT:"text-yellow-700 bg-yellow-50 border-yellow-200",
  PAYMENT_RECEIVED:"text-blue-700 bg-blue-50 border-blue-200",
  PROCESSING:      "text-blue-700 bg-blue-50 border-blue-200",
  DISPATCHED:      "text-purple-700 bg-purple-50 border-purple-200",
  DELIVERED:       "text-green-700 bg-green-50 border-green-200",
  CANCELLED:       "text-red-700 bg-red-50 border-red-200",
};

type Order = typeof DEMO_ORDERS[0];

export default function AdminOrders() {
  const [orders,  setOrders]   = useState(DEMO_ORDERS);
  const [search,  setSearch]   = useState("");
  const [filter,  setFilter]   = useState("ALL");
  const [editing, setEditing]  = useState<string|null>(null);
  const [editData, setEditData]= useState<Partial<Order>>({});

  const filtered = orders.filter(o =>
    (filter==="ALL" || o.status===filter) &&
    (o.customer.toLowerCase().includes(search.toLowerCase()) || o.id.toLowerCase().includes(search.toLowerCase()))
  );

  const startEdit = (o: Order) => { setEditing(o.id); setEditData({courier:o.courier,tracking:o.tracking,status:o.status}); };
  const saveEdit  = (id: string) => {
    setOrders(os=>os.map(o=>o.id===id?{...o,...editData}:o));
    setEditing(null);
  };
  const getTrackUrl = (courier: string, num: string) => COURIERS[courier] ? `${COURIERS[courier]}${num}` : "#";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-800 text-navy-950 text-2xl">Orders</h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by order # or customer..."
              className="input pl-9 py-2 text-xs w-60"/>
          </div>
          <div className="flex gap-1 flex-wrap">
            {["ALL","PENDING_PAYMENT","PROCESSING","DISPATCHED","DELIVERED"].map(s=>(
              <button key={s} onClick={()=>setFilter(s)}
                className={`text-xs font-display font-600 px-3 py-1.5 rounded-md border transition-colors ${filter===s?"bg-navy-950 text-white border-navy-950":"text-gray-600 border-gray-200 hover:border-navy-950"}`}>
                {s.replace(/_/g," ")}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr><th>Order #</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Courier</th><th>Tracking</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(o=>(
                <tr key={o.id}>
                  <td className="font-mono text-xs font-700 text-navy-950">{o.id}</td>
                  <td className="text-xs text-gray-500 whitespace-nowrap">{o.date}</td>
                  <td>
                    <div className="font-display font-600 text-sm text-navy-950">{o.customer}</div>
                    {o.company!=="—" && <div className="text-xs text-gray-400">{o.company}</div>}
                  </td>
                  <td className="text-xs text-gray-600 max-w-[160px] truncate">{o.items}</td>
                  <td className="font-display font-700 text-navy-950 whitespace-nowrap">{o.total}</td>
                  <td>
                    {editing===o.id ? (
                      <select value={editData.status} onChange={e=>setEditData(d=>({...d,status:e.target.value}))}
                        className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white font-display font-600 focus:border-accent focus:outline-none">
                        {Object.keys(S_COLOR).map(s=><option key={s} value={s}>{s.replace(/_/g," ")}</option>)}
                      </select>
                    ) : (
                      <span className={`badge ${S_COLOR[o.status]??""}`}>{o.status.replace(/_/g," ")}</span>
                    )}
                  </td>
                  <td>
                    {editing===o.id ? (
                      <select value={editData.courier} onChange={e=>setEditData(d=>({...d,courier:e.target.value}))}
                        className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white font-display font-600 focus:border-accent focus:outline-none">
                        <option value="">Select courier...</option>
                        {Object.keys(COURIERS).map(c=><option key={c}>{c}</option>)}
                      </select>
                    ) : (
                      <span className="text-xs text-gray-500">{o.courier||"—"}</span>
                    )}
                  </td>
                  <td>
                    {editing===o.id ? (
                      <input value={editData.tracking} onChange={e=>setEditData(d=>({...d,tracking:e.target.value}))}
                        placeholder="Tracking number..." className="input text-xs py-1.5 w-36"/>
                    ) : o.tracking ? (
                      <a href={getTrackUrl(o.courier,o.tracking)} target="_blank" rel="noopener noreferrer"
                        className="font-mono text-xs text-accent hover:text-accent-dark flex items-center gap-1 transition-colors">
                        {o.tracking} <ExternalLink size={10}/>
                      </a>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td>
                    {editing===o.id ? (
                      <div className="flex gap-2">
                        <button onClick={()=>saveEdit(o.id)} className="text-xs text-green-600 font-display font-700 hover:text-green-800">Save</button>
                        <button onClick={()=>setEditing(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={()=>startEdit(o)} className="text-xs text-accent hover:text-accent-dark font-display font-600 transition-colors">Edit</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
