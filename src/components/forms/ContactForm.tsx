"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

type SubmitState = { reference: string; emailMessage: string } | null;

export default function ContactForm() {
  const params = useSearchParams();
  const type = params.get("type") ?? "general";
  const [sent, setSent] = useState<SubmitState>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState(
    type === "quote" ? "Quote Request" : type === "repair" ? "Repair Enquiry" : type === "enquiry" ? "Product Enquiry" : "General Enquiry"
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const response = await fetch("/api/contact", { method: "POST", body: form });
    const result = await response.json();

    setLoading(false);

    if (!response.ok || !result.ok) {
      setError(result.error || "Unable to submit message. Please try again.");
      return;
    }

    setSent({ reference: result.reference, emailMessage: result.email?.message || "Request logged." });
  }

  if (sent) return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
      <div className="text-4xl mb-3">✅</div>
      <h3 className="font-display font-700 text-navy-900 text-lg mb-2">Message received</h3>
      <p className="text-gray-600 text-sm mb-2">Your reference is <span className="font-mono font-700 text-navy-900">{sent.reference}</span>.</p>
      <p className="text-gray-500 text-xs">{sent.emailMessage}</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div><label className="label">Name *</label><input name="name" required className="input" placeholder="Your full name"/></div>
        <div><label className="label">Email *</label><input name="email" required type="email" className="input" placeholder="you@company.com"/></div>
        <div><label className="label">Phone</label><input name="phone" type="tel" className="input" placeholder="+44..."/></div>
        <div><label className="label">Company</label><input name="company" className="input" placeholder="Optional"/></div>
      </div>
      <div>
        <label className="label">Subject *</label>
        <select required name="subject" className="select" value={subject} onChange={e => setSubject(e.target.value)}>
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
        <textarea name="message" required className="textarea" rows={5} placeholder="How can we help?"/>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Sending..." : "Send Message →"}
      </button>
    </form>
  );
}
