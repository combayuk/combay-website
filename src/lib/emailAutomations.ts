import { prisma } from "@/lib/db";
import { emailButton, escapeHtml, htmlShell, sendEmail, siteUrl, type EmailSendResult } from "@/lib/mailer";
import { automationConsentCategory, canSendAutomationToUser, ensureMarketingPrefs, isMarketingAutomation, unsubscribeUrl } from "@/lib/marketingConsent";

export const AUTOMATION_TRIGGERS = [
  "NEW_SIGNUP", "FIRST_ORDER_COMPLETED", "ORDER_COMPLETED",
  "MONTHLY_JANUARY", "MONTHLY_FEBRUARY", "MONTHLY_MARCH", "MONTHLY_APRIL", "MONTHLY_MAY", "MONTHLY_JUNE", "MONTHLY_JULY", "MONTHLY_AUGUST", "MONTHLY_SEPTEMBER", "MONTHLY_OCTOBER", "MONTHLY_NOVEMBER", "MONTHLY_DECEMBER",
  "NEW_YEAR", "SUMMER", "EASTER", "CHRISTMAS", "BOXING_DAY",
] as const;
export type AutomationTrigger = typeof AUTOMATION_TRIGGERS[number];

type AutomationContext = { user?: any; order?: any; customer?: { email?: string; name?: string; company?: string | null }; scheduledAt?: Date };
type DefaultRule = { name: string; subject: string; body: string; ctaLabel?: string; ctaUrl?: string };

const MONTH_NAMES: Record<string, string> = {
  MONTHLY_JANUARY: "January", MONTHLY_FEBRUARY: "February", MONTHLY_MARCH: "March", MONTHLY_APRIL: "April", MONTHLY_MAY: "May", MONTHLY_JUNE: "June", MONTHLY_JULY: "July", MONTHLY_AUGUST: "August", MONTHLY_SEPTEMBER: "September", MONTHLY_OCTOBER: "October", MONTHLY_NOVEMBER: "November", MONTHLY_DECEMBER: "December",
};

const MONTHLY_DEFAULT_RULES = Object.fromEntries(Object.entries(MONTH_NAMES).map(([trigger, month]) => [trigger, {
  name: `${month} customer update`,
  subject: `${month} stock and sourcing update from Combay`,
  body: `Dear {{name}},\n\nThis is our ${month} Combay update. We are continuing to source and supply industrial automation, controls, scientific, test, AV and networking equipment.\n\nIf you have a buying list, obsolete spare, MPN, SKU or manufacturer requirement, reply to this email and our team will check availability.`,
  ctaLabel: "Browse current stock",
  ctaUrl: "/shop",
}])) as Partial<Record<AutomationTrigger, DefaultRule>>;

const DEFAULT_RULES: Record<AutomationTrigger, DefaultRule> = {
  NEW_SIGNUP: { name: "Welcome new customer", subject: "Welcome to Combay", body: "Dear {{name}},\n\nThank you for verifying your Combay account. You can now request quotes, place orders, track purchases, manage returns and raise support tickets from your customer portal.\n\nIf you need help sourcing industrial automation, scientific, test, AV or networking equipment, reply with the SKU, MPN, manufacturer or application details.", ctaLabel: "Open customer portal", ctaUrl: "/portal" },
  FIRST_ORDER_COMPLETED: { name: "First order thank-you", subject: "Thank you for your first Combay order {{orderNumber}}", body: "Dear {{name}},\n\nThank you for placing your first order with Combay. Payment has been received for {{orderNumber}} and our team will now process the order for dispatch.\n\nYou can track the order from your customer portal once dispatch details are added.", ctaLabel: "View order", ctaUrl: "/portal/orders" },
  ORDER_COMPLETED: { name: "Order completed follow-up", subject: "Combay order {{orderNumber}} confirmed", body: "Dear {{name}},\n\nPayment has been received for order {{orderNumber}}. We will prepare the goods and add dispatch/tracking details as soon as available.\n\nIf any delivery details need updating, please reply to this email immediately.", ctaLabel: "View order", ctaUrl: "/portal/orders" },
  MONTHLY_JANUARY: MONTHLY_DEFAULT_RULES.MONTHLY_JANUARY!, MONTHLY_FEBRUARY: MONTHLY_DEFAULT_RULES.MONTHLY_FEBRUARY!, MONTHLY_MARCH: MONTHLY_DEFAULT_RULES.MONTHLY_MARCH!, MONTHLY_APRIL: MONTHLY_DEFAULT_RULES.MONTHLY_APRIL!, MONTHLY_MAY: MONTHLY_DEFAULT_RULES.MONTHLY_MAY!, MONTHLY_JUNE: MONTHLY_DEFAULT_RULES.MONTHLY_JUNE!, MONTHLY_JULY: MONTHLY_DEFAULT_RULES.MONTHLY_JULY!, MONTHLY_AUGUST: MONTHLY_DEFAULT_RULES.MONTHLY_AUGUST!, MONTHLY_SEPTEMBER: MONTHLY_DEFAULT_RULES.MONTHLY_SEPTEMBER!, MONTHLY_OCTOBER: MONTHLY_DEFAULT_RULES.MONTHLY_OCTOBER!, MONTHLY_NOVEMBER: MONTHLY_DEFAULT_RULES.MONTHLY_NOVEMBER!, MONTHLY_DECEMBER: MONTHLY_DEFAULT_RULES.MONTHLY_DECEMBER!,
  NEW_YEAR: { name: "New Year customer message", subject: "New Year sourcing support from Combay", body: "Dear {{name}},\n\nAs the year closes, thank you for using Combay for industrial stock, sourcing and support. If you are planning January procurement, equipment replacement or obsolete spare sourcing, send us your list and we will help check availability.", ctaLabel: "Send an enquiry", ctaUrl: "/contact" },
  SUMMER: { name: "Summer stock campaign", subject: "Summer industrial stock availability at Combay", body: "Dear {{name}},\n\nOur summer stock update is now available. Combay can help with automation spares, controls, test equipment, laboratory equipment and replacement sourcing during planned maintenance periods.\n\nReply with the items you need or browse current listings online.", ctaLabel: "View stock", ctaUrl: "/shop" },
  EASTER: { name: "Easter procurement reminder", subject: "Easter period sourcing support from Combay", body: "Dear {{name}},\n\nAhead of the Easter period, please let us know if you need support sourcing industrial automation, electrical, scientific or test equipment before scheduled downtime.\n\nSend us the SKU, MPN, manufacturer or equipment details and we will check availability.", ctaLabel: "Contact Combay", ctaUrl: "/contact" },
  CHRISTMAS: { name: "Christmas customer message", subject: "Christmas stock and support update from Combay", body: "Dear {{name}},\n\nThank you for working with Combay. During the Christmas period, we can still help with stock enquiries, urgent replacement sourcing and post-holiday procurement planning.\n\nReply with any requirement and our team will advise availability.", ctaLabel: "Browse stock", ctaUrl: "/shop" },
  BOXING_DAY: { name: "Boxing Day stock update", subject: "Boxing Day stock availability from Combay", body: "Dear {{name}},\n\nSelected industrial, automation, laboratory and test equipment remains available through Combay. If you are planning replacement stock, repairs or new-year procurement, send us the details and we will help source suitable options.", ctaLabel: "View available stock", ctaUrl: "/shop" },
};

export function isAutomationTrigger(value: unknown): value is AutomationTrigger { return AUTOMATION_TRIGGERS.includes(value as AutomationTrigger); }
function capitaliseWords(value: unknown) { return String(value ?? "").trim().toLowerCase().replace(/\b([a-z])/g, (match) => match.toUpperCase()).replace(/\s+/g, " "); }
function hasHtmlMarkup(value: string) { return /<(strong|b|em|i|u|br|p|ul|ol|li|span|h2|h3|div)\b/i.test(value); }
function sanitizeLimitedHtml(value: string) { const escapedDanger = String(value || "").replace(/<\/?script[^>]*>/gi, "").replace(/on[a-z]+\s*=\s*["'][^"']*["']/gi, "").replace(/javascript:/gi, ""); const allowed = /<\/?(strong|b|em|i|u|br|p|ul|ol|li|span|h2|h3|div)(\s+style="[^"]{0,220}")?\s*\/?>/gi; return escapedDanger.replace(/<[^>]+>/g, (tag) => tag.match(allowed) ? tag : escapeHtml(tag)); }
export function defaultAutomationRule(trigger: AutomationTrigger) { return { trigger, isActive: true, delayHours: 0, ...DEFAULT_RULES[trigger] }; }
export function automationTriggerLabel(trigger: string) { if (trigger === "NEW_SIGNUP") return "New signup"; if (trigger === "FIRST_ORDER_COMPLETED") return "First paid order"; if (trigger === "ORDER_COMPLETED") return "Any paid order"; if (trigger.startsWith("MONTHLY_")) return `${MONTH_NAMES[trigger] || trigger.replace("MONTHLY_", "")} — first Tuesday`; if (trigger === "NEW_YEAR") return "New Year — 31 December"; if (trigger === "SUMMER") return "Summer — first Friday in June and July"; if (trigger === "EASTER") return "Easter — 3 days before Easter"; if (trigger === "CHRISTMAS") return "Christmas — 20 and 25 December"; if (trigger === "BOXING_DAY") return "Boxing Day — 20 and 26 December"; return trigger; }
export function automationTriggerType(trigger: string) { if (["NEW_SIGNUP", "FIRST_ORDER_COMPLETED", "ORDER_COMPLETED"].includes(trigger)) return "Customer action"; if (trigger.startsWith("MONTHLY_")) return "Monthly campaign"; return "Seasonal campaign"; }
function recipientFor(_trigger: AutomationTrigger, context: AutomationContext) { const order = context.order; const user = context.user; const customer = context.customer; return { email: String(order?.customerEmail || user?.email || customer?.email || "").trim().toLowerCase(), name: capitaliseWords(order?.customerName || user?.name || customer?.name || "Customer"), company: order?.company || user?.company || customer?.company || "", orderNumber: order?.orderNumber || "", orderTotal: order?.total !== undefined ? `£${Number(order.total).toFixed(2)}` : "" }; }
function tokenMap(trigger: AutomationTrigger, context: AutomationContext) { const recipient = recipientFor(trigger, context); const order = context.order; const date = context.scheduledAt || new Date(); return { name: recipient.name || "Customer", email: recipient.email, company: recipient.company || "", orderNumber: recipient.orderNumber || "", orderTotal: recipient.orderTotal || "", portalUrl: `${siteUrl().replace(/\/$/, "")}/portal`, orderUrl: `${siteUrl().replace(/\/$/, "")}/portal/orders`, shopUrl: `${siteUrl().replace(/\/$/, "")}/shop`, contactUrl: `${siteUrl().replace(/\/$/, "")}/contact`, promotionCode: order?.promotionCode || "", month: MONTH_NAMES[trigger] || date.toLocaleString("en-GB", { month: "long" }), year: String(date.getFullYear()) }; }
export function renderTemplate(template: string, trigger: AutomationTrigger, context: AutomationContext) { const tokens = tokenMap(trigger, context); return String(template || "").replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key) => String((tokens as any)[key] ?? "")); }
function bodyHtml(body: string) { if (hasHtmlMarkup(body)) return sanitizeLimitedHtml(body).replace(/\n{2,}/g, "</p><p>").replace(/(?<!>)\n/g, "<br/>"); return body.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean).map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br/>")}</p>`).join(""); }
function previewText(value: string) { return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 260); }
function unsubscribeFooter(trigger: AutomationTrigger, context: AutomationContext) { const user = context.user; if (!isMarketingAutomation(trigger) || !user?.id) return ""; const prefs = user.marketingPrefs || null; const token = prefs?.unsubscribeToken; if (!token) return ""; const url = unsubscribeUrl(token, trigger); return `<div style="margin-top:26px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.6;color:#64748b;">You are receiving this because your Combay marketing preferences allow ${escapeHtml(automationConsentCategory(trigger))} emails. <a href="${escapeHtml(url)}" style="color:#475569;text-decoration:underline;">Unsubscribe or manage preferences</a>.</div>`; }
async function getRulesForTrigger(trigger: AutomationTrigger) { try { const rules = await prisma.emailAutomationRule.findMany({ where: { trigger, isActive: true }, orderBy: [{ createdAt: "asc" }] }); if (rules.length) return rules; } catch (error) { console.error("[automation-rules-load-failed]", error); } if (trigger === "ORDER_COMPLETED") return []; return [{ id: null, ...defaultAutomationRule(trigger) }]; }
function startOfDay(date: Date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
async function shouldSkipDuplicate(ruleId: string | null, trigger: AutomationTrigger, email: string, context: AutomationContext) { const orderId = context.order?.id || null; const where: any = { trigger, recipientEmail: email, status: "SENT" }; if (ruleId) where.ruleId = ruleId; if (orderId) where.orderId = orderId; const scheduled = Boolean(context.scheduledAt) || trigger.startsWith("MONTHLY_") || ["NEW_YEAR", "SUMMER", "EASTER", "CHRISTMAS", "BOXING_DAY"].includes(trigger); if (scheduled) { const day = startOfDay(context.scheduledAt || new Date()); const nextDay = new Date(day.getTime()); nextDay.setDate(day.getDate() + 1); where.createdAt = { gte: day, lt: nextDay }; } else if (trigger !== "ORDER_COMPLETED") { /* signup and first-order remain once-per-rule/customer */ } const existing = await prisma.emailAutomationLog.findFirst({ where, select: { id: true } }).catch(() => null); return Boolean(existing); }
export async function runEmailAutomations(trigger: AutomationTrigger, context: AutomationContext): Promise<EmailSendResult[]> {
  const recipient = recipientFor(trigger, context);
  if (!recipient.email) return [];
  if (context.user?.id && !context.user.marketingPrefs) {
    context.user.marketingPrefs = await ensureMarketingPrefs(context.user.id, "automation-send").catch(() => null);
  }
  const consent = await canSendAutomationToUser(trigger, context.user);
  if (!consent.ok) {
    await prisma.emailAutomationLog.create({ data: { trigger, recipientEmail: recipient.email, userId: context.user?.id || context.order?.userId || null, orderId: context.order?.id || null, category: automationConsentCategory(trigger), status: "SKIPPED", message: consent.reason, skippedReason: consent.reason } }).catch(() => null);
    return [];
  }
  const rules = await getRulesForTrigger(trigger);
  const results: EmailSendResult[] = [];
  for (const rule of rules as any[]) {
    const ruleId = rule.id || null;
    if (await shouldSkipDuplicate(ruleId, trigger, recipient.email, context)) continue;
    const subject = renderTemplate(rule.subject, trigger, context);
    const renderedBody = renderTemplate(rule.body, trigger, context);
    const rawCtaUrl = renderTemplate(rule.ctaUrl || "", trigger, context).trim();
    const ctaUrl = rawCtaUrl ? (rawCtaUrl.startsWith("http") ? rawCtaUrl : `${siteUrl().replace(/\/$/, "")}${rawCtaUrl.startsWith("/") ? "" : "/"}${rawCtaUrl}`) : "";
    const ctaLabel = renderTemplate(rule.ctaLabel || "", trigger, context).trim();
    const cta = ctaUrl && ctaLabel ? emailButton(ctaUrl, ctaLabel, "primary") : "";
    const html = htmlShell(subject, `${bodyHtml(renderedBody)}${cta}<p style="margin-bottom:0;">Kind regards,<br/><strong>Combay Limited</strong></p>${unsubscribeFooter(trigger, context)}`, subject);
    const headers: Record<string, string> = { "X-Combay-Automation": trigger, "X-Combay-Email-Category": automationConsentCategory(trigger) };
    const token = context.user?.marketingPrefs?.unsubscribeToken;
    if (token && isMarketingAutomation(trigger)) headers["List-Unsubscribe"] = `<${unsubscribeUrl(token, trigger)}>`;
    const log = await prisma.emailAutomationLog.create({ data: { ruleId, trigger, recipientEmail: recipient.email, userId: context.user?.id || context.order?.userId || null, orderId: context.order?.id || null, subject, preview: previewText(renderedBody), category: automationConsentCategory(trigger), status: "PENDING" } }).catch(() => null);
    const result = await sendEmail({ to: recipient.email, subject, html, headers });
    results.push(result);
    if (log) await prisma.emailAutomationLog.update({ where: { id: log.id }, data: { status: result.sent ? "SENT" : "FAILED", message: result.error || result.message, providerId: result.id || null, sentAt: result.sent ? new Date() : null } }).catch(() => null);
  }
  return results;
}
function firstWeekdayOfMonth(year: number, monthIndex: number, weekday: number) { const date = new Date(year, monthIndex, 1); const diff = (weekday - date.getDay() + 7) % 7; date.setDate(1 + diff); return date; }
function easterSunday(year: number) { const a = year % 19; const b = Math.floor(year / 100); const c = year % 100; const d = Math.floor(b / 4); const e = b % 4; const f = Math.floor((b + 8) / 25); const g = Math.floor((b - f + 1) / 3); const h = (19 * a + b - d - g + 15) % 30; const i = Math.floor(c / 4); const k = c % 4; const l = (32 + 2 * e + 2 * i - h - k) % 7; const m = Math.floor((a + 11 * h + 22 * l) / 451); const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; const day = ((h + l - 7 * m + 114) % 31) + 1; return new Date(year, month, day); }
function sameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
export function dueAutomationTriggers(today = new Date()): AutomationTrigger[] { const due: AutomationTrigger[] = []; const year = today.getFullYear(); const monthlyTriggers = Object.keys(MONTH_NAMES) as AutomationTrigger[]; monthlyTriggers.forEach((trigger, index) => { if (sameDay(today, firstWeekdayOfMonth(year, index, 2))) due.push(trigger); }); if (today.getMonth() === 11 && today.getDate() === 31) due.push("NEW_YEAR"); if ((today.getMonth() === 5 && sameDay(today, firstWeekdayOfMonth(year, 5, 5))) || (today.getMonth() === 6 && sameDay(today, firstWeekdayOfMonth(year, 6, 5)))) due.push("SUMMER"); const easter = easterSunday(year); const easterSend = new Date(easter.getTime()); easterSend.setDate(easter.getDate() - 3); if (sameDay(today, easterSend)) due.push("EASTER"); if (today.getMonth() === 11 && (today.getDate() === 20 || today.getDate() === 25)) due.push("CHRISTMAS"); if (today.getMonth() === 11 && (today.getDate() === 20 || today.getDate() === 26)) due.push("BOXING_DAY"); return due; }
export async function runScheduledEmailAutomations(today = new Date()) {
  const triggers = dueAutomationTriggers(today);
  if (!triggers.length) return { triggers, checkedCustomers: 0, sent: 0, failed: 0 };
  const users = await prisma.user.findMany({ where: { role: "CUSTOMER", email: { not: "" }, OR: [{ emailVerified: { not: null } }, { requiresEmailVerification: false }] }, take: 5000, include: { marketingPrefs: true } });
  let sent = 0;
  let failed = 0;
  for (const trigger of triggers) {
    for (const user of users) {
      const results = await runEmailAutomations(trigger, { user, scheduledAt: today });
      sent += results.filter((result) => result.sent).length;
      failed += results.filter((result) => !result.sent).length;
    }
  }
  return { triggers, checkedCustomers: users.length, sent, failed };
}
