import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { escapeHtml, htmlShell, sendEmail, siteUrl } from "@/lib/mailer";

export function normaliseEmail(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

export function normalisePhone(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

export function phoneCandidates(phone?: string | null, phoneCode?: string | null) {
  const rawPhone = String(phone || "").trim();
  const rawCode = String(phoneCode || "").trim();
  const phoneDigits = normalisePhone(rawPhone);
  const codeDigits = normalisePhone(rawCode);
  const combined = codeDigits && phoneDigits ? `${codeDigits}${phoneDigits.replace(/^0+/, "")}` : "";
  return Array.from(new Set([rawPhone, phoneDigits, combined].filter(Boolean)));
}

export function generateSecureToken(bytes = 32) {
  return randomBytes(bytes).toString("hex");
}

export async function findSuspendedUserByEmailOrPhone(args: { email?: string | null; phone?: string | null; phoneCode?: string | null }) {
  const email = normaliseEmail(args.email);
  const phones = phoneCandidates(args.phone, args.phoneCode);
  if (!email && phones.length === 0) return null;
  return prisma.user.findFirst({
    where: {
      suspendedAt: { not: null },
      OR: [
        ...(email ? [{ email }] : []),
        ...phones.map((phone) => ({ phone })),
      ],
    },
  });
}

export async function sendAccountSuspensionEmail(args: { to: string; name?: string | null }) {
  const firstName = String(args.name || "Customer").trim().split(/\s+/)[0] || "Customer";
  const html = htmlShell(
    "Account status update",
    `<p style="margin-top:0;">Dear ${escapeHtml(firstName)},</p><p>We are sorry, but after review we have decided to part ways and will no longer be able to continue providing account access or trading services to this account.</p><p>This is a commercial decision based on our internal business assessment and what we consider to be in Combay’s best interests.</p><p style="margin-bottom:0;">Kind regards,<br/><strong>Combay Limited</strong></p>`,
    "Combay account status update"
  );
  return sendEmail({ to: args.to, subject: "Combay account status update", html, headers: { "X-Combay-Email-Type": "account-suspension" } });
}

export async function createPasswordResetForUser(user: { email: string; name?: string | null; role?: string | null }) {
  const token = generateSecureToken(32);
  const expires = new Date(Date.now() + 30 * 60 * 1000);
  const identifier = `password-reset:${user.email.toLowerCase()}`;
  await prisma.verificationToken.deleteMany({ where: { identifier } }).catch(() => undefined);
  await prisma.verificationToken.create({ data: { identifier, token, expires } });
  const resetUrl = `${siteUrl().replace(/\/$/, "")}/auth/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`;
  const firstName = String(user.name || "User").trim().split(/\s+/)[0] || "User";
  const html = htmlShell(
    "Reset your Combay password",
    `<p style="margin-top:0;">Dear ${escapeHtml(firstName)},</p><p>We received a request to reset the password for your Combay ${user.role === "ADMIN" ? "admin" : "customer"} account.</p><p>Use the secure link below to choose a new password. The link expires in 30 minutes.</p><p style="margin:18px 0;padding:12px 14px;background:#f8fafc;border:1px solid #dbe3ea;border-radius:8px;"><a href="${escapeHtml(resetUrl)}" style="color:#0f172a;text-decoration:underline;font-weight:800;word-break:break-all;">${escapeHtml(resetUrl)}</a></p><p>If you did not request this reset, you can ignore this email.</p>`,
    "Reset your Combay password"
  );
  const emailResult = await sendEmail({ to: user.email, subject: "Reset your Combay password", html, headers: { "X-Combay-Email-Type": "password-reset" } });
  return { token, expires, emailResult };
}

export async function resetPasswordWithToken(args: { email: string; token: string; password: string }) {
  const email = normaliseEmail(args.email);
  const token = String(args.token || "").trim();
  if (!email || !token) return { ok: false, error: "Password reset link is invalid." } as const;
  const identifier = `password-reset:${email}`;
  const record = await prisma.verificationToken.findFirst({ where: { identifier, token } });
  if (!record || record.expires < new Date()) {
    await prisma.verificationToken.deleteMany({ where: { identifier } }).catch(() => undefined);
    return { ok: false, error: "Password reset link is invalid or has expired." } as const;
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.suspendedAt) return { ok: false, error: "Password reset link is invalid or has expired." } as const;
  const passwordHash = await bcrypt.hash(args.password, 12);
  await prisma.user.update({ where: { email }, data: { passwordHash } });
  await prisma.verificationToken.deleteMany({ where: { identifier } }).catch(() => undefined);
  return { ok: true, user } as const;
}
