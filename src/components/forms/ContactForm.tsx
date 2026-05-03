"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ContactForm() {
  const params = useSearchParams();
  const type = params.get("type") ?? "general";
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState(
    type === "quote" ? "Quote Request" : type === "repair" ? "Repair Enquiry" : type === "enquiry" ? "Product Enquiry" : "General Enquiry"
  );

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
      <h3 className="font-display font-700 text-navy-900 text-lg mb-2">Message sent</h3>
      <p className="text-gray-600 text-sm">We respond to all enquiries within 24 hours.</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div><label className="label">Name *</label><input required className="input" placeholder="Your full name"/></div>
        <div><label className="label">Email *</label><input required type="email" className="input" placeholder="you@company.com"/></div>
        <div><label className="label">Phone</label><input type="tel" className="input" placeholder="+44..."/></div>
        <div><label className="label">Company</label><input className="input" placeholder="Optional"/></div>
      </div>
      <div>
        <label className="label">Subject *</label>
        <select required className="select" value={subject} onChange={e => setSubject(e.target.value)}>
          <option>General Enquiry</option>
          <option>Quote Request</option>
          <option>Product Enquiry</option>
          <option>Repair Enquiry</option>
          <option>Asset Recovery</option>
          <option>Order Support</option>
          <option>Other</option>
        </select>
      </div>
      <div>
        <label className="label">Message *</label>
        <textarea required className="textarea" rows={5} placeholder="How can we help?"/>
      </div>
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Sending..." : "Send Message →"}
      </button>
    </form>
  );
}
