import { DEMO_REQUESTS, generateReference, getEmailStatus, readFormBody, todayLabel } from "@/lib/requests";

export async function GET() {
  return Response.json({
    ok: true,
    mode: "preview",
    data: DEMO_REQUESTS.filter((request) => request.type === "contact"),
  });
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

  console.info("[contact-request]", record);

  return Response.json({ ok: true, reference, message: "Contact message received.", email: getEmailStatus(), request: record });
}
