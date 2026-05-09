import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { escapeHtml, htmlShell, sendEmail, siteUrl } from "@/lib/mailer";

export type PasswordResetMode = "customer" | "admin";

const RESET_TTL_MINUTES = 45;

function normaliseEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function normaliseMode(value: unknown): PasswordResetMode {
  return value === "admin" ? "admin" : "customer";
}

function hashToken(rawToken: string) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function resetIdentifier(email: string, mode: PasswordResetMode) {
  return `password-reset:${mode}:${email}`;
}

export async function createPasswordResetToken(emailInput: string, modeInput: unknown = "customer") {
  const email = normaliseEmail(emailInput);
  const mode = normaliseMode(modeInput);
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const identifier = resetIdentifier(email, mode);
  const expires = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);

  await prisma.verificationToken.deleteMany({ where: { identifier } }).catch(() => undefined);
  await prisma.verificationToken.create({ data: { identifier, token: tokenHash, expires } });

  return { token: rawToken, expires, mode };
}

export async function sendPasswordResetEmail(args: { email: string; name?: string | null; token: string; mode?: PasswordResetMode }) {
  const mode = args.mode || "customer";
  const resetUrl = `${siteUrl().replace(/\/$/, "")}/auth/reset-password?token=${encodeURIComponent(args.token)}&mode=${mode}`;
  const firstName = String(args.name || "Customer").trim().split(/\s+/)[0] || "Customer";
  const html = htmlShell(
    "Reset your Combay password",
    `<p style="margin-top:0;">Dear ${escapeHtml(firstName)},</p><p>We received a request to reset the password for your Combay ${mode === "admin" ? "admin" : "customer"} account.</p><p>Copy and paste the link below into your browser to set a new password. This link expires in ${RESET_TTL_MINUTES} minutes.</p><p style="margin:18px 0;padding:12px 14px;border:1px solid #dbe3ea;border-radius:8px;background:#f8fafc;word-break:break-all;"><a href="${escapeHtml(resetUrl)}" style="color:#0f172a;text-decoration:underline;font-weight:800;">${escapeHtml(resetUrl)}</a></p><p>If you did not request this, you can ignore this email. Your password will not change.</p>`,
    "Reset your Combay password"
  );
  return sendEmail({ to: args.email, subject: "Reset your Combay password", html, headers: { "X-Combay-Email-Type": "password-reset" } });
}

export async function consumePasswordResetToken(rawTokenInput: string, passwordInput: string) {
  const rawToken = String(rawTokenInput || "").trim();
  const password = String(passwordInput || "");
  if (!rawToken || rawToken.length < 32) return { ok: false, error: "Password reset link is invalid." } as const;
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." } as const;

  const tokenHash = hashToken(rawToken);
  const token = await prisma.verificationToken.findUnique({ where: { token: tokenHash } });
  if (!token || token.expires < new Date()) {
    if (token) await prisma.verificationToken.deleteMany({ where: { identifier: token.identifier } }).catch(() => undefined);
    return { ok: false, error: "Password reset link is invalid or has expired." } as const;
  }

  const parts = token.identifier.split(":");
  const mode = normaliseMode(parts[1]);
  const email = parts.slice(2).join(":").trim().toLowerCase();
  if (!email) return { ok: false, error: "Password reset link is invalid." } as const;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await prisma.verificationToken.deleteMany({ where: { identifier: token.identifier } }).catch(() => undefined);
    return { ok: false, error: "Password reset link is invalid or has expired." } as const;
  }

  if (mode === "admin" && user.role !== "ADMIN") return { ok: false, error: "This reset link is not valid for an admin account." } as const;
  if (mode === "customer" && user.role !== "CUSTOMER") return { ok: false, error: "This reset link is not valid for a customer account." } as const;

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash, emailVerified: user.emailVerified || new Date(), requiresEmailVerification: false } });
  await prisma.verificationToken.deleteMany({ where: { identifier: token.identifier } }).catch(() => undefined);

  return { ok: true, email: user.email, mode } as const;
}
