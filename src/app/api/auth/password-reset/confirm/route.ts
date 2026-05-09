import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { consumePasswordResetToken } from "@/lib/passwordReset";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Password reset requires the database to be connected." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const token = String(body.token || "").trim();
  const password = String(body.password || "");
  const confirmPassword = String(body.confirmPassword || "");

  if (!token) return NextResponse.json({ ok: false, error: "Password reset token is missing." }, { status: 400 });
  if (!password || !confirmPassword) return NextResponse.json({ ok: false, error: "Enter and confirm the new password." }, { status: 400 });
  if (password !== confirmPassword) return NextResponse.json({ ok: false, error: "New password and confirmation password do not match." }, { status: 400 });

  const result = await consumePasswordResetToken(token, password);
  if (!result.ok) return NextResponse.json(result, { status: 400 });

  return NextResponse.json({ ok: true, mode: result.mode, message: "Password updated. You can now sign in." });
}
