import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDatabaseConfigured()) return NextResponse.json({ ok: false, error: "Database is not configured." }, { status: 503 });
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
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
    },
  });
  return NextResponse.json({ ok: true, users });
}
