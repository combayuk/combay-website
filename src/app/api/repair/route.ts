import { DEMO_REQUESTS, generateReference, getEmailStatus, readFormBody, todayLabel } from "@/lib/requests";

export async function GET() {
  return Response.json({
    ok: true,
    mode: "preview",
    data: DEMO_REQUESTS.filter((request) => request.type === "repair"),
  });
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

  console.info("[repair-request]", record);

  return Response.json({ ok: true, reference, message: "Repair request received.", email: getEmailStatus(), request: record });
}
