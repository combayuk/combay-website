import { prisma, withDatabase } from "@/lib/db";
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
  const dbResult = await withDatabase(async () => prisma.return.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { order: true } }));
  if (dbResult.ok) return Response.json({ ok: true, mode: "database", data: dbResult.data });
  return Response.json({ ok: true, mode: "preview", reason: dbResult.reason, data: DEMO_RETURNS });
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

  const dbResult = await withDatabase(async () => {
    const order = body.orderId ? await prisma.order.findUnique({ where: { orderNumber: String(body.orderId) } }) : null;
    if (!order) throw new Error("Order not found in database. Return recorded in preview mode only until order persistence is active.");
    return prisma.return.create({
      data: {
        orderId: order.id,
        reason: record.reason,
        notes: `${record.message}\nReference: ${reference}`,
      },
    });
  });

  console.info("[return-request]", record);

  return Response.json({
    ok: true,
    reference,
    mode: dbResult.ok ? "database" : "preview",
    persistence: dbResult.ok ? "saved" : "not-saved",
    persistenceMessage: dbResult.ok ? "Saved to PostgreSQL." : dbResult.reason,
    message: "Return request received. Collection/inspection status will update in the customer portal once returns storage is connected.",
    email: getEmailStatus(),
    request: dbResult.ok ? dbResult.data : record,
  });
}
