import { NextResponse, type NextRequest } from "next/server";
import { prisma, withDatabase } from "@/lib/db";

const ALLOWED_TYPES = ["QUOTE", "PROFORMA_INVOICE", "COMMERCIAL_INVOICE", "ADDITIONAL_PAYMENT_REQUEST", "INVOICE"] as const;
type InvoiceType = (typeof ALLOWED_TYPES)[number];

const ORDER_DOCUMENT_TYPES = ["COMMERCIAL_INVOICE", "ADDITIONAL_PAYMENT_REQUEST", "INVOICE"] as const;

type InputLine = {
  description?: string;
  desc?: string;
  sku?: string;
  hsCode?: string;
  origin?: string;
  quantity?: number | string;
  qty?: number | string;
  unitPrice?: number | string;
  unit?: number | string;
};

function money(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function makeDocumentNumber(type: InvoiceType) {
  const now = new Date();
  const compact = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  const prefix =
    type === "COMMERCIAL_INVOICE" || type === "INVOICE" ? "CMPI" :
    type === "PROFORMA_INVOICE" ? "CBPI" :
    type === "ADDITIONAL_PAYMENT_REQUEST" ? "CBAP" :
    "CBQ";
  return `${prefix}${compact}${suffix}`;
}

function normalizeInvoice(invoice: any) {
  return {
    id: invoice.id,
    documentNumber: invoice.documentNumber,
    type: invoice.type,
    status: invoice.status,
    orderId: invoice.orderId ?? null,
    orderNumber: invoice.order?.orderNumber ?? null,
    customerName: invoice.customerName,
    customerEmail: invoice.customerEmail,
    customerPhone: invoice.customerPhone ?? null,
    company: invoice.company ?? null,
    billingAddress: invoice.billingAddress ?? null,
    currency: invoice.currency ?? "GBP",
    subtotal: money(invoice.subtotal),
    tax: money(invoice.tax),
    total: money(invoice.total),
    amountPaid: money(invoice.amountPaid),
    balanceDue: money(invoice.balanceDue),
    paymentLink: invoice.paymentLink ?? null,
    bankDetails: invoice.bankDetails ?? "",
    notes: invoice.notes ?? "",
    paymentTerms: invoice.paymentTerms ?? "",
    sentAt: invoice.sentAt ?? null,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
    lines: (invoice.lines ?? []).map((line: any) => ({
      id: line.id,
      description: line.description,
      sku: line.sku ?? null,
      quantity: money(line.quantity),
      unitPrice: money(line.unitPrice),
      lineTotal: money(line.lineTotal),
      sortOrder: line.sortOrder ?? 0,
    })),
  };
}

function linesFromInput(input: InputLine[]) {
  return input
    .map((line, index) => {
      const quantity = Math.max(money(line.quantity ?? line.qty ?? 1), 0);
      const unitPrice = money(line.unitPrice ?? line.unit ?? 0);
      const bits = [String(line.description ?? line.desc ?? "").trim()];
      if (line.hsCode) bits.push(`HS Code: ${String(line.hsCode).trim()}`);
      if (line.origin) bits.push(`Origin: ${String(line.origin).trim()}`);
      const description = bits.filter(Boolean).join("\n");
      if (!description) return null;
      return {
        description,
        sku: String(line.sku ?? "").trim() || null,
        quantity,
        unitPrice,
        lineTotal: money(quantity * unitPrice),
        sortOrder: index,
      };
    })
    .filter(Boolean) as { description: string; sku: string | null; quantity: number; unitPrice: number; lineTotal: number; sortOrder: number }[];
}

function defaultTerms(type: InvoiceType) {
  if (type === "QUOTE") return "Quote only. Subject to stock availability, final shipping confirmation, and Combay Limited acceptance.";
  if (type === "PROFORMA_INVOICE") return "Payment required before dispatch. Pay by card using the payment link where provided, or by bank transfer using the details shown.";
  if (type === "ADDITIONAL_PAYMENT_REQUEST") return "Supplementary charge linked to an existing order. Payment required before the additional service/dispatch step is completed.";
  return "Paid order invoice. Balance due is £0.00 unless explicitly stated otherwise.";
}

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");
  const status = request.nextUrl.searchParams.get("status");
  const area = request.nextUrl.searchParams.get("area");

  const dbResult = await withDatabase(async () => {
    const where: any = {};
    if (type && ALLOWED_TYPES.includes(type as InvoiceType)) where.type = type;
    if (area === "quotes") where.type = { in: ["QUOTE", "PROFORMA_INVOICE", "ADDITIONAL_PAYMENT_REQUEST"] };
    if (area === "orders") where.type = { in: [...ORDER_DOCUMENT_TYPES] };
    if (status) where.status = status;
    return prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 150,
      include: { lines: { orderBy: { sortOrder: "asc" } }, order: true },
    });
  });

  if (!dbResult.ok) {
    return NextResponse.json({ ok: true, mode: "preview", reason: dbResult.reason, data: [], documents: [] });
  }

  const documents = dbResult.data.map(normalizeInvoice);
  return NextResponse.json({ ok: true, mode: "database", data: documents, documents });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });

  const type = String(body.type ?? "QUOTE").toUpperCase() as InvoiceType;
  if (!ALLOWED_TYPES.includes(type)) return NextResponse.json({ ok: false, error: "Invalid document type" }, { status: 400 });

  const dbResult = await withDatabase(async () => {
    const orderId = String(body.orderId ?? "").trim();

    if (orderId) {
      const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!order) throw new Error("Order not found");

      const orderDocType: InvoiceType = type === "ADDITIONAL_PAYMENT_REQUEST" ? "ADDITIONAL_PAYMENT_REQUEST" : "COMMERCIAL_INVOICE";
      const subtotal = money(body.subtotalOverride ?? order.subtotal);
      const tax = money(body.taxOverride ?? order.tax);
      const total = money(body.totalOverride ?? order.total);
      const paid = orderDocType === "COMMERCIAL_INVOICE" && order.paymentStatus === "PAID" ? total : money(body.amountPaid ?? 0);
      const balanceDue = Math.max(money(total - paid), 0);
      const status = orderDocType === "COMMERCIAL_INVOICE" && balanceDue === 0 ? "PAID" : "AWAITING_PAYMENT";

      return prisma.invoice.create({
        data: {
          documentNumber: makeDocumentNumber(orderDocType),
          type: orderDocType,
          status,
          orderId: order.id,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          customerPhone: order.customerPhone,
          company: order.company,
          billingAddress: order.shippingAddress ? JSON.stringify(order.shippingAddress, null, 2) : null,
          currency: order.currency ?? "GBP",
          subtotal,
          tax,
          total,
          amountPaid: paid,
          balanceDue,
          paymentLink: String(body.paymentLink ?? "").trim() || null,
          bankDetails: String(body.bankDetails ?? "").trim() || null,
          notes: body.notes ?? (orderDocType === "COMMERCIAL_INVOICE" ? `Commercial invoice generated from paid order ${order.orderNumber}.` : `Additional payment request linked to order ${order.orderNumber}.`),
          paymentTerms: body.paymentTerms ?? defaultTerms(orderDocType),
          lines: {
            create: orderDocType === "ADDITIONAL_PAYMENT_REQUEST" && Array.isArray(body.lines) && body.lines.length
              ? linesFromInput(body.lines)
              : order.items.map((item, index) => ({
                  description: item.title,
                  sku: item.sku,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  lineTotal: item.lineTotal,
                  sortOrder: index,
                })),
          },
        },
        include: { lines: { orderBy: { sortOrder: "asc" } }, order: true },
      });
    }

    const lines = linesFromInput(body.lines ?? []);
    if (!lines.length) throw new Error("At least one line item is required");

    const subtotal = money(lines.reduce((sum, line) => sum + line.lineTotal, 0));
    const taxRate = body.taxRate === undefined ? 0.2 : money(body.taxRate);
    const tax = money(subtotal * taxRate);
    const total = money(subtotal + tax);
    const amountPaid = money(body.amountPaid ?? 0);
    const balanceDue = Math.max(money(total - amountPaid), 0);

    const customerName = String(body.customerName ?? body.name ?? "").trim();
    const customerEmail = String(body.customerEmail ?? body.email ?? "").trim();
    if (!customerName || !customerEmail) throw new Error("Customer name and email are required");

    const initialStatus = type === "QUOTE" ? "DRAFT" : balanceDue === 0 && amountPaid > 0 ? "PAID" : "AWAITING_PAYMENT";

    return prisma.invoice.create({
      data: {
        documentNumber: makeDocumentNumber(type),
        type,
        status: initialStatus,
        customerName,
        customerEmail,
        customerPhone: String(body.customerPhone ?? body.phone ?? "").trim() || null,
        company: String(body.company ?? "").trim() || null,
        billingAddress: String(body.billingAddress ?? body.address ?? "").trim() || null,
        currency: "GBP",
        subtotal,
        tax,
        total,
        amountPaid,
        balanceDue,
        paymentLink: String(body.paymentLink ?? "").trim() || null,
        bankDetails: String(body.bankDetails ?? "").trim() || null,
        notes: String(body.notes ?? "").trim() || null,
        paymentTerms: String(body.paymentTerms ?? "").trim() || defaultTerms(type),
        lines: { create: lines },
      },
      include: { lines: { orderBy: { sortOrder: "asc" } }, order: true },
    });
  });

  if (!dbResult.ok) {
    return NextResponse.json({ ok: false, error: "Could not create document", reason: dbResult.reason }, { status: 500 });
  }

  const document = normalizeInvoice(dbResult.data);
  return NextResponse.json({ ok: true, mode: "database", document, data: document });
}
