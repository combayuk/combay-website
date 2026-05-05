"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PHONE_CODES } from "@/lib/portal";

const PERSONAL_EMAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
  "zoho.com",
  "gmx.com",
  "mail.com",
  "yandex.com",
];

function isPersonalEmail(email: string) {
  const domain = email.toLowerCase().split("@").pop() || "";
  return PERSONAL_EMAIL_DOMAINS.includes(domain);
}

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accountType, setAccountType] = useState<"individual" | "company">("individual");
  const [workEmail, setWorkEmail] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [sameAsMine, setSameAsMine] = useState(true);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim().toLowerCase();
    const companyEmailValue = sameAsMine ? email : String(fd.get("companyEmail") || "").trim().toLowerCase();
    const password = String(fd.get("password") || "");
    const confirmPassword = String(fd.get("confirmPassword") || "");

    if (password !== confirmPassword) {
      setLoading(false);
      setError("Password and re-entered password do not match.");
      return;
    }

    if (accountType === "company" && isPersonalEmail(email)) {
      setLoading(false);
      setError("Company accounts must use a work email address. Please use your business domain email rather than Gmail, Outlook, Proton or other personal email providers.");
      return;
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountType,
        name: fd.get("name"),
        email,
        phoneCode: fd.get("phoneCode"),
        phone: fd.get("phone"),
        designation: fd.get("designation"),
        company: fd.get("company"),
        companyEmail: companyEmailValue,
        companyNumber: fd.get("companyNumber"),
        vatNumber: fd.get("vatNumber"),
        password,
        confirmPassword,
      }),
    });
    setLoading(false);
    if (res.ok) router.push("/portal/login?registered=1");
    else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Registration failed");
    }
  }

  const isCompany = accountType === "company";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-8 h-8 bg-navy-900 rounded flex items-center justify-center"><span className="text-accent font-display font-900 text-sm">C</span></div>
            <span className="font-display font-800 text-navy-900 text-xl">COMBAY</span>
          </Link>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <h1 className="font-display font-800 text-navy-900 text-2xl mb-1">Create customer account</h1>
          <p className="text-gray-400 text-sm mb-6">Register to track orders, manage returns and view support tickets.</p>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="label">Register as</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setAccountType("individual")} className={`font-display font-600 text-sm px-4 py-2 rounded-md border ${accountType === "individual" ? "bg-navy-950 text-white border-navy-950" : "border-gray-200 text-gray-600"}`}>Individual</button>
                <button type="button" onClick={() => setAccountType("company")} className={`font-display font-600 text-sm px-4 py-2 rounded-md border ${accountType === "company" ? "bg-navy-950 text-white border-navy-950" : "border-gray-200 text-gray-600"}`}>Company</button>
              </div>
            </div>

            <section className="space-y-4">
              <h2 className="font-display font-800 text-navy-950 text-lg">Your details</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="label">Full name *</label><input required name="name" className="input" /></div>
                <div><label className="label">{isCompany ? "Work email *" : "Email *"}</label><input required name="email" type="email" className="input" value={workEmail} onChange={(event) => { setWorkEmail(event.target.value); if (sameAsMine) setCompanyEmail(event.target.value); }} /></div>
                <div className="sm:col-span-2"><label className="label">Phone number *</label><div className="flex"><select name="phoneCode" className="input rounded-r-none w-56 flex-shrink-0 border-r-0" defaultValue="+44">{PHONE_CODES.map((item) => <option key={`${item.country}-${item.code}`} value={item.code}>{item.label}</option>)}</select><input required name="phone" type="tel" className="input rounded-l-none" placeholder="7xxx xxxxxx" /></div></div>
                {isCompany && <div className="sm:col-span-2"><label className="label">Designation</label><input name="designation" className="input" placeholder="e.g. Procurement Manager, Director, Engineer" /></div>}
              </div>
              {isCompany && <p className="text-xs text-gray-500">Company registrations require a work email address. Personal email providers such as Gmail, Outlook, Proton, Yahoo and similar addresses are not accepted for company accounts.</p>}
            </section>

            {isCompany && (
              <section className="space-y-4 border-t border-gray-100 pt-6">
                <h2 className="font-display font-800 text-navy-950 text-lg">Company details</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><label className="label">Company name *</label><input required name="company" className="input" /></div>
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <label className="label mb-0">Company email *</label>
                      <label className="text-xs text-gray-500 flex items-center gap-1"><input type="checkbox" checked={sameAsMine} onChange={(event) => { setSameAsMine(event.target.checked); if (event.target.checked) setCompanyEmail(workEmail); }} /> Same as mine</label>
                    </div>
                    <input required name="companyEmail" type="email" className="input" value={sameAsMine ? workEmail : companyEmail} disabled={sameAsMine} onChange={(event) => setCompanyEmail(event.target.value)} />
                  </div>
                  <div><label className="label">Company number</label><input name="companyNumber" className="input" /></div>
                  <div><label className="label">VAT number</label><input name="vatNumber" className="input" /></div>
                </div>
              </section>
            )}

            <section className="grid sm:grid-cols-2 gap-4 border-t border-gray-100 pt-6">
              <div><label className="label">Password *</label><input required name="password" type="password" minLength={8} className="input" /></div>
              <div><label className="label">Re-enter password *</label><input required name="confirmPassword" type="password" minLength={8} className="input" /></div>
            </section>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">{loading ? "Creating..." : "Create account →"}</button>
          </form>
          <p className="text-xs text-gray-400 text-center mt-4">By registering you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy-policy" className="underline">Privacy Policy</Link>.</p>
          <p className="text-center text-sm text-gray-500 mt-3">Have an account? <Link href="/portal/login" className="text-accent hover:text-accent-dark font-600">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
