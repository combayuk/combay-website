import { NextResponse } from "next/server";
import { prisma, withDatabase } from "@/lib/db";
import { defaultSiteContent, getSiteContent, normaliseSiteContent, saveSiteContent, SITE_CONTENT_KEY } from "@/lib/siteContent";

export const dynamic = "force-dynamic";

export async function GET() {
  const content = await getSiteContent();
  return NextResponse.json({ ok: true, content, defaults: defaultSiteContent });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.content) return NextResponse.json({ ok: false, error: "Missing site content." }, { status: 400 });
  const content = normaliseSiteContent(body.content);
  const dbResult = await withDatabase(async () => saveSiteContent(content));
  if (!dbResult.ok) return NextResponse.json({ ok: false, error: dbResult.reason }, { status: 500 });
  return NextResponse.json({ ok: true, content: dbResult.data });
}

export async function DELETE() {
  const dbResult = await withDatabase(async () => {
    await prisma.siteSetting.delete({ where: { key: SITE_CONTENT_KEY } }).catch(() => null);
    return defaultSiteContent;
  });
  if (!dbResult.ok) return NextResponse.json({ ok: false, error: dbResult.reason }, { status: 500 });
  return NextResponse.json({ ok: true, content: dbResult.data });
}
