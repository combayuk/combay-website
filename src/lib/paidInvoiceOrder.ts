import { prisma } from "@/lib/db";
import { ensureOperationalTables } from "@/lib/operationalSchema";

function asMoney(value: unknown) {
  return Number(value || 0);
}

async function invoiceLineToOrderItem(line: any) {
  const sku = String(line.sku || "").trim();
  const product = sku ? await prisma.product.findUnique({ where: { sku } }).catch(() => null) : null;
  return {
    productId: product?.id ?? null,
    title: line.description || sku || "Invoice line item",
    sku: sku || `DOC-LINE-${line.sortOrder ?? 0}`,
    quantity: Math.max(1, Math.round(asMoney(line.quantity || 1))),
    unitPrice: asMoney(line.unitPrice),
    lineTotal: asMoney(line.lineTotal),
  };
}

export async function ensureOrderForPaidInvoice(invoiceId: string, sourceNote: string) {
  if (!invoiceId) return null;
  await ensureOperationalTables();
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { lines: { orderBy: { sortOrder: "asc" } }, order: { include: { items: true } } },
  });
  if (!invoice) return null;
  if (invoice.orderId && invoice.order) {
    if (!invoice.order.items?.length && invoice.lines.length) {
      const items = await Promise.all(invoice.lines.map(invoiceLineToOrderItem));
      await prisma.order.update({
        where: { id: invoice.order.id },
        data: { items: { create: items as any } },
      }).catch((error: unknown) => console.error("[paid-invoice-existing-order-items-create-failed]", error));
    }
    return invoice.order;
  }

  const orderNumber = `CB-DOC-${invoice.documentNumber}`;
  const existingOrder = await prisma.order.findUnique({ where: { orderNumber }, include: { items: true } }).catch(() => null);
  if (existingOrder) {
    if (!existingOrder.items.length && invoice.lines.length) {
      const items = await Promise.all(invoice.lines.map(invoiceLineToOrderItem));
      await prisma.order.update({ where: { id: existingOrder.id }, data: { items: { create: items as any } } }).catch((error: unknown) => console.error("[paid-invoice-linked-order-items-create-failed]", error));
    }
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        orderId: existingOrder.id,
        amountPaid: invoice.total,
        balanceDue: 0,
        notes: [invoice.notes, sourceNote, `Linked to existing order ${orderNumber}.`].filter(Boolean).join("\n"),
      },
    }).catch(() => undefined);
    return existingOrder;
  }

  const orderItems = await Promise.all(invoice.lines.map(invoiceLineToOrderItem));
  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerName: invoice.customerName,
      customerEmail: invoice.customerEmail,
      customerPhone: invoice.customerPhone,
      company: invoice.company,
      status: "PAYMENT_RECEIVED",
      paymentStatus: "PAID",
      salesChannel: "INVOICE",
      paidAt: new Date(),
      subtotal: invoice.subtotal,
      shipping: invoice.shippingCost,
      tax: invoice.tax,
      total: invoice.total,
      currency: invoice.currency,
      notes: [sourceNote, `Automatically created from paid document ${invoice.documentNumber}.`].filter(Boolean).join("\n"),
      shippingAddress: invoice.billingAddress ? { address: invoice.billingAddress, country: invoice.shippingCountry || undefined } : undefined,
      items: orderItems.length ? { create: orderItems as any } : undefined,
    },
    include: { items: true },
  });

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      orderId: order.id,
      amountPaid: invoice.total,
      balanceDue: 0,
      notes: [invoice.notes, sourceNote, `Automatically moved into Orders as ${order.orderNumber}.`].filter(Boolean).join("\n"),
    },
  });

  return order;
}
