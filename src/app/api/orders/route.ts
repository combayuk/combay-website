import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { prisma, withDatabase } from "@/lib/db";
import { authOptions } from "@/lib/auth";

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
  };
}

export async function GET(request: NextRequest) {
  const requestedEmail = request.nextUrl.searchParams.get("email");
  const portal = request.nextUrl.searchParams.get("portal") === "1";
  const session = portal ? await getServerSession(authOptions).catch(() => null) : null;
  const sessionEmail = String(session?.user?.email || "").trim().toLowerCase();
  const sessionRole = (session?.user as any)?.role as string | undefined;
  const email = portal ? sessionEmail : requestedEmail;

  if (portal && !sessionEmail) {
    return NextResponse.json({ ok: false, error: "Customer sign-in required." }, { status: 401 });
  }
  if (portal && sessionRole !== "CUSTOMER") {
    return NextResponse.json({ ok: false, error: "Customer portal access is required." }, { status: 403 });
  }

  const dbResult = await withDatabase(async () => {
    const where = email ? { customerEmail: { equals: email, mode: "insensitive" as const } } : undefined;
    return prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { items: true, returns: true },
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

  if (portal) return NextResponse.json({ ok: true, mode: "preview", reason: dbResult.reason, data: [], orders: [], portalOrders: [] });
  return NextResponse.json({ ok: true, mode: "preview", reason: dbResult.reason, data: orders, orders, portalOrders });
}


export async function PATCH(request: NextRequest) {
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
    const updated = await prisma.order.update({
      where: id ? { id } : { orderNumber },
      data,
      include: { items: true, returns: true },
    });
    return updated;
  });

  if (!dbResult.ok) {
    return NextResponse.json({ ok: false, mode: "preview", error: "Could not update order", reason: dbResult.reason }, { status: 500 });
  }

  const order = normalizeAdminOrder(dbResult.data);
  return NextResponse.json({ ok: true, mode: "database", order, data: order });
}
