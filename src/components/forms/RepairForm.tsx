"use client";
import { useState } from "react";

export default function RepairForm() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
      <p className="text-gray-600 text-sm mb-4">We&apos;ll send you a quote within 48 hours at your email address. Collection is always free.</p>
      <button onClick={() => setSent(false)} className="btn-secondary text-sm">Submit another request</button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div><label className="label">First Name *</label><input required className="input" placeholder="John"/></div>
        <div><label className="label">Last Name *</label><input required className="input" placeholder="Smith"/></div>
        <div><label className="label">Email *</label><input required type="email" className="input" placeholder="john@company.com"/></div>
        <div><label className="label">Phone</label><input type="tel" className="input" placeholder="+44 7xxx xxxxxx"/></div>
        <div><label className="label">Company</label><input className="input" placeholder="Your company name"/></div>
        <div>
          <label className="label">Type of Service *</label>
          <select required className="select">
            <option value="">Select service...</option>
            <option>Repair</option>
            <option>Calibration</option>
            <option>Installation &amp; Setup</option>
            <option>Preventative Maintenance</option>
            <option>Multiple services</option>
          </select>
        </div>
        <div>
          <label className="label">Equipment Type *</label>
          <select required className="select">
            <option value="">Select type...</option>
            <option>PLC / Controller</option>
            <option>AC / DC Drive</option>
            <option>HMI Panel</option>
            <option>Test &amp; Measurement</option>
            <option>Scientific Instrument</option>
            <option>Robot / Servo</option>
            <option>Other</option>
          </select>
        </div>
        <div><label className="label">Manufacturer / Model</label><input className="input" placeholder="e.g. Siemens S7-300"/></div>
      </div>
      <div>
        <label className="label">Fault Description *</label>
        <textarea required className="textarea" rows={4} placeholder="Describe the fault or service required in as much detail as possible..."/>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-500">
        By submitting this form you agree to Combay contacting you regarding your request. We do not share your data with third parties.
      </div>
      <div className="flex items-center justify-between">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Sending..." : "Send Quote Request →"}
        </button>
        <p className="text-xs text-gray-400 hidden sm:block">Or email <a href="mailto:service@combay.co.uk" className="text-accent">service@combay.co.uk</a></p>
      </div>
    </form>
  );
}
