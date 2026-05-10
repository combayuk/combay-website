import { createHmac, timingSafeEqual } from "crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions, type AuthRole } from "@/lib/auth";

export type ApiSession = {
  session: any;
  role: AuthRole;
  email: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function requireApiSession(): Promise<{ ok: true; access: ApiSession } | { ok: false; response: NextResponse }> {
  const session = await getServerSession(authOptions).catch(() => null);
  const email = String(session?.user?.email || "").trim().toLowerCase();
  const role = ((session?.user as any)?.role === "ADMIN" ? "ADMIN" : (session?.user as any)?.role === "CUSTOMER" ? "CUSTOMER" : null) as AuthRole | null;
  if (!session || !email || !role) return { ok: false, response: jsonError("Sign-in required.", 401) };
  return { ok: true, access: { session, role, email } };
}

export async function requireAdminApiSession(): Promise<{ ok: true; access: ApiSession } | { ok: false; response: NextResponse }> {
  const access = await requireApiSession();
  if (!access.ok) return access;
  if (access.access.role !== "ADMIN") return { ok: false, response: jsonError("Admin access required.", 403) };
  return access;
}

export async function requireCustomerApiSession(): Promise<{ ok: true; access: ApiSession } | { ok: false; response: NextResponse }> {
  const access = await requireApiSession();
  if (!access.ok) return access;
  if (access.access.role !== "CUSTOMER") return { ok: false, response: jsonError("Customer portal sign-in required.", 403) };
  return access;
}

export function isAdmin(access: ApiSession) {
  return access.role === "ADMIN";
}

export function sameEmail(a?: string | null, b?: string | null) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

export function invoiceHtmlAccessToken(invoiceId: string) {
  const secret = process.env.INVOICE_PUBLIC_TOKEN_SECRET || process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "";
  if (!secret) return "";
  return createHmac("sha256", secret).update(`invoice-html:${invoiceId}`).digest("hex");
}

export function validInvoiceHtmlAccessToken(invoiceId: string, token?: string | null) {
  const expected = invoiceHtmlAccessToken(invoiceId);
  const provided = String(token || "");
  if (!expected || !provided || expected.length !== provided.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}
