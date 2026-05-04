import { generateReference, getEmailStatus, readJsonBody, todayLabel } from "@/lib/requests";

const DEMO_RETURNS = [
  {
    id: "RET-MOCK-001",
    orderId: "CB0D9E1A",
    date: "10 Mar 2026",
    item: "ABB ACS550 Industrial Drive 7.5kW",
    status: "INSPECTING",
    message: "Item received back and currently under inspection.",
  },
];

export async function GET() {
  return Response.json({ ok: true, mode: "preview", data: DEMO_RETURNS });
}

export async function POST(req: Request) {
  const body = await readJsonBody(req);
  const reference = typeof body.reference === "string" ? body.reference : generateReference("RET");

  if (!body.orderId && !body.email && !body.reason) {
    return Response.json({ ok: false, error: "Return request requires order context or contact details." }, { status: 400 });
  }

  const record = {
    id: reference,
    type: "return" as const,
    date: todayLabel(),
    orderId: String(body.orderId || "not-provided"),
    item: body.item ? String(body.item) : undefined,
    sku: body.sku ? String(body.sku) : undefined,
    reason: String(body.reason || "Return request"),
    message: String(body.message || "Return requested from customer portal."),
    status: "REQUEST_SUBMITTED" as const,
    source: String(body.source || "customer-portal"),
  };

  console.info("[return-request]", record);

  return Response.json({
    ok: true,
    reference,
    message: "Return request received. Collection/inspection status will update in the customer portal once returns storage is connected.",
    email: getEmailStatus(),
    request: record,
  });
}
