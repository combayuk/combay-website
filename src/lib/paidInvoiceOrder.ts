import { prisma } from "@/lib/db";

function asMoney(value: unknown) {
  return Number(value || 0);
}

export async function ensureOrderForPaidInvoice(invoiceId: string, sourceNote: string) {
  if (!invoiceId) return null;
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { lines: { orderBy: { sortOrder: "asc" } }, order: true },
  });
  if (!invoice) return null;
  if (invoice.orderId && invoice.order) return invoice.order;

  const orderNumber = `CB-DOC-${invoice.documentNumber}`;
  const existingOrder = await prisma.order.findUnique({ where: { orderNumber } }).catch(() => null);
  if (existingOrder) {
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

  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerName: invoice.customerName,
      customerEmail: invoice.customerEmail,
      customerPhone: invoice.customerPhone,
      company: invoice.company,
      status: "PAYMENT_RECEIVED",
      paymentStatus: "PAID",
      subtotal: invoice.subtotal,
      shipping: invoice.shippingCost,
      tax: invoice.tax,
      total: invoice.total,
      currency: invoice.currency,
      notes: [sourceNote, `Automatically created from paid document ${invoice.documentNumber}.`].filter(Boolean).join("\n"),
      shippingAddress: invoice.billingAddress ? { address: invoice.billingAddress } : undefined,
    },
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
