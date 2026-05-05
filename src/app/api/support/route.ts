import { getServerSession } from "next-auth";
import { prisma, withDatabase } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { captureLead } from "@/lib/leads";
import { DEMO_REQUESTS, generateReference, readJsonBody, todayLabel } from "@/lib/requests";
import { sendAdminNotification, sendCustomerAcknowledgement } from "@/lib/mailer";

function serialiseTicket(ticket: any) {
  return {
    id: ticket.reference || ticket.id,
    dbId: ticket.id,
    type: "support",
    date: ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString("en-GB") : todayLabel(),
    name: ticket.name,
    email: ticket.email,
    phone: ticket.phone || undefined,
    country: ticket.country || undefined,
    company: ticket.company || undefined,
    orderId: ticket.orderId || undefined,
    subject: ticket.subject,
    message: ticket.message,
    productSku: ticket.productSku || undefined,
    productTitle: ticket.productTitle || undefined,
    status: ticket.status,
    source: ticket.source || undefined,
    adminNotes: ticket.adminNotes || undefined,
    lastResponseAt: ticket.lastResponseAt || undefined,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    messages: Array.isArray(ticket.messages) ? ticket.messages.map((message: any) => ({
      id: message.id,
      authorType: message.authorType,
      authorName: message.authorName,
      authorEmail: message.authorEmail,
      message: message.message,
      isCustomerVisible: message.isCustomerVisible,
      emailSent: message.emailSent,
      createdAt: message.createdAt,
    })) : [],
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const portal = searchParams.get("portal") === "1";
  const emailParam = searchParams.get("email") || "";
  const session = await getServerSession(authOptions).catch(() => null);
  const sessionEmail = session?.user?.email || "";
  const email = portal ? (emailParam || sessionEmail) : "";

  const dbResult = await withDatabase(async () => prisma.supportTicket.findMany({
    where: portal ? (email ? { email } : { id: "__no_portal_session__" }) : undefined,
    orderBy: { updatedAt: "desc" },
    take: portal ? 50 : 200,
    include: { messages: { orderBy: { createdAt: "asc" } } },
  }));

  if (dbResult.ok) {
    const data = dbResult.data.map(serialiseTicket);
    return Response.json({ ok: true, mode: "database", data, tickets: data });
  }

  const preview = DEMO_REQUESTS.filter((request) => request.type === "support");
  return Response.json({ ok: true, mode: "preview", reason: dbResult.reason, data: preview, tickets: preview });
}

export async function POST(req: Request) {
  const body = await readJsonBody(req);
  const session = await getServerSession(authOptions).catch(() => null);
  const reference = typeof body.reference === "string" ? body.reference : generateReference("SUP");
  const product = typeof body.product === "object" && body.product !== null ? (body.product as any) : {};
  const source = String(body.source || "website");
  const sessionEmail = session?.user?.email || "";
  const sessionName = session?.user?.name || "";
  const submittedEmail = String(body.email || "").trim();
  const canonicalEmail = source === "customer-portal" && sessionEmail ? sessionEmail : submittedEmail;

  if (!canonicalEmail && !body.subject && !product.sku) {
    return Response.json({ ok: false, error: "Support request requires an email, subject or product context." }, { status: 400 });
  }

  const record = {
    id: reference,
    type: "support" as const,
    date: todayLabel(),
    name: String(body.name || sessionName || "Website user"),
    email: canonicalEmail || "not-provided",
    phone: body.phone ? String(body.phone) : undefined,
    country: body.country ? String(body.country) : undefined,
    company: body.company ? String(body.company) : undefined,
    orderId: body.orderId ? String(body.orderId) : undefined,
    subject: String(body.subject || (product.sku ? `Question about ${product.sku}` : "Support request")),
    message: String(body.message || body.description || "Support request submitted."),
    productSku: product.sku ? String(product.sku) : body.productSku ? String(body.productSku) : undefined,
    productTitle: product.title ? String(product.title) : body.productTitle ? String(body.productTitle) : undefined,
    status: "NEW" as const,
    source,
  };

  const dbResult = await withDatabase(async () => prisma.supportTicket.create({
    data: {
      reference,
      name: record.name,
      email: record.email,
      phone: record.phone,
      country: record.country,
      company: record.company,
      orderId: record.orderId,
      subject: record.subject,
      message: record.message,
      productSku: record.productSku,
      productTitle: record.productTitle,
      source: record.source,
      messages: {
        create: {
          authorType: "CUSTOMER",
          authorName: record.name,
          authorEmail: record.email,
          message: record.message,
          isCustomerVisible: true,
        },
      },
    },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  }));

  await captureLead({
    name: record.name,
    email: record.email,
    phone: record.phone,
    country: record.country,
    company: record.company,
    source: record.source.includes("product") ? "web form (product question)" : "web form (support)",
    sourceRef: reference,
    productSku: record.productSku,
    productTitle: record.productTitle,
    notes: `${record.subject}: ${record.message}`,
  });

  const email = {
    admin: await sendAdminNotification({
      subject: `Combay support ticket ${reference}`,
      title: `New support ticket`,
      message: `Reference: ${reference}`,
      rows: [["Name", record.name], ["Email", record.email], ["Phone", record.phone || "—"], ["Company", record.company || "—"], ["Country", record.country || "—"], ["Order", record.orderId || "—"], ["Subject", record.subject], ["Product SKU", record.productSku || "—"], ["Message", record.message]],
    }),
    customer: record.email && record.email !== "not-provided"
      ? await sendCustomerAcknowledgement({
          to: record.email,
          name: record.name,
          subject: `Combay support ticket received ${reference}`,
          title: `Support ticket received`,
          reference,
          body: `Thank you. Your support request has been received and logged against reference ${reference}. We will review your message and respond with the next step.`,
          ctaUrl: `${process.env.NEXTAUTH_URL || "https://combay.co.uk"}/portal/support`,
          ctaLabel: "View support portal",
        })
      : { configured: false, sent: false, provider: "not-configured" as const, message: "Customer email not sent because customer email was missing." },
  };

  return Response.json({
    ok: true,
    reference,
    mode: dbResult.ok ? "database" : "preview",
    persistence: dbResult.ok ? "saved" : "not-saved",
    persistenceMessage: dbResult.ok ? "Saved to PostgreSQL." : dbResult.reason,
    message: "Support request received.",
    email,
    request: dbResult.ok ? serialiseTicket(dbResult.data) : record,
  });
}
