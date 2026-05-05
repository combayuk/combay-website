import { prisma, withDatabase } from "@/lib/db";
import { DEMO_REQUESTS, generateReference, readFormBody, todayLabel } from "@/lib/requests";
import { sendAdminNotification, sendCustomerAcknowledgement } from "@/lib/mailer";

export async function GET() {
  const dbResult = await withDatabase(async () => prisma.contactRequest.findMany({ orderBy: { createdAt: "desc" }, take: 100 }));
  if (dbResult.ok) return Response.json({ ok: true, mode: "database", data: dbResult.data });
  return Response.json({ ok: true, mode: "preview", reason: dbResult.reason, data: DEMO_REQUESTS.filter((request) => request.type === "contact") });
}

export async function POST(req: Request) {
  const body = await readFormBody(req);
  const reference = generateReference("CON");

  if (!body.name || !body.email || !body.message) {
    return Response.json({ ok: false, error: "Name, email and message are required." }, { status: 400 });
  }

  const record = {
    id: reference,
    type: "contact" as const,
    date: todayLabel(),
    name: String(body.name),
    email: String(body.email),
    phone: body.phone ? String(body.phone) : undefined,
    company: body.company ? String(body.company) : undefined,
    subject: String(body.subject || "General enquiry"),
    message: String(body.message),
    status: "NEW" as const,
    source: "contact-page",
  };

  const dbResult = await withDatabase(async () => prisma.contactRequest.create({
    data: {
      reference,
      name: record.name,
      email: record.email,
      phone: record.phone,
      company: record.company,
      subject: record.subject,
      message: record.message,
    },
  }));


  const email = {
    admin: await sendAdminNotification({
      subject: `Combay contact enquiry ${reference}`,
      title: `New contact enquiry`,
      message: `Reference: ${reference}`,
      rows: [["Name", record.name], ["Email", record.email], ["Phone", record.phone || "—"], ["Company", record.company || "—"], ["Subject", record.subject], ["Message", record.message]],
    }),
    customer: record.email && record.email !== "not-provided"
      ? await sendCustomerAcknowledgement({
          to: record.email,
          name: record.name,
          subject: `Combay enquiry received ${reference}`,
          title: `New contact enquiry`,
          reference,
          body: `Thank you for contacting Combay. We have received your enquiry and will respond as soon as possible.`,
        })
      : { configured: false, sent: false, provider: "not-configured", message: "Customer email not sent because customer email was missing." },
  };

  console.info("[contact-request]", record);

  return Response.json({
    ok: true,
    reference,
    mode: dbResult.ok ? "database" : "preview",
    persistence: dbResult.ok ? "saved" : "not-saved",
    persistenceMessage: dbResult.ok ? "Saved to PostgreSQL." : dbResult.reason,
    message: "Contact message received.",
    email,
    request: dbResult.ok ? dbResult.data : record,
  });
}
