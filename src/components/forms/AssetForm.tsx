"use client";
import { useState } from "react";

export default function AssetForm() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    setSent(true);
  }

  if (sent) return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
      <div className="text-4xl mb-3">✅</div>
      <h3 className="font-display font-700 text-navy-900 text-lg mb-2">Request received</h3>
      <p className="text-gray-600 text-sm mb-4">Our procurement team will contact you within 24 hours.</p>
      <button onClick={() => setSent(false)} className="btn-secondary text-sm">Submit another</button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div><label className="label">First Name *</label><input required className="input"/></div>
        <div><label className="label">Last Name *</label><input required className="input"/></div>
        <div><label className="label">Email *</label><input required type="email" className="input"/></div>
        <div><label className="label">Phone</label><input type="tel" className="input"/></div>
        <div><label className="label">Company</label><input className="input"/></div>
        <div><label className="label">Collection Location</label><input className="input" placeholder="City / postcode"/></div>
      </div>
      <div>
        <label className="label">Describe Your Stock *</label>
        <textarea required className="textarea" rows={4} placeholder="Tell us what you have — brand, model, quantity, condition. A rough description is fine. You can also email photos to procurement@combay.co.uk"/>
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
      <div className="bg-accent/10 border border-accent/20 rounded-lg px-4 py-3 text-xs text-navy-900">
        💡 No stock list? No problem. Send a few photos to <strong>procurement@combay.co.uk</strong> and we&apos;ll assess.
      </div>
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Sending..." : "Send Recovery Request →"}
      </button>
    </form>
  );
}
