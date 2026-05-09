import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken, sendPasswordResetEmail } from "@/lib/passwordReset";

export const dynamic = "force-dynamic";

function normaliseEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function normaliseMode(value: unknown): "customer" | "admin" {
  return value === "admin" ? "admin" : "customer";
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Password reset requires the database to be connected." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const email = normaliseEmail(body.email);
  const mode = normaliseMode(body.mode);
  if (!email) return NextResponse.json({ ok: false, error: "Email address is required." }, { status: 400 });

  const neutralMessage = "If an eligible Combay account exists for this email address, a password reset link has been sent.";

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    const roleMatches = mode === "admin" ? user?.role === "ADMIN" : user?.role === "CUSTOMER";

    if (user?.passwordHash && roleMatches) {
      const reset = await createPasswordResetToken(user.email, mode);
      await sendPasswordResetEmail({ email: user.email, name: user.name, token: reset.token, mode }).catch((error) => {
        console.error("[password-reset-email-failed]", error);
      });
    }

    return NextResponse.json({ ok: true, message: neutralMessage });
  } catch (error) {
    console.error("[password-reset-request-failed]", error);
    return NextResponse.json({ ok: true, message: neutralMessage });
  }
}
