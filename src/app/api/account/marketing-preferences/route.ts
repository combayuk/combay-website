import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db";
import { CATEGORY_INTERESTS, ensureMarketingPrefs, publicMarketingPrefs, updateMarketingPrefs } from "@/lib/marketingConsent";

export const dynamic = "force-dynamic";

async function currentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  if (!isDatabaseConfigured()) return { id: "preview", email: session.user.email, name: session.user.name || "Preview Customer", marketingPrefs: null } as any;
  return prisma.user.findUnique({ where: { email: session.user.email.toLowerCase() }, include: { marketingPrefs: true } });
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Please sign in before viewing marketing preferences." }, { status: 401 });
  if (user.id === "preview") return NextResponse.json({ ok: true, categories: CATEGORY_INTERESTS, prefs: publicMarketingPrefs(null), mode: "preview" });
  const prefs = user.marketingPrefs || await ensureMarketingPrefs(user.id, "customer-portal-load");
  return NextResponse.json({ ok: true, categories: CATEGORY_INTERESTS, prefs: publicMarketingPrefs(prefs) });
}

export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Please sign in before updating marketing preferences." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (user.id === "preview") return NextResponse.json({ ok: true, mode: "preview", prefs: publicMarketingPrefs(body), message: "Marketing preferences validated in preview mode." });
  const prefs = await updateMarketingPrefs(user.id, { ...body, consentSource: "customer-portal" });
  return NextResponse.json({ ok: true, prefs: publicMarketingPrefs(prefs), message: "Marketing preferences saved." });
}
