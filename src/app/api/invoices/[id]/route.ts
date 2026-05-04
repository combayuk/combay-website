import { NextResponse, type NextRequest } from "next/server";
import { prisma, withDatabase } from "@/lib/db";

function money(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
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
    shippingCountry: invoice.shippingCountry ?? null,
    shippingCost: money(invoice.shippingCost),
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

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const dbResult = await withDatabase(async () => prisma.invoice.findUnique({
    where: { id: params.id },
    include: { lines: { orderBy: { sortOrder: "asc" } }, order: true },
  }));

  if (!dbResult.ok) return NextResponse.json({ ok: false, error: "Database unavailable", reason: dbResult.reason }, { status: 500 });
  if (!dbResult.data) return NextResponse.json({ ok: false, error: "Document not found" }, { status: 404 });
  const document = normalizeInvoice(dbResult.data);
  return NextResponse.json({ ok: true, mode: "database", document, data: document });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });

  const allowedStatuses = ["DRAFT", "SENT", "AWAITING_PAYMENT", "ACCEPTED", "PAID", "CANCELLED", "EXPIRED", "VOID"];
  const status = body.status === undefined ? undefined : String(body.status).toUpperCase();
  if (status && !allowedStatuses.includes(status)) return NextResponse.json({ ok: false, error: "Invalid document status" }, { status: 400 });

  const data: any = {};
  if (status) data.status = status;
  if (status === "SENT") data.sentAt = new Date();
  if (body.notes !== undefined) data.notes = String(body.notes ?? "");
  if (body.paymentTerms !== undefined) data.paymentTerms = String(body.paymentTerms ?? "");
  if (body.paymentLink !== undefined) data.paymentLink = String(body.paymentLink ?? "") || null;
  if (body.bankDetails !== undefined) data.bankDetails = String(body.bankDetails ?? "") || null;
  if (body.shippingCountry !== undefined) data.shippingCountry = String(body.shippingCountry ?? "") || null;
  if (body.shippingCost !== undefined) data.shippingCost = money(body.shippingCost);
  if (body.amountPaid !== undefined) data.amountPaid = money(body.amountPaid);
  if (body.balanceDue !== undefined) data.balanceDue = money(body.balanceDue);

  const dbResult = await withDatabase(async () => prisma.invoice.update({
    where: { id: params.id },
    data,
    include: { lines: { orderBy: { sortOrder: "asc" } }, order: true },
  }));

  if (!dbResult.ok) return NextResponse.json({ ok: false, error: "Could not update document", reason: dbResult.reason }, { status: 500 });
  const document = normalizeInvoice(dbResult.data);
  return NextResponse.json({ ok: true, mode: "database", document, data: document });
}
