import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { escapeHtml, htmlShell, sendEmail, siteUrl } from "@/lib/mailer";

const CODE_TTL_MINUTES = 20;

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createEmailVerificationCode(email: string) {
  const identifier = `signup:${email.toLowerCase()}`;
  const code = generateCode();
  const token = `${code}_${randomUUID()}`;
  const expires = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);
  await prisma.verificationToken.deleteMany({ where: { identifier } }).catch(() => undefined);
  await prisma.verificationToken.create({ data: { identifier, token, expires } });
  return { code, expires };
}

export async function sendEmailVerificationCode(args: { email: string; name?: string | null; code: string }) {
  const verifyUrl = `${siteUrl().replace(/\/$/, "")}/auth/register?verify=${encodeURIComponent(args.email)}`;
  const firstName = String(args.name || "Customer").trim().split(/\s+/)[0] || "Customer";
  const html = htmlShell(
    "Verify your Combay account",
    `<p style="margin-top:0;">Dear ${escapeHtml(firstName)},</p><p>Thank you for creating a Combay customer account. Enter the verification code below to activate your account.</p><div style="letter-spacing:10px;font-size:30px;font-weight:800;color:#0f172a;background:#f8fafc;border:1px solid #dbe3ea;border-radius:12px;padding:18px 20px;text-align:center;margin:20px 0;">${escapeHtml(args.code)}</div><p>This code expires in ${CODE_TTL_MINUTES} minutes. If you did not create a Combay account, you can ignore this email.</p><p style="margin:18px 0 0;color:#475569;font-size:13px;line-height:1.6;">If you need to reopen the verification page, copy this link into your browser:<br/><a href="${escapeHtml(verifyUrl)}" style="color:#0f172a;text-decoration:underline;word-break:break-all;">${escapeHtml(verifyUrl)}</a></p>`,
    "Your Combay verification code"
  );
  return sendEmail({ to: args.email, subject: "Your Combay verification code", html, headers: { "X-Combay-Email-Type": "account-verification" } });
}

export async function verifyEmailCode(email: string, code: string) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.replace(/\D/g, "").slice(0, 6);
  if (!cleanEmail || cleanCode.length !== 6) return { ok: false, error: "Enter the 6 digit verification code." } as const;
  const identifier = `signup:${cleanEmail}`;
  const tokens = await prisma.verificationToken.findMany({ where: { identifier }, orderBy: { expires: "desc" }, take: 5 });
  const now = new Date();
  const match = tokens.find((item) => item.expires > now && item.token.startsWith(`${cleanCode}_`));
  if (!match) return { ok: false, error: "The verification code is invalid or has expired." } as const;
  const user = await prisma.user.update({ where: { email: cleanEmail }, data: { emailVerified: new Date(), requiresEmailVerification: false } });
  await prisma.verificationToken.deleteMany({ where: { identifier } }).catch(() => undefined);
  return { ok: true, user } as const;
}
