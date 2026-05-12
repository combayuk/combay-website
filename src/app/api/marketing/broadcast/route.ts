import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { emailButton, escapeHtml, htmlShell, sendEmail, siteUrl } from "@/lib/mailer";
import { ensureMarketingPrefs, publicMarketingPrefs, unsubscribeUrl } from "@/lib/marketingConsent";

export const dynamic = "force-dynamic";

type RecipientMode = "customers" | "all-leads" | "selected-leads" | "manual-only";

type Recipient = {
  email: string;
  name?: string | null;
  company?: string | null;
  userId?: string | null;
  marketingPrefs?: any;
  source: "customer" | "lead" | "manual";
};

type BroadcastAttachment = {
  filename: string;
  content: string;
  contentType?: string;
};

function cleanEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseManualEmails(value: unknown) {
  if (Array.isArray(value)) return value.map(cleanEmail).filter(validEmail);
  return String(value || "")
    .split(/[\s,;]+/)
    .map(cleanEmail)
    .filter(validEmail);
}

function bodyHtml(value: string) {
  return String(value || "")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${escapeHtml(part).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

function cleanAdminHtml(value: string) {
  return String(value || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*["'][\s\S]*?["']/gi, "")
    .replace(/javascript:/gi, "");
}

function normaliseAttachments(value: unknown): BroadcastAttachment[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item: any) => ({
      filename: String(item?.filename || "").trim(),
      content: String(item?.content || "").trim(),
      contentType: item?.contentType ? String(item.contentType).trim() : undefined,
    }))
    .filter((item) => item.filename && item.content)
    .slice(0, 5);
}

function title(value: string) {
  return String(value || "Customer")
    .trim()
    .toLowerCase()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase())
    .replace(/\s+/g, " ");
}

function render(value: string, recipient: Recipient) {
  const base = siteUrl().replace(/\/$/, "");
  const tokens: Record<string, string> = {
    name: title(recipient.name || recipient.email.split("@")[0] || "Customer"),
    email: recipient.email,
    company: recipient.company || "",
    shopUrl: `${base}/shop`,
    portalUrl: `${base}/portal`,
    contactUrl: `${base}/contact`,
  };
  return String(value || "").replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key) => tokens[key] || "");
}

function resolveCtaUrl(raw: string, recipient: Recipient) {
  const rendered = render(raw, recipient).trim();
  if (!rendered) return "";
  if (/^https?:\/\//i.test(rendered)) return rendered;
  return `${siteUrl().replace(/\/$/, "")}${rendered.startsWith("/") ? "" : "/"}${rendered}`;
}

function dedupeRecipients(recipients: Recipient[]) {
  const seen = new Map<string, Recipient>();
  for (const recipient of recipients) {
    const email = cleanEmail(recipient.email);
    if (!validEmail(email)) continue;
    if (!seen.has(email)) seen.set(email, { ...recipient, email });
  }
  return Array.from(seen.values());
}

async function recipientsFromRequest(body: any): Promise<{ recipients: Recipient[]; invalidManualCount: number; mode: RecipientMode }> {
  const mode = (["customers", "all-leads", "selected-leads", "manual-only"].includes(String(body.recipientMode)) ? String(body.recipientMode) : "customers") as RecipientMode;
  const selectedLeadIds = Array.isArray(body.selectedLeadIds) ? body.selectedLeadIds.map(String).filter(Boolean) : [];
  const manualEmailsRaw = String(body.manualEmails || "");
  const manualEmails = parseManualEmails(manualEmailsRaw);
  const manualCandidates = manualEmailsRaw.split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean);
  const invalidManualCount = Math.max(manualCandidates.length - manualEmails.length, 0);

  const recipients: Recipient[] = [];

  if (mode === "customers") {
    const users = await prisma.user.findMany({
      where: { role: "CUSTOMER", email: { not: "" }, OR: [{ emailVerified: { not: null } }, { requiresEmailVerification: false }] },
      include: { marketingPrefs: true },
      take: 5000,
    });
    recipients.push(...users.map((user) => ({ email: user.email, name: user.name, company: user.company, userId: user.id, marketingPrefs: user.marketingPrefs, source: "customer" as const })));
  }

  if (mode === "all-leads" || mode === "selected-leads") {
    const leads = await prisma.lead.findMany({
      where: mode === "selected-leads" ? { id: { in: selectedLeadIds } } : { email: { not: "" } },
      orderBy: { lastContactAt: "desc" },
      take: mode === "selected-leads" ? Math.max(selectedLeadIds.length, 1) : 10000,
    });
    recipients.push(...leads.map((lead) => ({ email: lead.email, name: lead.name, company: lead.company, source: "lead" as const })));
  }

  if (mode !== "manual-only") {
    recipients.push(...manualEmails.map((email) => ({ email, source: "manual" as const })));
  } else {
    recipients.push(...manualEmails.map((email) => ({ email, source: "manual" as const })));
  }

  return { recipients: dedupeRecipients(recipients), invalidManualCount, mode };
}


function publicBroadcastLog(log: any) {
  return {
    id: log.id,
    recipientEmail: log.recipientEmail,
    subject: log.subject || "",
    preview: log.preview || "",
    category: log.category || "broadcast",
    status: log.status,
    message: log.message || log.skippedReason || "",
    providerId: log.providerId || null,
    sentAt: log.sentAt?.toISOString?.() || null,
    createdAt: log.createdAt?.toISOString?.() || null,
  };
}

export async function GET() {
  const logs = await prisma.emailAutomationLog.findMany({
    where: { category: { startsWith: "broadcast" } },
    orderBy: { createdAt: "desc" },
    take: 60,
  }).catch(() => []);

  const summary = logs.reduce((acc: any, log: any) => {
    acc[log.status] = (acc[log.status] || 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    ok: true,
    logs: logs.map(publicBroadcastLog),
    summary: { sent: summary.SENT || 0, failed: summary.FAILED || 0, skipped: summary.SKIPPED || 0, pending: summary.PENDING || 0 },
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const subject = String(body.subject || "").trim();
  const rawBody = String(body.body || "").trim();
  const rawBodyHtml = String(body.bodyHtml || "").trim();
  const ctaLabel = String(body.ctaLabel || "").trim();
  const ctaUrlRaw = String(body.ctaUrl || "").trim();
  const respect = body.respectPreferences !== false;
  const attachments = normaliseAttachments(body.attachments);

  if (!subject || !rawBody) {
    return NextResponse.json({ ok: false, error: "Subject and body are required." }, { status: 400 });
  }

  const { recipients, invalidManualCount, mode } = await recipientsFromRequest(body);

  if (!recipients.length) {
    return NextResponse.json({ ok: false, error: "No valid recipients were selected or entered." }, { status: 400 });
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const bySource = { customer: 0, lead: 0, manual: 0 };

  for (const recipient of recipients) {
    bySource[recipient.source] += 1;

    let prefs = recipient.marketingPrefs;
    if (recipient.userId && !prefs) prefs = await ensureMarketingPrefs(recipient.userId, "broadcast-send").catch(() => null);
    const publicPrefs = recipient.userId ? publicMarketingPrefs(prefs) : null;

    if (respect && publicPrefs && !publicPrefs.allMarketingEmails) {
      skipped++;
      await prisma.emailAutomationLog.create({
        data: {
          trigger: "ORDER_COMPLETED",
          recipientEmail: recipient.email,
          userId: recipient.userId || null,
          subject,
          preview: rawBody.slice(0, 250),
          category: "broadcast",
          status: "SKIPPED",
          message: "Recipient unsubscribed from marketing broadcasts.",
          skippedReason: "Recipient unsubscribed from marketing broadcasts.",
        },
      }).catch(() => null);
      continue;
    }

    const renderedSubject = render(subject, recipient);
    const renderedBody = render(rawBody, recipient);
    const renderedBodyHtml = rawBodyHtml ? cleanAdminHtml(render(rawBodyHtml, recipient)) : bodyHtml(renderedBody);
    const ctaUrl = ctaUrlRaw ? resolveCtaUrl(ctaUrlRaw, recipient) : "";
    const token = prefs?.unsubscribeToken;
    const unsubscribe = token ? unsubscribeUrl(token, "BROADCAST") : `${siteUrl().replace(/\/$/, "")}/contact`;
    const footer = `<div style="margin-top:26px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.6;color:#64748b;">You are receiving this because you contacted Combay or your marketing preferences allow customer emails. ${token ? `<a href="${escapeHtml(unsubscribe)}" style="color:#475569;text-decoration:underline;">Unsubscribe or manage preferences</a>.` : `If you would prefer not to receive further emails, please reply with “unsubscribe”.`}</div>`;
    const cta = ctaUrl && ctaLabel ? emailButton(ctaUrl, ctaLabel, "primary") : "";
    const html = htmlShell(
      renderedSubject,
      `${renderedBodyHtml}${cta}<p style="margin-bottom:0;">Kind regards,<br/><strong>Combay Limited</strong></p>${footer}`,
      renderedSubject,
    );

    const log = await prisma.emailAutomationLog.create({
      data: {
        trigger: "ORDER_COMPLETED",
        recipientEmail: recipient.email,
        userId: recipient.userId || null,
        subject: renderedSubject,
        preview: renderedBody.slice(0, 250),
        category: `broadcast:${mode}:${recipient.source}`,
        status: "PENDING",
      },
    }).catch(() => null);

    const response = await sendEmail({
      to: recipient.email,
      subject: renderedSubject,
      html,
      headers: token
        ? { "List-Unsubscribe": `<${unsubscribe}>`, "X-Combay-Email-Category": "broadcast" }
        : { "X-Combay-Email-Category": "broadcast" },
      attachments,
    });

    response.sent ? sent++ : failed++;

    if (log) {
      await prisma.emailAutomationLog.update({
        where: { id: log.id },
        data: {
          status: response.sent ? "SENT" : "FAILED",
          message: response.error || response.message,
          providerId: response.id || null,
          sentAt: response.sent ? new Date() : null,
        },
      }).catch(() => null);
    }
  }

  return NextResponse.json({
    ok: true,
    mode,
    checked: recipients.length,
    sent,
    failed,
    skipped,
    invalidManualCount,
    bySource,
  });
}
