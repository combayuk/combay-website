import { NextResponse, type NextRequest } from "next/server";
import { prisma, withDatabase } from "@/lib/db";
import { requireAdminApiSession, requireCustomerApiSession } from "@/lib/apiAccess";
import { ensureOperationalTables } from "@/lib/operationalSchema";
import { createAdminActivityNotification, sendTrackingEmailIfNeeded } from "@/lib/operations";

const DEMO_ORDERS = [
  { id: "demo-1", orderNumber: "CB1ACB2F", status: "DELIVERED", paymentStatus: "PAID", total: 1240, subtotal: 1033.33, tax: 206.67, shipping: 0, createdAt: "2026-04-28", customerName: "Demo Customer", customerEmail: "demo@combay.co.uk", items: [] },
  { id: "demo-2", orderNumber: "CB0D9E1A", status: "DELIVERED", paymentStatus: "PAID", total: 890, subtotal: 741.67, tax: 148.33, shipping: 0, createdAt: "2026-03-05", customerName: "Demo Customer", customerEmail: "demo@combay.co.uk", items: [] },
];

function money(value: unknown) {
  return Number(value ?? 0);
}

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(money(value));
}

function normalizeAdminOrder(order: any) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone ?? null,
    company: order.company ?? null,
    subtotal: money(order.subtotal),
    shipping: money(order.shipping),
    tax: money(order.tax),
    total: money(order.total),
    currency: order.currency ?? "GBP",
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
    salesChannel: order.salesChannel ?? "WEBSITE",
    externalOrderId: order.externalOrderId ?? null,
    externalMarketplace: order.externalMarketplace ?? null,
    paidAt: order.paidAt ?? null,
    shippingAddress: order.shippingAddress ?? null,
    items: (order.items ?? []).map((item: any) => ({
      id: item.id,
      productId: item.productId,
      title: item.title,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: money(item.unitPrice),
      lineTotal: money(item.lineTotal),
    })),
    returns: order.returns ?? [],
    shippingSnapshot: order.shippingSnapshot ?? null,
  };
}

function toPortalStatus(status: string) {
  if (status === "DISPATCHED") return "DISPATCHED";
  if (status === "DELIVERED") return "DELIVERED";
  if (status === "CANCELLED") return "CANCELLED";
  return "PROCESSING";
}

function normalizePortalOrder(order: any) {
  const items = order.items ?? [];
  const first = items[0];
  const itemLabel = first
    ? items.length > 1
      ? `${first.title} + ${items.length - 1} more item${items.length > 2 ? "s" : ""}`
      : first.title
    : "Combay order";

  return {
    id: order.orderNumber,
    date: order.createdAt,
    deliveredAt: order.status === "DELIVERED" ? order.updatedAt ?? order.createdAt : undefined,
    item: itemLabel,
    sku: first?.sku ?? "—",
    total: formatCurrency(order.total),
    status: toPortalStatus(order.status),
    courier: order.trackingCarrier ?? undefined,
    tracking: order.trackingNumber ?? undefined,
    trackingUrl: order.trackingUrl ?? undefined,
    paymentStatus: order.paymentStatus,
    shipping: order.shippingSnapshot ? {
      cost: formatCurrency(order.shippingSnapshot.shippingCost ?? order.shipping),
      policy: order.shippingSnapshot.shippingPolicyName,
      zone: order.shippingSnapshot.shippingZoneName,
      manualQuoteRequired: order.shippingSnapshot.manualQuoteRequired,
      dispatchEstimate: order.shippingSnapshot.dispatchMinDays ? `${order.shippingSnapshot.dispatchMinDays}${order.shippingSnapshot.dispatchMaxDays && order.shippingSnapshot.dispatchMaxDays !== order.shippingSnapshot.dispatchMinDays ? `–${order.shippingSnapshot.dispatchMaxDays}` : ""} working days` : undefined,
      deliveryEstimate: order.shippingSnapshot.deliveryMinDays ? `${order.shippingSnapshot.deliveryMinDays}${order.shippingSnapshot.deliveryMaxDays && order.shippingSnapshot.deliveryMaxDays !== order.shippingSnapshot.deliveryMinDays ? `–${order.shippingSnapshot.deliveryMaxDays}` : ""} working days` : undefined,
    } : undefined,
  };
}

export async function GET(request: NextRequest) {
  const requestedEmail = request.nextUrl.searchParams.get("email");
  const portal = request.nextUrl.searchParams.get("portal") === "1";

  if (portal) {
    const access = await requireCustomerApiSession();
    if (!access.ok) return access.response;
    const sessionEmail = access.access.email;
    const email = sessionEmail;


    const dbResult = await withDatabase(async () => {
      await ensureOperationalTables();
      return prisma.order.findMany({
      where: { customerEmail: { equals: email, mode: "insensitive" as const } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { items: true, returns: true, shippingSnapshot: true },
    });
    });

    if (dbResult.ok) {
      const orders = dbResult.data.map(normalizeAdminOrder);
      const portalOrders = dbResult.data.map(normalizePortalOrder);
      return NextResponse.json({ ok: true, mode: "database", data: orders, orders, portalOrders });
    }

    return NextResponse.json({ ok: true, mode: "preview", reason: dbResult.reason, data: [], orders: [], portalOrders: [] });
  }

  const adminAccess = await requireAdminApiSession();
  if (!adminAccess.ok) return adminAccess.response;
  const email = requestedEmail;

  const dbResult = await withDatabase(async () => {
    await ensureOperationalTables();
    const where = email ? { customerEmail: { equals: email, mode: "insensitive" as const } } : undefined;
    return prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { items: true, returns: true, shippingSnapshot: true },
    });
  });

  if (dbResult.ok) {
    const orders = dbResult.data.map(normalizeAdminOrder);
    const portalOrders = dbResult.data.map(normalizePortalOrder);
    return NextResponse.json({ ok: true, mode: "database", data: orders, orders, portalOrders });
  }

  const orders = DEMO_ORDERS;
  const portalOrders = portal
    ? []
    : orders.map((order) => ({
        id: order.orderNumber,
        date: order.createdAt,
        item: "Demo order",
        sku: "—",
        total: formatCurrency(order.total),
        status: order.status,
      }));

  return NextResponse.json({ ok: true, mode: "preview", reason: dbResult.reason, data: orders, orders, portalOrders });
}


export async function PATCH(request: NextRequest) {
  const access = await requireAdminApiSession();
  if (!access.ok) return access.response;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });

  const id = String(body.id ?? body.orderId ?? "").trim();
  const orderNumber = String(body.orderNumber ?? "").trim();
  if (!id && !orderNumber) {
    return NextResponse.json({ ok: false, error: "Missing order id or order number" }, { status: 400 });
  }

  const trackingCarrier = body.trackingCarrier === undefined ? undefined : String(body.trackingCarrier ?? "").trim() || null;
  const trackingNumber = body.trackingNumber === undefined ? undefined : String(body.trackingNumber ?? "").trim() || null;
  const trackingUrl = body.trackingUrl === undefined ? undefined : String(body.trackingUrl ?? "").trim() || null;
  const status = body.status === undefined ? undefined : String(body.status ?? "").trim();

  const allowedStatuses = ["PENDING_PAYMENT", "PAYMENT_RECEIVED", "PROCESSING", "DISPATCHED", "DELIVERED", "CANCELLED", "REFUNDED"];
  if (status && !allowedStatuses.includes(status)) {
    return NextResponse.json({ ok: false, error: "Invalid order status" }, { status: 400 });
  }

  const data: any = {};
  if (trackingCarrier !== undefined) data.trackingCarrier = trackingCarrier;
  if (trackingNumber !== undefined) data.trackingNumber = trackingNumber;
  if (trackingUrl !== undefined) data.trackingUrl = trackingUrl;
  if (status) data.status = status;

  if (trackingNumber && !status) {
    data.status = "DISPATCHED";
  }
  if ((status === "DISPATCHED" || data.status === "DISPATCHED") && !data.dispatchedAt) {
    data.dispatchedAt = new Date();
  }
  if (status === "DELIVERED") {
    data.dispatchedAt = body.dispatchedAt ? new Date(body.dispatchedAt) : undefined;
  }

  const dbResult = await withDatabase(async () => {
    await ensureOperationalTables();
    const before = await prisma.order.findUnique({ where: id ? { id } : { orderNumber } }).catch(() => null);
    let updated = await prisma.order.update({
      where: id ? { id } : { orderNumber },
      data,
      include: { items: true, returns: true, shippingSnapshot: true },
    });
    const trackingChanged = Boolean(
      updated.trackingNumber && (
        !before ||
        before.trackingNumber !== updated.trackingNumber ||
        before.trackingUrl !== updated.trackingUrl ||
        before.trackingCarrier !== updated.trackingCarrier ||
        before.status !== updated.status
      )
    );
    let trackingEmailResult: any = null;
    if (trackingChanged || updated.status === "DISPATCHED") {
      trackingEmailResult = await sendTrackingEmailIfNeeded(updated, { reason: "admin-order-update" }).catch((emailError) => {
        console.error("[tracking-email-failed]", emailError);
        return { sent: false, configured: true, provider: "resend", message: "Tracking email send failed.", error: emailError instanceof Error ? emailError.message : "Unknown email error" };
      });
      await createAdminActivityNotification({
        type: trackingEmailResult?.sent ? "TRACKING_EMAIL_SENT" : "TRACKING_UPDATED",
        title: trackingEmailResult?.sent ? `Tracking email sent for ${updated.orderNumber}` : `Tracking updated for ${updated.orderNumber}`,
        message: trackingEmailResult?.sent
          ? `Sent to ${updated.customerEmail}. Resend ID: ${trackingEmailResult.id || "not returned"}`
          : `${updated.trackingCarrier || "Courier"}: ${updated.trackingNumber || "tracking added"}${trackingEmailResult?.reason ? ` · Email: ${trackingEmailResult.reason}` : ""}`,
        sourceModel: "Order",
        sourceId: updated.id,
        customerName: updated.customerName,
        customerEmail: updated.customerEmail,
        amount: Number(updated.total || 0),
      }).catch(() => null);
      updated = await prisma.order.findUnique({ where: { id: updated.id }, include: { items: true, returns: true, shippingSnapshot: true } }) as any || updated;
    }
    return { order: updated, trackingEmailResult };
  });

  if (!dbResult.ok) {
    return NextResponse.json({ ok: false, mode: "preview", error: "Could not update order", reason: dbResult.reason }, { status: 500 });
  }

  const order = normalizeAdminOrder((dbResult.data as any).order ?? dbResult.data);
  return NextResponse.json({ ok: true, mode: "database", order, data: order, trackingEmail: (dbResult.data as any).trackingEmailResult ?? null });
}
