"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Download, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";

type DocType = "QUOTE" | "PROFORMA_INVOICE" | "PACKING_LIST";
type DiscountMode = "NONE" | "LINE_ITEMS" | "TOTAL_VALUE";
type DiscountType = "PERCENTAGE" | "FIXED";
const newLine = () => ({ description: "", sku: "", hsCode: "", origin: "", quantity: 1, unitPrice: 0 });
type LineItem = ReturnType<typeof newLine>;

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

function fmt(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(value ?? 0));
}

function label(value: string) {
  return value.replace(/_/g, " ");
}

function money(value: number) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function discountFor(value: number, discountType: DiscountType, discountValue: number) {
  const raw = Number(discountValue || 0);
  if (!Number.isFinite(raw) || raw <= 0 || value <= 0) return 0;
  if (discountType === "PERCENTAGE") return money(value * Math.min(raw, 100) / 100);
  return money(Math.min(value, raw));
}

export default function InvoiceGenerator() {
  const params = useSearchParams();
  const requestedType = params.get("type") as DocType | null;
  const initialType: DocType = requestedType === "PACKING_LIST" ? "PACKING_LIST" : requestedType === "PROFORMA_INVOICE" ? "PROFORMA_INVOICE" : "QUOTE";
  const orderTotal = Number(params.get("orderTotal") ?? 0);
  const orderNumber = params.get("orderNumber") ?? "";

  const [type, setType] = useState<DocType>(initialType);
  const [customer, setCustomer] = useState({
    customerName: params.get("customerName") ?? "",
    company: params.get("company") ?? "",
    customerEmail: params.get("customerEmail") ?? "",
    customerPhone: params.get("customerPhone") ?? "",
    billingAddress: "",
  });
  const [lines, setLines] = useState<LineItem[]>(() => [newLine()]);
  const [shippingCountry, setShippingCountry] = useState("");
  const [shippingCost, setShippingCost] = useState(0);
  const [notes, setNotes] = useState("");
  const [paymentTerms, setPaymentTerms] = useState(DEFAULT_TERMS);
  const [paymentLink, setPaymentLink] = useState("");
  const [autoGeneratePaymentLink, setAutoGeneratePaymentLink] = useState(true);
  const [bankDetails, setBankDetails] = useState(DEFAULT_BANK_DETAILS);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [createdId, setCreatedId] = useState("");
  const [discountMode, setDiscountMode] = useState<DiscountMode>("NONE");
  const [discountType, setDiscountType] = useState<DiscountType>("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState(0);

  const isPackingList = type === "PACKING_LIST";
  const discountAllowed = type === "QUOTE" || type === "PROFORMA_INVOICE";
  const grossSubtotal = useMemo(() => isPackingList ? 0 : lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0), [lines, isPackingList]);
  const discount = discountAllowed && discountMode !== "NONE" ? discountFor(grossSubtotal, discountType, discountValue) : 0;
  const subtotal = Math.max(money(grossSubtotal - discount), 0);
  const tax = isPackingList ? 0 : subtotal * 0.2;
  const total = isPackingList ? 0 : subtotal + tax + Number(shippingCost || 0);
  const amountPaid = 0;
  const balanceDue = isPackingList ? 0 : Math.max(total - amountPaid, 0);
  const isPayable = type === "PROFORMA_INVOICE";

  function setDocType(next: DocType) {
    setType(next);
    setPaymentTerms(DEFAULT_TERMS);
  }

  function setLine(index: number, key: keyof LineItem, value: string | number) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, [key]: value } : line)));
  }

  function linesForSave() {
    if (!discountAllowed || discountMode === "NONE" || discount <= 0) return lines;
    if (discountMode === "LINE_ITEMS") {
      return lines.map((line) => {
        const originalLine = Number(line.quantity || 0) * Number(line.unitPrice || 0);
        const lineDiscount = discountFor(originalLine, discountType, discountValue);
        const discountedLine = Math.max(money(originalLine - lineDiscount), 0);
        const unitPrice = Number(line.quantity || 0) > 0 ? money(discountedLine / Number(line.quantity || 1)) : 0;
        const note = discountType === "PERCENTAGE" ? `${discountValue}% line-item discount applied` : `£${discountValue} line-item discount applied`;
        return { ...line, unitPrice, description: `${line.description}\n${note}` };
      });
    }
    const label = discountType === "PERCENTAGE" ? `${discountValue}% total invoice discount` : `£${discountValue} total invoice discount`;
    return [...lines, { description: `Discount - ${label}`, sku: "", hsCode: "", origin: "", quantity: 1, unitPrice: -discount }];
  }

  async function saveDocument() {
    setSaving(true);
    setMessage("");
    setCreatedId("");

    const response = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        ...customer,
        lines: linesForSave(),
        notes,
        paymentTerms,
        paymentLink,
        bankDetails,
        shippingCountry,
        shippingCost,
        amountPaid,
        autoGeneratePaymentLink: isPayable && autoGeneratePaymentLink,
        taxRate: 0.2,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok || !data.ok) {
      setMessage(data.error || data.reason || "Could not save document.");
      return;
    }

    setCreatedId(data.document.id);
    setPaymentLink(data.document.paymentLink ?? paymentLink);
    setMessage(`${data.document.documentNumber} saved.${data.document.paymentLink ? " Stripe payment link generated." : ""} Use View/Print to download as PDF from the browser.`);
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/invoices" className="text-gray-400 hover:text-navy-950 transition-colors p-1"><ArrowLeft size={18}/></Link>
        <div>
          <h1 className="font-display font-800 text-navy-950 text-2xl">New {label(type)}</h1>
          <p className="text-xs text-gray-400 mt-1">Quotes show price/terms. Proformas include payment links and bank details. Packing lists show package/item details only.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <p className="font-display font-700 text-sm text-navy-950">Document type:</p>
              {(["QUOTE", "PROFORMA_INVOICE", "PACKING_LIST"] as const).map((item) => (
                <button key={item} onClick={() => setDocType(item)} className={`font-display font-600 text-sm px-4 py-1.5 rounded-md border transition-colors ${type === item ? "bg-navy-950 text-white border-navy-950" : "border-gray-200 text-gray-600 hover:border-navy-950"}`}>{label(item)}</button>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className="label text-xs">Customer Name *</label><input className="input text-sm" value={customer.customerName} onChange={(e) => setCustomer((c) => ({ ...c, customerName: e.target.value }))} placeholder="John Smith"/></div>
              <div><label className="label text-xs">Company</label><input className="input text-sm" value={customer.company} onChange={(e) => setCustomer((c) => ({ ...c, company: e.target.value }))}/></div>
              <div><label className="label text-xs">Email *</label><input type="email" className="input text-sm" value={customer.customerEmail} onChange={(e) => setCustomer((c) => ({ ...c, customerEmail: e.target.value }))} placeholder="customer@company.com"/></div>
              <div><label className="label text-xs">Phone</label><input className="input text-sm" value={customer.customerPhone} onChange={(e) => setCustomer((c) => ({ ...c, customerPhone: e.target.value }))}/></div>
              <div className="sm:col-span-2"><label className="label text-xs">Customer / delivery address</label><textarea className="textarea text-sm" rows={2} value={customer.billingAddress} onChange={(e) => setCustomer((c) => ({ ...c, billingAddress: e.target.value }))}/></div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-display font-700 text-navy-950 mb-4">Line Items</h2>
            <div className="space-y-2 mb-3 overflow-x-auto">
              <div className="hidden sm:grid grid-cols-[1fr_90px_90px_72px_100px_85px_28px] gap-2 px-1 min-w-[760px]">
                {(isPackingList ? ["Description", "SKU", "HS Code", "Qty", "Unit", "Total", ""] : ["Description", "SKU", "HS Code", "Qty", "Unit (£)", "Total", ""]).map((heading) => <p key={heading} className="font-display font-700 text-[10px] text-gray-400 uppercase tracking-wider">{heading}</p>)}
              </div>
              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-[1fr_90px_90px_72px_100px_85px_28px] gap-2 items-center min-w-[760px]">
                  <input className="input text-sm py-2" value={line.description} onChange={(e) => setLine(index, "description", e.target.value)} placeholder="Item description..."/>
                  <input className="input text-sm py-2" value={line.sku} onChange={(e) => setLine(index, "sku", e.target.value)} placeholder="SKU"/>
                  <input className="input text-sm py-2" value={line.hsCode} onChange={(e) => setLine(index, "hsCode", e.target.value)} placeholder="9027.30.00"/>
                  <input type="number" className="input text-sm py-2 text-center" value={line.quantity} min="0" step="1" onChange={(e) => setLine(index, "quantity", Number(e.target.value))}/>
                  <input type="number" className="input text-sm py-2" value={isPackingList ? "" : line.unitPrice || ""} step="0.01" min="0" disabled={isPackingList} onChange={(e) => setLine(index, "unitPrice", Number(e.target.value))} placeholder={isPackingList ? "N/A" : "0.00"}/>
                  <div className="font-display font-700 text-navy-950 text-sm text-right whitespace-nowrap">{isPackingList ? "—" : fmt(Number(line.quantity || 0) * Number(line.unitPrice || 0))}</div>
                  <button onClick={() => setLines((current) => current.filter((_, i) => i !== index))} className="text-red-400 hover:text-red-600 p-1 transition-colors" disabled={lines.length === 1}><Trash2 size={13}/></button>
                </div>
              ))}
            </div>
            <button onClick={() => setLines((current) => [...current, newLine()])} className="flex items-center gap-1.5 text-accent font-display font-600 text-sm hover:text-accent-dark transition-colors"><Plus size={14}/> Add Line</button>
          </div>



          {discountAllowed && <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-display font-700 text-navy-950 mb-1">Discount</h2>
            <p className="text-xs text-gray-500 mb-4">Only applies to Quotes and Proforma Invoices. Choose whether the discount is applied across line items or as a discount against the total invoice value.</p>
            <div className="grid sm:grid-cols-4 gap-3">
              <div><label className="label">Discount application</label><select className="input text-sm" value={discountMode} onChange={(e) => setDiscountMode(e.target.value as DiscountMode)}><option value="NONE">No discount</option><option value="LINE_ITEMS">Apply to line items</option><option value="TOTAL_VALUE">Apply to total invoice value</option></select></div>
              <div><label className="label">Discount type</label><select className="input text-sm" value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)} disabled={discountMode === "NONE"}><option value="PERCENTAGE">Percentage %</option><option value="FIXED">Fixed amount £</option></select></div>
              <div><label className="label">Discount value</label><input type="number" min="0" step="0.01" className="input text-sm" value={discountValue || ""} onChange={(e) => setDiscountValue(Number(e.target.value))} disabled={discountMode === "NONE"} placeholder={discountType === "PERCENTAGE" ? "10" : "50.00"}/></div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600"><strong className="block text-navy-950">Calculated discount</strong>{fmt(discount)}<br/><span>Original subtotal: {fmt(grossSubtotal)}</span></div>
            </div>
          </div>}

          {!isPackingList && <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-display font-700 text-navy-950 mb-4">Shipping</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className="label">Shipping to country</label><input className="input text-sm" value={shippingCountry} onChange={(e) => setShippingCountry(e.target.value)} placeholder="e.g. United Kingdom / China / UAE" /></div>
              <div><label className="label">Shipping cost</label><input type="number" min="0" step="0.01" className="input text-sm" value={shippingCost || ""} onChange={(e) => setShippingCost(Number(e.target.value))} placeholder="0.00" /></div>
            </div>
          </div>}

          {isPayable && <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="font-display font-700 text-navy-950">Payment options</h2>
            <label className="flex items-start gap-2 text-sm text-gray-600"><input type="checkbox" checked={autoGeneratePaymentLink} onChange={(e) => setAutoGeneratePaymentLink(e.target.checked)} className="mt-1" /> Auto-generate Stripe payment link for the final balance due using the configured Stripe API key.</label>
            <div><label className="label">Stripe payment link</label><input className="input text-sm" value={paymentLink} onChange={(e) => { setPaymentLink(e.target.value); if (e.target.value) setAutoGeneratePaymentLink(false); }} placeholder="Auto-generated after save, or paste manual Stripe link"/></div>
            <div><label className="label">Bank transfer details</label><textarea className="textarea text-sm" rows={7} value={bankDetails} onChange={(e) => setBankDetails(e.target.value)} /></div>
          </div>}

          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div><label className="label">Terms</label><textarea className="textarea text-sm" rows={5} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}/></div>
            <div><label className="label">Notes</label><textarea className="textarea text-sm" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional customer-facing notes..."/></div>
          </div>
        </div>

        <div>
          <div className="bg-white border border-gray-200 rounded-xl p-5 sticky top-20">
            <h2 className="font-display font-700 text-navy-950 mb-4">Totals</h2>
            <div className="space-y-2 text-sm mb-5">
              {isPackingList ? <div className="text-gray-600 text-sm">Packing lists do not show invoice totals, payment links or balances.</div> : <>
              <div className="flex justify-between text-gray-600"><span>Subtotal before discount</span><span className="font-600">{fmt(grossSubtotal)}</span></div>
              {discount > 0 && <div className="flex justify-between text-green-700"><span>Discount</span><span className="font-600">-{fmt(discount)}</span></div>}
              <div className="flex justify-between text-gray-600"><span>Discounted subtotal</span><span className="font-600">{fmt(subtotal)}</span></div>
              {amountPaid > 0 && <div className="flex justify-between text-green-700"><span>Paid / credit</span><span className="font-600">-{fmt(amountPaid)}</span></div>}
              <div className="flex justify-between text-gray-600"><span>VAT 20%</span><span className="font-600">{fmt(tax)}</span></div>
              <div className="flex justify-between text-gray-600"><span>Shipping</span><span className="font-600">{fmt(Number(shippingCost || 0))}</span></div>
              <div className="flex justify-between font-display font-800 text-navy-950 text-lg border-t border-gray-200 pt-2"><span>Balance due</span><span>{fmt(balanceDue)}</span></div>
              </>}
            </div>
            <div className="space-y-2">
              <button onClick={saveDocument} disabled={saving || !customer.customerName || !customer.customerEmail} className="btn-primary w-full py-3"><Save size={14}/> {saving ? "Saving..." : "Save Document"}</button>
              {createdId && <a href={`/api/invoices/${createdId}/html`} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full py-2.5 flex items-center justify-center gap-2"><Download size={14}/> View / Print</a>}
            </div>
            {message && <p className={`text-xs mt-3 ${createdId ? "text-green-700" : "text-red-600"}`}>{message}</p>}
            {isPayable && <p className="text-xs text-gray-400 text-center mt-2">Payment links are generated from the balance due when Stripe keys are configured.</p>}
            {(!customer.customerEmail || !customer.customerName) && <p className="text-xs text-gray-400 text-center mt-2">Fill in customer name and email to save</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
