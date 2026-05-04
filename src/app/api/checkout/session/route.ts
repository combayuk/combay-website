import { NextResponse } from "next/server";
import { prisma, withDatabase } from "@/lib/db";
import { isStripeConfigured, retrieveStripeCheckoutSession } from "@/lib/stripe";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) return NextResponse.json({ ok: false, error: "Missing session_id." }, { status: 400 });
  if (!isStripeConfigured()) return NextResponse.json({ ok: false, error: "Stripe is not configured." }, { status: 500 });

  const session = await retrieveStripeCheckoutSession(sessionId);
  const orderId = session.metadata?.orderId;
  const orderNumber = session.metadata?.orderNumber || session.client_reference_id || null;
  const paid = session.payment_status === "paid";

  let order: unknown = null;
  if (orderId || orderNumber) {
    const dbResult = await withDatabase(async () => {
      if (paid) {
        return prisma.order.update({
          where: orderId ? { id: orderId } : { orderNumber: orderNumber as string },
          data: { paymentStatus: "PAID", status: "PAYMENT_RECEIVED", notes: `Stripe session ${session.id} confirmed paid.` },
          include: { items: true },
        });
      }
      return prisma.order.findFirst({ where: { OR: [{ id: orderId ?? "" }, { orderNumber: orderNumber ?? "" }] }, include: { items: true } });
    });
    if (dbResult.ok) order = dbResult.data;
  }

  return NextResponse.json({
    ok: true,
    session: {
      id: session.id,
      paymentStatus: session.payment_status,
      status: session.status,
      amountTotal: session.amount_total,
      currency: session.currency,
      customerEmail: session.customer_details?.email ?? session.customer_email,
      orderNumber,
    },
    order,
  });
}
