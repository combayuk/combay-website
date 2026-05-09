import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureOrderForPaidInvoice } from "@/lib/paidInvoiceOrder";
import { isDatabaseConfigured } from "@/lib/db";
import { isStripeConfigured, retrieveStripeCheckoutSession } from "@/lib/stripe";

export const dynamic = "force-dynamic";

type StripeSessionLike = {
  id: string;
  payment_status?: string | null;
  status?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  customer_email?: string | null;
  client_reference_id?: string | null;
  metadata?: Record<string, string> | null;
  customer_details?: { email?: string | null } | null;
};

async function updatePaidRecordFromSession(stripeSession: StripeSessionLike) {
  if (!isDatabaseConfigured() || stripeSession.payment_status !== "paid") return null;

  const metadata = stripeSession.metadata ?? {};
  const orderId = metadata.orderId;
  const orderNumber = metadata.orderNumber || stripeSession.client_reference_id || undefined;
  const invoiceId = metadata.invoiceId;
  const documentNumber = metadata.documentNumber || stripeSession.client_reference_id || undefined;
  const paidAmount = stripeSession.amount_total ? Number((stripeSession.amount_total / 100).toFixed(2)) : undefined;

  if (invoiceId || documentNumber) {
    const invoice = await prisma.invoice.update({
      where: invoiceId ? { id: invoiceId } : { documentNumber: documentNumber as string },
      data: {
        status: "PAID",
        amountPaid: paidAmount ?? undefined,
        balanceDue: 0,
        notes: `Stripe confirmed payment. Session: ${stripeSession.id}`,
      },
    }).catch(() => null);
    if (invoice) {
      const order = await ensureOrderForPaidInvoice(invoice.id, `Stripe confirmed payment. Session: ${stripeSession.id}`).catch(() => null);
      return { type: "invoice", reference: order?.orderNumber || invoice.documentNumber };
    }
  }

  if (orderId || orderNumber) {
    const order = await prisma.order.update({
      where: orderId ? { id: orderId } : { orderNumber: orderNumber as string },
      data: {
        paymentStatus: "PAID",
        status: "PAYMENT_RECEIVED",
        notes: `Stripe confirmed payment. Session: ${stripeSession.id}`,
      },
    }).catch(() => null);
    if (order) return { type: "order", reference: order.orderNumber };
  }

  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");

  // Stripe payment success page calls this route with session_id.
  // Customer checkout prefill calls the same route without session_id.
  if (sessionId) {
    if (!isStripeConfigured()) {
      return NextResponse.json({ ok: false, error: "Stripe is not configured." }, { status: 500 });
    }

    try {
      const stripeSession = await retrieveStripeCheckoutSession(sessionId) as StripeSessionLike;
      const updated = await updatePaidRecordFromSession(stripeSession);
      const metadata = stripeSession.metadata ?? {};
      const reference = updated?.reference || metadata.orderNumber || metadata.documentNumber || stripeSession.client_reference_id || null;

      return NextResponse.json({
        ok: true,
        updated,
        session: {
          id: stripeSession.id,
          paymentStatus: stripeSession.payment_status ?? null,
          status: stripeSession.status ?? null,
          amountTotal: stripeSession.amount_total ?? null,
          currency: stripeSession.currency ?? null,
          customerEmail: stripeSession.customer_email || stripeSession.customer_details?.email || null,
          orderNumber: reference,
          reference,
          recordType: updated?.type || (metadata.invoiceId || metadata.documentNumber ? "invoice" : "order"),
        },
      });
    } catch (error) {
      return NextResponse.json({
        ok: false,
        error: error instanceof Error ? error.message : "Could not retrieve Stripe checkout session.",
      }, { status: 400 });
    }
  }

  // Registered-customer checkout prefill.
  const authSession = await getServerSession(authOptions).catch(() => null);
  if (!authSession?.user?.email) {
    return NextResponse.json({ ok: true, signedIn: false, customer: null, addresses: [] });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      signedIn: true,
      customer: { fullName: authSession.user.name || "", email: authSession.user.email, phone: "", company: "" },
      addresses: [],
    });
  }

  const user = await prisma.user.findUnique({
    where: { email: String(authSession.user.email).toLowerCase() },
    include: { addresses: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] } },
  }).catch(() => null);

  return NextResponse.json({
    ok: true,
    signedIn: true,
    customer: {
      fullName: user?.name || authSession.user.name || "",
      email: user?.email || authSession.user.email,
      phone: user?.phone || "",
      company: user?.company || "",
    },
    addresses: user?.addresses || [],
  });
}
