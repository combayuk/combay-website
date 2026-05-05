import { prisma, withDatabase } from "@/lib/db";
import { captureLead } from "@/lib/leads";
import { DEMO_REQUESTS, generateReference, readJsonBody, todayLabel } from "@/lib/requests";
import { sendAdminNotification, sendCustomerAcknowledgement } from "@/lib/mailer";

const DEFAULT_TERMS = `Payment 100% in advance prior to shipment.
Pay by card using the payment link where provided, or by bank transfer using the details shown.
30 days return to base warranty (unless sold for parts)
Customs duty is payable by the buyer`;

function money(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function makeQuoteNumber() {
  const now = new Date();
  const compact = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CBQ${compact}${suffix}`;
}

export async function GET() {
  const dbResult = await withDatabase(async () => prisma.quoteRequest.findMany({ orderBy: { createdAt: "desc" }, take: 100 }));
  if (dbResult.ok) return Response.json({ ok: true, mode: "database", data: dbResult.data });
  return Response.json({ ok: true, mode: "preview", reason: dbResult.reason, data: DEMO_REQUESTS.filter((request) => request.type === "quote") });
}

export async function POST(req: Request) {
  const body = await readJsonBody(req);
  const reference = typeof body.reference === "string" ? body.reference : generateReference("QT");
  const product = typeof body.product === "object" && body.product !== null ? (body.product as any) : {};

  if (!body.email && !body.name && !product.sku) {
    return Response.json({ ok: false, error: "Quote request requires customer or product context." }, { status: 400 });
  }

  const record = {
    id: reference,
    type: "quote" as const,
    date: todayLabel(),
    name: String(body.name || "Website enquiry"),
    email: String(body.email || "not-provided"),
    phone: body.phone ? String(body.phone) : undefined,
    company: body.company ? String(body.company) : undefined,
    country: body.country ? String(body.country) : undefined,
    message: String(body.message || body.description || "Quote requested from product page."),
    productSku: product.sku ? String(product.sku) : undefined,
    productTitle: product.title ? String(product.title) : undefined,
    status: "NEW" as const,
    source: String(body.source || "web form (RFQ)"),
    quantity: Math.max(1, Math.floor(Number(body.quantity || 1))),
  };

  const dbResult = await withDatabase(async () => {
    const request = await prisma.quoteRequest.create({
      data: {
        reference,
        name: record.name,
        email: record.email,
        phone: record.phone,
        company: record.company,
        description: record.message,
        quantity: record.quantity,
        productSku: record.productSku,
        productTitle: record.productTitle,
        productUrl: product.slug ? `/shop/${product.slug}` : body.productUrl,
        source: record.source,
      },
    });

    const dbProduct = record.productSku
      ? await prisma.product.findUnique({ where: { sku: record.productSku } }).catch(() => null)
      : null;
    const unitPrice = dbProduct && !dbProduct.priceOnRequest && dbProduct.price !== null ? money(dbProduct.price) : money(product.price ?? 0);
    const lineTotal = money(unitPrice * record.quantity);

    const quote = await prisma.invoice.create({
      data: {
        documentNumber: makeQuoteNumber(),
        type: "QUOTE",
        status: "DRAFT",
        customerName: record.name,
        customerEmail: record.email,
        customerPhone: record.phone ?? null,
        company: record.company ?? null,
        billingAddress: record.country ? `Country: ${record.country}` : null,
        currency: "GBP",
        subtotal: lineTotal,
        tax: 0,
        shippingCost: 0,
        total: lineTotal,
        amountPaid: 0,
        balanceDue: lineTotal,
        notes: `Auto-created from RFQ ${reference}. Customer message: ${record.message}`,
        paymentTerms: DEFAULT_TERMS,
        lines: {
          create: [{
            description: record.productTitle || record.message || "Quote request item",
            sku: record.productSku ?? null,
            quantity: record.quantity,
            unitPrice,
            lineTotal,
            sortOrder: 0,
          }],
        },
      },
      include: { lines: true },
    });

    await captureLead({
      name: record.name,
      email: record.email,
      phone: record.phone,
      country: record.country,
      company: record.company,
      source: "web form (RFQ)",
      sourceRef: reference,
      productSku: record.productSku,
      productTitle: record.productTitle,
      invoiceId: quote.id,
      notes: record.message,
    });

    return { request, quote };
  });

  const email = {
    admin: await sendAdminNotification({
      subject: `Combay quote request ${reference}`,
      title: `New quote request`,
      message: `Reference: ${reference}. A draft quote has been created in Quotes / Proformas for admin review.`,
      rows: [["Name", record.name], ["Email", record.email], ["Phone", record.phone || "—"], ["Company", record.company || "—"], ["Product SKU", record.productSku || "—"], ["Product", record.productTitle || "—"], ["Message", record.message]],
    }),
    customer: record.email && record.email !== "not-provided"
      ? await sendCustomerAcknowledgement({
          to: record.email,
          name: record.name,
          subject: `Combay quote request received ${reference}`,
          title: `Quote request received`,
          reference,
          body: `Thank you for your quote request. We have received the item details and will confirm price, stock, shipping and any required documentation before sending a formal quote.`,
        })
      : { configured: false, sent: false, provider: "not-configured", message: "Customer email not sent because customer email was missing." },
  };

  console.info("[quote-request]", record);

  return Response.json({
    ok: true,
    reference,
    mode: dbResult.ok ? "database" : "preview",
    persistence: dbResult.ok ? "saved" : "not-saved",
    persistenceMessage: dbResult.ok ? "Saved to PostgreSQL and draft quote created." : dbResult.reason,
    message: "Quote request received.",
    email,
    request: dbResult.ok ? dbResult.data.request : record,
    draftQuote: dbResult.ok ? dbResult.data.quote : null,
  });
}
