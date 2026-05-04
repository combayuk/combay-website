import { NextResponse } from "next/server";
import { prisma, withDatabase } from "@/lib/db";
import { createStripeCheckoutSession, isStripeConfigured } from "@/lib/stripe";

type CheckoutLine = {
  sku: string;
  qty?: number;
  quantity?: number;
};

function orderNumber() {
  return `CB-${Date.now().toString(36).toUpperCase()}`;
}

function siteOrigin(request: Request) {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || new URL(request.url).origin;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.customer?.email || !Array.isArray(body?.lines) || body.lines.length === 0) {
    return NextResponse.json({ ok: false, error: "Missing checkout details." }, { status: 400 });
  }

  const reference = orderNumber();
  const lines = body.lines as CheckoutLine[];
  const stripeConfigured = isStripeConfigured();
  const origin = siteOrigin(request);

  const dbResult = await withDatabase(async () => {
    const requestedSkus = lines.map((line) => String(line.sku)).filter(Boolean);
    const products = await prisma.product.findMany({
      where: { sku: { in: requestedSkus }, status: "PUBLISHED" },
      include: { images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] } },
    });

    const productBySku = new Map(products.map((product) => [product.sku, product]));
    const orderItems = [] as Array<{
      productId: string;
      title: string;
      sku: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }>;

    for (const line of lines) {
      const sku = String(line.sku);
      const product = productBySku.get(sku);
      const qty = Math.max(1, Math.floor(Number(line.qty ?? line.quantity ?? 1)));

      if (!product) throw new Error(`Product not found or not published: ${sku}`);
      if (product.priceOnRequest || product.price === null) throw new Error(`${sku} is price on request and cannot be checked out online.`);
      if (product.stockQty < qty) throw new Error(`${sku} only has ${product.stockQty} available.`);

      const unitPrice = Number(product.price);
      orderItems.push({ productId: product.id, title: product.title, sku: product.sku, quantity: qty, unitPrice, lineTotal: unitPrice * qty });
    }

    const subtotal = Number(orderItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
    const tax = Number((subtotal * 0.2).toFixed(2));
    const shipping = 0;
    const total = Number((subtotal + tax + shipping).toFixed(2));

    const order = await prisma.order.create({
      data: {
        orderNumber: reference,
        customerName: String(body.customer.fullName || body.customer.name || body.customer.email),
        customerEmail: String(body.customer.email),
        customerPhone: body.customer.phone ? String(body.customer.phone) : null,
        company: body.customer.company ? String(body.customer.company) : null,
        status: "PENDING_PAYMENT",
        paymentStatus: "UNPAID",
        subtotal,
        tax,
        shipping,
        total,
        shippingAddress: {
          address1: body.customer.address1 ?? body.address?.address1 ?? "",
          address2: body.customer.address2 ?? body.address?.address2 ?? "",
          city: body.customer.city ?? body.address?.city ?? "",
          postcode: body.customer.postcode ?? body.address?.postcode ?? "",
          country: body.customer.country ?? body.address?.country ?? "United Kingdom",
        },
        notes: body.customer.notes ? String(body.customer.notes) : null,
        items: {
          create: orderItems.map((item) => ({
            productId: item.productId,
            title: item.title,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          })),
        },
      },
      include: { items: true },
    });

    return { order, orderItems, subtotal, tax, shipping, total };
  });

  if (!dbResult.ok) return NextResponse.json({ ok: false, error: dbResult.reason }, { status: 400 });

  const { order, orderItems, tax, total } = dbResult.data;

  if (!stripeConfigured) {
    return NextResponse.json({
      ok: true,
      reference,
      mode: "database",
      persistence: "saved",
      paymentMode: "stripe-not-configured",
      status: "unpaid-checkout-request",
      message: "Stripe is not configured. No payment has been captured.",
      order,
    });
  }

  const session = await createStripeCheckoutSession({
    customerEmail: order.customerEmail,
    orderNumber: order.orderNumber,
    orderId: order.id,
    successUrl: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${origin}/checkout/cancel?order=${encodeURIComponent(order.orderNumber)}`,
    lines: [
      ...orderItems.map((item) => ({ name: `${item.sku} — ${item.title}`, quantity: item.quantity, unitAmountPence: Math.round(item.unitPrice * 100) })),
      ...(tax > 0 ? [{ name: "VAT estimate", quantity: 1, unitAmountPence: Math.round(tax * 100) }] : []),
    ],
  });

  await prisma.order.update({ where: { id: order.id }, data: { notes: `Stripe checkout session created: ${session.id}. Total: £${total.toFixed(2)}.` } });

  return NextResponse.json({
    ok: true,
    reference: order.orderNumber,
    mode: "database",
    paymentMode: "stripe-checkout",
    status: "redirect-to-stripe",
    checkoutUrl: session.url,
    sessionId: session.id,
  });
}
