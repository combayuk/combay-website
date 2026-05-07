"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Lock, AlertTriangle } from "lucide-react";
import { clearCart, formatCurrency, getCartSummary, readCartLines, type CartLine } from "@/lib/cart";

type SavedAddress = { id: string; label?: string | null; fullName?: string | null; company?: string | null; phone?: string | null; address1: string; address2?: string | null; city: string; postcode: string; country: string; isPrimary: boolean; };

type CheckoutForm = {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  postcode: string;
  country: string;
  notes: string;
};

const initialForm: CheckoutForm = {
  fullName: "",
  email: "",
  phone: "",
  company: "",
  address1: "",
  address2: "",
  city: "",
  postcode: "",
  country: "United Kingdom",
  notes: "",
};

export default function CheckoutClient() {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [form, setForm] = useState<CheckoutForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ reference: string; paymentMode: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promo, setPromo] = useState<{ code: string; name: string; discount: number; shippingDiscount: number; vat: number; total: number } | null>(null);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");

  useEffect(() => {
    setLines(readCartLines());
    fetch("/api/checkout/session", { cache: "no-store" }).then((r) => r.json()).then((data) => {
      if (!data?.ok || !data.signedIn) return;
      const addresses: SavedAddress[] = Array.isArray(data.addresses) ? data.addresses : [];
      const primary = addresses.find((a) => a.isPrimary) || addresses[0] || null;
      setSavedAddresses(addresses);
      if (primary) setSelectedAddressId(primary.id);
      setForm((cur) => ({ ...cur, fullName: data.customer?.fullName || primary?.fullName || cur.fullName, email: data.customer?.email || cur.email, phone: data.customer?.phone || primary?.phone || cur.phone, company: data.customer?.company || primary?.company || cur.company, address1: primary?.address1 || cur.address1, address2: primary?.address2 || cur.address2, city: primary?.city || cur.city, postcode: primary?.postcode || cur.postcode, country: primary?.country || cur.country }));
    }).catch(() => undefined);
  }, []);

  const summary = useMemo(() => getCartSummary(lines), [lines]);
  const displayVat = promo ? promo.vat : summary.vat;
  const displayDiscount = promo ? promo.discount + promo.shippingDiscount : 0;
  const displayTotal = promo ? promo.total : summary.total;
  const stripeConfigured = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

  function update<K extends keyof CheckoutForm>(key: K, value: CheckoutForm[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function useSavedAddress(id: string) { setSelectedAddressId(id); const a = savedAddresses.find((item) => item.id === id); if (!a) return; setForm((cur) => ({ ...cur, fullName: a.fullName || cur.fullName, phone: a.phone || cur.phone, company: a.company || cur.company, address1: a.address1, address2: a.address2 || "", city: a.city, postcode: a.postcode, country: a.country || "United Kingdom" })); }

  async function applyPromotion() {
    setPromo(null);
    setPromoMessage(null);
    if (!promoCode.trim()) {
      setPromoMessage("Enter a promotion code.");
      return;
    }

    setPromoLoading(true);
    try {
      const response = await fetch("/api/promotions/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode, subtotal: summary.subtotal, shipping: 0, productIds: summary.lines.map(({ product }) => product.id).filter(Boolean) }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) throw new Error(data?.error || "Promotion code could not be applied.");
      setPromo({
        code: data.code,
        name: data.name,
        discount: Number(data.discount || 0),
        shippingDiscount: Number(data.shippingDiscount || 0),
        vat: Number(data.vat || 0),
        total: Number(data.total || 0),
      });
      setPromoMessage(`${data.code} applied.`);
    } catch (err) {
      setPromoMessage(err instanceof Error ? err.message : "Promotion code could not be applied.");
    } finally {
      setPromoLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (summary.lines.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    if (summary.hasUnavailableItems) {
      setError("One or more items require quote confirmation before checkout.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: form,
          lines: summary.lines.map(({ product, variant, qty, unitPrice, lineTotal }) => ({
            sku: product.sku,
            title: product.title,
            qty,
            unitPrice,
            lineTotal,
            variantId: variant?.id,
            variantSku: variant?.sku,
            variationSku: variant?.sku,
            variationLabel: variant?.label,
          })),
          promotionCode: promo?.code || promoCode.trim() || undefined,
          totals: {
            subtotal: summary.subtotal,
            discount: displayDiscount,
            vat: displayVat,
            total: displayTotal,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Checkout request failed.");
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      setResult({ reference: data.reference, paymentMode: data.paymentMode });
      clearCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout request failed.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="bg-gray-50 min-h-screen py-14">
        <div className="max-w-2xl mx-auto px-4 bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <CheckCircle2 size={42} className="text-green-600 mx-auto mb-4" />
          <h1 className="font-display font-900 text-2xl text-navy-950 mb-2">Checkout request created</h1>
          <p className="text-sm text-gray-600 mb-4">Reference: <span className="font-mono text-navy-950">{result.reference}</span></p>
          {result.paymentMode === "stripe-not-configured" ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-5">
              Stripe is not connected yet, so no payment was taken. This has been recorded as an unpaid checkout request for Phase 3 testing.
            </div>
          ) : null}
          <Link href="/shop" className="btn-primary">Back to shop</Link>
        </div>
      </div>
    );
  }

  if (summary.lines.length === 0) {
    return (
      <div className="bg-gray-50 min-h-screen py-14">
        <div className="max-w-2xl mx-auto px-4 text-center bg-white border border-gray-200 rounded-2xl p-8">
          <h1 className="font-display font-900 text-2xl text-navy-950 mb-2">No items to checkout</h1>
          <p className="text-sm text-gray-500 mb-5">Add stocked products to your cart before starting checkout.</p>
          <Link href="/shop" className="btn-primary">Browse inventory</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-navy-950 text-white py-10">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-mono text-xs tracking-widest uppercase text-accent mb-2">Secure checkout</p>
          <h1 className="font-display font-900 text-3xl lg:text-4xl">Delivery and payment</h1>
          <p className="text-gray-400 text-sm mt-2">Enter delivery details and continue to secure Stripe card payment when configured.</p>
        </div>
      </div>

      <form onSubmit={submit} className="max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-2 text-sm text-red-700">
              <AlertTriangle size={16} className="mt-0.5" /> {error}
            </div>
          )}

          <section className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="font-display font-800 text-xl text-navy-950 mb-4">Contact details</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <label className="block"><span className="label">Full name *</span><input required className="input" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} /></label>
              <label className="block"><span className="label">Email *</span><input required type="email" className="input" value={form.email} onChange={(e) => update("email", e.target.value)} /></label>
              <label className="block"><span className="label">Phone</span><input className="input" value={form.phone} onChange={(e) => update("phone", e.target.value)} /></label>
              <label className="block"><span className="label">Company</span><input className="input" value={form.company} onChange={(e) => update("company", e.target.value)} /></label>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="font-display font-800 text-xl text-navy-950 mb-4">Delivery address</h2>
            {savedAddresses.length > 0 ? <label className="block mb-4"><span className="label">Use saved address</span><select className="input" value={selectedAddressId} onChange={(e) => useSavedAddress(e.target.value)}><option value="">Enter a different address</option>{savedAddresses.map((address) => <option key={address.id} value={address.id}>{address.isPrimary ? "Primary — " : ""}{address.label || address.address1}, {address.city}, {address.postcode}</option>)}</select></label> : null}
            <div className="grid md:grid-cols-2 gap-4">
              <label className="block md:col-span-2"><span className="label">Address line 1 *</span><input required className="input" value={form.address1} onChange={(e) => update("address1", e.target.value)} /></label>
              <label className="block md:col-span-2"><span className="label">Address line 2</span><input className="input" value={form.address2} onChange={(e) => update("address2", e.target.value)} /></label>
              <label className="block"><span className="label">Town / city *</span><input required className="input" value={form.city} onChange={(e) => update("city", e.target.value)} /></label>
              <label className="block"><span className="label">Postcode *</span><input required className="input" value={form.postcode} onChange={(e) => update("postcode", e.target.value)} /></label>
              <label className="block md:col-span-2"><span className="label">Country *</span><input required className="input" value={form.country} onChange={(e) => update("country", e.target.value)} /></label>
              <label className="block md:col-span-2"><span className="label">Delivery notes</span><textarea className="textarea min-h-[100px]" value={form.notes} onChange={(e) => update("notes", e.target.value)} /></label>
            </div>
          </section>
        </div>

        <aside className="bg-white border border-gray-200 rounded-2xl p-5 h-fit sticky top-24">
          <h2 className="font-display font-800 text-xl text-navy-950 mb-4">Summary</h2>
          <div className="space-y-3 mb-4">
            {summary.lines.map(({ product, variant, qty, lineTotal }) => (
              <div key={`${product.sku}-${variant?.id || variant?.sku || "base"}`} className="flex justify-between gap-3 text-sm">
                <div><p className="font-display font-700 text-navy-950 leading-snug">{product.sku}</p><p className="text-xs text-gray-500">Qty {qty}{variant ? ` · ${variant.label}` : ""}</p></div>
                <span className="font-display font-700 text-navy-950">{formatCurrency(lineTotal)}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2 text-sm border-t border-gray-200 pt-3 mb-4">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(summary.subtotal)}</span></div>
            {displayDiscount > 0 ? <div className="flex justify-between text-green-700"><span>Promotion discount</span><span>-{formatCurrency(displayDiscount)}</span></div> : null}
            <div className="flex justify-between"><span className="text-gray-500">VAT estimate</span><span>{formatCurrency(displayVat)}</span></div>
            <div className="flex justify-between font-display font-900 text-lg text-navy-950"><span>Total</span><span>{formatCurrency(displayTotal)}</span></div>
          </div>

          <div className="border-t border-gray-200 pt-3 mb-4">
            <label className="block"><span className="label">Promotion code</span>
              <div className="flex gap-2">
                <input className="input uppercase" value={promoCode} onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromo(null); }} placeholder="ENTER CODE" />
                <button type="button" onClick={applyPromotion} disabled={promoLoading} className="btn-secondary whitespace-nowrap">{promoLoading ? "Checking..." : "Apply"}</button>
              </div>
            </label>
            {promoMessage ? <p className={`text-xs mt-2 ${promo ? "text-green-700" : "text-red-600"}`}>{promoMessage}</p> : null}
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-600 mb-4 flex gap-2">
            <Lock size={14} className="text-gray-400 mt-0.5" />
            {stripeConfigured ? "Stripe card checkout is enabled. You will be redirected to Stripe to complete payment." : "Stripe key not configured. This submit will create an unpaid checkout request only."}
          </div>
          <button disabled={loading || summary.hasUnavailableItems} type="submit" className="btn-primary w-full py-3">
            {loading ? "Submitting..." : stripeConfigured ? "Continue to secure card payment" : "Create unpaid checkout request"}
          </button>
          <Link href="/cart" className="btn-secondary w-full mt-2">Back to cart</Link>
        </aside>
      </form>
    </div>
  );
}
