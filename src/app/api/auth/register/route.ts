import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db";

export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Registration requires the database to be connected." }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const accountType = body.accountType === "company" ? "company" : "individual";
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const phoneCode = String(body.phoneCode || "").trim();
  const phone = String(body.phone || "").trim();
  const company = String(body.company || "").trim();
  const companyNumber = String(body.companyNumber || "").trim();
  const vatNumber = String(body.vatNumber || "").trim();

  if (!name || !email || !password || !phone) {
    return NextResponse.json({ error: "Name, email, phone number and password are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (accountType === "company" && !company) {
    return NextResponse.json({ error: "Company name is required for company accounts." }, { status: 400 });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "An account already exists with this email address." }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: "CUSTOMER",
        phone,
        phoneCode: phoneCode || "+44",
        accountType,
        company: accountType === "company" ? company : null,
        companyNumber: accountType === "company" ? companyNumber || null : null,
        vatNumber: accountType === "company" ? vatNumber || null : null,
      },
    });

    return NextResponse.json({ ok: true, message: "Account created. You can now sign in." });
  } catch (error: any) {
    if (error?.code === "P2002") return NextResponse.json({ error: "An account already exists with this email address." }, { status: 409 });
    console.error("[register-failed]", error);
    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  }
}
