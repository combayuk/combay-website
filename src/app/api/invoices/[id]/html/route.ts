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

function money(v: unknown) { const n = Number(v ?? 0); return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function fmt(v: unknown) { return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(money(v)); }
function esc(v: unknown) { return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c] as string)); }
function label(v: string) { return v.replace(/_/g, " "); }
function title(type: string) {
  if (type === "QUOTE") return "QUOTATION";
  if (type === "PROFORMA_INVOICE") return "PROFORMA INVOICE";
  if (type === "COMMERCIAL_INVOICE") return "COMMERCIAL INVOICE";
  if (type === "PAID_INVOICE" || type === "INVOICE") return "PAID INVOICE";
  if (type === "ADDITIONAL_PAYMENT_REQUEST") return "ADDITIONAL PAYMENT REQUEST";
  return label(type);
}
function hs(desc: string) { return /HS Code:\s*([^\n]+)/i.exec(desc)?.[1]?.trim() ?? ""; }
function clean(desc: string) { return desc.replace(/HS Code:\s*[^\n]+/gi, "").replace(/Origin:\s*[^\n]+/gi, "").trim(); }
function isCommercial(type: string) { return type === "COMMERCIAL_INVOICE"; }
function isPaid(type: string) { return type === "PAID_INVOICE" || type === "INVOICE"; }
function isPayable(type: string, balance: number) { return ["PROFORMA_INVOICE", "ADDITIONAL_PAYMENT_REQUEST"].includes(type) && balance > 0; }
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

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const result = await withDatabase(async () => prisma.invoice.findUnique({ where: { id: params.id }, include: { lines: { orderBy: { sortOrder: "asc" } }, order: true } }));
  if (!result.ok) return new NextResponse("Database unavailable", { status: 500 });
  const doc: any = result.data;
  if (!doc) return new NextResponse("Document not found", { status: 404 });

  const balance = money(doc.balanceDue);
  const paid = money(doc.amountPaid);
  const payable = isPayable(doc.type, balance);
  const paidDoc = (isCommercial(doc.type) || isPaid(doc.type)) && balance === 0;
  const bank = doc.bankDetails || DEFAULT_BANK_DETAILS;
  const terms = doc.paymentTerms || DEFAULT_TERMS;
  const logo = `/images/combay-doc-logo.png`;
  const companyInfo = `<strong>Combay Limited</strong><br/>CRN. 16638170<br/>2B Erick Avenue, Chelmsford, Essex, England, United Kingdom, CM1 7BX<br/>Cell / WhatsApp +44 7340 383334<br/>sales@combay.co.uk<br/>www.combay.co.uk/`;
  const customerAddress = doc.billingAddress || doc.order?.shippingAddress;
  const customerInfo = `<strong>${esc(doc.customerName)}</strong>${doc.company ? `<br/>${esc(doc.company)}` : ""}${customerAddress ? `<br/>${formatAddress(customerAddress)}` : ""}<br/>Email: ${esc(doc.customerEmail)}${doc.customerPhone ? `<br/>Tel: ${esc(doc.customerPhone)}` : ""}`;
  const rows = doc.lines.map((l: any) => `<tr><td class="qty">${money(l.quantity).toFixed(2).replace(/\.00$/, "")}</td><td class="desc">${esc(clean(l.description)).replace(/\n/g, "<br/>")}${l.sku ? `<br/><small>SKU: ${esc(l.sku)}</small>` : ""}</td><td class="hs">${esc(hs(l.description))}</td><td class="num">${fmt(l.unitPrice)}</td><td class="num">${fmt(l.lineTotal)}</td></tr>`).join("");

  const commercialBlocks = `<section class="boxgrid commercial"><div class="box"><h2>Exporter / Sender</h2><em>COMBAY LIMITED</em><br/>2B Erick Avenue,<br/>Chelmsford, England, CM1 7BX<br/>Tel # +44 7340 383334<br/>mail: sales@combay.co.uk<br/>EORI. GB045614819000<br/>Company # (CRN): 16638170</div><div class="box"><h2>Consignee / Receiver</h2>${customerInfo}</div><div class="box"><strong>Country of Origin:</strong> United Kingdom<br/><strong>Reason for export:</strong> E-commerce sale<br/><strong>Incoterms:</strong><br/>DAP ${esc(doc.shippingCountry || "unless stated otherwise")}<br/>(Incoterms® 2020)<br/><br/><strong>No loose batteries</strong><br/><strong>Status:</strong> ${esc(label(doc.status))}<br/><strong>Balance due:</strong> ${fmt(balance)}</div></section>`;
  const normalBlocks = `<section class="boxgrid simple"><div class="box"><h2>Company information</h2>${companyInfo}</div><div class="box"><h2>Customer information</h2>${customerInfo}</div><div class="box"><h2>Document details</h2><strong>Reference:</strong> ${esc(doc.documentNumber)}<br/><strong>Date:</strong> ${new Date(doc.createdAt).toLocaleDateString("en-GB")}<br/><strong>Status:</strong> ${esc(label(doc.status))}<br/><strong>Currency:</strong> GBP${doc.shippingCountry ? `<br/><strong>Shipping to:</strong> ${esc(doc.shippingCountry)}` : ""}</div></section>`;
  const paymentCards = payable ? `<section class="payment"><div class="paybox"><h3>Pay by card</h3>${doc.paymentLink ? `<a class="paylink" href="${esc(doc.paymentLink)}">Pay securely by card</a>` : "Payment link not generated yet."}</div><div class="paybox"><h3>Pay by bank transfer</h3>${esc(bank).replace(/\n/g,"<br/>")}<br/><strong>Payment reference:</strong> ${esc(doc.documentNumber)}</div></section>` : "";

  const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${esc(title(doc.type))} ${esc(doc.documentNumber)}</title><style>
  *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#111827;margin:0;background:#f3f4f6}.actions{max-width:920px;margin:18px auto;text-align:right}.actions button{background:#111827;color:#fff;border:0;padding:10px 16px;border-radius:8px;cursor:pointer}.page{width:860px;margin:0 auto 36px;background:#fff;padding:34px 38px;border:1px solid #d1d5db;position:relative}.brand{display:grid;grid-template-columns:300px 1fr;gap:26px;align-items:start;margin-bottom:24px}.logoimg{width:255px;height:auto}.company{font-size:13px;line-height:1.35}.headerline{display:grid;grid-template-columns:1fr 1.3fr 1fr;align-items:center;margin-bottom:10px;font-size:13px}.headerline h1{margin:0;text-align:center;font-size:18px;letter-spacing:.04em}.stamp{position:absolute;top:112px;right:46px;border:4px solid #16a34a;color:#16a34a;transform:rotate(-8deg);font-size:26px;font-weight:900;padding:8px 18px;opacity:.9;letter-spacing:2px}.due{position:absolute;top:112px;right:40px;border:3px solid #b45309;color:#b45309;transform:rotate(-5deg);font-size:18px;font-weight:900;padding:8px 12px;opacity:.9}.boxgrid{display:grid;grid-template-columns:1fr 1fr 1fr;border:1.5px solid #111827;margin-top:8px}.box{min-height:128px;padding:10px;border-right:1.5px solid #111827;font-size:12px;line-height:1.45;overflow-wrap:anywhere}.box:last-child{border-right:0}.box h2{margin:0 0 8px;font-size:13px}table{width:100%;border-collapse:collapse;table-layout:fixed;border-left:1.5px solid #111827;border-right:1.5px solid #111827}th{border-bottom:1.5px solid #111827;border-right:1.5px solid #111827;padding:8px;font-size:12px;text-align:left;background:#f9fafb}td{border-bottom:1.5px solid #111827;border-right:1.5px solid #111827;padding:10px 8px;height:auto;min-height:46px;vertical-align:top;font-size:12.5px;overflow-wrap:anywhere}th:last-child,td:last-child{border-right:0}.qty{width:58px;text-align:center}.desc{width:390px}.hs{width:105px;text-align:center}.num{width:120px;text-align:right;white-space:nowrap}.totals{border:1.5px solid #111827;border-top:0;margin-bottom:14px}.totals .row{display:grid;grid-template-columns:1fr 160px 170px;min-height:34px}.totals .row>div{padding:8px;border-right:1.5px solid #111827;border-bottom:1.5px solid #111827}.totals .row>div:last-child{border-right:0;text-align:right}.totals .row:last-child>div{border-bottom:0}.grand{font-weight:900;font-size:18px}.payment{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:18px}.paybox{border:1px solid #d1d5db;border-radius:10px;padding:14px;font-size:12px;line-height:1.5}.paybox h3{margin:0 0 8px;font-size:13px;text-transform:uppercase}.paylink{display:inline-block;background:#111827;color:white;text-decoration:none;padding:9px 12px;border-radius:8px;margin-top:8px}.terms{margin-top:18px;border:1px solid #d1d5db;border-radius:10px;padding:12px;font-size:12px;line-height:1.5}.note{margin-top:12px;font-size:12px;line-height:1.5}.footer{margin:20px auto 0;border:1px solid #f59e0b;border-radius:12px;padding:14px 22px;width:620px;text-align:center;font-size:12px}.center{text-align:center}@media print{body{background:white}.actions{display:none}.page{margin:0;border:0;width:auto}}
  </style></head><body><div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div><main class="page">${paidDoc ? `<div class="stamp">PAID</div>` : payable ? `<div class="due">BALANCE DUE<br/>${fmt(balance)}</div>` : ""}<section class="brand"><div><img src="${logo}" class="logoimg" alt="Combay"/></div><div class="company">${companyInfo}</div></section><section class="headerline"><div>Our Ref. <strong>${esc(doc.documentNumber)}</strong></div><h1>${esc(title(doc.type))}</h1><div style="text-align:right">Date: ${new Date(doc.createdAt).toLocaleDateString("en-GB")}</div></section>${isCommercial(doc.type) ? commercialBlocks : normalBlocks}<table><thead><tr><th class="qty">QTY</th><th class="desc">Description</th><th class="hs">HS Code</th><th class="num">Unit</th><th class="num">Value</th></tr></thead><tbody>${rows}</tbody></table><section class="totals"><div class="row"><div></div><div><strong>Subtotal</strong></div><div>${fmt(doc.subtotal)}</div></div>${money(doc.shippingCost)>0 ? `<div class="row"><div>${doc.shippingCountry ? `Shipping to ${esc(doc.shippingCountry)}` : "Shipping"}</div><div>Shipping</div><div>${fmt(doc.shippingCost)}</div></div>` : ""}${money(doc.tax)>0 ? `<div class="row"><div></div><div>VAT</div><div>${fmt(doc.tax)}</div></div>` : ""}<div class="row"><div></div><div class="grand">Total</div><div class="grand">${fmt(doc.total)}</div></div><div class="row"><div></div><div>Paid</div><div>${fmt(paid)}</div></div><div class="row"><div></div><div><strong>Balance Due</strong></div><div><strong>${fmt(balance)}</strong></div></div></section>${paymentCards}<section class="terms"><strong>Terms:</strong><br/>${esc(terms).replace(/\n/g,"<br/>")}</section>${doc.notes ? `<section class="note"><strong>Notes:</strong><br/>${esc(doc.notes).replace(/\n/g,"<br/>")}</section>` : ""}<p class="center" style="font-size:12px;margin-top:14px;">This is a computer-generated document, no signature required.</p><div class="footer"><strong>THANK YOU FOR YOUR BUSINESS</strong><br/>We deal in new / used equipment and parts for: Industrial Automation, Scientific Research, Telecoms, Networks, Test and Measurement, Audio & Visuals. We also repair and consult.</div></main></body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
