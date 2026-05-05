import { NextResponse, type NextRequest } from "next/server";
import { prisma, withDatabase } from "@/lib/db";
import { emailButton, escapeHtml, htmlShell, sendEmail, siteUrl } from "@/lib/mailer";

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
  const introByType = doc.type === "QUOTE"
    ? "Please find your quotation below. It summarises the products, pricing and any notes currently available. This is not a payment request unless a proforma invoice is issued separately."
    : doc.type === "PROFORMA_INVOICE"
      ? "Please find your proforma invoice below. Payment is required before shipment. You may pay securely by card where a payment link is provided, or by bank transfer using the details shown on the document."
      : doc.type === "PACKING_LIST"
        ? "Please find the packing list for your order below. This document summarises the items and package details for dispatch/reference purposes."
        : doc.type === "COMMERCIAL_INVOICE"
          ? "Please find the commercial invoice below. This document is intended for customs/export and shipment documentation."
          : "Please find your paid invoice below for your records.";
  const payLine = doc.paymentLink ? emailButton(doc.paymentLink, "Pay securely by card") : "";
  const html = htmlShell(
    `${docTitle} ${doc.documentNumber}`,
    `<p style="margin-top:0;">Dear ${escapeHtml(doc.customerName || "Customer")},</p><p>${escapeHtml(introByType)}</p><div style="margin:18px 0;padding:12px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;"><div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px;">Document reference</div><strong style="font-size:16px;color:#111827;">${escapeHtml(doc.documentNumber)}</strong></div>${emailButton(url, "Open / print document", "secondary")}${payLine}<p>Please review the document carefully, including product details, shipping details, payment status and any terms shown. If anything needs correcting before dispatch or payment, reply directly to this email.</p><p style="margin-bottom:0;">Kind regards,<br/><strong>Combay Limited</strong></p>`,
    `${docTitle} ${doc.documentNumber}`,
  );

  const email = await sendEmail({ to: doc.customerEmail, subject, html });

  let updated = doc;
  if (email.sent) {
    const update = await withDatabase(async () => prisma.invoice.update({ where: { id: doc.id }, data: { status: doc.status === "DRAFT" ? "SENT" : doc.status, sentAt: new Date() }, include: { order: true, lines: true } }));
    if (update.ok) updated = update.data;
  }

  return NextResponse.json({ ok: email.sent, email, document: updated, url });
}
