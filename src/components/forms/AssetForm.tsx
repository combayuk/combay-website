"use client";
import { useState, useRef } from "react";
import { Upload, FileText, X } from "lucide-react";

type SubmitState = { reference: string; emailMessage: string } | null;

export default function AssetForm() {
  const [sent, setSent] = useState<SubmitState>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [docFile, setDocFile] = useState<File|null>(null);
  const docRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const response = await fetch("/api/asset-recovery", { method: "POST", body: form });
    const result = await response.json();
    setLoading(false);

    if (!response.ok || !result.ok) {
      setError(result.error || "Unable to submit asset recovery request. Please try again.");
      return;
    }

    setSent({ reference: result.reference, emailMessage: result.email?.message || "Request logged." });
  }

  if (sent) return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
      <div className="text-4xl mb-3">✅</div>
      <h3 className="font-display font-700 text-navy-950 text-lg mb-2">Request received</h3>
      <p className="text-gray-600 text-sm mb-2">Reference: <span className="font-mono font-700 text-navy-900">{sent.reference}</span></p>
      <p className="text-gray-500 text-xs mb-4">{sent.emailMessage}</p>
      <button onClick={() => setSent(null)} className="btn-secondary text-sm">Submit another</button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div><label className="label">First Name *</label><input name="firstName" required className="input" placeholder="John"/></div>
        <div><label className="label">Last Name *</label><input name="lastName" required className="input" placeholder="Smith"/></div>
        <div><label className="label">Email *</label><input name="email" required type="email" className="input" placeholder="john@company.com"/></div>
        <div><label className="label">Phone</label><input name="phone" type="tel" className="input" placeholder="+44..."/></div>
        <div><label className="label">Company</label><input name="company" className="input" placeholder="Optional"/></div>
        <div><label className="label">Country *</label><input name="country" required className="input" placeholder="United Kingdom"/></div>
        <div><label className="label">Collection location</label><input name="location" className="input" placeholder="City or postcode"/></div>
      </div>
      <div>
        <label className="label">Describe Your Stock *</label>
        <textarea name="description" required className="textarea" rows={4}
          placeholder="Tell us what you have — brand, model, quantity, condition. A rough description is fine.\n\nYou can also email photos to sales@combay.co.uk"/>
      </div>
      <div>
        <label className="label">Approximate Quantity</label>
        <select name="quantity" className="select">
          <option>1–5 items</option>
          <option>6–20 items</option>
          <option>21–100 items</option>
          <option>100+ items / full clearance</option>
        </select>
      </div>

      <div>
        <label className="label">Asset Disposal Sheet <span className="text-gray-400 font-sans font-400 text-xs">(optional)</span></label>
        <p className="text-gray-400 text-xs mb-2">Upload a completed asset disposal form if you have one. We also accept photos via email.</p>
        {docFile ? (
          <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 bg-surface">
            <FileText size={16} className="text-accent flex-shrink-0"/>
            <span className="font-display font-600 text-sm text-navy-950 flex-1 truncate">{docFile.name}</span>
            <button type="button" onClick={() => setDocFile(null)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={14}/></button>
          </div>
        ) : (
          <div onClick={() => docRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-all">
            <Upload size={18} className="mx-auto mb-2 text-gray-300"/>
            <p className="font-display font-600 text-sm text-gray-600">Click to upload asset disposal sheet</p>
            <p className="text-gray-400 text-xs mt-1">PDF, DOCX, XLSX, CSV — max 10MB</p>
            <input name="assetSheet" ref={docRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv" className="hidden"
              onChange={e => e.target.files?.[0] && setDocFile(e.target.files[0])}/>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="bg-accent/10 border border-accent/20 rounded-xl px-4 py-3 text-xs text-navy-950">
        💡 No stock list? No problem — send a few photos to <strong>sales@combay.co.uk</strong> and we&apos;ll assess for free.
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full py-3">
        {loading ? "Sending..." : "Send Recovery Request →"}
      </button>
    </form>
  );
}
