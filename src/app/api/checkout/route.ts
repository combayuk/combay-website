import { NextResponse } from "next/server";
import { prisma, withDatabase } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.customer?.email || !Array.isArray(body?.lines) || body.lines.length === 0) {
    return NextResponse.json({ ok: false, error: "Missing checkout details." }, { status: 400 });
  }

  const reference = `CB-ORDER-${Date.now().toString(36).toUpperCase()}`;
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
  const subtotal = Number(body.summary?.subtotal ?? body.lines.reduce((sum: number, line: any) => sum + Number(line.price || 0) * Number(line.quantity || 1), 0));
  const tax = Number(body.summary?.tax ?? subtotal * 0.2);
  const shipping = Number(body.summary?.shipping ?? 0);
  const total = Number(body.summary?.total ?? subtotal + tax + shipping);

  const dbResult = await withDatabase(async () => prisma.order.create({
    data: {
      orderNumber: reference,
      customerName: String(body.customer.name || body.customer.email),
      customerEmail: String(body.customer.email),
      customerPhone: body.customer.phone ? String(body.customer.phone) : null,
      company: body.customer.company ? String(body.customer.company) : null,
      status: "PENDING_PAYMENT",
      paymentStatus: "UNPAID",
      subtotal,
      tax,
      shipping,
      total,
      shippingAddress: body.address ?? {},
      notes: "Created by Phase 7 checkout persistence foundation. Stripe capture is not active yet.",
    },
  }));

  return NextResponse.json({
    ok: true,
    reference,
    mode: dbResult.ok ? "database" : "preview",
    persistence: dbResult.ok ? "saved" : "not-saved",
    persistenceMessage: dbResult.ok ? "Order saved to PostgreSQL." : dbResult.reason,
    status: stripeConfigured ? "payment-pending" : "unpaid-checkout-request",
    paymentMode: stripeConfigured ? "stripe-ready" : "stripe-not-configured",
    message: stripeConfigured
      ? "Stripe configuration detected. Payment intent wiring is ready for the next step."
      : "Stripe is not configured. No payment has been captured.",
    order: dbResult.ok ? dbResult.data : null,
  });
}
