"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";

export default function UnsubscribePage() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const trigger = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("trigger") || "";
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token") || "";
    setToken(t);
    if (!t) { setLoading(false); setError("This unsubscribe link is missing a token."); return; }
    fetch(`/api/marketing/unsubscribe?token=${encodeURIComponent(t)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) throw new Error(data.error || "Could not load this unsubscribe link.");
        setEmail(data.email || "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load this unsubscribe link."))
      .finally(() => setLoading(false));
  }, []);

  async function unsubscribe(mode: string) {
    setSaving(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/marketing/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, mode }) });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !data.ok) { setError(data.error || "Could not update preference."); return; }
    setMessage(data.message || "Preference updated.");
  }

  return (
    <main>
      <TopBar />
      <Navigation />
      <section className="section-pad bg-surface min-h-[55vh]">
        <div className="container max-w-2xl">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-accent mb-2">Email preferences</p>
            <h1 className="font-display font-800 text-3xl text-navy-950 mb-3">Unsubscribe or manage Combay emails</h1>
            {loading ? <p className="text-gray-500 text-sm">Checking your unsubscribe link...</p> : error ? <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p> : (
              <div className="space-y-5">
                <p className="text-sm text-gray-600">This link is for <strong>{email}</strong>. You can unsubscribe from all marketing emails immediately. Transactional emails about accounts, orders, quotes, returns and support may still be sent where needed.</p>
                {trigger.startsWith("MONTHLY_") && <button disabled={saving} onClick={() => unsubscribe("monthly")} className="btn-secondary w-full justify-center">Stop monthly campaign emails</button>}
                {["NEW_YEAR", "SUMMER", "EASTER", "CHRISTMAS", "BOXING_DAY"].includes(trigger) && <button disabled={saving} onClick={() => unsubscribe("seasonal")} className="btn-secondary w-full justify-center">Stop seasonal campaign emails</button>}
                <button disabled={saving} onClick={() => unsubscribe("all")} className="btn-primary w-full justify-center">Unsubscribe from all marketing emails</button>
                {message && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">{message}</p>}
                <p className="text-xs text-gray-500">To choose categories and individual email types, sign in and open Marketing Preferences in your customer portal.</p>
                <Link href="/portal?section=marketing" className="text-sm font-display font-700 text-accent hover:text-accent-dark">Open portal preferences →</Link>
              </div>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
