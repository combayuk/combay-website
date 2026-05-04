import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.customer?.email || !Array.isArray(body?.lines) || body.lines.length === 0) {
    return NextResponse.json({ ok: false, error: "Missing checkout details." }, { status: 400 });
  }

  const reference = `CB-ORDER-${Date.now().toString(36).toUpperCase()}`;
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

  return NextResponse.json({
    ok: true,
    reference,
    status: stripeConfigured ? "payment-pending" : "unpaid-checkout-request",
    paymentMode: stripeConfigured ? "stripe-ready" : "stripe-not-configured",
    message: stripeConfigured
      ? "Stripe configuration detected. Payment intent wiring is ready for the next step."
      : "Stripe is not configured. No payment has been captured.",
  });
}
