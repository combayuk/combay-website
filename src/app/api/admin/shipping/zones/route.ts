import { NextResponse } from "next/server";
import { prisma, withDatabase } from "@/lib/db";
import { requireAdminApiSession } from "@/lib/apiAccess";
import { ensureDefaultShippingSetup } from "@/lib/shipping";

export async function GET() {
  const access = await requireAdminApiSession();
  if (!access.ok) return access.response;
  await ensureDefaultShippingSetup();
  const result = await withDatabase(() => prisma.shippingZone.findMany({ orderBy: { sortOrder: "asc" } }));
  if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
  return NextResponse.json({ ok: true, zones: result.data });
}

export async function POST(request: Request) {
  const access = await requireAdminApiSession();
  if (!access.ok) return access.response;
  const body = await request.json().catch(() => null) as any;
  if (!body?.name?.trim()) return NextResponse.json({ ok: false, error: "Zone name is required." }, { status: 400 });
  const result = await withDatabase(() => prisma.shippingZone.upsert({
    where: { name: String(body.name).trim() },
    update: { countriesJson: body.countriesJson || body.countries || [], isActive: body.isActive !== false, sortOrder: Number(body.sortOrder || 100) },
    create: { name: String(body.name).trim(), countriesJson: body.countriesJson || body.countries || [], isActive: body.isActive !== false, sortOrder: Number(body.sortOrder || 100) },
  }));
  if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
  return NextResponse.json({ ok: true, zone: result.data });
}
