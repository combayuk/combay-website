"use client";
import { useState } from "react";

export default function AdminContent() {
  const [saved, setSaved] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-800 text-navy-900 text-2xl">Content Manager</h1>
        <button onClick={() => setSaved(true)} className="btn-primary">Save Changes →</button>
      </div>
      {saved && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">✅ Changes saved</div>}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-display font-700 text-navy-900 mb-4">Homepage Hero</h2>
          <div className="space-y-3">
            <div><label className="label text-xs">Slide 1 — Heading</label><input className="input text-sm" defaultValue="Mission-critical equipment, delivered."/></div>
            <div><label className="label text-xs">Slide 1 — Body Text</label><textarea className="textarea text-sm" rows={2} defaultValue="Tested, warranted industrial equipment. 30-day warranty. Dispatch within 48 hours."/></div>
            <div><label className="label text-xs">Slide 2 — Heading</label><input className="input text-sm" defaultValue="Don't replace — repair instead."/></div>
            <div><label className="label text-xs">Slide 3 — Heading</label><input className="input text-sm" defaultValue="Recover cash on unwanted equipment."/></div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-display font-700 text-navy-900 mb-4">Trust Stats</h2>
          <div className="grid grid-cols-2 gap-3">
            {[["Stock count","~10,000 items"],["Warranty period","30 days"],["Repair warranty","60 days"],["Below OEM cost","40%"]].map(([l,v]) => (
              <div key={l}>
                <label className="label text-xs">{l}</label>
                <input className="input text-sm" defaultValue={v}/>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-display font-700 text-navy-900 mb-4">Client Logos</h2>
          <div className="space-y-2">
            {["Nutrein","AG Solutions","Fiber Logic","Poole IT","Transend (UK) Ltd"].map(c => (
              <div key={c} className="flex items-center gap-2">
                <input className="input text-sm flex-1" defaultValue={c}/>
                <button className="text-red-400 hover:text-red-600 text-sm">✕</button>
              </div>
            ))}
            <button className="text-xs text-accent font-600">+ Add Client</button>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-display font-700 text-navy-900 mb-4">Contact Information</h2>
          <div className="space-y-3">
            {[["Sales Email","info@combay.co.uk"],["Repair Email","service@combay.co.uk"],["Procurement Email","procurement@combay.co.uk"],["Phone","+44 7340 383334"],["Location","Chelmsford, Essex, UK"]].map(([l,v]) => (
              <div key={l}><label className="label text-xs">{l}</label><input className="input text-sm" defaultValue={v}/></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
