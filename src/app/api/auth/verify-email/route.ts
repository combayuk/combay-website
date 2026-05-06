import { NextResponse } from "next/server";
import { isDatabaseConfigured, prisma } from "@/lib/db";
import { createEmailVerificationCode, sendEmailVerificationCode, verifyEmailCode } from "@/lib/emailVerification";
import { runEmailAutomations } from "@/lib/emailAutomations";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return NextResponse.json({ ok: false, error: "Database is not configured." }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const code = String(body.code || "").replace(/\D/g, "").slice(0, 6);
  if (!email || code.length !== 6) return NextResponse.json({ ok: false, error: "Enter the 6 digit verification code." }, { status: 400 });
  const result = await verifyEmailCode(email, code);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  await runEmailAutomations("NEW_SIGNUP", { user: result.user }).catch((error) => console.error("[signup-automation-failed]", error));
  return NextResponse.json({ ok: true, message: "Email verified. You can now sign in." });
}
export async function PUT(request: Request) {
  if (!isDatabaseConfigured()) return NextResponse.json({ ok: false, error: "Database is not configured." }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  if (!email) return NextResponse.json({ ok: false, error: "Email address is required." }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.requiresEmailVerification || user.emailVerified) return NextResponse.json({ ok: false, error: "No pending verification was found for this email address." }, { status: 404 });
  const { code } = await createEmailVerificationCode(email);
  const emailResult = await sendEmailVerificationCode({ email, name: user.name, code });
  return NextResponse.json({ ok: true, message: emailResult.sent ? "A new verification code has been sent." : "Could not send verification email. Check Resend configuration.", emailStatus: emailResult });
}
