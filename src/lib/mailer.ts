export type EmailSendResult = {
  configured: boolean;
  sent: boolean;
  provider: "resend" | "not-configured";
  message: string;
  id?: string;
  error?: string;
};

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

function cleanEmail(value: unknown) {
  return String(value ?? "").trim();
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function emailStatus(): EmailSendResult {
  if (!isEmailConfigured()) {
    return {
      configured: false,
      sent: false,
      provider: "not-configured",
      message: "Email not sent because RESEND_API_KEY and EMAIL_FROM are not configured.",
    };
  }
  return {
    configured: true,
    sent: false,
    provider: "resend",
    message: "Resend is configured. Email will be attempted by live endpoints.",
  };
}

function normaliseRecipients(to: string | string[]) {
  return (Array.isArray(to) ? to : [to]).map(cleanEmail).filter(Boolean);
}

export function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "https://combay.co.uk";
}

export async function sendEmail(input: SendEmailInput): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const replyTo = input.replyTo || process.env.EMAIL_REPLY_TO || process.env.ADMIN_EMAIL || "sales@combay.co.uk";
  const to = normaliseRecipients(input.to);

  if (!apiKey || !from) return emailStatus();
  if (to.length === 0) {
    return { configured: true, sent: false, provider: "resend", message: "Email not sent because recipient is missing." };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: input.subject,
        html: input.html,
        text: input.text || htmlToText(input.html),
        reply_to: replyTo,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        configured: true,
        sent: false,
        provider: "resend",
        message: "Resend rejected the email request.",
        error: data?.message || data?.error?.message || `HTTP ${response.status}`,
      };
    }
    return {
      configured: true,
      sent: true,
      provider: "resend",
      message: "Email sent via Resend.",
      id: data?.id,
    };
  } catch (error) {
    return {
      configured: true,
      sent: false,
      provider: "resend",
      message: "Email send failed.",
      error: error instanceof Error ? error.message : "Unknown email error",
    };
  }
}

export function htmlShell(title: string, content: string) {
  return `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#111827;"><div style="max-width:680px;margin:0 auto;padding:24px;"><div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;"><div style="padding:20px 24px;border-bottom:1px solid #e5e7eb;"><div style="font-size:13px;color:#6b7280;margin-bottom:4px;">Combay Limited</div><h1 style="margin:0;font-size:20px;color:#0f172a;">${escapeHtml(title)}</h1></div><div style="padding:24px;font-size:14px;line-height:1.55;">${content}</div><div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;">Combay Limited · 2B Erick Avenue, Chelmsford, Essex, CM1 7BX<br/>sales@combay.co.uk · +44 7340 383334</div></div></div></body></html>`;
}

export function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] as string));
}

export function htmlToText(html: string) {
  return html
    .replace(/<br\s*\/?\>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function sendAdminNotification(args: { subject: string; title: string; rows: Array<[string, unknown]>; message?: string; }) {
  const admin = process.env.ADMIN_EMAIL || "sales@combay.co.uk";
  const rowsHtml = args.rows.map(([label, value]) => `<tr><td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;color:#6b7280;width:160px;">${escapeHtml(label)}</td><td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(value)}</td></tr>`).join("");
  const html = htmlShell(args.title, `${args.message ? `<p>${escapeHtml(args.message)}</p>` : ""}<table style="border-collapse:collapse;width:100%;border:1px solid #e5e7eb;">${rowsHtml}</table>`);
  return sendEmail({ to: admin, subject: args.subject, html });
}

export async function sendCustomerAcknowledgement(args: { to: string; name?: string; subject: string; title: string; reference?: string; body: string; ctaUrl?: string; ctaLabel?: string; }) {
  const cta = args.ctaUrl ? `<p style="margin:24px 0 0;"><a href="${escapeHtml(args.ctaUrl)}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;">${escapeHtml(args.ctaLabel || "View details")}</a></p>` : "";
  const ref = args.reference ? `<p style="padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;"><strong>Reference:</strong> ${escapeHtml(args.reference)}</p>` : "";
  const html = htmlShell(args.title, `<p>Dear ${escapeHtml(args.name || "Customer")},</p><p>${escapeHtml(args.body)}</p>${ref}${cta}<p>Regards,<br/>Combay Limited</p>`);
  return sendEmail({ to: args.to, subject: args.subject, html });
}
