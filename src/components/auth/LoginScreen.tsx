"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type LoginMode = "customer" | "admin" | "generic";

type LoginPreset = {
  label: string;
  badge: string;
  email: string;
  password: string;
  helper: string;
};

const CUSTOMER_PRESET: LoginPreset = {
  label: "Customer portal",
  badge: "CUSTOMER",
  email: "test@combay.co.uk",
  password: "Test12345",
  helper: "Open customer portal",
};

const ADMIN_PRESET: LoginPreset = {
  label: "Admin portal",
  badge: "ADMIN",
  email: "admin@combay.co.uk",
  password: "Admin12345",
  helper: "Open admin dashboard",
};

function LoginForm({ mode }: { mode: LoginMode }) {
  const router = useRouter();
  const params = useSearchParams();
  const defaultCallback = mode === "admin" ? "/admin" : "/portal";
  const callbackUrl = params.get("callbackUrl") ?? defaultCallback;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.ok) {
      router.push(callbackUrl);
      router.refresh();
      return;
    }

    setError(
      mode === "admin"
        ? "Incorrect admin credentials. Use the authorised admin test account."
        : "Incorrect credentials. Use the customer test account below."
    );
  }

  const fill = (preset: LoginPreset) => {
    setEmail(preset.email);
    setPassword(preset.password);
    setError("");
  };

  const presets = mode === "admin" ? [ADMIN_PRESET] : mode === "customer" ? [CUSTOMER_PRESET] : [CUSTOMER_PRESET, ADMIN_PRESET];
  const title = mode === "admin" ? "Combay Admin Login" : mode === "customer" ? "Customer Portal Login" : "Sign in";
  const subtitle = mode === "admin" ? "For authorised Combay staff only." : mode === "customer" ? "Access orders, returns, tracking and support." : "Choose the correct portal account.";
  const buttonText = mode === "admin" ? "Sign in to admin →" : mode === "customer" ? "Sign in to portal →" : "Sign in →";

  return (
    <div
      className="min-h-screen bg-navy-950 flex items-center justify-center p-4"
      style={{ backgroundImage: "radial-gradient(ellipse at 60% 40%, rgba(240,165,0,0.07) 0%, transparent 70%)" }}
    >
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-9 h-9 bg-accent rounded-lg flex items-center justify-center">
            <span className="text-navy-950 font-display font-800 text-sm">CB</span>
          </div>
          <span className="font-display font-800 text-white text-2xl tracking-tight">COMBAY</span>
        </Link>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-5">
          <p className="font-display font-700 text-white text-xs mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-accent rounded-full inline-block" />
            Preview Mode — Test Account{presets.length > 1 ? "s" : ""}
          </p>
          <div className={presets.length > 1 ? "grid grid-cols-2 gap-2" : "grid grid-cols-1 gap-2"}>
            {presets.map((preset) => (
              <button
                key={preset.badge}
                type="button"
                onClick={() => fill(preset)}
                className="bg-white/8 border border-white/10 rounded-xl px-3 py-3 text-left hover:border-accent/50 hover:bg-white/12 transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-display font-700 text-white text-xs">{preset.label}</span>
                  <span className={`text-[9px] rounded px-1.5 py-0.5 font-mono border ${preset.badge === "ADMIN" ? "bg-red-500/20 text-red-300 border-red-500/30" : "bg-blue-500/20 text-blue-300 border-blue-500/30"}`}>
                    {preset.badge}
                  </span>
                </div>
                <p className="font-mono text-[10px] text-white/40">{preset.email}</p>
                <p className="font-mono text-[10px] text-accent/60 mt-0.5 group-hover:text-accent transition-colors">Click to fill →</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-card-lg">
          <h1 className="font-display font-800 text-navy-950 text-xl mb-0.5">{title}</h1>
          <p className="text-gray-400 text-xs mb-5">{subtitle}</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2.5 mb-4 font-display font-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder={mode === "admin" ? "admin@combay.co.uk" : "you@company.com"} autoComplete="email" />
            </div>
            <div>
              <label className="label">Password</label>
              <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" autoComplete="current-password" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base mt-1">
              {loading ? "Signing in..." : buttonText}
            </button>
          </form>

          {mode === "customer" && (
            <p className="text-center text-sm text-gray-500 mt-5">
              Don’t have an account? <Link href="/auth/register" className="text-accent hover:text-accent-dark font-700">Register with us</Link>
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-gray-400 mt-5">
            <Link href="/" className="hover:text-navy-950 transition-colors">← Back to website</Link>
            {mode !== "customer" && <Link href="/portal/login" className="hover:text-navy-950 transition-colors">Customer portal</Link>}
            {mode !== "admin" && <Link href="/admin-login" className="hover:text-navy-950 transition-colors">Admin portal</Link>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginScreen({ mode = "generic" }: { mode?: LoginMode }) {
  return (
    <Suspense>
      <LoginForm mode={mode} />
    </Suspense>
  );
}
