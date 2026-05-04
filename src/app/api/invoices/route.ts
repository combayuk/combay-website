import { NextResponse, type NextRequest } from "next/server";
import { prisma, withDatabase } from "@/lib/db";

const ALLOWED_TYPES = ["QUOTE", "INVOICE"] as const;
type InvoiceType = (typeof ALLOWED_TYPES)[number];

type InputLine = {
  description?: string;
  desc?: string;
  sku?: string;
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
  const prefix = type === "INVOICE" ? "CB-INV" : "CB-QUO";
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${ymd}-${Date.now().toString(36).toUpperCase().slice(-5)}${rand}`;
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
      const description = String(line.description ?? line.desc ?? "").trim();
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

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");
  const status = request.nextUrl.searchParams.get("status");

  const dbResult = await withDatabase(async () => {
    const where: any = {};
    if (type && ALLOWED_TYPES.includes(type as InvoiceType)) where.type = type;
    if (status) where.status = status;
    return prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
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

      const subtotal = money(order.subtotal);
      const tax = money(order.tax);
      const total = money(order.total);
      return prisma.invoice.create({
        data: {
          documentNumber: makeDocumentNumber(type),
          type,
          status: "DRAFT",
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
          notes: body.notes ?? `Created from order ${order.orderNumber}.`,
          paymentTerms: body.paymentTerms ?? (type === "INVOICE" ? "Payment received via Stripe checkout unless stated otherwise." : "Quote valid for 7 days unless stated otherwise."),
          lines: {
            create: order.items.map((item, index) => ({
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

    const customerName = String(body.customerName ?? body.name ?? "").trim();
    const customerEmail = String(body.customerEmail ?? body.email ?? "").trim();
    if (!customerName || !customerEmail) throw new Error("Customer name and email are required");

    return prisma.invoice.create({
      data: {
        documentNumber: makeDocumentNumber(type),
        type,
        status: "DRAFT",
        customerName,
        customerEmail,
        customerPhone: String(body.customerPhone ?? body.phone ?? "").trim() || null,
        company: String(body.company ?? "").trim() || null,
        billingAddress: String(body.billingAddress ?? body.address ?? "").trim() || null,
        currency: "GBP",
        subtotal,
        tax,
        total,
        notes: String(body.notes ?? "").trim() || null,
        paymentTerms: String(body.paymentTerms ?? "").trim() || null,
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
