"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function ForgotPasswordForm() {
  const params = useSearchParams();
  const mode = params.get("mode") === "admin" ? "admin" : "customer";
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError(""); setMessage("");
    const res = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier, portal: mode }) });
    const data = await res.json().catch(() => ({})); setLoading(false);
    if (!res.ok) { setError(data.error || "Could not start password reset."); return; }
    setMessage(data.message || "If an eligible account exists, a password reset email has been sent.");
  }

  return (
    <main className="min-h-screen bg-navy-950 flex items-center justify-center p-4" style={{ backgroundImage: "radial-gradient(ellipse at 60% 40%, rgba(232,164,74,0.09) 0%, transparent 70%)" }}>
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex justify-center"><img src="/images/combay-footer-logo.svg" alt="Combay" className="h-16 w-auto max-w-[260px] object-contain" /></Link>
        <div className="rounded-2xl bg-white p-6 shadow-card-lg">
          <p className="text-xs font-900 uppercase tracking-[0.18em] text-accent">{mode === "admin" ? "Admin access" : "Customer portal"}</p>
          <h1 className="mt-1 font-display text-2xl font-900 text-navy-950">Forgot password</h1>
          <p className="mt-1 text-sm text-slate-500">Enter the email address or phone number linked to your account. If eligible, we will send password reset instructions to the registered email address.</p>
          {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-700 text-red-700">{error}</div> : null}
          {message ? <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-xs font-700 text-green-700">{message}</div> : null}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div><label className="label">Email address or phone number</label><input required value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="input" placeholder={mode === "admin" ? "admin@combay.co.uk" : "you@company.com or phone number"} /></div>
            <button disabled={loading} className="btn-primary w-full py-3">{loading ? "Sending..." : "Send reset instructions"}</button>
          </form>
          <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-slate-400">
            <Link href={mode === "admin" ? "/admin-login" : "/portal/login"} className="hover:text-navy-950">Back to sign in</Link>
            <Link href="/" className="hover:text-navy-950">Back to website</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return <Suspense><ForgotPasswordForm /></Suspense>;
}
