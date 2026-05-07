"use client";
import { useState } from "react";

type SubmitState = { reference: string; emailMessage: string } | null;

export default function RepairForm() {
  const [sent, setSent] = useState<SubmitState>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const response = await fetch("/api/repair", { method: "POST", body: form });
    const result = await response.json();
    setLoading(false);

    if (!response.ok || !result.ok) {
      setError(result.error || "Unable to submit repair request. Please try again.");
      return;
    }

    setSent({ reference: result.reference, emailMessage: result.email?.message || "Request logged." });
  }

  if (sent) return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
      <div className="text-4xl mb-3">✅</div>
      <h3 className="font-display font-700 text-navy-900 text-lg mb-2">Request received</h3>
      <p className="text-gray-600 text-sm mb-2">Reference: <span className="font-mono font-700 text-navy-900">{sent.reference}</span></p>
      <p className="text-gray-500 text-xs mb-4">{sent.emailMessage}</p>
      <button onClick={() => setSent(null)} className="btn-secondary text-sm">Submit another request</button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div><label className="label">First Name *</label><input name="firstName" required className="input" placeholder="John"/></div>
        <div><label className="label">Last Name *</label><input name="lastName" required className="input" placeholder="Smith"/></div>
        <div><label className="label">Email *</label><input name="email" required type="email" className="input" placeholder="john@company.com"/></div>
        <div><label className="label">Phone</label><input name="phone" type="tel" className="input" placeholder="+44 7xxx xxxxxx"/></div>
        <div><label className="label">Company</label><input name="company" className="input" placeholder="Your company name"/></div>
        <div><label className="label">Country *</label><input name="country" required className="input" placeholder="United Kingdom"/></div>
        <div>
          <label className="label">Type of Service *</label>
          <select name="serviceType" required className="select">
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
          <select name="equipmentType" required className="select">
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
        <div><label className="label">Manufacturer / Model</label><input name="manufacturerModel" className="input" placeholder="e.g. Siemens S7-300"/></div>
      </div>
      <div>
        <label className="label">Fault Description *</label>
        <textarea name="faultDesc" required className="textarea" rows={4} placeholder="Describe the fault or service required in as much detail as possible..."/>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-500">
        By submitting this form you agree to Combay contacting you regarding your request. We do not share your data with third parties.
      </div>
      <div className="flex items-center justify-between">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Sending..." : "Send Quote Request →"}
        </button>
        <p className="text-xs text-gray-400 hidden sm:block">Or email <a href="mailto:sales@combay.co.uk" className="text-accent">sales@combay.co.uk</a></p>
      </div>
    </form>
  );
}
