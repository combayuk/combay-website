import { prisma, withDatabase } from "@/lib/db";
import { captureLead } from "@/lib/leads";
import { DEMO_REQUESTS, generateReference, readFormBody, todayLabel } from "@/lib/requests";
import { sendAdminNotification, sendCustomerAcknowledgement } from "@/lib/mailer";

export async function GET() {
  const dbResult = await withDatabase(async () => prisma.repairRequest.findMany({ orderBy: { createdAt: "desc" }, take: 100 }));
  if (dbResult.ok) return Response.json({ ok: true, mode: "database", data: dbResult.data });
  return Response.json({ ok: true, mode: "preview", reason: dbResult.reason, data: DEMO_REQUESTS.filter((request) => request.type === "repair") });
}

export async function POST(req: Request) {
  const body = await readFormBody(req);
  const reference = generateReference("REP");

  if (!body.firstName || !body.lastName || !body.email || !body.faultDesc) {
    return Response.json({ ok: false, error: "First name, last name, email and fault description are required." }, { status: 400 });
  }

  const record = {
    id: reference,
    type: "repair" as const,
    date: todayLabel(),
    name: `${body.firstName} ${body.lastName}`,
    email: String(body.email),
    phone: body.phone ? String(body.phone) : undefined,
    company: body.company ? String(body.company) : undefined,
    country: body.country ? String(body.country) : undefined,
    equipment: String(body.equipmentType || body.manufacturerModel || "Repair item"),
    service: String(body.serviceType || "Repair"),
    message: String(body.faultDesc),
    status: "NEW" as const,
    source: "repair-page",
  };

  const dbResult = await withDatabase(async () => prisma.repairRequest.create({
    data: {
      reference,
      firstName: String(body.firstName),
      lastName: String(body.lastName),
      email: record.email,
      phone: record.phone,
      company: record.company,
      serviceType: record.service,
      equipmentType: record.equipment,
      manufacturer: body.manufacturer ? String(body.manufacturer) : undefined,
      model: body.model ? String(body.model) : undefined,
      faultDesc: record.message,
    },
  }));

  await captureLead({
    name: record.name,
    email: record.email,
    phone: record.phone,
    country: record.country,
    company: record.company,
    source: "web form (Repair)",
    sourceRef: reference,
    productTitle: record.equipment,
    notes: record.message,
  });


  const email = {
    admin: await sendAdminNotification({
      subject: `Combay repair request ${reference}`,
      title: `New repair request`,
      message: `Reference: ${reference}`,
      rows: [["Name", record.name], ["Email", record.email], ["Phone", record.phone || "—"], ["Company", record.company || "—"], ["Country", record.country || "—"], ["Service", record.service], ["Equipment", record.equipment], ["Fault", record.message]],
    }),
    customer: record.email && record.email !== "not-provided"
      ? await sendCustomerAcknowledgement({
          to: record.email,
          name: record.name,
          subject: `Combay repair request received ${reference}`,
          title: `New repair request`,
          reference,
          body: `Thank you for submitting your repair request. We have received the equipment/fault details and will review them shortly.`,
          ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "https://combay.co.uk"}/repair`,
          ctaLabel: "View repair services",
        })
      : { configured: false, sent: false, provider: "not-configured", message: "Customer email not sent because customer email was missing." },
  };

  console.info("[repair-request]", record);

  return Response.json({
    ok: true,
    reference,
    mode: dbResult.ok ? "database" : "preview",
    persistence: dbResult.ok ? "saved" : "not-saved",
    persistenceMessage: dbResult.ok ? "Saved to PostgreSQL." : dbResult.reason,
    message: "Repair request received.",
    email,
    request: dbResult.ok ? dbResult.data : record,
  });
}
