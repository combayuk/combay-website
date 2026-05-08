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
  headers?: Record<string, string>;
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

export function emailLogoUrl() {
  return process.env.EMAIL_LOGO_URL || `${siteUrl().replace(/\/$/, "")}/images/combay-doc-logo.png`;
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
        headers: {
          "X-Entity-Ref-ID": `combay-${Date.now()}`,
          ...(input.headers || {}),
        },
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

export function emailButton(url: string, label: string, variant: "primary" | "secondary" = "primary") {
  // Essential payment/document links should remain as professional buttons.
  // General customer-portal / marketing CTA buttons remain disabled in their callers.
  const isPrimary = variant === "primary";
  const bg = isPrimary ? "#f2a900" : "#ffffff";
  const color = isPrimary ? "#0f172a" : "#0f172a";
  const border = isPrimary ? "#f2a900" : "#0f172a";
  return `<table role="presentation" border="0" cellPadding="0" cellSpacing="0" style="margin:18px 0 0;"><tr><td align="left"><a href="${escapeHtml(url)}" style="display:inline-block;background:${bg};border:1px solid ${border};border-radius:8px;color:${color};font-size:14px;font-weight:800;line-height:1;text-decoration:none;padding:13px 18px;">${escapeHtml(label)}</a></td></tr></table>`;
}

export function htmlShell(title: string, content: string, preheader?: string) {
  const logo = emailLogoUrl();
  const hiddenPreheader = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;">${escapeHtml(preheader)}</div>`
    : "";

  return `<!doctype html><html><head><meta charSet="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#eef2f5;font-family:Arial,Helvetica,sans-serif;color:#111827;">${hiddenPreheader}<div style="max-width:700px;margin:0 auto;padding:26px 14px;"><div style="background:#ffffff;border:1px solid #d9e1e8;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,.06);"><div style="padding:24px 28px 20px;border-bottom:1px solid #e5e7eb;background:#ffffff;"><img src="${escapeHtml(logo)}" alt="Combay" width="175" style="display:block;max-width:175px;height:auto;margin:0 0 16px;"><h1 style="margin:0;font-size:22px;line-height:1.28;color:#0f172a;font-weight:800;">${escapeHtml(title)}</h1></div><div style="padding:26px 28px;font-size:14px;line-height:1.68;color:#1f2937;">${content}</div><div style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.6;color:#64748b;"><strong style="color:#334155;">Combay Limited</strong><br/>2B Erick Avenue, Chelmsford, Essex, CM1 7BX<br/>sales@combay.co.uk · +44 7340 383334<br/><span style="color:#94a3b8;">This email relates to your account, enquiry, order, quote or document with Combay. Please reply to this email if anything needs correcting.</span></div></div></div></body></html>`;
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

function detailTable(rows: Array<[string, unknown]>) {
  const rowsHtml = rows
    .filter(([, value]) => String(value ?? "").trim())
    .map(([label, value]) => `<tr><td style="padding:9px 10px;border-bottom:1px solid #e5e7eb;color:#6b7280;width:170px;vertical-align:top;font-weight:700;">${escapeHtml(label)}</td><td style="padding:9px 10px;border-bottom:1px solid #e5e7eb;color:#111827;vertical-align:top;">${escapeHtml(value)}</td></tr>`)
    .join("");
  return `<table style="border-collapse:collapse;width:100%;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">${rowsHtml}</table>`;
}

export async function sendAdminNotification(args: { subject: string; title: string; rows: Array<[string, unknown]>; message?: string; }) {
  const admin = process.env.ADMIN_EMAIL || "sales@combay.co.uk";
  const intro = args.message ? `<p style="margin-top:0;">${escapeHtml(args.message)}</p>` : "";
  const html = htmlShell(args.title, `${intro}${detailTable(args.rows)}`, args.subject);
  return sendEmail({ to: admin, subject: args.subject, html });
}

export async function sendCustomerAcknowledgement(args: { to: string; name?: string; subject: string; title: string; reference?: string; body: string; ctaUrl?: string; ctaLabel?: string; }) {
  const cta = ""; // Customer email action buttons are temporarily disabled.
  const ref = args.reference ? `<div style="margin:18px 0;padding:12px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;"><div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px;">Reference</div><strong style="font-size:16px;color:#111827;">${escapeHtml(args.reference)}</strong></div>` : "";
  const html = htmlShell(
    args.title,
    `<p style="margin-top:0;">Dear ${escapeHtml(args.name || "Customer")},</p><p>${escapeHtml(args.body)}</p>${ref}<p>Our team will review the details and respond with the next step as soon as possible. If any information above is incorrect, or if you need to add documents, photos, delivery details or urgency notes, please reply directly to this email.</p>${cta}<p style="margin-bottom:0;">Kind regards,<br/><strong>Combay Limited</strong><br/><span style="color:#6b7280;">Industrial automation, scientific equipment, repairs and asset recovery</span></p>`,
    args.body,
  );
  return sendEmail({ to: args.to, subject: args.subject, html });
}
