import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma, withDatabase } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { createStripeCheckoutSession, isStripeConfigured } from "@/lib/stripe";
import { calculatePromotionTotals, checkPromotionProductTargets, findPromotionByCode } from "@/lib/promotions";
import { customerPaymentCancelUrl, customerPaymentSuccessUrl } from "@/lib/paymentReturn";

type CheckoutLine = {
  sku: string;
  qty?: number;
  quantity?: number;
  variantId?: string;
  variantSku?: string;
  variationSku?: string;
  variationLabel?: string;
};

function orderNumber() {
  return `CB-${Date.now().toString(36).toUpperCase()}`;
}

function siteOrigin(request: Request) {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || new URL(request.url).origin;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const authSession = await getServerSession(authOptions).catch(() => null);

  if (!body?.customer?.email || !Array.isArray(body?.lines) || body.lines.length === 0) {
    return NextResponse.json({ ok: false, error: "Missing checkout details." }, { status: 400 });
  }

  const reference = orderNumber();
  const lines = body.lines as CheckoutLine[];
  const stripeConfigured = isStripeConfigured();
  const origin = siteOrigin(request);

  const dbResult = await withDatabase(async () => {
    const sessionEmail = authSession?.user?.email ? String(authSession.user.email).toLowerCase() : "";
    const currentUser = sessionEmail ? await prisma.user.findUnique({ where: { email: sessionEmail }, select: { id: true } }).catch(() => null) : null;
    const requestedSkus = lines.map((line) => String(line.sku)).filter(Boolean);
    const products = await prisma.product.findMany({
      where: { sku: { in: requestedSkus }, status: "PUBLISHED" },
      include: { category: true, images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] }, variants: { orderBy: { sortOrder: "asc" } } },
    });

    const productBySku = new Map(products.map((product) => [product.sku, product]));
    const orderItems = [] as Array<{
      productId: string;
      title: string;
      sku: string;
      variationSku?: string | null;
      variationLabel?: string | null;
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

      const requestedVariantSku = String(line.variantSku || line.variationSku || "").trim();
      const requestedVariantId = String(line.variantId || "").trim();
      const variant = product.variants.find((item) => item.id === requestedVariantId || (requestedVariantSku && item.sku === requestedVariantSku)) ?? null;
      if (product.variants.length && !variant) throw new Error(`${sku} has variations. Please choose a variation before checkout.`);

      const availableQty = variant ? variant.stockQty : product.stockQty;
      if (availableQty < qty) throw new Error(`${variant?.sku || sku} only has ${availableQty} available.`);

      const unitPrice = variant?.price !== null && variant?.price !== undefined ? Number(variant.price) : Number(product.price);
      orderItems.push({
        productId: product.id,
        title: variant ? `${product.title} — ${variant.label}` : product.title,
        sku: product.sku,
        variationSku: variant?.sku || requestedVariantSku || null,
        variationLabel: variant?.label || line.variationLabel || null,
        quantity: qty,
        unitPrice,
        lineTotal: unitPrice * qty,
      });
    }

    const subtotal = Number(orderItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
    const shipping = 0;
    let discount = 0;
    let promotionCode: string | null = null;
    let promotionName: string | null = null;
    let tax = Number((subtotal * 0.2).toFixed(2));
    let total = Number((subtotal + tax + shipping).toFixed(2));

    const requestedPromotionCode = String(body.promotionCode || "").trim();
    if (requestedPromotionCode) {
      const promotion = await findPromotionByCode(requestedPromotionCode);
      if (!promotion) throw new Error("Promotion code was not recognised.");
      const targetCheck = checkPromotionProductTargets(promotion, orderItems.map((item) => {
        const product = products.find((candidate) => candidate.id === item.productId);
        return {
          id: item.productId,
          productId: item.productId,
          categorySlug: product?.category?.slug ?? "",
          category: product?.category?.name ?? "",
          brand: product?.brand ?? "",
          manufacturer: product?.manufacturer ?? "",
        };
      }));
      if (!targetCheck.ok) throw new Error(targetCheck.error || "Promotion code is not valid for these products.");
      const promoTotals = calculatePromotionTotals(promotion, subtotal, shipping);
      if (!promoTotals.ok) throw new Error(promoTotals.error || "Promotion code is not valid for this order.");
      discount = Number((promoTotals.discount + promoTotals.shippingDiscount).toFixed(2));
      promotionCode = promoTotals.code || promotion.code || null;
      promotionName = promoTotals.name || promotion.name || null;
      tax = promoTotals.vat;
      total = promoTotals.total;
    }

    const order = await prisma.order.create({
      data: {
        orderNumber: reference,
        userId: currentUser?.id || null,
        customerName: String(body.customer.fullName || body.customer.name || body.customer.email),
        customerEmail: String(body.customer.email),
        customerPhone: body.customer.phone ? String(body.customer.phone) : null,
        company: body.customer.company ? String(body.customer.company) : null,
        status: "PENDING_PAYMENT",
        paymentStatus: "UNPAID",
        subtotal,
        discount,
        promotionCode,
        promotionName,
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
            variationSku: item.variationSku,
            variationLabel: item.variationLabel,
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

  const stripeSession = await createStripeCheckoutSession({
    customerEmail: order.customerEmail,
    orderNumber: order.orderNumber,
    orderId: order.id,
    successUrl: customerPaymentSuccessUrl(order.orderNumber, "order"),
    cancelUrl: customerPaymentCancelUrl(order.orderNumber, "order"),
    lines: Number(order.discount) > 0
      ? [
          { name: `Combay order ${order.orderNumber}${order.promotionCode ? ` after promotion ${order.promotionCode}` : ""}`, quantity: 1, unitAmountPence: Math.round((Number(order.subtotal) - Number(order.discount)) * 100) },
          ...(tax > 0 ? [{ name: "VAT estimate", quantity: 1, unitAmountPence: Math.round(tax * 100) }] : []),
        ]
      : [
          ...orderItems.map((item) => ({ name: `${item.variationSku || item.sku} — ${item.title}`, quantity: item.quantity, unitAmountPence: Math.round(item.unitPrice * 100) })),
          ...(tax > 0 ? [{ name: "VAT estimate", quantity: 1, unitAmountPence: Math.round(tax * 100) }] : []),
        ],
  });

  await prisma.order.update({ where: { id: order.id }, data: { notes: `Stripe checkout session created: ${stripeSession.id}. Total: £${total.toFixed(2)}.` } });

  return NextResponse.json({
    ok: true,
    reference: order.orderNumber,
    mode: "database",
    paymentMode: "stripe-checkout",
    status: "redirect-to-stripe",
    checkoutUrl: stripeSession.url,
    sessionId: stripeSession.id,
  });
}
