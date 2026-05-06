import { NextResponse } from "next/server";
import { prisma, withDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

const TRIGGERS = ["NEW_SIGNUP", "FIRST_ORDER_COMPLETED", "ORDER_COMPLETED"] as const;

function cleanRule(body: any) {
  const trigger = TRIGGERS.includes(body.trigger) ? body.trigger : null;
  const name = String(body.name || "").trim();
  const subject = String(body.subject || "").trim();
  const bodyText = String(body.body || "").trim();
  if (!trigger) throw new Error("Choose a valid automation trigger.");
  if (!name) throw new Error("Rule name is required.");
  if (!subject) throw new Error("Email subject is required.");
  if (!bodyText) throw new Error("Email body is required.");
  return {
    name,
    trigger,
    isActive: Boolean(body.isActive),
    subject,
    body: bodyText,
    ctaLabel: body.ctaLabel ? String(body.ctaLabel).trim() : null,
    ctaUrl: body.ctaUrl ? String(body.ctaUrl).trim() : null,
    delayHours: Math.max(0, Math.floor(Number(body.delayHours || 0))),
  };
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "Invalid automation data." }, { status: 400 });
  try {
    const data = cleanRule(body);
    const result = await withDatabase(async () => prisma.emailAutomationRule.update({ where: { id: params.id }, data }));
    if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not update automation." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const result = await withDatabase(async () => {
    await prisma.emailAutomationRule.delete({ where: { id: params.id } });
    return true;
  });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: 500 });
  return NextResponse.json({ ok: true });
}
