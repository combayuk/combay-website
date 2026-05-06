import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db";
import { createEmailVerificationCode, sendEmailVerificationCode } from "@/lib/emailVerification";

const PERSONAL_EMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com", "msn.com", "yahoo.com", "icloud.com", "me.com", "mac.com", "proton.me", "protonmail.com", "aol.com", "zoho.com", "gmx.com", "mail.com", "yandex.com"]);
function isPersonalEmail(email: string) { return PERSONAL_EMAIL_DOMAINS.has(email.toLowerCase().split("@").pop() || ""); }

export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Registration requires the database to be connected." }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const accountType = body.accountType === "company" ? "company" : "individual";
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const confirmPassword = String(body.confirmPassword || "");
  const phoneCode = String(body.phoneCode || "").trim();
  const phone = String(body.phone || "").trim();
  const designation = String(body.designation || "").trim();
  const company = String(body.company || "").trim();
  const companyEmail = String(body.companyEmail || email).trim().toLowerCase();
  const companyNumber = String(body.companyNumber || "").trim();
  const vatNumber = String(body.vatNumber || "").trim();
  if (!name || !email || !password || !phone) return NextResponse.json({ error: "Name, email, phone number and password are required." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  if (password !== confirmPassword) return NextResponse.json({ error: "Password and re-entered password do not match." }, { status: 400 });
  if (accountType === "company") {
    if (!company) return NextResponse.json({ error: "Company name is required for company accounts." }, { status: 400 });
    if (!companyEmail) return NextResponse.json({ error: "Company email is required for company accounts." }, { status: 400 });
    if (isPersonalEmail(email)) return NextResponse.json({ error: "Company accounts must use a work email address, not Gmail, Outlook, Proton or other personal email providers." }, { status: 400 });
  }
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && !(existing.requiresEmailVerification && !existing.emailVerified)) return NextResponse.json({ error: "An account already exists with this email address." }, { status: 409 });
    const passwordHash = await bcrypt.hash(password, 12);
    const data = { email, name, passwordHash, role: "CUSTOMER" as const, phone, phoneCode: phoneCode || "+44", accountType, company: accountType === "company" ? company : null, companyEmail: accountType === "company" ? companyEmail || null : null, designation: accountType === "company" ? designation || null : null, companyNumber: accountType === "company" ? companyNumber || null : null, vatNumber: accountType === "company" ? vatNumber || null : null, requiresEmailVerification: true, emailVerified: null };
    const user = existing ? await prisma.user.update({ where: { email }, data }) : await prisma.user.create({ data });
    const { code } = await createEmailVerificationCode(email);
    const emailResult = await sendEmailVerificationCode({ email, name: user.name, code });
    return NextResponse.json({ ok: true, verifyRequired: true, email, message: emailResult.sent ? "Verification code sent. Please check your email." : "Account created, but the verification email could not be sent. Check Resend configuration.", emailStatus: emailResult });
  } catch (error: any) {
    if (error?.code === "P2002") return NextResponse.json({ error: "An account already exists with this email address." }, { status: 409 });
    console.error("[register-failed]", error);
    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  }
}
