import { NextResponse, type NextRequest } from "next/server";
import { prisma, withDatabase } from "@/lib/db";

const ALLOWED_TYPES = ["QUOTE", "PROFORMA_INVOICE", "COMMERCIAL_INVOICE", "ADDITIONAL_PAYMENT_REQUEST", "PAID_INVOICE", "PACKING_LIST", "INVOICE"] as const;
type InvoiceType = (typeof ALLOWED_TYPES)[number];

const ORDER_DOCUMENT_TYPES = ["COMMERCIAL_INVOICE", "PAID_INVOICE", "PACKING_LIST", "ADDITIONAL_PAYMENT_REQUEST", "INVOICE"] as const;

const DEFAULT_BANK_DETAILS = `Combay Limited
Acc. # 37213788
Sort-code 60-84-64
IBAN. GB45 TRWI 6084 6437 2137 88
SWIFT. TRWIGB2LXXX
Bank Name & Address: Wise Payments Limited Worship Square, 65 Clifton Street London EC2A 4JE United Kingdom
Currency: GBP`;

const DEFAULT_TERMS = `Payment 100% in advance prior to shipment.
Pay by card using the payment link where provided, or by bank transfer using the details shown.
30 days return to base warranty (unless sold for parts)
Customs duty is payable by the buyer`;

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
    type === "COMMERCIAL_INVOICE" ? "CMCI" :
    type === "PAID_INVOICE" || type === "INVOICE" ? "CMPI" :
    type === "PACKING_LIST" ? "CMPL" :
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
    shippingCountry: invoice.shippingCountry ?? null,
    shippingCost: money(invoice.shippingCost),
    total: money(invoice.total),
    amountPaid: money(invoice.amountPaid),
    balanceDue: money(invoice.balanceDue),
    paymentLink: invoice.paymentLink ?? null,
    bankDetails: invoice.bankDetails ?? DEFAULT_BANK_DETAILS,
    notes: invoice.notes ?? "",
    paymentTerms: invoice.paymentTerms ?? DEFAULT_TERMS,
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

function defaultTerms(_type: InvoiceType) {
  return DEFAULT_TERMS;
}

function defaultBankDetails() {
  return DEFAULT_BANK_DETAILS;
}

function baseUrl(request: NextRequest) {
  return process.env.NEXTAUTH_URL || request.nextUrl.origin;
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
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.url) throw new Error(data.error?.message || "Stripe payment link could not be generated");
  return data.url as string;
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

  if (!dbResult.ok) return NextResponse.json({ ok: true, mode: "preview", reason: dbResult.reason, data: [], documents: [] });
  const documents = dbResult.data.map(normalizeInvoice);
  return NextResponse.json({ ok: true, mode: "database", data: documents, documents });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });

  const type = String(body.type ?? "QUOTE").toUpperCase() as InvoiceType;
  if (!ALLOWED_TYPES.includes(type)) return NextResponse.json({ ok: false, error: "Invalid document type" }, { status: 400 });

  const shouldGenerateLink = Boolean(body.autoGeneratePaymentLink ?? true);

  const dbResult = await withDatabase(async () => {
    const orderId = String(body.orderId ?? "").trim();

    if (orderId) {
      const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!order) throw new Error("Order not found");

      const orderDocType: InvoiceType =
        type === "ADDITIONAL_PAYMENT_REQUEST" ? "ADDITIONAL_PAYMENT_REQUEST" :
        type === "PAID_INVOICE" ? "PAID_INVOICE" :
        type === "PACKING_LIST" ? "PACKING_LIST" :
        "COMMERCIAL_INVOICE";
      const mandatoryHsCode = String(body.hsCode ?? "").trim();
      if (orderDocType === "COMMERCIAL_INVOICE" && !mandatoryHsCode) throw new Error("HS code is mandatory before creating a commercial invoice");
      const isPackingList = orderDocType === "PACKING_LIST";
      const subtotal = isPackingList ? 0 : money(body.subtotalOverride ?? order.subtotal);
      const tax = isPackingList ? 0 : money(body.taxOverride ?? order.tax);
      const shippingCost = isPackingList ? 0 : money(body.shippingCost ?? 0);
      const total = isPackingList ? 0 : money(body.totalOverride ?? (subtotal + tax + shippingCost));
      const isPaidDoc = ["COMMERCIAL_INVOICE", "PAID_INVOICE"].includes(orderDocType) && order.paymentStatus === "PAID";
      const paid = isPaidDoc ? total : money(body.amountPaid ?? 0);
      const balanceDue = Math.max(money(total - paid), 0);
      const status = isPackingList ? "DRAFT" : isPaidDoc && balanceDue === 0 ? "PAID" : "AWAITING_PAYMENT";

      let invoice = await prisma.invoice.create({
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
          shippingCountry: String(body.shippingCountry ?? "").trim() || null,
          shippingCost,
          total,
          amountPaid: paid,
          balanceDue,
          paymentLink: String(body.paymentLink ?? "").trim() || null,
          bankDetails: String(body.bankDetails ?? "").trim() || defaultBankDetails(),
          notes: body.notes ?? (orderDocType === "COMMERCIAL_INVOICE" ? `Commercial invoice generated from order ${order.orderNumber}. No loose batteries.` : orderDocType === "PAID_INVOICE" ? `Paid invoice generated from paid order ${order.orderNumber}.` : orderDocType === "PACKING_LIST" ? `Packing list generated from order ${order.orderNumber}.` : `Additional payment request linked to order ${order.orderNumber}.`),
          paymentTerms: body.paymentTerms ?? defaultTerms(orderDocType),
          lines: {
            create: orderDocType === "ADDITIONAL_PAYMENT_REQUEST" && Array.isArray(body.lines) && body.lines.length
              ? linesFromInput(body.lines)
              : order.items.map((item, index) => ({
                  description: orderDocType === "COMMERCIAL_INVOICE" ? `${item.title}\nHS Code: ${mandatoryHsCode}\nNo loose batteries` : item.title,
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

      if (orderDocType === "ADDITIONAL_PAYMENT_REQUEST" && shouldGenerateLink && invoice.balanceDue && !invoice.paymentLink) {
        const paymentLink = await createStripeCheckoutLink({ documentId: invoice.id, documentNumber: invoice.documentNumber, customerEmail: invoice.customerEmail, total: money(invoice.balanceDue), description: invoice.documentNumber, baseUrl: baseUrl(request) });
        if (paymentLink) invoice = await prisma.invoice.update({ where: { id: invoice.id }, data: { paymentLink }, include: { lines: { orderBy: { sortOrder: "asc" } }, order: true } });
      }
      return invoice;
    }

    const lines = linesFromInput(body.lines ?? []);
    if (!lines.length) throw new Error("At least one line item is required");

    const subtotal = money(lines.reduce((sum, line) => sum + line.lineTotal, 0));
    const taxRate = body.taxRate === undefined ? 0.2 : money(body.taxRate);
    const tax = money(subtotal * taxRate);
    const shippingCost = money(body.shippingCost ?? 0);
    const total = money(subtotal + tax + shippingCost);
    const amountPaid = money(body.amountPaid ?? 0);
    const balanceDue = Math.max(money(total - amountPaid), 0);

    const customerName = String(body.customerName ?? body.name ?? "").trim();
    const customerEmail = String(body.customerEmail ?? body.email ?? "").trim();
    if (!customerName || !customerEmail) throw new Error("Customer name and email are required");

    const initialStatus = type === "QUOTE" ? "DRAFT" : balanceDue === 0 && amountPaid > 0 ? "PAID" : "AWAITING_PAYMENT";

    let invoice = await prisma.invoice.create({
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
        shippingCountry: String(body.shippingCountry ?? "").trim() || null,
        shippingCost,
        total,
        amountPaid,
        balanceDue,
        paymentLink: String(body.paymentLink ?? "").trim() || null,
        bankDetails: String(body.bankDetails ?? "").trim() || defaultBankDetails(),
        notes: String(body.notes ?? "").trim() || null,
        paymentTerms: String(body.paymentTerms ?? "").trim() || defaultTerms(type),
        lines: { create: lines },
      },
      include: { lines: { orderBy: { sortOrder: "asc" } }, order: true },
    });

    if (["PROFORMA_INVOICE", "ADDITIONAL_PAYMENT_REQUEST"].includes(type) && shouldGenerateLink && balanceDue > 0 && !invoice.paymentLink) {
      const paymentLink = await createStripeCheckoutLink({ documentId: invoice.id, documentNumber: invoice.documentNumber, customerEmail: invoice.customerEmail, total: balanceDue, description: invoice.documentNumber, baseUrl: baseUrl(request) });
      if (paymentLink) invoice = await prisma.invoice.update({ where: { id: invoice.id }, data: { paymentLink }, include: { lines: { orderBy: { sortOrder: "asc" } }, order: true } });
    }

    return invoice;
  });

  if (!dbResult.ok) return NextResponse.json({ ok: false, error: "Could not create document", reason: dbResult.reason }, { status: 500 });
  const document = normalizeInvoice(dbResult.data);
  return NextResponse.json({ ok: true, mode: "database", document, data: document });
}
