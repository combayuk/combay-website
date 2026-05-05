import { prisma, withDatabase } from "@/lib/db";
import { DEMO_REQUESTS, generateReference, readJsonBody, todayLabel } from "@/lib/requests";
import { sendAdminNotification, sendCustomerAcknowledgement } from "@/lib/mailer";

export async function GET() {
  const dbResult = await withDatabase(async () => prisma.supportTicket.findMany({ orderBy: { createdAt: "desc" }, take: 100 }));
  if (dbResult.ok) return Response.json({ ok: true, mode: "database", data: dbResult.data });
  return Response.json({ ok: true, mode: "preview", reason: dbResult.reason, data: DEMO_REQUESTS.filter((request) => request.type === "support") });
}

export async function POST(req: Request) {
  const body = await readJsonBody(req);
  const reference = typeof body.reference === "string" ? body.reference : generateReference("SUP");
  const product = typeof body.product === "object" && body.product !== null ? (body.product as any) : {};

  if (!body.email && !body.subject && !product.sku) {
    return Response.json({ ok: false, error: "Support request requires an email, subject or product context." }, { status: 400 });
  }

  const record = {
    id: reference,
    type: "support" as const,
    date: todayLabel(),
    name: String(body.name || "Website user"),
    email: String(body.email || "not-provided"),
    phone: body.phone ? String(body.phone) : undefined,
    company: body.company ? String(body.company) : undefined,
    subject: String(body.subject || (product.sku ? `Question about ${product.sku}` : "Support request")),
    message: String(body.message || body.description || "Support request submitted."),
    productSku: product.sku ? String(product.sku) : undefined,
    productTitle: product.title ? String(product.title) : undefined,
    status: "NEW" as const,
    source: String(body.source || "website"),
  };

  const dbResult = await withDatabase(async () => prisma.supportTicket.create({
    data: {
      reference,
      name: record.name,
      email: record.email,
      phone: record.phone,
      company: record.company,
      subject: record.subject,
      message: record.message,
      productSku: record.productSku,
      productTitle: record.productTitle,
      source: record.source,
    },
  }));


  const email = {
    admin: await sendAdminNotification({
      subject: `Combay support ticket ${reference}`,
      title: `New support ticket`,
      message: `Reference: ${reference}`,
      rows: [["Name", record.name], ["Email", record.email], ["Phone", record.phone || "—"], ["Company", record.company || "—"], ["Subject", record.subject], ["Product SKU", record.productSku || "—"], ["Message", record.message]],
    }),
    customer: record.email && record.email !== "not-provided"
      ? await sendCustomerAcknowledgement({
          to: record.email,
          name: record.name,
          subject: `Combay support ticket received ${reference}`,
          title: `New support ticket`,
          reference,
          body: `Thank you. Your support request has been received and our team will respond as soon as possible.`,
        })
      : { configured: false, sent: false, provider: "not-configured", message: "Customer email not sent because customer email was missing." },
  };

  console.info("[support-request]", record);

  return Response.json({
    ok: true,
    reference,
    mode: dbResult.ok ? "database" : "preview",
    persistence: dbResult.ok ? "saved" : "not-saved",
    persistenceMessage: dbResult.ok ? "Saved to PostgreSQL." : dbResult.reason,
    message: "Support request received.",
    email,
    request: dbResult.ok ? dbResult.data : record,
  });
}
