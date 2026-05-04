import { NextResponse, type NextRequest } from "next/server";
import { prisma, withDatabase } from "@/lib/db";

const DEFAULT_BANK_DETAILS = `Combay Limited
Acc. # 37213788
Sort-code 60-84-64
IBAN. GB45 TRWI 6084 6437 2137 88
SWIFT. TRWIGB2LXXX
Bank Name & Address: Wise Payments Limited Worship Square, 65 Clifton Street London EC2A 4JE United Kingdom
Currency: GBP`;

const DEFAULT_TERMS = `Payment 100% in advance prior to shipment.
Pay by card using the payment link where provided, or by bank transfer using the details shown.
30 days return to base warranty (unless sold for parts)
Customs duty is payable by the buyer`;

function money(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function fmt(value: unknown) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(money(value));
}

function esc(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("\n", "<br/>");
}

function label(value: string) {
  return value.replace(/_/g, " ");
}

function docTitle(type: string) {
  if (type === "QUOTE") return "QUOTE";
  if (type === "PROFORMA_INVOICE") return "PROFORMA INVOICE";
  if (type === "ADDITIONAL_PAYMENT_REQUEST") return "ADDITIONAL PAYMENT REQUEST";
  if (type === "PAID_INVOICE" || type === "INVOICE") return "PAID INVOICE";
  return "COMMERCIAL INVOICE";
}

function isPayable(type: string, balance: number) {
  return ["PROFORMA_INVOICE", "ADDITIONAL_PAYMENT_REQUEST"].includes(type) && balance > 0;
}

function isCommercial(type: string) {
  return type === "COMMERCIAL_INVOICE";
}

function isPaidInvoice(type: string) {
  return type === "PAID_INVOICE" || type === "INVOICE";
}

function hsFromDescription(description: string) {
  return description.match(/HS Code:\s*([^\n]+)/)?.[1] ?? "—";
}

function cleanDescription(description: string) {
  return description
    .split("\n")
    .filter((line) => !line.startsWith("HS Code:") && !line.startsWith("Origin:"))
    .join("\n");
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const dbResult = await withDatabase(async () => prisma.invoice.findUnique({
    where: { id: params.id },
    include: { lines: { orderBy: { sortOrder: "asc" } }, order: true },
  }));

  if (!dbResult.ok) return new NextResponse("Database unavailable", { status: 500 });
  const document = dbResult.data;
  if (!document) return new NextResponse("Document not found", { status: 404 });

  const title = docTitle(document.type);
  const paid = money(document.amountPaid);
  const balance = money(document.balanceDue);
  const payable = isPayable(document.type, balance);
  const paidDocument = (isCommercial(document.type) || isPaidInvoice(document.type)) && balance === 0;
  const bankDetails = document.bankDetails || DEFAULT_BANK_DETAILS;
  const terms = document.paymentTerms || DEFAULT_TERMS;
  const shippingCost = money((document as any).shippingCost);

  const rows = document.lines.map((line) => `
    <tr>
      <td class="qty">${money(line.quantity).toFixed(2).replace(/\.00$/, "")}</td>
      <td class="desc">${esc(cleanDescription(line.description))}${line.sku ? `<br/><small>SKU: ${esc(line.sku)}</small>` : ""}</td>
      <td class="hs">${esc(hsFromDescription(line.description))}</td>
      <td class="num">${fmt(line.unitPrice)}</td>
      <td class="num">${fmt(line.lineTotal)}</td>
    </tr>
  `).join("");

  const companyInfo = `<strong>Combay Limited</strong><br/>CRN. 16638170<br/>2B Erick Avenue, Chelmsford, Essex, England, United Kingdom, CM1 7BX<br/>Cell / WhatsApp +44 7340 383334<br/>sales@combay.co.uk<br/>www.combay.co.uk/`;
  const customerInfo = `<strong>${esc(document.customerName)}</strong>${document.company ? `<br/>${esc(document.company)}` : ""}${document.billingAddress ? `<br/>${esc(document.billingAddress)}` : ""}<br/>Email: ${esc(document.customerEmail)}${document.customerPhone ? `<br/>Tel: ${esc(document.customerPhone)}` : ""}`;

  const commercialBlocks = `
    <section class="boxgrid commercial">
      <div class="box"><h2>Exporter (Sender)</h2><em>COMBAY LIMITED</em><br/>2B Erick Avenue,<br/>Chelmsford, England, CM1 7BX<br/>Tel # +44 7340 383334<br/>mail: sales@combay.co.uk<br/>EORI. GB045614819000<br/>Company # (CRN): 16638170</div>
      <div class="box"><h2>Consignee (Receiver)</h2>${customerInfo}</div>
      <div class="box"><strong>Country of Origin:</strong> United Kingdom<br/><strong>Reason for export:</strong> E-commerce sale<br/><strong>Incoterms:</strong><br/>DAP ${esc((document as any).shippingCountry || "unless stated otherwise")}<br/>(Incoterms® 2020)<br/><br/><strong>Status:</strong> ${esc(label(document.status))}<br/><strong>Balance due:</strong> ${fmt(balance)}</div>
    </section>`;

  const quoteBlocks = `
    <section class="boxgrid simple">
      <div class="box"><h2>Company information</h2>${companyInfo}</div>
      <div class="box"><h2>Customer information</h2>${customerInfo}</div>
      <div class="box"><h2>Document details</h2><strong>Reference:</strong> ${esc(document.documentNumber)}<br/><strong>Date:</strong> ${new Date(document.createdAt).toLocaleDateString("en-GB")}<br/><strong>Status:</strong> ${esc(label(document.status))}<br/><strong>Currency:</strong> GBP${(document as any).shippingCountry ? `<br/><strong>Shipping to:</strong> ${esc((document as any).shippingCountry)}` : ""}</div>
    </section>`;

  const paymentCards = payable ? `<section class="payment"><div class="paybox"><h3>Pay by card</h3>${document.paymentLink ? `<a class="paylink" href="${esc(document.paymentLink)}">Pay securely by card</a>` : `Stripe payment link not generated yet. Add Stripe keys or paste a link before sending.`}</div><div class="paybox"><h3>Pay by bank transfer</h3>${esc(bankDetails)}<br/><strong>Payment reference:</strong> ${esc(document.documentNumber)}</div></section>` : "";

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)} ${esc(document.documentNumber)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 0; background: #f3f4f6; }
  .actions { max-width: 920px; margin: 18px auto; text-align: right; }
  .actions button { background: #111827; color: #fff; border: 0; padding: 10px 16px; border-radius: 8px; cursor: pointer; }
  .page { width: 860px; margin: 0 auto 36px; background: #fff; padding: 34px 38px; border: 1px solid #d1d5db; position: relative; }
  .brand { display: grid; grid-template-columns: 220px 1fr; gap: 22px; align-items: start; margin-bottom: 24px; }
  .logo { font-size: 36px; font-weight: 900; letter-spacing: 2px; color: #1f2937; line-height: .9; }
  .tag { font-size: 11px; letter-spacing: 2px; color: #9ca3af; margin-top: 6px; }
  .company { font-size: 13px; line-height: 1.35; }
  .headerline { display: grid; grid-template-columns: 1fr 1.3fr 1fr; align-items: center; margin-bottom: 10px; font-size: 13px; }
  .headerline h1 { margin: 0; text-align: center; font-size: 18px; letter-spacing: .04em; }
  .stamp { position: absolute; top: 112px; right: 46px; border: 4px solid #16a34a; color: #16a34a; transform: rotate(-8deg); font-size: 26px; font-weight: 900; padding: 8px 18px; opacity: .9; letter-spacing: 2px; }
  .due { position: absolute; top: 112px; right: 40px; border: 3px solid #b45309; color: #b45309; transform: rotate(-5deg); font-size: 18px; font-weight: 900; padding: 8px 12px; opacity: .9; }
  .boxgrid { display: grid; grid-template-columns: 1fr 1fr 1fr; border: 1.5px solid #111827; margin-top: 8px; }
  .box { min-height: 128px; padding: 10px; border-right: 1.5px solid #111827; font-size: 12px; line-height: 1.45; overflow-wrap: anywhere; }
  .box:last-child { border-right: 0; }
  .box h2 { margin: 0 0 8px; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; border-left: 1.5px solid #111827; border-right: 1.5px solid #111827; }
  th { border-bottom: 1.5px solid #111827; border-right: 1.5px solid #111827; padding: 8px; font-size: 12px; text-align: left; background: #f9fafb; }
  th:last-child, td:last-child { border-right: 0; }
  td { border-bottom: 1.5px solid #111827; border-right: 1.5px solid #111827; padding: 10px 8px; height: 86px; vertical-align: top; font-size: 12.5px; overflow-wrap: anywhere; }
  small { font-size: 10.5px; color: #374151; }
  .qty { width: 58px; text-align: center; }
  .desc { width: 390px; }
  .hs { width: 105px; text-align: center; }
  .num { width: 120px; text-align: right; white-space: nowrap; }
  .totals { border: 1.5px solid #111827; border-top: 0; margin-bottom: 14px; }
  .totals .row { display: grid; grid-template-columns: 1fr 160px 170px; min-height: 35px; }
  .totals .row > div { padding: 9px; border-right: 1.5px solid #111827; border-bottom: 1.5px solid #111827; }
  .totals .row > div:last-child { border-right: 0; text-align: right; }
  .totals .row:last-child > div { border-bottom: 0; }
  .grand { font-weight: 900; font-size: 18px; }
  .payment { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 18px; }
  .paybox { border: 1px solid #d1d5db; border-radius: 10px; padding: 14px; font-size: 12px; line-height: 1.5; }
  .paybox h3 { margin: 0 0 8px; font-size: 13px; text-transform: uppercase; }
  .paylink { display: inline-block; background: #111827; color: white; text-decoration: none; padding: 9px 12px; border-radius: 8px; margin-top: 8px; }
  .terms { margin-top: 18px; border: 1px solid #d1d5db; border-radius: 10px; padding: 12px; font-size: 12px; line-height: 1.5; }
  .note { margin-top: 12px; font-size: 12px; line-height: 1.5; }
  .footer { margin: 20px auto 0; border: 1px solid #f59e0b; border-radius: 12px; padding: 14px 22px; width: 620px; text-align: center; font-size: 12px; }
  .center { text-align: center; }
  @media print { body { background: white; } .actions { display: none; } .page { margin: 0; border: 0; width: auto; } }
</style>
</head>
<body>
  <div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
  <main class="page">
    ${paidDocument ? `<div class="stamp">PAID</div>` : payable ? `<div class="due">BALANCE DUE<br/>${fmt(balance)}</div>` : ""}
    <section class="brand">
      <div><div class="logo">COMBAY</div><div class="tag">SOURCING · STOCK · SUPPLY</div></div>
      <div class="company">${companyInfo}</div>
    </section>

    <section class="headerline">
      <div>Our Ref. <strong>${esc(document.documentNumber)}</strong></div>
      <h1>${esc(title)}</h1>
      <div style="text-align:right">Date: ${new Date(document.createdAt).toLocaleDateString("en-GB")}</div>
    </section>

    ${isCommercial(document.type) ? commercialBlocks : quoteBlocks}

    <table>
      <thead><tr><th class="qty">QTY</th><th class="desc">Description</th><th class="hs">HS Code</th><th class="num">Unit</th><th class="num">Value</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <section class="totals">
      <div class="row"><div></div><div><strong>Subtotal</strong></div><div>${fmt(document.subtotal)}</div></div>
      <div class="row"><div>${(document as any).shippingCountry ? `Shipping to ${esc((document as any).shippingCountry)}` : "Shipping"}</div><div>Shipping</div><div>${fmt(shippingCost)}</div></div>
      <div class="row"><div></div><div>VAT</div><div>${fmt(document.tax)}</div></div>
      <div class="row"><div></div><div class="grand">Total</div><div class="grand">${fmt(document.total)}</div></div>
      <div class="row"><div></div><div>Paid</div><div>${fmt(paid)}</div></div>
      <div class="row"><div></div><div><strong>Balance Due</strong></div><div><strong>${fmt(balance)}</strong></div></div>
    </section>

    ${paymentCards}
    <section class="terms"><strong>Terms:</strong><br/>${esc(terms)}</section>
    ${document.notes ? `<section class="note"><strong>Notes:</strong><br/>${esc(document.notes)}</section>` : ""}
    <p class="center" style="font-size:12px;margin-top:14px;">This is a computer-generated document, no signature required.</p>
    <div class="footer"><strong>THANK YOU FOR YOUR BUSINESS</strong><br/>We deal in new / used equipment and parts for: Industrial Automation, Scientific Research, Telecoms, Networks, Test and Measurement, Audio & Visuals. We also repair and consult.</div>
  </main>
</body>
</html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
