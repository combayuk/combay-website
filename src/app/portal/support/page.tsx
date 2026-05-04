"use client";
import { useState } from "react";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { Input, Textarea, Select } from "@/components/ui/FormField";

type SubmitState = { reference: string; emailMessage: string } | null;

export default function SupportPage() {
  const [sent, setSent] = useState<SubmitState>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const response = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, source: "customer-portal" }),
    });
    const result = await response.json();
    setLoading(false);

    if (!response.ok || !result.ok) {
      setError(result.error || "Unable to submit ticket. Please try again.");
      return;
    }

    setSent({ reference: result.reference, emailMessage: result.email?.message || "Ticket logged." });
  }

  return (
    <main><TopBar /><Navigation />
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-navy-950 text-white py-10"><div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-3"><Link href="/portal" className="hover:text-accent">Portal</Link><span>/</span><span>Support</span></div>
        <h1 className="font-display font-900 text-3xl text-white">Contact Support</h1>
      </div></div>
      <div className="max-w-2xl mx-auto px-4 py-10">
        {sent ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
            <div className="text-3xl mb-2">✓</div>
            <h3 className="font-display font-700 text-green-800 text-lg mb-1">Ticket Submitted</h3>
            <p className="text-green-700 text-sm mb-2">Reference: <span className="font-mono font-700">{sent.reference}</span></p>
            <p className="text-green-700 text-xs">{sent.emailMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <h2 className="font-display font-800 text-xl text-navy-900">Open a Support Ticket</h2>
            <Select name="subject" label="What is this regarding?" required options={[{value:"",label:"Select..."},{value:"order",label:"An order I placed"},{value:"repair",label:"A repair booking"},{value:"return",label:"A return / refund"},{value:"general",label:"General query"}]} />
            <Input name="orderId" label="Order Number (if applicable)" placeholder="CB-001" />
            <Input name="name" label="Your Name" required placeholder="Your full name" />
            <Input name="email" type="email" label="Email" required placeholder="you@company.com" />
            <Textarea name="message" label="Message" required rows={4} placeholder="Describe your issue in detail..." />
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex items-center justify-between">
              <button type="submit" disabled={loading} className="bg-navy-900 text-white font-display font-700 px-5 py-2.5 rounded hover:bg-navy-800 transition-colors">{loading ? "Submitting..." : "Submit Ticket →"}</button>
              <a href="https://wa.me/447340383334" target="_blank" rel="noopener noreferrer" className="text-xs text-[#25D366] font-600 hover:text-[#1EBE5A]">Or WhatsApp us →</a>
            </div>
          </form>
        )}
      </div>
    </div>
    <Footer /></main>
  );
}
