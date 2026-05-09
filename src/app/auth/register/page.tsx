"use client";
import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PHONE_CODES } from "@/lib/portal";

const PERSONAL_EMAIL_DOMAINS = ["gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com", "msn.com", "yahoo.com", "icloud.com", "me.com", "mac.com", "proton.me", "protonmail.com", "aol.com", "zoho.com", "gmx.com", "mail.com", "yandex.com"];
function isPersonalEmail(email: string) { return PERSONAL_EMAIL_DOMAINS.includes(email.toLowerCase().split("@").pop() || ""); }

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [accountType, setAccountType] = useState<"individual" | "company">("individual");
  const [workEmail, setWorkEmail] = useState(searchParams.get("verify") || "");
  const [companyEmail, setCompanyEmail] = useState("");
  const [sameAsMine, setSameAsMine] = useState(true);
  const [verifyEmail, setVerifyEmail] = useState(searchParams.get("verify") || "");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const verificationStep = Boolean(verifyEmail);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError(""); setMessage("");
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim().toLowerCase();
    const companyEmailValue = sameAsMine ? email : String(fd.get("companyEmail") || "").trim().toLowerCase();
    const password = String(fd.get("password") || "");
    const confirmPassword = String(fd.get("confirmPassword") || "");
    if (password !== confirmPassword) { setLoading(false); setError("Password and re-entered password do not match."); return; }
    if (accountType === "company" && isPersonalEmail(email)) { setLoading(false); setError("Company accounts must use a work email address. Please use your business domain email rather than Gmail, Outlook, Proton or other personal email providers."); return; }
    const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountType, name: fd.get("name"), email, phoneCode: fd.get("phoneCode"), phone: fd.get("phone"), designation: fd.get("designation"), company: fd.get("company"), companyEmail: companyEmailValue, companyNumber: fd.get("companyNumber"), vatNumber: fd.get("vatNumber"), password, confirmPassword }) });
    const data = await res.json().catch(() => ({})); setLoading(false);
    if (res.ok && data.verifyRequired) { setVerifyEmail(data.email || email); setMessage(data.message || "A verification code has been sent to your email."); setTimeout(() => inputRefs.current[0]?.focus(), 50); }
    else setError(data.error ?? "Registration failed");
  }
  function updateCode(index: number, value: string) { const digit = value.replace(/\D/g, "").slice(-1); setCode((items) => items.map((item, i) => (i === index ? digit : item))); if (digit && index < 5) inputRefs.current[index + 1]?.focus(); }
  function handleCodeKey(index: number, event: React.KeyboardEvent<HTMLInputElement>) { if (event.key === "Backspace" && !code[index] && index > 0) inputRefs.current[index - 1]?.focus(); }
  async function verifyCode(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(""); setMessage("");
    const res = await fetch("/api/auth/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: verifyEmail, code: code.join("") }) });
    const data = await res.json().catch(() => ({})); setLoading(false);
    if (res.ok && data.ok) router.push("/portal/login?verified=1"); else setError(data.error || "Verification failed.");
  }
  async function resendCode() {
    setResending(true); setError(""); setMessage("");
    const res = await fetch("/api/auth/verify-email", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: verifyEmail }) });
    const data = await res.json().catch(() => ({})); setResending(false);
    if (res.ok && data.ok) setMessage(data.message || "A new code has been sent."); else setError(data.error || "Could not resend code.");
  }
  const isCompany = accountType === "company";
  return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4"><div className="w-full max-w-3xl"><div className="mb-6 flex justify-center"><Link href="/" className="inline-flex items-center"><img src="/images/combay-logo.svg" alt="Combay" className="h-12 w-auto max-w-[230px] object-contain" /></Link></div><div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-7 shadow-sm">{verificationStep ? <div className="mx-auto max-w-md"><h1 className="font-display font-800 text-navy-900 text-xl mb-1">Verify your email</h1><p className="text-gray-500 text-sm mb-5">Enter the 6-digit code sent to <strong>{verifyEmail}</strong>.</p>{error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5 mb-4">{error}</div>}{message && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-3 py-2.5 mb-4">{message}</div>}<form onSubmit={verifyCode} className="space-y-5"><div className="mx-auto grid max-w-[300px] grid-cols-6 gap-1.5 sm:gap-2">{code.map((digit, index) => <input key={index} ref={(node) => { inputRefs.current[index] = node; }} value={digit} onChange={(event) => updateCode(index, event.target.value)} onKeyDown={(event) => handleCodeKey(index, event)} inputMode="numeric" maxLength={1} className="h-11 sm:h-12 rounded-lg border border-gray-300 text-center text-lg font-display font-900 text-navy-950 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none" aria-label={`Verification digit ${index + 1}`} />)}</div><button type="submit" disabled={loading || code.join("").length !== 6} className="btn-primary w-full justify-center py-2.5 disabled:opacity-50">{loading ? "Verifying..." : "Verify email →"}</button></form><div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-sm"><button type="button" onClick={resendCode} disabled={resending} className="text-accent hover:text-accent-dark font-display font-700 disabled:opacity-50">{resending ? "Sending..." : "Resend code"}</button><button type="button" onClick={() => { setVerifyEmail(""); setCode(["", "", "", "", "", ""]); setError(""); setMessage(""); }} className="text-gray-500 hover:text-navy-950">Use a different email</button></div></div> : <><h1 className="font-display font-800 text-navy-900 text-2xl mb-1">Create customer account</h1><p className="text-gray-400 text-sm mb-6">Register to track orders, manage returns and view support tickets.</p>{error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}{message && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-4">{message}</div>}<form onSubmit={handleSubmit} className="space-y-6"><div><label className="label">Register as</label><div className="flex gap-2"><button type="button" onClick={() => setAccountType("individual")} className={`font-display font-600 text-sm px-4 py-2 rounded-md border ${accountType === "individual" ? "bg-navy-950 text-white border-navy-950" : "border-gray-200 text-gray-600"}`}>Individual</button><button type="button" onClick={() => setAccountType("company")} className={`font-display font-600 text-sm px-4 py-2 rounded-md border ${accountType === "company" ? "bg-navy-950 text-white border-navy-950" : "border-gray-200 text-gray-600"}`}>Company</button></div></div><section className="space-y-4"><h2 className="font-display font-800 text-navy-950 text-lg">Your details</h2><div className="grid sm:grid-cols-2 gap-4"><div><label className="label">Full name *</label><input required name="name" className="input" /></div><div><label className="label">{isCompany ? "Work email *" : "Email *"}</label><input required name="email" type="email" className="input" value={workEmail} onChange={(event) => { setWorkEmail(event.target.value); if (sameAsMine) setCompanyEmail(event.target.value); }} /></div><div className="sm:col-span-2"><label className="label">Phone number *</label><div className="flex"><select name="phoneCode" className="input rounded-r-none w-56 flex-shrink-0 border-r-0" defaultValue="+44">{PHONE_CODES.map((item) => <option key={`${item.country}-${item.code}`} value={item.code}>{item.label}</option>)}</select><input required name="phone" type="tel" className="input rounded-l-none" placeholder="7xxx xxxxxx" /></div></div>{isCompany && <div className="sm:col-span-2"><label className="label">Designation</label><input name="designation" className="input" placeholder="e.g. Procurement Manager, Director, Engineer" /></div>}</div>{isCompany && <p className="text-xs text-gray-500">Company registrations require a work email address. Personal email providers such as Gmail, Outlook, Proton, Yahoo and similar addresses are not accepted for company accounts.</p>}</section>{isCompany && <section className="space-y-4 border-t border-gray-100 pt-6"><h2 className="font-display font-800 text-navy-950 text-lg">Company details</h2><div className="grid sm:grid-cols-2 gap-4"><div><label className="label">Company name *</label><input required name="company" className="input" /></div><div><div className="flex items-center justify-between gap-3 mb-1.5"><label className="label mb-0">Company email *</label><label className="text-xs text-gray-500 flex items-center gap-1"><input type="checkbox" checked={sameAsMine} onChange={(event) => { setSameAsMine(event.target.checked); if (event.target.checked) setCompanyEmail(workEmail); }} /> Same as mine</label></div><input required name="companyEmail" type="email" className="input" value={sameAsMine ? workEmail : companyEmail} disabled={sameAsMine} onChange={(event) => setCompanyEmail(event.target.value)} /></div><div><label className="label">Company number</label><input name="companyNumber" className="input" /></div><div><label className="label">VAT number</label><input name="vatNumber" className="input" /></div></div></section>}<section className="grid sm:grid-cols-2 gap-4 border-t border-gray-100 pt-6"><div><label className="label">Password *</label><input required name="password" type="password" minLength={8} className="input" /></div><div><label className="label">Re-enter password *</label><input required name="confirmPassword" type="password" minLength={8} className="input" /></div></section><button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">{loading ? "Creating..." : "Create account →"}</button></form><p className="text-xs text-gray-400 text-center mt-4">By registering you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy-policy" className="underline">Privacy Policy</Link>.</p><p className="text-center text-sm text-gray-500 mt-3">Have an account? <Link href="/portal/login" className="text-accent hover:text-accent-dark font-600">Sign in</Link></p></>}</div></div></div>;
}


export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>;
}
