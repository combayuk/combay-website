import { prisma, withDatabase } from "@/lib/db";
import { DEMO_REQUESTS, generateReference, getEmailStatus, readFormBody, todayLabel } from "@/lib/requests";

export async function GET() {
  const dbResult = await withDatabase(async () => prisma.assetRecoveryRequest.findMany({ orderBy: { createdAt: "desc" }, take: 100 }));
  if (dbResult.ok) return Response.json({ ok: true, mode: "database", data: dbResult.data });
  return Response.json({ ok: true, mode: "preview", reason: dbResult.reason, data: DEMO_REQUESTS.filter((request) => request.type === "asset") });
}

export async function POST(req: Request) {
  const body = await readFormBody(req);
  const reference = generateReference("AST");

  if (!body.firstName || !body.lastName || !body.email || !body.description) {
    return Response.json({ ok: false, error: "First name, last name, email and stock description are required." }, { status: 400 });
  }

  const record = {
    id: reference,
    type: "asset" as const,
    date: todayLabel(),
    name: `${body.firstName} ${body.lastName}`,
    email: String(body.email),
    phone: body.phone ? String(body.phone) : undefined,
    company: body.company ? String(body.company) : undefined,
    message: String(body.description),
    subject: String(body.quantity || "Asset recovery enquiry"),
    status: "NEW" as const,
    source: "asset-recovery-page",
  };

  const dbResult = await withDatabase(async () => prisma.assetRecoveryRequest.create({
    data: {
      reference,
      firstName: String(body.firstName),
      lastName: String(body.lastName),
      email: record.email,
      phone: record.phone,
      company: record.company,
      description: record.message,
      location: body.location ? String(body.location) : undefined,
      quantity: record.subject,
    },
  }));

  console.info("[asset-recovery-request]", record);

  return Response.json({
    ok: true,
    reference,
    mode: dbResult.ok ? "database" : "preview",
    persistence: dbResult.ok ? "saved" : "not-saved",
    persistenceMessage: dbResult.ok ? "Saved to PostgreSQL." : dbResult.reason,
    message: "Asset recovery request received.",
    email: getEmailStatus(),
    request: dbResult.ok ? dbResult.data : record,
  });
}
