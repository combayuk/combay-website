"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function ForgotPasswordForm() {
  const params = useSearchParams();
  const mode = params.get("mode") === "admin" ? "admin" : "customer";
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const copy = useMemo(() => {
    if (mode === "admin") {
      return {
        title: "Reset admin password",
        subtitle: "Enter the authorised admin email address. If it exists, a secure reset link will be sent.",
        backHref: "/admin-login",
        backLabel: "Back to admin login",
      };
    }
    return {
      title: "Reset customer password",
      subtitle: "Enter your customer account email. If it exists, a secure reset link will be sent.",
      backHref: "/portal/login",
      backLabel: "Back to customer login",
    };
  }, [mode]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, mode }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Password reset request failed.");
      setMessage(data.message || "If an eligible account exists for this email address, a reset link has been sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset request failed.");
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
          <h1 className="font-display text-xl font-900 text-[#2D4F7A]">{copy.title}</h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">{copy.subtitle}</p>

          {error ? <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-700 text-red-700">{error}</div> : null}
          {message ? <div className="mt-5 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-xs font-700 text-green-700">{message}</div> : null}

          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label className="label">Email address</label>
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input" placeholder={mode === "admin" ? "admin@combay.co.uk" : "you@company.com"} autoComplete="email" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">{loading ? "Sending..." : "Send reset link →"}</button>
          </form>

          <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-gray-400">
            <Link href={copy.backHref} className="hover:text-[#2D4F7A]">← {copy.backLabel}</Link>
            <Link href="/" className="hover:text-[#2D4F7A]">Back to website</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return <Suspense><ForgotPasswordForm /></Suspense>;
}
