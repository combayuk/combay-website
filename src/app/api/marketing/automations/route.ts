import { NextResponse } from "next/server";
import { prisma, withDatabase } from "@/lib/db";
import { AUTOMATION_TRIGGERS, automationTriggerLabel, automationTriggerType, defaultAutomationRule, isAutomationTrigger } from "@/lib/emailAutomations";
export const dynamic = "force-dynamic";
function cleanRule(body: any) { const trigger = isAutomationTrigger(body.trigger) ? body.trigger : null; const name = String(body.name || "").trim(); const subject = String(body.subject || "").trim(); const bodyText = String(body.body || "").trim(); if (!trigger) throw new Error("Choose a valid automation trigger."); if (!name) throw new Error("Rule name is required."); if (!subject) throw new Error("Email subject is required."); if (!bodyText) throw new Error("Email body is required."); return { name, trigger, isActive: Boolean(body.isActive), subject, body: bodyText, ctaLabel: body.ctaLabel ? String(body.ctaLabel).trim() : null, ctaUrl: body.ctaUrl ? String(body.ctaUrl).trim() : null, delayHours: Math.max(0, Math.floor(Number(body.delayHours || 0))) }; }
function publicRule(rule: any) { return { id: rule.id, name: rule.name, trigger: rule.trigger, triggerLabel: automationTriggerLabel(rule.trigger), triggerType: automationTriggerType(rule.trigger), isActive: rule.isActive, subject: rule.subject, body: rule.body, ctaLabel: rule.ctaLabel || "", ctaUrl: rule.ctaUrl || "", delayHours: rule.delayHours || 0, createdAt: rule.createdAt?.toISOString?.() || rule.createdAt, sentCount: rule.logs?.filter?.((log: any) => log.status === "SENT").length || 0, failedCount: rule.logs?.filter?.((log: any) => log.status === "FAILED").length || 0 }; }
export async function GET() {
  const result = await withDatabase(async () => {
    const rules = await prisma.emailAutomationRule.findMany({ orderBy: [{ trigger: "asc" }, { createdAt: "asc" }], include: { logs: { select: { status: true }, take: 500 } } });
    const logs = await prisma.emailAutomationLog.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { rule: { select: { name: true } } } });
    const [customerCount, optedInCount, unsubscribedCount] = await Promise.all([
      prisma.user.count({ where: { role: "CUSTOMER" } }).catch(() => 0),
      prisma.marketingPrefs.count({ where: { allMarketingEmails: true, unsubscribedAt: null } }).catch(() => 0),
      prisma.marketingPrefs.count({ where: { OR: [{ allMarketingEmails: false }, { unsubscribedAt: { not: null } }] } }).catch(() => 0),
    ]);
    const logSummary = logs.reduce((acc: any, log: any) => { acc[log.status] = (acc[log.status] || 0) + 1; return acc; }, {});
    return {
      triggers: AUTOMATION_TRIGGERS.map((trigger) => ({ value: trigger, label: automationTriggerLabel(trigger), type: automationTriggerType(trigger) })),
      rules: rules.map(publicRule),
      stats: { customerCount, optedInCount, unsubscribedCount, recentSent: logSummary.SENT || 0, recentFailed: logSummary.FAILED || 0, recentSkipped: logSummary.SKIPPED || 0 },
      logs: logs.map((log) => ({ id: log.id, ruleName: log.rule?.name || "Built-in fallback", trigger: log.trigger, triggerLabel: automationTriggerLabel(log.trigger), triggerType: automationTriggerType(log.trigger), recipientEmail: log.recipientEmail, subject: log.subject || "", preview: log.preview || "", category: log.category || "", status: log.status, message: log.message || log.skippedReason || "", createdAt: log.createdAt.toISOString(), sentAt: log.sentAt?.toISOString() || null }))
    };
  });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: 500 });
  return NextResponse.json({ ok: true, ...result.data });
}
export async function POST(request: Request) { const body = await request.json().catch(() => null); if (!body) return NextResponse.json({ ok: false, error: "Invalid automation data." }, { status: 400 }); try { const data = body.useDefault ? defaultAutomationRule(body.trigger) : cleanRule(body); const result = await withDatabase(async () => prisma.emailAutomationRule.create({ data })); if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: 500 }); return NextResponse.json({ ok: true, rule: publicRule(result.data) }); } catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not save automation." }, { status: 400 }); } }
