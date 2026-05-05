import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db";

function mockPasswordForRole(role?: string | null) {
  if (role === "ADMIN") {
    return process.env.MOCK_ADMIN_PASSWORD ?? process.env.ADMIN_LOGIN_PASSWORD ?? "Admin12345";
  }
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
  const phone = String(body.phone || "").trim();
  const company = String(body.company || "").trim();
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");
  const role = (session.user as any).role as string | undefined;

  const emailChanged = nextEmail && nextEmail !== currentEmail.toLowerCase();
  const passwordChangeRequested = Boolean(newPassword);
  const sensitiveChange = emailChanged || passwordChangeRequested;

  if (sensitiveChange && !currentPassword) {
    return NextResponse.json({ ok: false, error: "Current password is required to change your email address or password." }, { status: 400 });
  }

  if (newPassword && newPassword.length < 8) {
    return NextResponse.json({ ok: false, error: "New password must be at least 8 characters." }, { status: 400 });
  }

  const mockAuthEnabled = process.env.MOCK_AUTH_ENABLED !== "false";

  if (mockAuthEnabled && sensitiveChange) {
    const expected = mockPasswordForRole(role);
    if (currentPassword !== expected) {
      return NextResponse.json({ ok: false, error: "Current password is incorrect." }, { status: 403 });
    }
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      mode: "preview",
      message: sensitiveChange
        ? "Account details validated in preview mode. Email/password login changes require database auth mode; mock login values are controlled in Vercel environment variables."
        : "Profile details saved in preview mode.",
    });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: currentEmail } });

    if (sensitiveChange && !mockAuthEnabled) {
      if (!user?.passwordHash) {
        return NextResponse.json({ ok: false, error: "This account cannot be updated because no password is set." }, { status: 400 });
      }
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) {
        return NextResponse.json({ ok: false, error: "Current password is incorrect." }, { status: 403 });
      }
    }

    const passwordHash = newPassword ? await bcrypt.hash(newPassword, 12) : undefined;

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          name: name || undefined,
          email: nextEmail || undefined,
          phone: phone || undefined,
          company: company || undefined,
          ...(passwordHash ? { passwordHash } : {}),
        },
      });
    } else {
      await prisma.user.create({
        data: {
          email: nextEmail || currentEmail,
          name: name || session.user.name || "Customer",
          phone: phone || undefined,
          company: company || undefined,
          role: role === "ADMIN" ? "ADMIN" : "CUSTOMER",
          ...(passwordHash ? { passwordHash } : {}),
        },
      });
    }

    return NextResponse.json({
      ok: true,
      mode: mockAuthEnabled ? "mock-auth-db-profile" : "database-auth",
      message: mockAuthEnabled && sensitiveChange
        ? "Profile saved. Mock login email/password are controlled by Vercel environment variables until real database auth is enabled."
        : "Account settings saved.",
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ ok: false, error: "That email address is already used by another account." }, { status: 409 });
    }
    console.error("[account-settings-update-failed]", error);
    return NextResponse.json({ ok: false, error: "Account settings could not be saved." }, { status: 500 });
  }
}
