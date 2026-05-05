import { prisma, withDatabase } from "@/lib/db";
import { generateReference, readJsonBody, todayLabel } from "@/lib/requests";
import { sendAdminNotification, sendCustomerAcknowledgement } from "@/lib/mailer";
import { formatReturnRow } from "@/lib/returnUtils";

const DEMO_RETURNS = [
  {
    id: "RET-MOCK-001",
    reference: "RET-MOCK-001",
    orderId: "CB0D9E1A",
    date: "10 Mar 2026",
    item: "ABB ACS550 Industrial Drive 7.5kW",
    status: "INSPECTING",
    statusLabel: "Inspecting",
    message: "Item received back and currently under inspection.",
  },
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const portal = url.searchParams.get("portal") === "1";
  const admin = url.searchParams.get("admin") === "1";
  const dbResult = await withDatabase(async () => {
    const rows = await prisma.return.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { order: { include: { items: true } } },
    });
    return rows.map(formatReturnRow);
  });
  if (dbResult.ok) {
    return Response.json({ ok: true, mode: "database", data: dbResult.data, returns: dbResult.data, portalReturns: portal ? dbResult.data : undefined });
  }
  return Response.json({ ok: true, mode: "preview", reason: dbResult.reason, data: DEMO_RETURNS, returns: DEMO_RETURNS, portalReturns: portal ? DEMO_RETURNS : undefined });
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
    status: "AWAITING_APPROVAL" as const,
    source: String(body.source || "customer-portal"),
  };

  const dbResult = await withDatabase(async () => {
    const order = body.orderId ? await prisma.order.findUnique({ where: { orderNumber: String(body.orderId) } }) : null;
    if (!order) throw new Error("Order not found in database. Return recorded in preview mode only until order persistence is active.");
    return prisma.return.create({
      data: {
        orderId: order.id,
        reason: record.reason,
        status: "AWAITING_APPROVAL",
        notes: `${record.message}\nReference: ${reference}\nSource: ${record.source}`,
      },
      include: { order: { include: { items: true } } },
    });
  });

  const returnedOrder = dbResult.ok ? (dbResult as any).data?.order : null;
  const customerEmail = String(body.email || returnedOrder?.customerEmail || "");
  const customerName = String(body.name || returnedOrder?.customerName || "Customer");
  const email = {
    admin: await sendAdminNotification({
      subject: `Combay return request ${reference}`,
      title: "New return request awaiting approval",
      message: `Reference: ${reference}`,
      rows: [["Order", record.orderId], ["Item", record.item || record.sku || "—"], ["Reason", record.reason], ["Message", record.message], ["Status", "Awaiting approval"]],
    }),
    customer: customerEmail
      ? await sendCustomerAcknowledgement({
          to: customerEmail,
          name: customerName,
          subject: `Combay return request received ${reference}`,
          title: "Return request received",
          reference,
          body: "Thank you. Your return request has been received and is awaiting admin approval. The return timeline will begin after approval.",
        })
      : { configured: false, sent: false, provider: "not-configured", message: "Customer email not sent because customer email was missing." },
  };

  console.info("[return-request]", record);

  return Response.json({
    ok: true,
    reference,
    mode: dbResult.ok ? "database" : "preview",
    persistence: dbResult.ok ? "saved" : "not-saved",
    persistenceMessage: dbResult.ok ? "Saved to PostgreSQL." : dbResult.reason,
    message: "Return request received and awaiting admin approval.",
    email,
    request: dbResult.ok ? formatReturnRow((dbResult as any).data) : record,
  });
}
