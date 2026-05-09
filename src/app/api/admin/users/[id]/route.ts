import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db";
import { sendAccountSuspensionEmail } from "@/lib/authSecurity";

export const dynamic = "force-dynamic";
const ROOT_ADMIN_EMAIL = "sales@combay.co.uk";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isDatabaseConfigured()) return NextResponse.json({ ok: false, error: "Database is not configured." }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const reason = String(body.reason || "Commercial account access review").trim().slice(0, 500);
  const id = params.id;
  if (!id) return NextResponse.json({ ok: false, error: "User id is required." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });

  if (action === "suspend") {
    if (user.role === "ADMIN") return NextResponse.json({ ok: false, error: "Admin accounts cannot be suspended from this screen." }, { status: 400 });
    const updated = await prisma.user.update({
      where: { id },
      data: {
        suspendedAt: user.suspendedAt || new Date(),
        suspendedReason: reason || "Commercial account access review",
        requiresEmailVerification: false,
      },
      select: { id: true, email: true, name: true, phone: true, phoneCode: true, role: true, suspendedAt: true, suspendedReason: true, suspendedEmailSentAt: true },
    });
    let emailResult: unknown = null;
    if (!user.suspendedEmailSentAt) {
      emailResult = await sendAccountSuspensionEmail({ to: user.email, name: user.name }).catch((error) => ({ sent: false, error: error instanceof Error ? error.message : "Email failed" }));
      await prisma.user.update({ where: { id }, data: { suspendedEmailSentAt: new Date() } }).catch(() => undefined);
    }
    return NextResponse.json({ ok: true, user: updated, emailResult });
  }

  if (action === "reactivate") {
    const updated = await prisma.user.update({
      where: { id },
      data: { suspendedAt: null, suspendedReason: null, suspendedEmailSentAt: null },
      select: { id: true, email: true, name: true, phone: true, phoneCode: true, role: true, suspendedAt: true, suspendedReason: true, suspendedEmailSentAt: true },
    });
    return NextResponse.json({ ok: true, user: updated });
  }

  return NextResponse.json({ ok: false, error: "Unsupported action." }, { status: 400 });
}


export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isDatabaseConfigured()) return NextResponse.json({ ok: false, error: "Database is not configured." }, { status: 503 });
  const id = params.id;
  if (!id) return NextResponse.json({ ok: false, error: "User id is required." }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
  if (user.role !== "ADMIN") return NextResponse.json({ ok: false, error: "Only admin accounts can be deleted here." }, { status: 400 });
  if (user.email.toLowerCase() === ROOT_ADMIN_EMAIL) return NextResponse.json({ ok: false, error: "The primary sales@combay.co.uk admin account cannot be deleted." }, { status: 403 });
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
