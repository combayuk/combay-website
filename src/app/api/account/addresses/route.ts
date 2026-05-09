import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

async function currentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  if ((session.user as any).role !== "CUSTOMER") return { forbidden: true } as any;
  if (!isDatabaseConfigured()) {
    return { id: "preview", email: session.user.email, name: session.user.name || "", phone: "", company: "", addresses: [] } as any;
  }
  return prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    include: { addresses: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] } },
  });
}

function clean(body: any) {
  const address1 = String(body?.address1 || body?.line1 || "").trim();
  const city = String(body?.city || body?.town || "").trim();
  const postcode = String(body?.postcode || "").trim();
  const country = String(body?.country || "United Kingdom").trim();
  if (!address1 || !city || !postcode || !country) {
    throw new Error("Address line 1, town/city, postcode and country are required.");
  }
  return {
    label: String(body?.label || "").trim() || null,
    fullName: String(body?.fullName || "").trim() || null,
    company: String(body?.company || "").trim() || null,
    phone: String(body?.phone || "").trim() || null,
    address1,
    address2: String(body?.address2 || body?.line2 || "").trim() || null,
    city,
    postcode,
    country,
    isPrimary: Boolean(body?.isPrimary || body?.isDefault),
  };
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Please sign in." }, { status: 401 });
  if ((user as any).forbidden) return NextResponse.json({ ok: false, error: "Customer portal access is required." }, { status: 403 });
  return NextResponse.json({
    ok: true,
    customer: { name: user.name || "", email: user.email || "", phone: user.phone || "", company: user.company || "" },
    addresses: user.addresses || [],
  });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Please sign in." }, { status: 401 });
  if ((user as any).forbidden) return NextResponse.json({ ok: false, error: "Customer portal access is required." }, { status: 403 });
  try {
    const data = clean(await request.json().catch(() => ({})));
    if (user.id === "preview") return NextResponse.json({ ok: true, address: { id: "preview", ...data } });
    const count = await prisma.customerAddress.count({ where: { userId: user.id } });
    if (count >= 5) return NextResponse.json({ ok: false, error: "You can save up to 5 addresses." }, { status: 400 });
    const makePrimary = data.isPrimary || count === 0;
    const address = await prisma.$transaction(async (tx) => {
      if (makePrimary) await tx.customerAddress.updateMany({ where: { userId: user.id }, data: { isPrimary: false } });
      return tx.customerAddress.create({ data: { ...data, isPrimary: makePrimary, userId: user.id } });
    });
    return NextResponse.json({ ok: true, address });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not save address." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Please sign in." }, { status: 401 });
  if ((user as any).forbidden) return NextResponse.json({ ok: false, error: "Customer portal access is required." }, { status: 403 });
  try {
    const body = await request.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    if (!id) return NextResponse.json({ ok: false, error: "Address ID is required." }, { status: 400 });
    if (user.id === "preview") return NextResponse.json({ ok: true, address: { id, ...clean(body) } });

    const existing = await prisma.customerAddress.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ ok: false, error: "Address not found." }, { status: 404 });

    const data = body?.setPrimaryOnly ? { isPrimary: true } : clean(body);
    const address = await prisma.$transaction(async (tx) => {
      if ((data as any).isPrimary) await tx.customerAddress.updateMany({ where: { userId: user.id }, data: { isPrimary: false } });
      return tx.customerAddress.update({ where: { id }, data });
    });
    return NextResponse.json({ ok: true, address });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not update address." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Please sign in." }, { status: 401 });
  if ((user as any).forbidden) return NextResponse.json({ ok: false, error: "Customer portal access is required." }, { status: 403 });
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ ok: false, error: "Address ID is required." }, { status: 400 });
  if (user.id === "preview") return NextResponse.json({ ok: true });

  const existing = await prisma.customerAddress.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ ok: false, error: "Address not found." }, { status: 404 });
  await prisma.customerAddress.delete({ where: { id } });

  if (existing.isPrimary) {
    const next = await prisma.customerAddress.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
    if (next) await prisma.customerAddress.update({ where: { id: next.id }, data: { isPrimary: true } });
  }
  return NextResponse.json({ ok: true });
}
