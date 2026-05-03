"use client";
import { useState } from "react";

const REPAIR_REQUESTS = [
  { id:"REP001", date:"01 May 2025", name:"James Walker",  company:"Walker Pharma",  equipment:"Siemens S7-300 PLC",   service:"Repair",       status:"NEW",         email:"j.walker@walkerpharma.com" },
  { id:"REP002", date:"29 Apr 2025", name:"Maria Santos",  company:"Santos Labs",    equipment:"Fluke 435-II",          service:"Calibration",  status:"IN_PROGRESS", email:"m.santos@lab.com" },
  { id:"REP003", date:"28 Apr 2025", name:"Tom Richards",  company:"—",             equipment:"ABB Drive (unknown)",    service:"Repair",       status:"RESOLVED",    email:"tom.r@gmail.com" },
];

const ASSET_REQUESTS = [
  { id:"AST001", date:"01 May 2025", name:"David Chen",    company:"Chen Electronics",desc:"~20 PLCs + 5 oscilloscopes, surplus after factory upgrade", status:"NEW",    email:"d.chen@chen-elec.com" },
  { id:"AST002", date:"27 Apr 2025", name:"Priya Patel",   company:"BiomedKit UK",   desc:"3x Thermo centrifuges, all working, need to clear space",   status:"IN_PROGRESS", email:"p.patel@biomedkit.co.uk" },
];

const STATUS_COLOR: Record<string,string> = {
  NEW:               "text-yellow-700 bg-yellow-50 border-yellow-200",
  IN_PROGRESS:       "text-blue-700 bg-blue-50 border-blue-200",
  AWAITING_CUSTOMER: "text-purple-700 bg-purple-50 border-purple-200",
  RESOLVED:          "text-green-700 bg-green-50 border-green-200",
  CLOSED:            "text-gray-700 bg-gray-50 border-gray-200",
};

export default function AdminRequests() {
  const [tab, setTab] = useState<"repair"|"asset">("repair");
  return (
    <div>
      <h1 className="font-display font-800 text-navy-900 text-2xl mb-6">Requests</h1>
      <div className="flex gap-2 mb-5">
        {(["repair","asset"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`font-display font-600 text-sm px-5 py-2.5 rounded-lg border transition-all capitalize ${tab===t ? "bg-navy-900 text-white border-navy-900" : "border-gray-200 text-gray-600 hover:border-navy-900"}`}>
            {t === "repair" ? "Repair Requests" : "Asset Recovery Requests"}
          </button>
        ))}
      </div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full admin-table">
          <thead>
            <tr><th>ID</th><th>Date</th><th>Customer</th><th>{tab==="repair" ? "Equipment" : "Description"}</th><th>{tab==="repair" ? "Service" : "—"}</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {(tab==="repair" ? REPAIR_REQUESTS : ASSET_REQUESTS).map((r: any) => (
              <tr key={r.id}>
                <td className="font-mono text-xs text-gray-500">{r.id}</td>
                <td className="text-xs text-gray-500">{r.date}</td>
                <td>
                  <div className="font-display font-600 text-sm text-navy-900">{r.name}</div>
                  {r.company !== "—" && <div className="text-xs text-gray-400">{r.company}</div>}
                  <a href={`mailto:${r.email}`} className="text-xs text-accent hover:text-accent-dark">{r.email}</a>
                </td>
                <td className="text-xs text-gray-600 max-w-xs">{r.equipment ?? r.desc}</td>
                <td className="text-xs text-gray-500">{r.service ?? "—"}</td>
                <td>
                  <select defaultValue={r.status} className="text-xs border border-gray-200 rounded px-2 py-1 bg-white font-display font-600">
                    {["NEW","IN_PROGRESS","AWAITING_CUSTOMER","RESOLVED","CLOSED"].map(s => (
                      <option key={s} value={s}>{s.replace(/_/g," ")}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <a href={`mailto:${r.email}`} className="text-xs text-accent hover:text-accent-dark font-600 mr-2">Reply</a>
                  <button className="text-xs text-gray-400 hover:text-navy-900 font-600">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
