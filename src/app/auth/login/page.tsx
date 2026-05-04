"use client";
import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router      = useRouter();
  const params      = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/portal";

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.ok) {
      // Redirect admin to dashboard, customer to portal
      const isAdmin = email === (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "admin@combay.co.uk");
      router.push(isAdmin ? "/admin" : callbackUrl.startsWith("/admin") ? "/portal" : callbackUrl);
    } else {
      setError("Incorrect credentials. Use the test accounts below.");
    }
  }

  const fill = (e: string, p: string) => { setEmail(e); setPassword(p); setError(""); };

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4"
      style={{backgroundImage:"radial-gradient(ellipse at 60% 40%, rgba(240,165,0,0.07) 0%, transparent 70%)"}}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-9 h-9 bg-accent rounded-lg flex items-center justify-center">
            <span className="text-navy-950 font-display font-800 text-sm">CB</span>
          </div>
          <span className="font-display font-800 text-white text-2xl tracking-tight">COMBAY</span>
        </Link>

        {/* Preview accounts */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-5">
          <p className="font-display font-700 text-white text-xs mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-accent rounded-full inline-block"/>
            Preview Mode — Test Accounts
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => fill("admin@combay.co.uk","combay-admin-2024")}
              className="bg-white/8 border border-white/10 rounded-xl px-3 py-3 text-left hover:border-accent/50 hover:bg-white/12 transition-all group">
              <div className="flex items-center justify-between mb-1">
                <span className="font-display font-700 text-white text-xs">Admin</span>
                <span className="text-[9px] bg-red-500/20 text-red-300 border border-red-500/30 rounded px-1.5 py-0.5 font-mono">ADMIN</span>
              </div>
              <p className="font-mono text-[10px] text-white/40">admin@combay.co.uk</p>
              <p className="font-mono text-[10px] text-accent/60 mt-0.5 group-hover:text-accent transition-colors">Click to fill →</p>
            </button>
            <button onClick={() => fill("test@combay.co.uk","Test1234")}
              className="bg-white/8 border border-white/10 rounded-xl px-3 py-3 text-left hover:border-accent/50 hover:bg-white/12 transition-all group">
              <div className="flex items-center justify-between mb-1">
                <span className="font-display font-700 text-white text-xs">Customer</span>
                <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded px-1.5 py-0.5 font-mono">PORTAL</span>
              </div>
              <p className="font-mono text-[10px] text-white/40">test@combay.co.uk</p>
              <p className="font-mono text-[10px] text-accent/60 mt-0.5 group-hover:text-accent transition-colors">Click to fill →</p>
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl p-6 shadow-card-lg">
          <h1 className="font-display font-800 text-navy-950 text-xl mb-0.5">Sign in</h1>
          <p className="text-gray-400 text-xs mb-5">Access your account and order history.</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2.5 mb-4 font-display font-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input required type="email" value={email} onChange={e=>setEmail(e.target.value)}
                className="input" placeholder="you@company.com" autoComplete="email"/>
            </div>
            <div>
              <label className="label">Password</label>
              <input required type="password" value={password} onChange={e=>setPassword(e.target.value)}
                className="input" autoComplete="current-password"/>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base mt-1">
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-5">
            <Link href="/" className="hover:text-navy-950 transition-colors">← Back to website</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
