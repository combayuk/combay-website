"use client";
import { useState, useRef } from "react";
import { Upload, FileText, X } from "lucide-react";

export default function AssetForm() {
  const [sent,     setSent]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [docFile,  setDocFile]  = useState<File|null>(null);
  const docRef                  = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise(r=>setTimeout(r,900));
    setLoading(false); setSent(true);
  }

  if (sent) return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
      <div className="text-4xl mb-3">✅</div>
      <h3 className="font-display font-700 text-navy-950 text-lg mb-2">Request received</h3>
      <p className="text-gray-600 text-sm mb-4">Our procurement team will contact you within 24 hours.</p>
      <button onClick={()=>setSent(false)} className="btn-secondary text-sm">Submit another</button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div><label className="label">First Name *</label><input required className="input" placeholder="John"/></div>
        <div><label className="label">Last Name *</label><input required className="input" placeholder="Smith"/></div>
        <div><label className="label">Email *</label><input required type="email" className="input" placeholder="john@company.com"/></div>
        <div><label className="label">Phone</label><input type="tel" className="input" placeholder="+44..."/></div>
        <div><label className="label">Company</label><input className="input" placeholder="Optional"/></div>
        <div><label className="label">Collection Location</label><input className="input" placeholder="City or postcode"/></div>
      </div>
      <div>
        <label className="label">Describe Your Stock *</label>
        <textarea required className="textarea" rows={4}
          placeholder="Tell us what you have — brand, model, quantity, condition. A rough description is fine.&#10;&#10;You can also email photos to procurement@combay.co.uk"/>
      </div>
      <div>
        <label className="label">Approximate Quantity</label>
        <select className="select">
          <option>1–5 items</option>
          <option>6–20 items</option>
          <option>21–100 items</option>
          <option>100+ items / full clearance</option>
        </select>
      </div>

      {/* Upload completed asset disposal sheet */}
      <div>
        <label className="label">Asset Disposal Sheet <span className="text-gray-400 font-sans font-400 text-xs">(optional)</span></label>
        <p className="text-gray-400 text-xs mb-2">Upload a completed asset disposal form if you have one. We also accept photos via email.</p>
        {docFile ? (
          <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 bg-surface">
            <FileText size={16} className="text-accent flex-shrink-0"/>
            <span className="font-display font-600 text-sm text-navy-950 flex-1 truncate">{docFile.name}</span>
            <button type="button" onClick={()=>setDocFile(null)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={14}/></button>
          </div>
        ) : (
          <div onClick={()=>docRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-all">
            <Upload size={18} className="mx-auto mb-2 text-gray-300"/>
            <p className="font-display font-600 text-sm text-gray-600">Click to upload asset disposal sheet</p>
            <p className="text-gray-400 text-xs mt-1">PDF, DOCX, XLSX, CSV — max 10MB</p>
            <input ref={docRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv" className="hidden"
              onChange={e=>e.target.files?.[0] && setDocFile(e.target.files[0])}/>
          </div>
        )}
      </div>

      <div className="bg-accent/10 border border-accent/20 rounded-xl px-4 py-3 text-xs text-navy-950">
        💡 No stock list? No problem — send a few photos to <strong>procurement@combay.co.uk</strong> and we&apos;ll assess for free.
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full py-3">
        {loading ? "Sending..." : "Send Recovery Request →"}
      </button>
    </form>
  );
}
