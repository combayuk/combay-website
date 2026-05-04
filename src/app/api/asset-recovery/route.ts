import { DEMO_REQUESTS, generateReference, getEmailStatus, readFormBody, todayLabel } from "@/lib/requests";

export async function GET() {
  return Response.json({
    ok: true,
    mode: "preview",
    data: DEMO_REQUESTS.filter((request) => request.type === "asset"),
  });
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

  console.info("[asset-recovery-request]", record);

  return Response.json({ ok: true, reference, message: "Asset recovery request received.", email: getEmailStatus(), request: record });
}
