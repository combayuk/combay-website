import { prisma, withDatabase } from "@/lib/db";
import { DEMO_REQUESTS, generateReference, getEmailStatus, readFormBody, todayLabel } from "@/lib/requests";

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

  console.info("[repair-request]", record);

  return Response.json({
    ok: true,
    reference,
    mode: dbResult.ok ? "database" : "preview",
    persistence: dbResult.ok ? "saved" : "not-saved",
    persistenceMessage: dbResult.ok ? "Saved to PostgreSQL." : dbResult.reason,
    message: "Repair request received.",
    email: getEmailStatus(),
    request: dbResult.ok ? dbResult.data : record,
  });
}
