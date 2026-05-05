import { NextResponse, type NextRequest } from "next/server";
import { prisma, withDatabase } from "@/lib/db";
import { escapeHtml, sendEmail, siteUrl } from "@/lib/mailer";

function label(value: string) {
  return value.replace(/_/g, " ").toLowerCase();
}

function title(value: string) {
  if (value === "QUOTE") return "Quotation";
  if (value === "PROFORMA_INVOICE") return "Proforma invoice";
  if (value === "COMMERCIAL_INVOICE") return "Commercial invoice";
  if (value === "PAID_INVOICE" || value === "INVOICE") return "Paid invoice";
  if (value === "PACKING_LIST") return "Packing list";
  return label(value);
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || request.nextUrl.origin || siteUrl();
  const result = await withDatabase(async () => prisma.invoice.findUnique({ where: { id: params.id }, include: { order: true } }));

  if (!result.ok) return NextResponse.json({ ok: false, error: "Database unavailable", reason: result.reason }, { status: 500 });
  const doc: any = result.data;
  if (!doc) return NextResponse.json({ ok: false, error: "Document not found" }, { status: 404 });

  const url = `${origin}/api/invoices/${doc.id}/html`;
  const docTitle = title(doc.type);
  const subject = `Combay ${docTitle} ${doc.documentNumber}`;
  const payLine = doc.paymentLink ? `<p><a href="${escapeHtml(doc.paymentLink)}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;">Pay securely by card</a></p>` : "";
  const html = `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#111827;"><div style="max-width:680px;margin:0 auto;padding:24px;"><div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;"><div style="padding:22px 24px;border-bottom:1px solid #e5e7eb;"><p style="margin:0 0 5px;color:#6b7280;font-size:13px;">Combay Limited</p><h1 style="margin:0;font-size:20px;color:#0f172a;">${escapeHtml(docTitle)} ${escapeHtml(doc.documentNumber)}</h1></div><div style="padding:24px;font-size:14px;line-height:1.55;"><p>Dear ${escapeHtml(doc.customerName || "Customer")},</p><p>Please find your ${escapeHtml(docTitle.toLowerCase())} below.</p><p><a href="${escapeHtml(url)}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;">Open / print document</a></p>${payLine}<p>Regards,<br/>Combay Limited</p></div><div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;">sales@combay.co.uk · +44 7340 383334</div></div></div></body></html>`;

  const email = await sendEmail({ to: doc.customerEmail, subject, html });

  let updated = doc;
  if (email.sent) {
    const update = await withDatabase(async () => prisma.invoice.update({ where: { id: doc.id }, data: { status: doc.status === "DRAFT" ? "SENT" : doc.status, sentAt: new Date() }, include: { order: true, lines: true } }));
    if (update.ok) updated = update.data;
  }

  return NextResponse.json({ ok: email.sent, email, document: updated, url });
}
