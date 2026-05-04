import { prisma, withDatabase } from "@/lib/db";

const DEMO_ORDERS = [
  { orderNumber: "CB1ACB2F", status: "DELIVERED", paymentStatus: "PAID", total: 1240, createdAt: "2026-04-28" },
  { orderNumber: "CB0D9E1A", status: "DELIVERED", paymentStatus: "PAID", total: 890, createdAt: "2026-03-05" },
];

export async function GET() {
  const dbResult = await withDatabase(async () => prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { items: true, returns: true } }));
  if (dbResult.ok) return Response.json({ ok: true, mode: "database", data: dbResult.data });
  return Response.json({ ok: true, mode: "preview", reason: dbResult.reason, data: DEMO_ORDERS });
}
