"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Lock, AlertTriangle } from "lucide-react";
import AccountBenefitBanner from "@/components/commerce/AccountBenefitBanner";
import CountryCombobox from "@/components/cart/CountryCombobox";
import { clearCart, formatCurrency, getCartSummary, readCartLines, type CartLine } from "@/lib/cart";
import { countryNameFromCode, normaliseCountryCode, type CountryOption } from "@/lib/countries";

type SavedAddress = { id: string; label?: string | null; fullName?: string | null; company?: string | null; phone?: string | null; address1: string; address2?: string | null; city: string; postcode: string; country: string; isPrimary: boolean; };

type LiveShippingEstimate = { cost: number | null; label: string; dispatchLabel: string; deliveryLabel: string; manualQuoteRequired: boolean; collectionOnly: boolean; policyName: string; zoneName: string; };

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
  countryCode: string;
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
  countryCode: "GB",
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
  const [liveShipping, setLiveShipping] = useState<LiveShippingEstimate | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);

  useEffect(() => {
    setLines(readCartLines());
    fetch("/api/checkout/session", { cache: "no-store" }).then((r) => r.json()).then((data) => {
      if (!data?.ok || !data.signedIn) return;
      const addresses: SavedAddress[] = Array.isArray(data.addresses) ? data.addresses : [];
      const primary = addresses.find((a) => a.isPrimary) || addresses[0] || null;
      setSavedAddresses(addresses);
      if (primary) setSelectedAddressId(primary.id);
      const primaryCountryCode = normaliseCountryCode(primary?.country || "GB") || "GB";
      setForm((cur) => ({
        ...cur,
        fullName: data.customer?.fullName || primary?.fullName || cur.fullName,
        email: data.customer?.email || cur.email,
        phone: data.customer?.phone || primary?.phone || cur.phone,
        company: data.customer?.company || primary?.company || cur.company,
        address1: primary?.address1 || cur.address1,
        address2: primary?.address2 || cur.address2,
        city: primary?.city || cur.city,
        postcode: primary?.postcode || cur.postcode,
        countryCode: primaryCountryCode,
        country: countryNameFromCode(primaryCountryCode, primary?.country || cur.country),
      }));
    }).catch(() => undefined);
  }, []);

  const summary = useMemo(() => getCartSummary(lines), [lines]);

  useEffect(() => {
    if (!lines.length) {
      setLiveShipping(null);
      return;
    }
    let active = true;
    setShippingLoading(true);
    setPromo(null);
    fetch("/api/shipping/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: form.country, countryCode: form.countryCode, lines: lines.map((line) => ({ sku: line.sku, qty: line.qty })) }),
    })
      .then((response) => response.json())
      .then((data) => { if (active && data?.ok && data.shipping) setLiveShipping(data.shipping); })
      .catch(() => { if (active) setLiveShipping(null); })
      .finally(() => { if (active) setShippingLoading(false); });
    return () => { active = false; };
  }, [form.country, form.countryCode, lines]);

  const activeShipping = liveShipping || summary.shipping;
  const displayShipping = activeShipping.manualQuoteRequired ? 0 : Number(activeShipping.cost || 0);
  const displayVat = promo ? promo.vat : Number(((summary.subtotal + displayShipping) * 0.2).toFixed(2));
  const displayDiscount = promo ? promo.discount + promo.shippingDiscount : 0;
  const displayTotal = promo ? promo.total : Number((summary.subtotal + displayShipping + displayVat).toFixed(2));
  const stripeConfigured = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

  function update<K extends keyof CheckoutForm>(key: K, value: CheckoutForm[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function updateCountry(country: CountryOption) { setForm((current) => ({ ...current, country: country.name, countryCode: country.code })); }
  function invalidateCountry() { setForm((current) => ({ ...current, country: "", countryCode: "" })); }
  function useSavedAddress(id: string) {
    setSelectedAddressId(id);
    const a = savedAddresses.find((item) => item.id === id);
    if (!a) return;
    const countryCode = normaliseCountryCode(a.country) || "GB";
    setForm((cur) => ({
      ...cur,
      fullName: a.fullName || cur.fullName,
      phone: a.phone || cur.phone,
      company: a.company || cur.company,
      address1: a.address1,
      address2: a.address2 || "",
      city: a.city,
      postcode: a.postcode,
      countryCode,
      country: countryNameFromCode(countryCode, a.country || "United Kingdom"),
    }));
  }

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
        body: JSON.stringify({ code: promoCode, subtotal: summary.subtotal, shipping: displayShipping, productIds: summary.lines.map(({ product }) => product.id).filter(Boolean) }),
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

    if (!normaliseCountryCode(form.countryCode)) {
      setError("Select a valid delivery country from the dropdown before checkout.");
      return;
    }

    if (summary.hasUnavailableItems || activeShipping.manualQuoteRequired) {
      setError("One or more items require stock, price or manual shipping quote confirmation before checkout.");
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
            shipping: displayShipping,
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
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <CheckCircle2 size={42} className="text-green-600 mx-auto mb-4" />
          <h1 className="font-display font-900 text-2xl text-navy-950 mb-2">Checkout request created</h1>
          <p className="text-sm text-gray-600 mb-4">Reference: <span className="font-mono text-navy-950">{result.reference}</span></p>
          {result.paymentMode === "stripe-not-configured" ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-5">
              Stripe is not connected yet, so no payment has been taken. Your checkout request has been recorded and Combay will confirm payment or proforma details separately.
            </div>
          ) : null}
          <Link href="/shop" className="btn-primary py-2 text-xs">Back to shop</Link>
        </div>
      </div>
    );
  }

  if (summary.lines.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <h1 className="font-display font-900 text-2xl text-navy-950 mb-2">No items to checkout</h1>
          <p className="text-sm text-gray-500 mb-5">Add stocked products to your cart before starting checkout.</p>
          <Link href="/shop" className="btn-primary py-2 text-xs">Browse inventory</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-navy-950 text-white py-7">
        <div className="mx-auto max-w-7xl px-4">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-accent">Secure checkout</p>
          <h1 className="font-display text-3xl font-900">Delivery and payment</h1>
          <p className="mt-1 text-sm text-gray-400">Enter delivery details and continue to secure Stripe card payment when configured.</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 font-900">1. Details</span>
            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 font-900">2. Review</span>
            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 font-900">3. Secure payment</span>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <AccountBenefitBanner />
          {error && (
            <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle size={16} className="mt-0.5" /> {error}
            </div>
          )}

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 font-display text-lg font-900 text-navy-950">Contact details</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block"><span className="label">Full name *</span><input required className="input py-2 text-sm" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} /></label>
              <label className="block"><span className="label">Email *</span><input required type="email" className="input py-2 text-sm" value={form.email} onChange={(e) => update("email", e.target.value)} /></label>
              <label className="block"><span className="label">Phone</span><input className="input py-2 text-sm" value={form.phone} onChange={(e) => update("phone", e.target.value)} /></label>
              <label className="block"><span className="label">Company</span><input className="input py-2 text-sm" value={form.company} onChange={(e) => update("company", e.target.value)} /></label>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 font-display text-lg font-900 text-navy-950">Delivery address</h2>
            {savedAddresses.length > 0 ? <label className="mb-3 block"><span className="label">Use saved address</span><p className="mb-1.5 text-xs text-gray-400">Primary address is selected automatically when available.</p><select className="input py-2 text-sm" value={selectedAddressId} onChange={(e) => useSavedAddress(e.target.value)}><option value="">Enter a different address</option>{savedAddresses.map((address) => <option key={address.id} value={address.id}>{address.isPrimary ? "Primary — " : ""}{address.label || address.address1}, {address.city}, {address.postcode}</option>)}</select></label> : null}
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block md:col-span-2"><span className="label">Address line 1 *</span><input required className="input py-2 text-sm" value={form.address1} onChange={(e) => update("address1", e.target.value)} /></label>
              <label className="block md:col-span-2"><span className="label">Address line 2</span><input className="input py-2 text-sm" value={form.address2} onChange={(e) => update("address2", e.target.value)} /></label>
              <label className="block"><span className="label">Town / city *</span><input required className="input py-2 text-sm" value={form.city} onChange={(e) => update("city", e.target.value)} /></label>
              <label className="block"><span className="label">Postcode *</span><input required className="input py-2 text-sm" value={form.postcode} onChange={(e) => update("postcode", e.target.value)} /></label>
              <div className="block md:col-span-2">
                <CountryCombobox
                  required
                  valueCode={form.countryCode}
                  valueName={form.country}
                  onChange={updateCountry}
                  onInvalidInput={invalidateCountry}
                  error={!normaliseCountryCode(form.countryCode) ? "Select a valid country from the dropdown." : null}
                />
              </div>
              <label className="block md:col-span-2"><span className="label">Delivery notes</span><textarea className="textarea min-h-[90px] py-2 text-sm" value={form.notes} onChange={(e) => update("notes", e.target.value)} /></label>
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:sticky lg:top-24">
          <h2 className="mb-3 font-display text-lg font-900 text-navy-950">Summary</h2>
          <div className="mb-4 space-y-2.5">
            {summary.lines.map(({ product, variant, qty, lineTotal }) => (
              <div key={`${product.sku}-${variant?.id || variant?.sku || "base"}`} className="flex justify-between gap-3 text-sm">
                <div className="min-w-0"><p className="truncate font-display font-900 text-navy-950 leading-snug">{product.sku}</p><p className="truncate text-xs text-gray-500">Qty {qty}{variant ? ` · ${variant.label}` : ""}</p></div>
                <span className="shrink-0 font-display font-800 text-navy-950">{formatCurrency(lineTotal)}</span>
              </div>
            ))}
          </div>
          <div className="mb-4 space-y-2 border-t border-gray-200 pt-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(summary.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{activeShipping.manualQuoteRequired ? "Quote required" : formatCurrency(displayShipping)}</span></div>
            {displayDiscount > 0 ? <div className="flex justify-between text-green-700"><span>Promotion discount</span><span>-{formatCurrency(displayDiscount)}</span></div> : null}
            <div className="flex justify-between"><span className="text-gray-500">VAT estimate</span><span>{formatCurrency(displayVat)}</span></div>
            <div className="flex justify-between font-display text-lg font-900 text-navy-950"><span>Total</span><span>{formatCurrency(displayTotal)}</span></div>
          </div>

          <div className="mb-4 border-t border-gray-200 pt-3">
            <label className="block"><span className="label">Promotion code</span>
              <div className="flex gap-2">
                <input className="input py-2 text-sm uppercase" value={promoCode} onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromo(null); }} placeholder="ENTER CODE" />
                <button type="button" onClick={applyPromotion} disabled={promoLoading} className="btn-secondary whitespace-nowrap py-2 text-xs">{promoLoading ? "Checking..." : "Apply"}</button>
              </div>
            </label>
            {promoMessage ? <p className={`text-xs mt-2 ${promo ? "text-green-700" : "text-red-600"}`}>{promoMessage}</p> : null}
          </div>
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
            <div className="mb-2 flex gap-2"><Lock size={14} className="mt-0.5 text-gray-400" /><span>{stripeConfigured ? "Stripe card checkout is enabled. You will be redirected to Stripe to complete payment." : "Stripe key not configured. This submit will create an unpaid checkout request only."}</span></div>
            <p className="font-display font-900 text-navy-950">{shippingLoading ? "Updating shipping estimate…" : activeShipping.label}</p>
            <p>Destination zone: {activeShipping.zoneName || "UK"} · Dispatch: {activeShipping.dispatchLabel} · Estimated delivery: {activeShipping.deliveryLabel}</p>
          </div>
          <button disabled={loading || summary.hasUnavailableItems || activeShipping.manualQuoteRequired} type="submit" className="btn-primary w-full py-2.5 text-sm">
            {loading ? "Submitting..." : stripeConfigured ? "Continue to secure card payment" : "Create unpaid checkout request"}
          </button>
          <Link href="/cart" className="btn-secondary mt-2 w-full py-2 text-xs">Back to cart</Link>
        </aside>
      </form>
    </div>
  );
}
