import { NextResponse } from "next/server";
import { prisma, withDatabase } from "@/lib/db";
import { publicMarketingPrefs } from "@/lib/marketingConsent";

export const dynamic = "force-dynamic";

function tokenFrom(request: Request) {
  const url = new URL(request.url);
  return String(url.searchParams.get("token") || "").trim();
}

export async function GET(request: Request) {
  const token = tokenFrom(request);
  if (!token) return NextResponse.json({ ok: false, error: "Unsubscribe token is missing." }, { status: 400 });
  const result = await withDatabase(async () => {
    const prefs = await prisma.marketingPrefs.findUnique({ where: { unsubscribeToken: token }, include: { user: { select: { email: true, name: true } } } });
    if (!prefs) return null;
    return { email: prefs.user.email, name: prefs.user.name || "", prefs: publicMarketingPrefs(prefs) };
  });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: 500 });
  if (!result.data) return NextResponse.json({ ok: false, error: "This unsubscribe link is invalid or expired." }, { status: 404 });
  return NextResponse.json({ ok: true, ...result.data });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = String(body.token || tokenFrom(request)).trim();
  const mode = String(body.mode || "all");
  if (!token) return NextResponse.json({ ok: false, error: "Unsubscribe token is missing." }, { status: 400 });
  const result = await withDatabase(async () => {
    const existing = await prisma.marketingPrefs.findUnique({ where: { unsubscribeToken: token }, include: { user: { select: { email: true, name: true } } } });
    if (!existing) return null;
    const data = mode === "seasonal"
      ? { seasonalEmails: false, consentSource: "unsubscribe-link", consentUpdatedAt: new Date() }
      : mode === "monthly"
        ? { monthlyEmails: false, consentSource: "unsubscribe-link", consentUpdatedAt: new Date() }
        : { allMarketingEmails: false, newStockEmails: false, promotionEmails: false, monthlyEmails: false, seasonalEmails: false, unsubscribedAt: new Date(), consentSource: "unsubscribe-link", consentUpdatedAt: new Date() };
    const prefs = await prisma.marketingPrefs.update({ where: { id: existing.id }, data });
    return { email: existing.user.email, prefs: publicMarketingPrefs(prefs) };
  });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: 500 });
  if (!result.data) return NextResponse.json({ ok: false, error: "This unsubscribe link is invalid or expired." }, { status: 404 });
  return NextResponse.json({ ok: true, ...result.data, message: "Email preference updated." });
}
