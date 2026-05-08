import { NextResponse, type NextRequest } from "next/server";
import { prisma, withDatabase } from "@/lib/db";
import { captureLead } from "@/lib/leads";

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

function normaliseLines(input: any[]) {
  return (input || [])
    .map((line, index) => {
      const description = String(line.description ?? line.desc ?? "").trim();
      if (!description) return null;
      const quantity = Math.max(money(line.quantity ?? line.qty ?? 1), 0);
      const unitPrice = money(line.unitPrice ?? line.unit ?? 0);
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

async function createStripeCheckoutLink(args: { documentId: string; documentNumber: string; customerEmail: string; total: number; description: string; baseUrl: string; }) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || args.total <= 0) return null;
  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("success_url", `${args.baseUrl}/checkout/success?invoice=${encodeURIComponent(args.documentId)}&session_id={CHECKOUT_SESSION_ID}`);
  body.set("cancel_url", `${args.baseUrl}/admin/invoices`);
  body.set("customer_email", args.customerEmail);
  body.set("metadata[invoiceId]", args.documentId);
  body.set("metadata[documentNumber]", args.documentNumber);
  body.set("line_items[0][quantity]", "1");
  body.set("line_items[0][price_data][currency]", "gbp");
  body.set("line_items[0][price_data][unit_amount]", String(Math.round(args.total * 100)));
  body.set("line_items[0][price_data][product_data][name]", args.description);

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.url) throw new Error(data.error?.message || "Stripe payment link could not be generated");
  return data.url as string;
}

function baseUrl(request: NextRequest) {
  return process.env.NEXTAUTH_URL || request.nextUrl.origin;
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

  const allowedStatuses = ["DRAFT", "SENT", "AWAITING_PAYMENT", "ACCEPTED", "PAID", "RECEIVED", "CANCELLED", "EXPIRED", "VOID"];
  const status = body.status === undefined ? undefined : String(body.status).toUpperCase();
  if (status && !allowedStatuses.includes(status)) return NextResponse.json({ ok: false, error: "Invalid document status" }, { status: 400 });

  const dbResult = await withDatabase(async () => {
    const existing = await prisma.invoice.findUnique({ where: { id: params.id }, include: { lines: { orderBy: { sortOrder: "asc" } }, order: true } });
    if (!existing) throw new Error("Document not found");

    const data: any = {};
    if (status) data.status = status;
    if (status === "SENT") data.sentAt = new Date();
    if (body.customerName !== undefined) data.customerName = String(body.customerName ?? "").trim() || existing.customerName;
    if (body.customerEmail !== undefined) data.customerEmail = String(body.customerEmail ?? "").trim() || existing.customerEmail;
    if (body.customerPhone !== undefined) data.customerPhone = String(body.customerPhone ?? "").trim() || null;
    if (body.company !== undefined) data.company = String(body.company ?? "").trim() || null;
    if (body.billingAddress !== undefined) data.billingAddress = String(body.billingAddress ?? "").trim() || null;
    if (body.notes !== undefined) data.notes = String(body.notes ?? "").trim() || null;
    if (body.paymentTerms !== undefined) data.paymentTerms = String(body.paymentTerms ?? "").trim() || null;
    if (body.paymentLink !== undefined) data.paymentLink = String(body.paymentLink ?? "").trim() || null;
    if (body.bankDetails !== undefined) data.bankDetails = String(body.bankDetails ?? "").trim() || null;
    if (body.shippingCountry !== undefined) data.shippingCountry = String(body.shippingCountry ?? "").trim() || null;
    if (body.shippingCost !== undefined) data.shippingCost = money(body.shippingCost);
    if (body.amountPaid !== undefined) data.amountPaid = money(body.amountPaid);

    const nextLines = Array.isArray(body.lines) ? normaliseLines(body.lines) : null;
    const isPackingList = existing.type === "PACKING_LIST";

    if (nextLines) {
      const subtotal = isPackingList ? 0 : money(nextLines.reduce((sum, line) => sum + line.lineTotal, 0));
      const taxRate = body.taxRate === undefined ? (money(existing.tax) > 0 && subtotal > 0 ? 0.2 : 0) : money(body.taxRate);
      const tax = isPackingList ? 0 : money(subtotal * taxRate);
      const shippingCost = isPackingList ? 0 : money(body.shippingCost ?? existing.shippingCost ?? 0);
      const total = isPackingList ? 0 : money(subtotal + tax + shippingCost);
      const amountPaid = isPackingList ? 0 : money(body.amountPaid ?? existing.amountPaid ?? 0);
      data.subtotal = subtotal;
      data.tax = tax;
      data.shippingCost = shippingCost;
      data.total = total;
      data.amountPaid = amountPaid;
      data.balanceDue = Math.max(money(total - amountPaid), 0);
      if (body.regeneratePaymentLink && existing.type === "PROFORMA_INVOICE" && data.balanceDue > 0) data.paymentLink = null;
    } else if (body.balanceDue !== undefined) {
      data.balanceDue = money(body.balanceDue);
    }

    let updated = await prisma.invoice.update({
      where: { id: params.id },
      data,
      include: { lines: { orderBy: { sortOrder: "asc" } }, order: true },
    });

    if (nextLines) {
      await prisma.invoiceLine.deleteMany({ where: { invoiceId: params.id } });
      await prisma.invoiceLine.createMany({ data: nextLines.map((line) => ({ ...line, invoiceId: params.id })) });
      updated = await prisma.invoice.findUnique({ where: { id: params.id }, include: { lines: { orderBy: { sortOrder: "asc" } }, order: true } }) as any;
    }

    if (body.regeneratePaymentLink && updated.type === "PROFORMA_INVOICE" && Number(updated.balanceDue) > 0) {
      const paymentLink = await createStripeCheckoutLink({ documentId: updated.id, documentNumber: updated.documentNumber, customerEmail: updated.customerEmail, total: money(updated.balanceDue), description: updated.documentNumber, baseUrl: baseUrl(request) });
      if (paymentLink) updated = await prisma.invoice.update({ where: { id: params.id }, data: { paymentLink }, include: { lines: { orderBy: { sortOrder: "asc" } }, order: true } });
    }

    if (status === "RECEIVED" && !updated.orderId) {
      const order = await prisma.order.create({
        data: {
          orderNumber: `CB-DOC-${updated.documentNumber}`,
          customerName: updated.customerName,
          customerEmail: updated.customerEmail,
          customerPhone: updated.customerPhone,
          company: updated.company,
          status: "PAYMENT_RECEIVED",
          paymentStatus: "PAID",
          subtotal: updated.subtotal,
          shipping: updated.shippingCost,
          tax: updated.tax,
          total: updated.total,
          currency: updated.currency,
          notes: `Created when ${updated.documentNumber} was marked as received.`,
          shippingAddress: updated.billingAddress ? { address: updated.billingAddress } : undefined,
        },
      });
      updated = await prisma.invoice.update({
        where: { id: params.id },
        data: { orderId: order.id, amountPaid: updated.total, balanceDue: 0 },
        include: { lines: { orderBy: { sortOrder: "asc" } }, order: true },
      });
      await captureLead({
        name: updated.customerName,
        email: updated.customerEmail,
        phone: updated.customerPhone,
        company: updated.company,
        source: "paid bank transfer",
        sourceRef: updated.documentNumber,
        productSku: updated.lines?.[0]?.sku,
        productTitle: updated.lines?.[0]?.description,
        orderId: order.id,
        invoiceId: updated.id,
        notes: `${updated.documentNumber} marked as received and converted to order.`,
      });
    }

    return updated;
  });

  if (!dbResult.ok) return NextResponse.json({ ok: false, error: "Could not update document", reason: dbResult.reason }, { status: 500 });
  const document = normalizeInvoice(dbResult.data);
  return NextResponse.json({ ok: true, mode: "database", document, data: document });
}
