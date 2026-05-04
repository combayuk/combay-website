"use client";
import { useState } from "react";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { FormField } from "@/components/ui/FormField";

export default function SupportPage() {
  const [sent, setSent] = useState(false);

  return (
    <main>
      <TopBar />
      <Navigation />
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-navy-950 text-white py-10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
              <Link href="/portal" className="hover:text-accent">Portal</Link>
              <span>/</span>
              <span>Support</span>
            </div>
            <h1 className="font-display font-900 text-3xl text-white">Contact Support</h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-10">
          {sent ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
              <div className="text-3xl mb-2">✓</div>
              <h3 className="font-display font-700 text-green-800 text-lg mb-1">Ticket Submitted</h3>
              <p className="text-green-700 text-sm">We&apos;ll respond to your query within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
              <h2 className="font-display font-800 text-xl text-navy-900">Open a Support Ticket</h2>

              <FormField label="What is this regarding?">
                <select required className="input">
                  <option value="">Select...</option>
                  <option value="order">An order I placed</option>
                  <option value="repair">A repair booking</option>
                  <option value="return">A return / refund</option>
                  <option value="general">General query</option>
                </select>
              </FormField>

              <FormField label="Order Number (if applicable)">
                <input className="input" placeholder="CB-001" />
              </FormField>

              <FormField label="Subject">
                <input className="input" required placeholder="Brief description of your issue" />
              </FormField>

              <FormField label="Message">
                <textarea className="input" required rows={4} placeholder="Describe your issue in detail..." />
              </FormField>

              <div className="flex items-center justify-between">
                <button type="submit" className="bg-navy-900 text-white font-display font-700 px-5 py-2.5 rounded hover:bg-navy-800 transition-colors">
                  Submit Ticket →
                </button>
                <a href="https://wa.me/447340383334" target="_blank" rel="noopener noreferrer" className="text-xs text-[#25D366] font-600 hover:text-[#1EBE5A]">
                  Or WhatsApp us →
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}