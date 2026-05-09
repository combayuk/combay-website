import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";
const ROOT_ADMIN_EMAIL = "sales@combay.co.uk";

function selectUserFields() {
  return {
    id: true,
    email: true,
    name: true,
    phone: true,
    phoneCode: true,
    role: true,
    accountType: true,
    company: true,
    emailVerified: true,
    requiresEmailVerification: true,
    suspendedAt: true,
    suspendedReason: true,
    suspendedEmailSentAt: true,
    createdAt: true,
    updatedAt: true,
  } as const;
}

export async function GET() {
  if (!isDatabaseConfigured()) return NextResponse.json({ ok: false, error: "Database is not configured." }, { status: 503 });
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: selectUserFields(),
  });
  return NextResponse.json({ ok: true, users });
}


export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) return NextResponse.json({ ok: false, error: "Database is not configured." }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim() || null;
  const phone = String(body.phone || "").trim() || null;
  const password = String(body.password || "");
  if (!email || !email.includes("@")) return NextResponse.json({ ok: false, error: "A valid admin email is required." }, { status: 400 });
  if (password.length < 10) return NextResponse.json({ ok: false, error: "Admin password must be at least 10 characters." }, { status: 400 });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.role !== "ADMIN") return NextResponse.json({ ok: false, error: "A customer account already exists with this email." }, { status: 409 });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = existing
    ? await prisma.user.update({
        where: { email },
        data: { name, phone, passwordHash, role: "ADMIN", emailVerified: new Date(), requiresEmailVerification: false, suspendedAt: null, suspendedReason: null },
        select: selectUserFields(),
      })
    : await prisma.user.create({
        data: { email, name, phone, passwordHash, role: "ADMIN", emailVerified: new Date(), requiresEmailVerification: false, accountType: "admin" },
        select: selectUserFields(),
      });
  return NextResponse.json({ ok: true, user, protectedEmail: user.email === ROOT_ADMIN_EMAIL });
}
