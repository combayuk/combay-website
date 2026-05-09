"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const mode = params.get("mode") === "admin" ? "admin" : "customer";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loginHref = useMemo(() => mode === "admin" ? "/admin-login" : "/portal/login", [mode]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Password reset failed.");
      setMessage(data.message || "Password updated. You can now sign in.");
      setTimeout(() => router.push(data.mode === "admin" ? "/admin-login?reset=1" : "/portal/login?reset=1"), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#2D4F7A] flex items-center justify-center p-4" style={{ backgroundImage: "radial-gradient(ellipse at 60% 40%, rgba(232,164,74,0.09) 0%, transparent 70%)" }}>
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex justify-center">
          <span className="rounded-xl bg-white px-4 py-3 shadow-card">
            <img src="/images/combay-logo.svg" alt="Combay" className="h-12 w-auto max-w-[230px] object-contain" />
          </span>
        </Link>

        <div className="rounded-2xl bg-white p-6 shadow-card-lg">
          <p className="section-label mb-2">Account security</p>
          <h1 className="font-display text-xl font-900 text-[#2D4F7A]">Set a new password</h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">Enter a new password for your Combay {mode === "admin" ? "admin" : "customer"} account.</p>

          {!token ? <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-700 text-red-700">Password reset token is missing. Request a new reset link.</div> : null}
          {error ? <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-700 text-red-700">{error}</div> : null}
          {message ? <div className="mt-5 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-xs font-700 text-green-700">{message}</div> : null}

          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label className="label">New password</label>
              <input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="input" autoComplete="new-password" />
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <input required minLength={8} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="input" autoComplete="new-password" />
            </div>
            <button type="submit" disabled={loading || !token} className="btn-primary w-full justify-center py-3 disabled:opacity-50">{loading ? "Updating..." : "Update password →"}</button>
          </form>

          <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-gray-400">
            <Link href={loginHref} className="hover:text-[#2D4F7A]">← Back to login</Link>
            <Link href="/auth/forgot-password" className="hover:text-[#2D4F7A]">Request another link</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordForm /></Suspense>;
}
