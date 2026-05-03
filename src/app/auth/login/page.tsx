"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.ok) router.push("/portal");
    else setError("Invalid email or password.");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-8 h-8 bg-navy-900 rounded flex items-center justify-center">
              <span className="text-accent font-display font-900 text-sm">C</span>
            </div>
            <span className="font-display font-800 text-navy-900 text-xl">COMBAY</span>
          </Link>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <h1 className="font-display font-800 text-navy-900 text-2xl mb-1">Sign in</h1>
          <p className="text-gray-400 text-sm mb-6">Access your account and order history.</p>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="label">Email</label><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="input"/></div>
            <div><label className="label">Password</label><input required type="password" value={password} onChange={e=>setPassword(e.target.value)} className="input"/></div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-5">
            No account? <Link href="/auth/register" className="text-accent hover:text-accent-dark font-600">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
