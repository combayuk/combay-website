import { NextRequest, NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { resetPasswordWithToken } from "@/lib/authSecurity";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) return NextResponse.json({ ok: false, error: "Database is not configured." }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const token = String(body.token || "").trim();
  const password = String(body.password || "");
  const confirmPassword = String(body.confirmPassword || "");
  if (!email || !token) return NextResponse.json({ ok: false, error: "Password reset link is invalid." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ ok: false, error: "Password must be at least 8 characters." }, { status: 400 });
  if (password !== confirmPassword) return NextResponse.json({ ok: false, error: "Password and confirmation do not match." }, { status: 400 });
  const result = await resetPasswordWithToken({ email, token, password });
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json({ ok: true, message: "Password updated. You can now sign in." });
}
