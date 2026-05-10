import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma, withDatabase } from "@/lib/db";
import { isStripeConfigured, verifyStripeWebhookSignature } from "@/lib/stripe";
import { sendAdminNotification, sendCustomerAcknowledgement } from "@/lib/mailer";
import { captureLead } from "@/lib/leads";
import { runEmailAutomations } from "@/lib/emailAutomations";
import { ensureOrderForPaidInvoice } from "@/lib/paidInvoiceOrder";

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
    const metadata = session.metadata ?? {};
    const invoiceId = metadata.invoiceId;
    const documentNumber = metadata.documentNumber;
    const orderId = metadata.orderId;
    const orderNumber = metadata.orderNumber || session.client_reference_id;
    const paidAmount = session.amount_total ? Number((session.amount_total / 100).toFixed(2)) : undefined;

    if (invoiceId || documentNumber) {
      const invoiceResult = await withDatabase(async () => prisma.invoice.update({
        where: invoiceId ? { id: invoiceId } : { documentNumber },
        data: {
          status: "PAID",
          amountPaid: paidAmount ?? undefined,
          balanceDue: 0,
          notes: `Stripe webhook confirmed payment. Session: ${session.id}`,
        },
        include: { lines: { orderBy: { sortOrder: "asc" } }, order: true },
      }));

      if (invoiceResult.ok) {
        const invoice: any = invoiceResult.data;
        const order = await ensureOrderForPaidInvoice(invoice.id, `Stripe webhook confirmed payment. Session: ${session.id}`).catch((orderError) => {
          console.error("[invoice-auto-order-failed]", orderError);
          return null;
        });
        await sendCustomerAcknowledgement({
          to: invoice.customerEmail,
          name: invoice.customerName,
          subject: `Combay payment confirmation ${invoice.documentNumber}`,
          title: "Payment confirmation",
          reference: invoice.documentNumber,
          body: `Thank you. Payment has been received for ${invoice.documentNumber}. We will now process the order/proforma workflow and contact you with any dispatch updates.`,
          ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "https://combay.co.uk"}/portal/orders`,
          ctaLabel: "View portal",
        }).catch((emailError) => console.error("[invoice-payment-email-failed]", emailError));

        await sendAdminNotification({
          subject: `Paid Combay proforma ${invoice.documentNumber}`,
          title: "Proforma payment received",
          message: `Stripe confirmed payment for ${invoice.documentNumber}.`,
          rows: [
            ["Document", invoice.documentNumber],
            ["Customer", invoice.customerName],
            ["Email", invoice.customerEmail],
            ["Total", `£${Number(invoice.total).toFixed(2)}`],
            ["Order", order?.orderNumber || invoice.order?.orderNumber || "Auto-order pending"],
            ["Session", session.id],
          ],
        }).catch((emailError) => console.error("[invoice-payment-admin-email-failed]", emailError));

        await captureLead({
          name: invoice.customerName,
          email: invoice.customerEmail,
          phone: invoice.customerPhone,
          company: invoice.company,
          country: null,
          source: "paid stripe proforma",
          sourceRef: invoice.documentNumber,
          productSku: invoice.lines?.[0]?.sku,
          productTitle: invoice.lines?.[0]?.description,
          notes: `Paid Stripe proforma/invoice ${invoice.documentNumber}.`,
        }).catch((leadError) => console.error("[invoice-payment-lead-failed]", leadError));
      }
    } else if (orderId || orderNumber) {
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
          ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "https://combay.co.uk"}/portal/orders`,
          ctaLabel: "View order",
        });
        const paidOrderCount = await prisma.order.count({
          where: {
            customerEmail: order.customerEmail,
            paymentStatus: "PAID",
          },
        }).catch(() => 1);
        if (paidOrderCount <= 1) {
          await runEmailAutomations("FIRST_ORDER_COMPLETED", { order }).catch((emailError) => console.error("[first-order-automation-failed]", emailError));
        }
        await runEmailAutomations("ORDER_COMPLETED", { order }).catch((emailError) => console.error("[order-automation-failed]", emailError));

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
