import { prisma } from "@/lib/db";
import { emailButton, escapeHtml, htmlShell, sendEmail, siteUrl, type EmailSendResult } from "@/lib/mailer";

export type AutomationTrigger = "NEW_SIGNUP" | "FIRST_ORDER_COMPLETED" | "ORDER_COMPLETED";

type AutomationContext = {
  user?: any;
  order?: any;
  customer?: { email?: string; name?: string; company?: string | null };
};

const DEFAULT_RULES: Record<AutomationTrigger, { name: string; subject: string; body: string; ctaLabel?: string; ctaUrl?: string }> = {
  NEW_SIGNUP: {
    name: "Welcome new customer",
    subject: "Welcome to Combay",
    body: "Dear {{name}},\n\nThank you for creating a Combay account. You can now request quotes, place orders, track purchases, manage returns and raise support tickets from your customer portal.\n\nIf you need help sourcing industrial automation, scientific, test, AV or networking equipment, reply to this email with the SKU, MPN, manufacturer or application details.",
    ctaLabel: "Open customer portal",
    ctaUrl: "/portal",
  },
  FIRST_ORDER_COMPLETED: {
    name: "First order thank-you",
    subject: "Thank you for your first Combay order {{orderNumber}}",
    body: "Dear {{name}},\n\nThank you for placing your first order with Combay. Payment has been received for {{orderNumber}} and our team will now process the order for dispatch.\n\nYou can track the order from your customer portal once dispatch details are added.",
    ctaLabel: "View order",
    ctaUrl: "/portal/orders",
  },
  ORDER_COMPLETED: {
    name: "Order completed follow-up",
    subject: "Combay order {{orderNumber}} confirmed",
    body: "Dear {{name}},\n\nPayment has been received for order {{orderNumber}}. We will prepare the goods and add dispatch/tracking details as soon as available.\n\nIf any delivery details need updating, please reply to this email immediately.",
    ctaLabel: "View order",
    ctaUrl: "/portal/orders",
  },
};

export function defaultAutomationRule(trigger: AutomationTrigger) {
  return { trigger, isActive: true, delayHours: 0, ...DEFAULT_RULES[trigger] };
}

export function automationTriggerLabel(trigger: string) {
  if (trigger === "NEW_SIGNUP") return "New signup";
  if (trigger === "FIRST_ORDER_COMPLETED") return "First paid order";
  if (trigger === "ORDER_COMPLETED") return "Any paid order";
  return trigger;
}

function recipientFor(trigger: AutomationTrigger, context: AutomationContext) {
  const order = context.order;
  const user = context.user;
  const customer = context.customer;
  return {
    email: String(order?.customerEmail || user?.email || customer?.email || "").trim().toLowerCase(),
    name: String(order?.customerName || user?.name || customer?.name || "Customer").trim(),
    company: order?.company || user?.company || customer?.company || "",
    orderNumber: order?.orderNumber || "",
    orderTotal: order?.total !== undefined ? `£${Number(order.total).toFixed(2)}` : "",
  };
}

function tokenMap(trigger: AutomationTrigger, context: AutomationContext) {
  const recipient = recipientFor(trigger, context);
  const order = context.order;
  return {
    name: recipient.name || "Customer",
    email: recipient.email,
    company: recipient.company || "",
    orderNumber: recipient.orderNumber || "",
    orderTotal: recipient.orderTotal || "",
    portalUrl: `${siteUrl().replace(/\/$/, "")}/portal`,
    orderUrl: `${siteUrl().replace(/\/$/, "")}/portal/orders`,
    shopUrl: `${siteUrl().replace(/\/$/, "")}/shop`,
    promotionCode: order?.promotionCode || "",
  };
}

export function renderTemplate(template: string, trigger: AutomationTrigger, context: AutomationContext) {
  const tokens = tokenMap(trigger, context);
  return String(template || "").replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key) => String((tokens as any)[key] ?? ""));
}

function bodyHtml(body: string) {
  return body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

async function getRulesForTrigger(trigger: AutomationTrigger) {
  try {
    const rules = await prisma.emailAutomationRule.findMany({
      where: { trigger, isActive: true },
      orderBy: [{ createdAt: "asc" }],
    });
    if (rules.length) return rules;
  } catch (error) {
    console.error("[automation-rules-load-failed]", error);
  }
  if (trigger === "ORDER_COMPLETED") return [];
  return [{ id: null, ...defaultAutomationRule(trigger) }];
}

async function shouldSkipDuplicate(ruleId: string | null, trigger: AutomationTrigger, email: string, context: AutomationContext) {
  if (trigger === "ORDER_COMPLETED") return false;
  const orderId = context.order?.id || null;
  const where: any = { trigger, recipientEmail: email, status: "SENT" };
  if (ruleId) where.ruleId = ruleId;
  if (orderId) where.orderId = orderId;
  const existing = await prisma.emailAutomationLog.findFirst({ where, select: { id: true } }).catch(() => null);
  return Boolean(existing);
}

export async function runEmailAutomations(trigger: AutomationTrigger, context: AutomationContext): Promise<EmailSendResult[]> {
  const recipient = recipientFor(trigger, context);
  if (!recipient.email) return [];
  const rules = await getRulesForTrigger(trigger);
  const results: EmailSendResult[] = [];

  for (const rule of rules as any[]) {
    const ruleId = rule.id || null;
    if (await shouldSkipDuplicate(ruleId, trigger, recipient.email, context)) continue;

    const subject = renderTemplate(rule.subject, trigger, context);
    const renderedBody = renderTemplate(rule.body, trigger, context);
    const ctaUrlRaw = renderTemplate(rule.ctaUrl || "", trigger, context).trim();
    const ctaUrl = ctaUrlRaw ? (ctaUrlRaw.startsWith("http") ? ctaUrlRaw : `${siteUrl().replace(/\/$/, "")}${ctaUrlRaw.startsWith("/") ? "" : "/"}${ctaUrlRaw}`) : "";
    const cta = ctaUrl ? emailButton(ctaUrl, rule.ctaLabel || "View details") : "";
    const html = htmlShell(subject, `${bodyHtml(renderedBody)}${cta}<p style="margin-bottom:0;">Kind regards,<br/><strong>Combay Limited</strong></p>`, subject);

    const log = await prisma.emailAutomationLog.create({
      data: {
        ruleId,
        trigger,
        recipientEmail: recipient.email,
        userId: context.user?.id || context.order?.userId || null,
        orderId: context.order?.id || null,
        status: "PENDING",
      },
    }).catch(() => null);

    const result = await sendEmail({ to: recipient.email, subject, html });
    results.push(result);
    if (log) {
      await prisma.emailAutomationLog.update({
        where: { id: log.id },
        data: {
          status: result.sent ? "SENT" : "FAILED",
          message: result.error || result.message,
          providerId: result.id || null,
          sentAt: result.sent ? new Date() : null,
        },
      }).catch(() => null);
    }
  }
  return results;
}
