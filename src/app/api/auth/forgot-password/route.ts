import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db";
import { createPasswordResetForUser, normaliseEmail, normalisePhone, phoneCandidates } from "@/lib/authSecurity";

export const dynamic = "force-dynamic";

function genericResponse() {
  return NextResponse.json({ ok: true, message: "If an eligible account exists, a password reset email has been sent." });
}

export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) return NextResponse.json({ ok: false, error: "Database is not configured." }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const identifier = String(body.identifier || "").trim();
  const portal = body.portal === "admin" ? "admin" : "customer";
  if (!identifier) return NextResponse.json({ ok: false, error: "Enter your email address or phone number." }, { status: 400 });

  const email = identifier.includes("@") ? normaliseEmail(identifier) : "";
  const phoneDigits = normalisePhone(identifier);
  const candidates = phoneDigits ? phoneCandidates(identifier, body.phoneCode || "") : [];

  let user = email ? await prisma.user.findFirst({
    where: { email },
    select: { email: true, name: true, role: true, suspendedAt: true },
  }) : null;

  if (!user && phoneDigits) {
    const possibleUsers = await prisma.user.findMany({
      where: { phone: { not: null } },
      select: { email: true, name: true, role: true, suspendedAt: true, phone: true, phoneCode: true },
      take: 500,
    });
    user = possibleUsers.find((item) => {
      const savedPhone = normalisePhone(item.phone);
      const savedCombined = normalisePhone(`${item.phoneCode || ""}${item.phone || ""}`);
      return candidates.includes(item.phone || "") || candidates.includes(savedPhone) || candidates.includes(savedCombined) || savedPhone === phoneDigits || savedCombined === phoneDigits;
    }) || null;
  }

  if (!user || user.suspendedAt) return genericResponse();
  if (portal === "admin" && user.role !== "ADMIN") return genericResponse();
  if (portal === "customer" && user.role !== "CUSTOMER") return genericResponse();

  await createPasswordResetForUser(user).catch((error) => console.error("[password-reset-email-failed]", error));
  return genericResponse();
}
