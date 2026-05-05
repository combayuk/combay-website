import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db";

function mockPasswordForRole(role?: string | null) {
  if (role === "ADMIN") return process.env.MOCK_ADMIN_PASSWORD ?? process.env.ADMIN_LOGIN_PASSWORD ?? "Admin12345";
  return process.env.MOCK_CUSTOMER_PASSWORD ?? process.env.MOCK_AUTH_PASSWORD ?? process.env.TEST_USER_PASSWORD ?? "Test12345";
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "Please sign in before updating account settings." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const currentEmail = session.user.email;
  const nextEmail = String(body.email || currentEmail).trim().toLowerCase();
  const name = String(body.name || "").trim();
  const phoneCode = String(body.phoneCode || "+44").trim();
  const phone = String(body.phone || "").trim();
  const company = String(body.company || "").trim();
  const companyNumber = String(body.companyNumber || "").trim();
  const vatNumber = String(body.vatNumber || "").trim();
  const accountType = body.accountType === "company" ? "company" : "individual";
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");
  const twoStepEnabled = Boolean(body.twoStepEnabled);
  const twoStepMethod = ["email", "phone"].includes(String(body.twoStepMethod)) ? String(body.twoStepMethod) : null;
  const changedFields = Array.isArray(body.changedFields) ? body.changedFields.map(String) : [];
  const role = (session.user as any).role as string | undefined;

  if (!name) return NextResponse.json({ ok: false, error: "Full name is required." }, { status: 400 });
  if (!nextEmail) return NextResponse.json({ ok: false, error: "Email address is required." }, { status: 400 });
  if (!phone) return NextResponse.json({ ok: false, error: "Phone number is required." }, { status: 400 });
  if (accountType === "company" && !company) return NextResponse.json({ ok: false, error: "Company name is required for company accounts." }, { status: 400 });
  if (newPassword && newPassword.length < 8) return NextResponse.json({ ok: false, error: "New password must be at least 8 characters." }, { status: 400 });
  if (twoStepEnabled && twoStepMethod === "phone" && !phone) return NextResponse.json({ ok: false, error: "A phone number is required to enable phone two-step verification." }, { status: 400 });

  const anyChanges = changedFields.length > 0;
  if (anyChanges && !currentPassword) {
    return NextResponse.json({ ok: false, error: "Enter your current password to save account changes." }, { status: 400 });
  }

  const mockAuthEnabled = process.env.MOCK_AUTH_ENABLED !== "false";
  if (mockAuthEnabled && anyChanges) {
    const expected = mockPasswordForRole(role);
    if (currentPassword !== expected) {
      return NextResponse.json({ ok: false, error: "Current password is incorrect." }, { status: 403 });
    }
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: true, mode: "preview", message: "Account settings validated in preview mode." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: currentEmail } });

    if (anyChanges && !mockAuthEnabled) {
      if (!user?.passwordHash) return NextResponse.json({ ok: false, error: "This account cannot be updated because no password is set." }, { status: 400 });
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) return NextResponse.json({ ok: false, error: "Current password is incorrect." }, { status: 403 });
    }

    const passwordHash = newPassword ? await bcrypt.hash(newPassword, 12) : undefined;
    const data: any = {
      name,
      email: nextEmail,
      phone,
      phoneCode,
      company: accountType === "company" ? company : null,
      companyNumber: accountType === "company" ? companyNumber || null : null,
      vatNumber: accountType === "company" ? vatNumber || null : null,
      accountType,
      twoStepEnabled,
      twoStepMethod: twoStepEnabled ? twoStepMethod || "email" : null,
      ...(passwordHash ? { passwordHash } : {}),
    };

    if (user) await prisma.user.update({ where: { id: user.id }, data });
    else await prisma.user.create({ data: { ...data, role: role === "ADMIN" ? "ADMIN" : "CUSTOMER", ...(passwordHash ? {} : { passwordHash: await bcrypt.hash(currentPassword || mockPasswordForRole(role), 12) }) } });

    return NextResponse.json({
      ok: true,
      mode: mockAuthEnabled ? "mock-auth-db-profile" : "database-auth",
      message: mockAuthEnabled && (nextEmail !== currentEmail.toLowerCase() || newPassword)
        ? "Account profile saved. Current login credentials remain controlled by Vercel mock-auth variables until mock mode is disabled."
        : "Account settings saved.",
    });
  } catch (error: any) {
    if (error?.code === "P2002") return NextResponse.json({ ok: false, error: "That email address is already used by another account." }, { status: 409 });
    console.error("[account-settings-update-failed]", error);
    return NextResponse.json({ ok: false, error: "Account settings could not be saved." }, { status: 500 });
  }
}
