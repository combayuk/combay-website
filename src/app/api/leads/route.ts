import { NextResponse, type NextRequest } from "next/server";
import { prisma, withDatabase } from "@/lib/db";

function normaliseInteraction(item: any) {
  return {
    id: item.id,
    source: item.source,
    sourceRef: item.sourceRef ?? null,
    productSku: item.productSku ?? null,
    productTitle: item.productTitle ?? null,
    orderId: item.orderId ?? null,
    invoiceId: item.invoiceId ?? null,
    notes: item.notes ?? null,
    createdAt: item.createdAt,
  };
}

function normaliseLead(lead: any) {
  return {
    id: lead.id,
    name: lead.name ?? "—",
    email: lead.email,
    phone: lead.phone ?? "—",
    country: lead.country ?? "—",
    company: lead.company ?? "—",
    source: lead.source,
    sourceRef: lead.sourceRef ?? null,
    productSku: lead.productSku ?? null,
    productTitle: lead.productTitle ?? null,
    orderId: lead.orderId ?? null,
    invoiceId: lead.invoiceId ?? null,
    notes: lead.notes ?? null,
    contactCount: lead.contactCount ?? (lead.interactions?.length || 1),
    lastContactAt: lead.lastContactAt ?? lead.updatedAt ?? lead.createdAt,
    interactions: (lead.interactions ?? []).map(normaliseInteraction),
    createdAt: lead.createdAt,
  };
}

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") || "").trim().toLowerCase();
  const source = request.nextUrl.searchParams.get("source") || "";

  const dbResult = await withDatabase(async () => prisma.lead.findMany({
    where: {
      ...(source ? { source } : {}),
      ...(q ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { company: { contains: q, mode: "insensitive" } },
          { country: { contains: q, mode: "insensitive" } },
          { productSku: { contains: q, mode: "insensitive" } },
          { productTitle: { contains: q, mode: "insensitive" } },
          { sourceRef: { contains: q, mode: "insensitive" } },
          { interactions: { some: { sourceRef: { contains: q, mode: "insensitive" } } } },
          { interactions: { some: { productSku: { contains: q, mode: "insensitive" } } } },
          { interactions: { some: { productTitle: { contains: q, mode: "insensitive" } } } },
        ],
      } : {}),
    },
    include: { interactions: { orderBy: { createdAt: "desc" }, take: 50 } },
    orderBy: { lastContactAt: "desc" },
    take: 500,
  }));

  if (!dbResult.ok) return NextResponse.json({ ok: true, mode: "preview", reason: dbResult.reason, leads: [], data: [] });
  const leads = dbResult.data.map(normaliseLead);
  return NextResponse.json({ ok: true, mode: "database", leads, data: leads });
}
