import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma, withDatabase } from "@/lib/db";
import { isStripeConfigured, verifyStripeWebhookSignature } from "@/lib/stripe";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!isStripeConfigured() || !webhookSecret) return NextResponse.json({ ok: false, error: "Stripe webhook is not configured." }, { status: 500 });

  const body = await request.text();
  const signature = headers().get("stripe-signature");
  if (!signature) return NextResponse.json({ ok: false, error: "Missing Stripe signature." }, { status: 400 });
  if (!verifyStripeWebhookSignature(body, signature, webhookSecret)) return NextResponse.json({ ok: false, error: "Webhook verification failed." }, { status: 400 });

  const event = JSON.parse(body);
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const orderId = session.metadata?.orderId;
    const orderNumber = session.metadata?.orderNumber || session.client_reference_id;
    if (orderId || orderNumber) {
      await withDatabase(async () => prisma.order.update({
        where: orderId ? { id: orderId } : { orderNumber },
        data: { paymentStatus: "PAID", status: "PAYMENT_RECEIVED", notes: `Stripe webhook confirmed payment. Session: ${session.id}` },
      }));
    }
  }

  return NextResponse.json({ received: true });
}
