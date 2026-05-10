import { NextResponse, type NextRequest } from "next/server";
import { prisma, withDatabase } from "@/lib/db";
import { requireAdminApiSession, validInvoiceHtmlAccessToken } from "@/lib/apiAccess";

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

function money(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}
function fmt(v: unknown) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(money(v));
}
function esc(v: unknown) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c] as string));
}
function label(v: string) { return v.replace(/_/g, " "); }
function title(type: string) {
  if (type === "QUOTE") return "QUOTATION";
  if (type === "PROFORMA_INVOICE") return "PROFORMA INVOICE";
  if (type === "COMMERCIAL_INVOICE") return "COMMERCIAL INVOICE";
  if (type === "PAID_INVOICE" || type === "INVOICE") return "PAID INVOICE";
  if (type === "ADDITIONAL_PAYMENT_REQUEST") return "ADDITIONAL PAYMENT REQUEST";
  if (type === "PACKING_LIST") return "PACKING LIST";
  return label(type);
}
function hs(desc: string) { return /HS Code:\s*([^\n]+)/i.exec(desc)?.[1]?.trim() ?? ""; }
function clean(desc: string) { return desc.replace(/HS Code:\s*[^\n]+/gi, "").replace(/Origin:\s*[^\n]+/gi, "").trim(); }
function isCommercial(type: string) { return type === "COMMERCIAL_INVOICE"; }
function isPaid(type: string) { return type === "PAID_INVOICE" || type === "INVOICE"; }
function isPacking(type: string) { return type === "PACKING_LIST"; }
function isPayable(type: string, balance: number) { return type === "PROFORMA_INVOICE" && balance > 0; }
function shouldShowPaidStamp(doc: any, balance: number) {
  if (isPacking(doc.type) || doc.type === "QUOTE") return false;
  const amountPaid = money(doc.amountPaid);
  const status = String(doc.status || "").toUpperCase();
  const paidStatus = status === "PAID" || status === "RECEIVED";
  const fullyPaid = balance === 0 && amountPaid > 0;
  return paidStatus || fullyPaid;
}
function formatAddress(raw: unknown) {
  if (!raw) return "";
  if (typeof raw === "object") return Object.values(raw as Record<string, unknown>).filter(Boolean).map(esc).join("<br/>");
  const text = String(raw);
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") return Object.values(parsed).filter(Boolean).map(esc).join("<br/>");
  } catch {}
  return esc(text).replace(/\n/g, "<br/>");
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const hasValidToken = validInvoiceHtmlAccessToken(params.id, request.nextUrl.searchParams.get("token"));
  if (!hasValidToken) {
    const access = await requireAdminApiSession();
    if (!access.ok) return new NextResponse("Admin sign-in required", { status: access.response.status || 401 });
  }

  const result = await withDatabase(async () => prisma.invoice.findUnique({ where: { id: params.id }, include: { lines: { orderBy: { sortOrder: "asc" } }, order: { include: { items: true } } } }));
  if (!result.ok) return new NextResponse("Database unavailable", { status: 500 });
  const doc: any = result.data;
  if (!doc) return new NextResponse("Document not found", { status: 404 });

  const balance = money(doc.balanceDue);
  const payable = isPayable(doc.type, balance);
  const paidDoc = shouldShowPaidStamp(doc, balance);
  const packing = isPacking(doc.type);
  const bank = doc.bankDetails || DEFAULT_BANK_DETAILS;
  const terms = doc.paymentTerms || DEFAULT_TERMS;
  const logo = `/images/combay-doc-logo.png`;
  const companyInfo = `<strong>Combay Limited</strong><br/>CRN. 16638170<br/>2B Erick Avenue, Chelmsford, Essex, England, United Kingdom, CM1 7BX<br/>Cell / WhatsApp +44 7340 383334<br/>sales@combay.co.uk<br/>www.combay.co.uk/`;
  const customerAddress = doc.billingAddress || doc.order?.shippingAddress;
  const customerInfo = `<strong>${esc(doc.customerName)}</strong>${doc.company ? `<br/>${esc(doc.company)}` : ""}${customerAddress ? `<br/>${formatAddress(customerAddress)}` : ""}<br/>Email: ${esc(doc.customerEmail)}${doc.customerPhone ? `<br/>Tel: ${esc(doc.customerPhone)}` : ""}`;
  const exportBlocks = `<section class="boxgrid commercial"><div class="box"><h2>Exporter / Sender</h2><em>COMBAY LIMITED</em><br/>2B Erick Avenue,<br/>Chelmsford, England, CM1 7BX<br/>Tel # +44 7340 383334<br/>mail: sales@combay.co.uk<br/>EORI. GB045614819000<br/>Company # (CRN): 16638170</div><div class="box"><h2>Consignee / Receiver</h2>${customerInfo}</div><div class="box"><strong>Country of Origin:</strong> United Kingdom<br/><strong>Reason for export:</strong> E-commerce sale<br/><strong>Incoterms:</strong><br/>DAP ${esc(doc.shippingCountry || "unless stated otherwise")}<br/>(Incoterms® 2020)<br/><br/><strong>No loose batteries</strong><br/><strong>Status:</strong> ${esc(label(doc.status))}${packing ? `<br/><strong>Values:</strong> Not applicable - packing list only` : `<br/><strong>Balance due:</strong> ${fmt(balance)}`}</div></section>`;
  const normalBlocks = `<section class="boxgrid simple"><div class="box"><h2>Company information</h2>${companyInfo}</div><div class="box"><h2>Customer information</h2>${customerInfo}</div><div class="box"><h2>Document details</h2><strong>Reference:</strong> ${esc(doc.documentNumber)}<br/><strong>Date:</strong> ${new Date(doc.createdAt).toLocaleDateString("en-GB")}<br/><strong>Status:</strong> ${esc(label(doc.status))}<br/><strong>Currency:</strong> GBP${doc.shippingCountry ? `<br/><strong>Shipping to:</strong> ${esc(doc.shippingCountry)}` : ""}</div></section>`;

  const sourceLines = (doc.lines && doc.lines.length ? doc.lines : (packing && doc.order?.items ? doc.order.items.map((item: any, index: number) => ({
    description: String(item.title || item.sku || `Order item ${index + 1}`),
    sku: item.sku,
    quantity: item.quantity,
    unitPrice: 0,
    lineTotal: 0,
  })) : []));

  const itemRows = sourceLines
    .filter((l: any) => clean(String(l.description ?? "")).trim() || String(l.sku ?? "").trim())
    .map((l: any) => packing
      ? `<tr><td class="qty">${money(l.quantity).toFixed(2).replace(/\.00$/, "")}</td><td class="sku">${esc(l.sku ?? "")}</td><td class="desc packdesc">${esc(clean(l.description) || l.sku || "Item").replace(/\n/g, "<br/>")}</td><td class="packnote">No loose batteries</td></tr>`
      : `<tr><td class="qty">${money(l.quantity).toFixed(2).replace(/\.00$/, "")}</td><td class="desc">${esc(clean(l.description)).replace(/\n/g, "<br/>")}${l.sku ? `<br/><small>SKU: ${esc(l.sku)}</small>` : ""}</td><td class="hs">${esc(hs(l.description))}</td><td class="num">${fmt(l.unitPrice)}</td><td class="num">${fmt(l.lineTotal)}</td></tr>`)
    .join("") || (packing ? `<tr><td colspan="4" class="center">No line items were found for this packing list.</td></tr>` : `<tr><td colspan="5" class="center">No line items found.</td></tr>`);

  const table = packing
    ? `<table class="items packing"><colgroup><col class="cqty"/><col class="csku"/><col class="cdesc"/><col class="cnote"/></colgroup><thead><tr><th>QTY</th><th>SKU</th><th>Description</th><th>Package / Notes</th></tr></thead><tbody>${itemRows}</tbody></table>`
    : `<table class="items"><colgroup><col class="cqty"/><col class="cdesc"/><col class="chs"/><col class="cnum"/><col class="cnum"/></colgroup><thead><tr><th>QTY</th><th>Description</th><th>HS Code</th><th>Unit</th><th>Value</th></tr></thead><tbody>${itemRows}</tbody></table>`;

  const totals = packing ? "" : `<section class="totals"><div class="row"><div></div><div>Subtotal</div><div>${fmt(doc.subtotal)}</div></div>${money(doc.amountPaid) > 0 ? `<div class="row paidrow"><div></div><div>Paid / Credit</div><div>- ${fmt(doc.amountPaid)}</div></div>` : ""}${money(doc.tax) > 0 ? `<div class="row"><div></div><div>VAT / Tax</div><div>${fmt(doc.tax)}</div></div>` : ""}${money(doc.shippingCost) > 0 ? `<div class="row"><div></div><div>Shipping</div><div>${fmt(doc.shippingCost)}</div></div>` : ""}<div class="row grand"><div></div><div>Total</div><div>${fmt(doc.total)}</div></div><div class="row"><div></div><div>Balance Due</div><div>${fmt(balance)}</div></div></section>`;

  const paymentCards = payable ? `<section class="payment"><div class="paybox"><h3>Pay by card</h3>${doc.paymentLink ? `<a class="paylink" href="${esc(doc.paymentLink)}">Pay securely by card</a>` : "Payment link not generated yet."}</div><div class="paybox"><h3>Pay by bank transfer</h3>${esc(bank).replace(/\n/g,"<br/>")}<br/><strong>Payment reference:</strong> ${esc(doc.documentNumber)}</div></section>` : "";

  const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${esc(title(doc.type))} ${esc(doc.documentNumber)}</title><style>
  *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#111827;margin:0;background:#f3f4f6}.actions{max-width:920px;margin:18px auto;text-align:right}.actions button{background:#111827;color:#fff;border:0;padding:10px 16px;border-radius:8px;cursor:pointer}.page{width:794px;margin:0 auto 36px;background:#fff;padding:28px 28px;border:1px solid #d1d5db;position:relative;overflow:hidden}.brand{display:grid;grid-template-columns:255px 1fr;gap:24px;align-items:start;margin-bottom:20px}.logoimg{width:235px;height:auto}.company{font-size:12px;line-height:1.35}.headerline{display:grid;grid-template-columns:1fr 1.2fr 1fr;align-items:center;margin-bottom:10px;font-size:12px}.headerline h1{margin:0;text-align:center;font-size:17px;letter-spacing:.04em}.stamp{position:absolute;top:104px;right:38px;border:4px solid #16a34a;color:#16a34a;transform:rotate(-8deg);font-size:24px;font-weight:900;padding:7px 16px;opacity:.9;letter-spacing:2px}.due{position:absolute;top:104px;right:34px;border:3px solid #b45309;color:#b45309;transform:rotate(-5deg);font-size:16px;font-weight:900;padding:8px 12px;opacity:.9}.boxgrid{display:grid;grid-template-columns:1fr 1fr 1fr;border:1.2px solid #111827;margin-top:8px}.box{min-height:118px;padding:9px;border-right:1.2px solid #111827;font-size:11.5px;line-height:1.42;overflow-wrap:anywhere}.box:last-child{border-right:0}.box h2{margin:0 0 7px;font-size:12px}.items{width:100%;border-collapse:collapse;table-layout:fixed;border-left:1.2px solid #111827;border-right:1.2px solid #111827}.items col.cqty{width:7%}.items col.cdesc{width:43%}.items col.chs{width:13%}.items col.cnum{width:18.5%}.items.packing col.cqty{width:8%}.items.packing col.csku{width:16%}.items.packing col.cdesc{width:52%}.items.packing col.cnote{width:24%}th{border-bottom:1.2px solid #111827;border-right:1.2px solid #111827;padding:6px 5px;font-size:11px;text-align:left;background:#f9fafb}td{border-bottom:1.2px solid #111827;border-right:1.2px solid #111827;padding:7px 5px;vertical-align:top;font-size:11px;line-height:1.3;overflow-wrap:anywhere;word-break:break-word}th:last-child,td:last-child{border-right:0}.qty{text-align:center}.sku{font-family:monospace;font-size:10.5px}.hs{text-align:center}.num{text-align:right;white-space:nowrap;font-size:11px}.packnote{font-size:11px}.totals{border:1.2px solid #111827;border-top:0;margin-bottom:14px}.totals .row{display:grid;grid-template-columns:1fr 145px 155px;min-height:30px}.totals .row>div{padding:7px;border-right:1.2px solid #111827;border-bottom:1.2px solid #111827;font-size:11.5px}.totals .row>div:last-child{border-right:0;text-align:right}.totals .row:last-child>div{border-bottom:0}.grand{font-weight:900;font-size:15px}.paidrow{color:#15803d}.payment{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}.paybox{border:1px solid #d1d5db;border-radius:10px;padding:12px;font-size:11.5px;line-height:1.45}.paybox h3{margin:0 0 8px;font-size:12px;text-transform:uppercase}.paylink{display:inline-block;background:#111827;color:white;text-decoration:none;padding:8px 11px;border-radius:8px;margin-top:8px}.terms{margin-top:16px;border:1px solid #d1d5db;border-radius:10px;padding:11px;font-size:11.5px;line-height:1.45;page-break-inside:avoid}.note{margin-top:12px;font-size:11.5px;line-height:1.45}.footer{margin:18px auto 0;border:1px solid #f59e0b;border-radius:12px;padding:12px 20px;width:600px;max-width:100%;text-align:center;font-size:11.5px}.center{text-align:center}@media print{body{background:white}.actions{display:none}.page{margin:0;border:0;width:100%;padding:20px 24px}}
  </style></head><body><div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div><main class="page">${paidDoc ? `<div class="stamp">PAID</div>` : payable ? `<div class="due">BALANCE DUE<br/>${fmt(balance)}</div>` : ""}<section class="brand"><div><img src="${logo}" class="logoimg" alt="Combay"/></div><div class="company">${companyInfo}</div></section><section class="headerline"><div>Our Ref. <strong>${esc(doc.documentNumber)}</strong></div><h1>${esc(title(doc.type))}</h1><div style="text-align:right">Date: ${new Date(doc.createdAt).toLocaleDateString("en-GB")}</div></section>${(isCommercial(doc.type) || packing) ? exportBlocks : normalBlocks}${table}${totals}${paymentCards}<section class="terms"><strong>Terms:</strong><br/>${esc(terms).replace(/\n/g,"<br/>")}</section>${doc.notes ? `<section class="note"><strong>Notes:</strong><br/>${esc(doc.notes).replace(/\n/g,"<br/>")}</section>` : ""}<p class="center note">This is a computer-generated document, no signature required</p><section class="footer"><strong>THANK YOU FOR YOUR BUSINESS</strong><br/>We deal in new / used equipment and parts for: Industrial Automation, Scientific Research, Telecoms, Networks, Test and Measurement, Audio & Visuals. We also repair and consult.</section></main></body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
