import { NextResponse, type NextRequest } from "next/server";
import { prisma, withDatabase } from "@/lib/db";

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
    .replaceAll('"', "&quot;");
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const dbResult = await withDatabase(async () => prisma.invoice.findUnique({
    where: { id: params.id },
    include: { lines: { orderBy: { sortOrder: "asc" } }, order: true },
  }));

  if (!dbResult.ok) return new NextResponse("Database unavailable", { status: 500 });
  const document = dbResult.data;
  if (!document) return new NextResponse("Document not found", { status: 404 });

  const isInvoice = document.type === "INVOICE";
  const title = isInvoice ? "Invoice" : "Quote";
  const rows = document.lines.map((line) => `
    <tr>
      <td>${esc(line.description)}${line.sku ? `<br><small>SKU: ${esc(line.sku)}</small>` : ""}</td>
      <td class="num">${money(line.quantity).toFixed(2).replace(/\.00$/, "")}</td>
      <td class="num">${fmt(line.unitPrice)}</td>
      <td class="num">${fmt(line.lineTotal)}</td>
    </tr>
  `).join("");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)} ${esc(document.documentNumber)}</title>
<style>
  body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; background: #f8fafc; }
  .page { max-width: 900px; margin: 32px auto; background: white; padding: 44px; border: 1px solid #e2e8f0; }
  .top { display: flex; justify-content: space-between; gap: 32px; border-bottom: 3px solid #0f172a; padding-bottom: 24px; margin-bottom: 28px; }
  h1 { margin: 0; font-size: 34px; letter-spacing: .08em; text-transform: uppercase; }
  h2 { margin: 0 0 8px; font-size: 15px; text-transform: uppercase; letter-spacing: .08em; color: #475569; }
  .muted { color: #64748b; font-size: 13px; line-height: 1.55; white-space: pre-line; }
  .meta { text-align: right; font-size: 13px; line-height: 1.7; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-bottom: 28px; }
  table { width: 100%; border-collapse: collapse; margin-top: 18px; }
  th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: .07em; color: #64748b; border-bottom: 1px solid #cbd5e1; padding: 10px 8px; }
  td { border-bottom: 1px solid #e2e8f0; padding: 12px 8px; vertical-align: top; font-size: 14px; }
  small { color: #64748b; font-size: 11px; }
  .num { text-align: right; white-space: nowrap; }
  .totals { width: 320px; margin-left: auto; margin-top: 24px; }
  .totals div { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
  .totals .grand { font-weight: 700; font-size: 18px; border-bottom: 2px solid #0f172a; }
  .notes { margin-top: 34px; padding-top: 18px; border-top: 1px solid #e2e8f0; }
  .actions { max-width: 900px; margin: 18px auto; text-align: right; }
  button { background: #0f172a; color: white; border: 0; padding: 10px 16px; border-radius: 8px; cursor: pointer; }
  @media print { body { background: white; } .page { margin: 0; border: 0; max-width: none; } .actions { display: none; } }
</style>
</head>
<body>
  <div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
  <main class="page">
    <section class="top">
      <div>
        <h1>${esc(title)}</h1>
        <p class="muted"><strong>Combay</strong><br/>Industrial automation, scientific and technical equipment<br/>sales@combay.co.uk</p>
      </div>
      <div class="meta">
        <strong>${esc(document.documentNumber)}</strong><br/>
        Date: ${new Date(document.createdAt).toLocaleDateString("en-GB")}<br/>
        Status: ${esc(document.status)}${document.order?.orderNumber ? `<br/>Order: ${esc(document.order.orderNumber)}` : ""}
      </div>
    </section>

    <section class="grid">
      <div>
        <h2>Bill to</h2>
        <p class="muted"><strong>${esc(document.customerName)}</strong><br/>${document.company ? `${esc(document.company)}<br/>` : ""}${esc(document.customerEmail)}${document.customerPhone ? `<br/>${esc(document.customerPhone)}` : ""}${document.billingAddress ? `<br/>${esc(document.billingAddress)}` : ""}</p>
      </div>
      <div>
        <h2>Terms</h2>
        <p class="muted">${esc(document.paymentTerms || (isInvoice ? "Payment due on receipt unless stated otherwise." : "Quote valid for 7 days unless stated otherwise."))}</p>
      </div>
    </section>

    <table>
      <thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Line total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <section class="totals">
      <div><span>Subtotal</span><strong>${fmt(document.subtotal)}</strong></div>
      <div><span>VAT</span><strong>${fmt(document.tax)}</strong></div>
      <div class="grand"><span>Total</span><span>${fmt(document.total)}</span></div>
    </section>

    ${document.notes ? `<section class="notes"><h2>Notes</h2><p class="muted">${esc(document.notes)}</p></section>` : ""}
  </main>
</body>
</html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
