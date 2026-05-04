"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { clearCart, formatCurrency } from "@/lib/cart";

type SessionResult = {
  ok: boolean;
  error?: string;
  session?: {
    id: string;
    paymentStatus: string;
    status: string | null;
    amountTotal: number | null;
    currency: string | null;
    customerEmail?: string | null;
    orderNumber?: string | null;
  };
};

export default function CheckoutSuccessClient() {
  const [result, setResult] = useState<SessionResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    if (!sessionId) {
      setResult({ ok: false, error: "Missing Stripe session ID." });
      setLoading(false);
      return;
    }

    fetch(`/api/checkout/session?session_id=${encodeURIComponent(sessionId)}`)
      .then((response) => response.json())
      .then((data) => {
        setResult(data);
        if (data?.ok && data?.session?.paymentStatus === "paid") clearCart();
      })
      .catch((error) => setResult({ ok: false, error: error instanceof Error ? error.message : "Could not verify payment." }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen py-14">
        <div className="max-w-2xl mx-auto px-4 bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <Loader2 size={36} className="animate-spin text-accent mx-auto mb-4" />
          <h1 className="font-display font-900 text-2xl text-navy-950 mb-2">Confirming payment</h1>
          <p className="text-sm text-gray-500">Please wait while we verify the Stripe checkout session.</p>
        </div>
      </div>
    );
  }

  if (!result?.ok) {
    return (
      <div className="bg-gray-50 min-h-screen py-14">
        <div className="max-w-2xl mx-auto px-4 bg-white border border-red-200 rounded-2xl p-8 text-center">
          <AlertTriangle size={38} className="text-red-500 mx-auto mb-4" />
          <h1 className="font-display font-900 text-2xl text-navy-950 mb-2">Payment verification issue</h1>
          <p className="text-sm text-gray-600 mb-5">{result?.error || "Could not verify the payment session."}</p>
          <Link href="/cart" className="btn-primary">Return to cart</Link>
        </div>
      </div>
    );
  }

  const amount = result.session?.amountTotal ? formatCurrency(result.session.amountTotal / 100) : "—";
  const paid = result.session?.paymentStatus === "paid";

  return (
    <div className="bg-gray-50 min-h-screen py-14">
      <div className="max-w-2xl mx-auto px-4 bg-white border border-gray-200 rounded-2xl p-8 text-center">
        <CheckCircle2 size={44} className={paid ? "text-green-600 mx-auto mb-4" : "text-amber-500 mx-auto mb-4"} />
        <h1 className="font-display font-900 text-2xl text-navy-950 mb-2">{paid ? "Payment successful" : "Checkout session received"}</h1>
        <p className="text-sm text-gray-600 mb-4">
          {paid ? "Your payment has been received and your order is now recorded." : "Stripe returned this session, but payment is not marked as paid yet."}
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-left text-sm mb-5 space-y-1">
          <p><span className="text-gray-500">Order:</span> <span className="font-mono text-navy-950">{result.session?.orderNumber || "—"}</span></p>
          <p><span className="text-gray-500">Amount:</span> <span className="font-display font-700 text-navy-950">{amount}</span></p>
          <p><span className="text-gray-500">Payment status:</span> <span className="font-display font-700 text-navy-950">{result.session?.paymentStatus || "—"}</span></p>
          {result.session?.customerEmail && <p><span className="text-gray-500">Email:</span> {result.session.customerEmail}</p>}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link href="/portal/orders" className="btn-primary">View orders</Link>
          <Link href="/shop" className="btn-secondary">Continue shopping</Link>
        </div>
      </div>
    </div>
  );
}
