import { prisma, withDatabase } from "@/lib/db";
import { DEMO_REQUESTS, generateReference, getEmailStatus, readJsonBody, todayLabel } from "@/lib/requests";

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
    message: String(body.message || body.description || "Quote requested from product page."),
    productSku: product.sku ? String(product.sku) : undefined,
    productTitle: product.title ? String(product.title) : undefined,
    status: "NEW" as const,
    source: String(body.source || "website"),
  };

  const dbResult = await withDatabase(async () => prisma.quoteRequest.create({
    data: {
      reference,
      name: record.name,
      email: record.email,
      phone: record.phone,
      company: record.company,
      description: record.message,
      quantity: Number(body.quantity || 1),
      productSku: record.productSku,
      productTitle: record.productTitle,
      productUrl: product.slug ? `/shop/${product.slug}` : body.productUrl,
      source: record.source,
    },
  }));

  console.info("[quote-request]", record);

  return Response.json({
    ok: true,
    reference,
    mode: dbResult.ok ? "database" : "preview",
    persistence: dbResult.ok ? "saved" : "not-saved",
    persistenceMessage: dbResult.ok ? "Saved to PostgreSQL." : dbResult.reason,
    message: "Quote request received.",
    email: getEmailStatus(),
    request: dbResult.ok ? dbResult.data : record,
  });
}
