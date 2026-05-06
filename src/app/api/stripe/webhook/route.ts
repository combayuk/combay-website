import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma, withDatabase } from "@/lib/db";
import { isStripeConfigured, verifyStripeWebhookSignature } from "@/lib/stripe";
import { sendAdminNotification, sendCustomerAcknowledgement } from "@/lib/mailer";
import { captureLead } from "@/lib/leads";

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
      const updateResult = await withDatabase(async () => prisma.order.update({
        where: orderId ? { id: orderId } : { orderNumber },
        data: { paymentStatus: "PAID", status: "PAYMENT_RECEIVED", notes: `Stripe webhook confirmed payment. Session: ${session.id}` },
        include: { items: true },
      }));
      if (updateResult.ok) {
        const order: any = updateResult.data;
        await sendCustomerAcknowledgement({
          to: order.customerEmail,
          name: order.customerName,
          subject: `Combay order confirmation ${order.orderNumber}`,
          title: "Order confirmation",
          reference: order.orderNumber,
          body: `Thank you for your order. Payment has been received and your order is now being processed.`,
          ctaUrl: `${process.env.NEXTAUTH_URL || "https://combay.co.uk"}/portal/orders`,
          ctaLabel: "View order",
        });
        await sendAdminNotification({
          subject: `Paid Combay order ${order.orderNumber}`,
          title: "Paid order received",
          message: `Stripe confirmed payment for order ${order.orderNumber}.`,
          rows: [["Order", order.orderNumber], ["Customer", order.customerName], ["Email", order.customerEmail], ["Total", `£${Number(order.total).toFixed(2)}`], ["Items", order.items.map((item: any) => `${item.quantity} x ${item.sku}`).join(", ")]],
        });
        if (order.promotionCode) {
          await prisma.promotion.update({ where: { code: order.promotionCode }, data: { usedCount: { increment: 1 } } }).catch(() => null);
        }
        await captureLead({
          name: order.customerName,
          email: order.customerEmail,
          phone: order.customerPhone,
          company: order.company,
          country: order.shippingAddress?.country,
          source: "paid stripe order",
          sourceRef: order.orderNumber,
          productSku: order.items?.[0]?.sku,
          productTitle: order.items?.[0]?.title,
          orderId: order.id,
          notes: `Paid Stripe order ${order.orderNumber}. Items: ${order.items.map((item: any) => `${item.quantity} x ${item.sku}`).join(", ")}`,
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
