import { NextResponse } from "next/server";
import { prisma, withDatabase } from "@/lib/db";
import { defaultAutomationRule, automationTriggerLabel } from "@/lib/emailAutomations";

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

function publicRule(rule: any) {
  return {
    id: rule.id,
    name: rule.name,
    trigger: rule.trigger,
    triggerLabel: automationTriggerLabel(rule.trigger),
    isActive: rule.isActive,
    subject: rule.subject,
    body: rule.body,
    ctaLabel: rule.ctaLabel || "",
    ctaUrl: rule.ctaUrl || "",
    delayHours: rule.delayHours || 0,
    createdAt: rule.createdAt?.toISOString?.() || rule.createdAt,
    sentCount: rule.logs?.filter?.((log: any) => log.status === "SENT").length || 0,
    failedCount: rule.logs?.filter?.((log: any) => log.status === "FAILED").length || 0,
  };
}

export async function GET() {
  const result = await withDatabase(async () => {
    const rules = await prisma.emailAutomationRule.findMany({
      orderBy: [{ trigger: "asc" }, { createdAt: "asc" }],
      include: { logs: { select: { status: true }, take: 500 } },
    });
    const logs = await prisma.emailAutomationLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { rule: { select: { name: true } } },
    });
    return {
      rules: rules.map(publicRule),
      logs: logs.map((log) => ({
        id: log.id,
        ruleName: log.rule?.name || "Built-in fallback",
        trigger: log.trigger,
        triggerLabel: automationTriggerLabel(log.trigger),
        recipientEmail: log.recipientEmail,
        status: log.status,
        message: log.message || "",
        createdAt: log.createdAt.toISOString(),
        sentAt: log.sentAt?.toISOString() || null,
      })),
    };
  });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: 500 });
  return NextResponse.json({ ok: true, ...result.data });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "Invalid automation data." }, { status: 400 });
  try {
    const data = body.useDefault ? defaultAutomationRule(body.trigger) : cleanRule(body);
    const result = await withDatabase(async () => prisma.emailAutomationRule.create({ data }));
    if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: 500 });
    return NextResponse.json({ ok: true, rule: publicRule(result.data) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not save automation." }, { status: 400 });
  }
}
