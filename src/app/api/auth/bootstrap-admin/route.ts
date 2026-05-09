import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

function tokenFromRequest(request: NextRequest) {
  return request.headers.get("x-bootstrap-token") || request.nextUrl.searchParams.get("token") || "";
}

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Database is not configured." }, { status: 503 });
  }

  const expectedToken = process.env.ADMIN_BOOTSTRAP_TOKEN;
  if (!expectedToken) {
    return NextResponse.json({ ok: false, error: "ADMIN_BOOTSTRAP_TOKEN is not configured." }, { status: 403 });
  }

  if (tokenFromRequest(request) !== expectedToken) {
    return NextResponse.json({ ok: false, error: "Invalid bootstrap token." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const email = String(body.email || process.env.ADMIN_LOGIN_EMAIL || process.env.MOCK_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = String(body.password || process.env.ADMIN_LOGIN_PASSWORD || process.env.MOCK_ADMIN_PASSWORD || "");
  const name = String(body.name || "Combay Admin").trim();

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "Admin email and password are required." }, { status: 400 });
  }
  if (password.length < 10) {
    return NextResponse.json({ ok: false, error: "Admin password must be at least 10 characters." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      role: "ADMIN",
      requiresEmailVerification: false,
      emailVerified: new Date(),
    },
    create: {
      email,
      name,
      passwordHash,
      role: "ADMIN",
      requiresEmailVerification: false,
      emailVerified: new Date(),
    },
    select: { id: true, email: true, role: true, name: true },
  });

  return NextResponse.json({ ok: true, user, message: "Admin account is ready. Remove ADMIN_BOOTSTRAP_TOKEN after use if you do not need this endpoint." });
}
