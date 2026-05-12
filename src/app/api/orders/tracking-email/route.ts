import { NextResponse, type NextRequest } from "next/server";
import { prisma, withDatabase } from "@/lib/db";
import { requireAdminApiSession } from "@/lib/apiAccess";
import { ensureOperationalTables } from "@/lib/operationalSchema";
import { sendTrackingEmailIfNeeded, createAdminActivityNotification } from "@/lib/operations";

function normalizeOrder(order: any) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    status: order.status,
    paymentStatus: order.paymentStatus,
    trackingCarrier: order.trackingCarrier ?? null,
    trackingNumber: order.trackingNumber ?? null,
    trackingUrl: order.trackingUrl ?? null,
    dispatchedAt: order.dispatchedAt ?? null,
    trackingEmailSentAt: order.trackingEmailSentAt ?? null,
    trackingEmailAttemptedAt: order.trackingEmailAttemptedAt ?? null,
    trackingEmailStatus: order.trackingEmailStatus ?? null,
    trackingEmailProviderId: order.trackingEmailProviderId ?? null,
    trackingEmailRecipient: order.trackingEmailRecipient ?? null,
    trackingEmailLastError: order.trackingEmailLastError ?? null,
  };
}

export async function POST(request: NextRequest) {
  const access = await requireAdminApiSession();
  if (!access.ok) return access.response;

  const body = await request.json().catch(() => null) as any;
  const orderId = String(body?.orderId ?? body?.id ?? "").trim();
  const force = Boolean(body?.force);
  if (!orderId) return NextResponse.json({ ok: false, error: "Missing orderId" }, { status: 400 });

  const dbResult = await withDatabase(async () => {
    await ensureOperationalTables();
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true, returns: true, shippingSnapshot: true } });
    if (!order) throw new Error("Order not found");
    const result = await sendTrackingEmailIfNeeded(order, { force, reason: force ? "manual-admin-resend" : "manual-admin-send" });
    await createAdminActivityNotification({
      type: result.sent ? "TRACKING_EMAIL_SENT" : "TRACKING_EMAIL_NOT_SENT",
      title: result.sent ? `Tracking email sent for ${order.orderNumber}` : `Tracking email not sent for ${order.orderNumber}`,
      message: result.sent ? `Sent to ${order.customerEmail}. Resend ID: ${result.id || "not returned"}` : `${result.reason || result.message || "Not sent"}`,
      sourceModel: "Order",
      sourceId: order.id,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      amount: Number(order.total || 0),
    }).catch(() => null);
    const refreshed = await prisma.order.findUnique({ where: { id: order.id }, include: { items: true, returns: true, shippingSnapshot: true } });
    return { order: normalizeOrder(refreshed || order), trackingEmail: result };
  });

  if (!dbResult.ok) return NextResponse.json({ ok: false, error: "Could not process tracking email", reason: dbResult.reason }, { status: 500 });
  return NextResponse.json({ ok: true, ...dbResult.data });
}
