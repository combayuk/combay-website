import { prisma, withDatabase } from "@/lib/db";
import { readJsonBody } from "@/lib/requests";
import { sendEmail, htmlShell, escapeHtml, emailButton } from "@/lib/mailer";
import { requireAdminApiSession, requireApiSession, isAdmin, sameEmail } from "@/lib/apiAccess";

const STATUSES = ["NEW", "IN_PROGRESS", "AWAITING_CUSTOMER", "RESOLVED", "CLOSED"] as const;
type Status = (typeof STATUSES)[number];

function normaliseStatus(value: unknown): Status | undefined {
  const status = String(value || "").toUpperCase().replace(/\s+/g, "_") as Status;
  return STATUSES.includes(status) ? status : undefined;
}

function serialiseTicket(ticket: any) {
  return {
    id: ticket.reference || ticket.id,
    dbId: ticket.id,
    type: "support",
    date: ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString("en-GB") : "",
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

async function findTicket(id: string) {
  return prisma.supportTicket.findFirst({
    where: { OR: [{ id }, { reference: id }] },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const access = await requireApiSession();
  if (!access.ok) return access.response;

  const dbResult = await withDatabase(async () => {
    const ticket = await findTicket(params.id);
    if (!ticket) return null;
    if (!isAdmin(access.access) && !sameEmail(ticket.email, access.access.email)) return null;
    return ticket;
  });
  if (!dbResult.ok) return Response.json({ ok: false, error: dbResult.reason }, { status: 503 });
  if (!dbResult.data) return Response.json({ ok: false, error: "Support ticket not found." }, { status: 404 });
  return Response.json({ ok: true, ticket: serialiseTicket(dbResult.data) });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const access = await requireAdminApiSession();
  if (!access.ok) return access.response;

  const body = await readJsonBody(req);
  const status = normaliseStatus(body.status);
  const adminNotes = typeof body.adminNotes === "string" ? body.adminNotes : undefined;

  const dbResult = await withDatabase(async () => {
    const existing = await findTicket(params.id);
    if (!existing) throw new Error("Support ticket not found.");
    return prisma.supportTicket.update({
      where: { id: existing.id },
      data: {
        ...(status ? { status, closedAt: status === "RESOLVED" || status === "CLOSED" ? new Date() : null } : {}),
        ...(adminNotes !== undefined ? { adminNotes } : {}),
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  });

  if (!dbResult.ok) return Response.json({ ok: false, error: dbResult.reason }, { status: 400 });
  return Response.json({ ok: true, ticket: serialiseTicket(dbResult.data) });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const access = await requireAdminApiSession();
  if (!access.ok) return access.response;

  const body = await readJsonBody(req);
  const message = String(body.message || "").trim();
  const status = normaliseStatus(body.status);
  const visible = body.isCustomerVisible !== false;
  const emailCustomer = body.emailCustomer !== false && visible;

  if (!message) return Response.json({ ok: false, error: "Reply message is required." }, { status: 400 });

  let emailResult: any = { configured: false, sent: false, provider: "not-configured", message: "No customer-visible email was requested." };

  const dbResult = await withDatabase(async () => {
    const existing = await findTicket(params.id);
    if (!existing) throw new Error("Support ticket not found.");

    if (emailCustomer && existing.email) {
      const portalUrl = `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "https://combay.co.uk"}/portal/support`;
      emailResult = await sendEmail({
        to: existing.email,
        subject: `Update on your Combay support ticket ${existing.reference || existing.id}`,
        html: htmlShell(
          "Support ticket update",
          `<p style="margin-top:0;">Dear ${escapeHtml(existing.name || "Customer")},</p><p>We have added an update to your Combay support ticket <strong>${escapeHtml(existing.reference || existing.id)}</strong>.</p><div style="margin:16px 0;padding:14px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;white-space:pre-line;">${escapeHtml(message)}</div><p>You can continue the conversation by replying to this email or by using your customer portal.</p>${emailButton(portalUrl, "View support portal", "secondary")}<p style="margin-bottom:0;">Kind regards,<br/><strong>Combay Limited</strong></p>`,
          `Support ticket update ${existing.reference || existing.id}`,
        ),
      });
    }

    await prisma.supportMessage.create({
      data: {
        ticketId: existing.id,
        authorType: "ADMIN",
        authorName: "Combay Support",
        authorEmail: process.env.ADMIN_EMAIL || "sales@combay.co.uk",
        message,
        isCustomerVisible: visible,
        emailSent: Boolean(emailResult?.sent),
      },
    });

    return prisma.supportTicket.update({
      where: { id: existing.id },
      data: {
        lastResponseAt: new Date(),
        ...(status ? { status, closedAt: status === "RESOLVED" || status === "CLOSED" ? new Date() : null } : { status: visible ? "AWAITING_CUSTOMER" : existing.status }),
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  });

  if (!dbResult.ok) return Response.json({ ok: false, error: dbResult.reason }, { status: 400 });
  return Response.json({ ok: true, email: emailResult, ticket: serialiseTicket(dbResult.data) });
}
