"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const email = params.get("email") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError(""); setMessage("");
    const res = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, token, password, confirmPassword }) });
    const data = await res.json().catch(() => ({})); setLoading(false);
    if (!res.ok) { setError(data.error || "Could not reset password."); return; }
    setMessage(data.message || "Password updated. You can now login with your new details.");
    window.setTimeout(() => router.replace(data.redirectTo || "/portal/login?reset=1"), 900);
  }

  return (
    <main className="min-h-screen bg-navy-950 flex items-center justify-center p-4" style={{ backgroundImage: "radial-gradient(ellipse at 60% 40%, rgba(232,164,74,0.09) 0%, transparent 70%)" }}>
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex justify-center"><img src="/images/combay-footer-logo.svg" alt="Combay" className="h-16 w-auto max-w-[260px] object-contain" /></Link>
        <div className="rounded-2xl bg-white p-6 shadow-card-lg">
          <p className="text-xs font-900 uppercase tracking-[0.18em] text-accent">Secure reset</p>
          <h1 className="mt-1 font-display text-2xl font-900 text-navy-950">Choose a new password</h1>
          <p className="mt-1 text-sm text-slate-500">Use at least 8 characters. After saving, you will be redirected to the correct login page.</p>
          {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-700 text-red-700">{error}</div> : null}
          {message ? <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-xs font-700 text-green-700">{message}</div> : null}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div><label className="label">New password</label><input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="input" /></div>
            <div><label className="label">Re-enter new password</label><input required type="password" minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input" /></div>
            <button disabled={loading || !token || !email} className="btn-primary w-full py-3">{loading ? "Updating..." : "Update password"}</button>
          </form>
          <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-slate-400"><Link href="/portal/login" className="hover:text-navy-950">Customer login</Link><Link href="/admin-login" className="hover:text-navy-950">Admin login</Link></div>
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordForm /></Suspense>;
}
