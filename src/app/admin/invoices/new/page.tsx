"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Download, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";

type DocType = "QUOTE" | "PROFORMA_INVOICE" | "COMMERCIAL_INVOICE" | "PACKING_LIST";
type DiscountMode = "NONE" | "LINE_ITEMS" | "TOTAL_VALUE";
type DiscountType = "PERCENTAGE" | "FIXED";
const newLine = () => ({ description: "", sku: "", hsCode: "", origin: "", quantity: 1, unitPrice: 0 });
type LineItem = ReturnType<typeof newLine>;

type AddressFields = {
  line1: string;
  line2: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
};

const blankAddress = (): AddressFields => ({ line1: "", line2: "", city: "", county: "", postcode: "", country: "" });

function composeAddress(address: AddressFields) {
  const cityLine = [address.city, address.county, address.postcode].map((v) => v.trim()).filter(Boolean).join(", ");
  return [address.line1, address.line2, cityLine, address.country].map((v) => v.trim()).filter(Boolean).join("\n");
}


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

const DEFAULT_COMMERCIAL_TERMS = `Commercial invoice values are declared for customs purposes.
Customs duty, taxes, import clearance charges and local handling fees are payable by the buyer/consignee unless agreed otherwise in writing.
Goods are supplied as used industrial/commercial equipment unless stated otherwise.
No loose batteries are included unless expressly stated.`;

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
  const initialType: DocType =
    requestedType === "PACKING_LIST"
      ? "PACKING_LIST"
      : requestedType === "COMMERCIAL_INVOICE"
        ? "COMMERCIAL_INVOICE"
        : requestedType === "PROFORMA_INVOICE"
          ? "PROFORMA_INVOICE"
          : "QUOTE";
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
  const [address, setAddress] = useState<AddressFields>(() => blankAddress());
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
  const [chargeVat, setChargeVat] = useState(initialType !== "COMMERCIAL_INVOICE" && initialType !== "PACKING_LIST");
  const [exportCountryOfOrigin, setExportCountryOfOrigin] = useState("United Kingdom");
  const [exportReason, setExportReason] = useState("E-commerce sale");
  const [incoterms, setIncoterms] = useState("DAP");
  const [shipmentNotes, setShipmentNotes] = useState("No loose batteries");

  const isPackingList = type === "PACKING_LIST";
  const isCommercialInvoice = type === "COMMERCIAL_INVOICE";
  const discountAllowed = type === "QUOTE" || type === "PROFORMA_INVOICE";
  const grossSubtotal = useMemo(() => isPackingList ? 0 : lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0), [lines, isPackingList]);
  const discount = discountAllowed && discountMode !== "NONE" ? discountFor(grossSubtotal, discountType, discountValue) : 0;
  const subtotal = Math.max(money(grossSubtotal - discount), 0);
  const tax = isPackingList || !chargeVat ? 0 : money(subtotal * 0.2);
  const total = isPackingList ? 0 : subtotal + tax + Number(shippingCost || 0);
  const amountPaid = 0;
  const balanceDue = isPackingList ? 0 : Math.max(total - amountPaid, 0);
  const isPayable = type === "PROFORMA_INVOICE";

  function setDocType(next: DocType) {
    setType(next);
    setPaymentTerms(next === "COMMERCIAL_INVOICE" ? DEFAULT_COMMERCIAL_TERMS : DEFAULT_TERMS);
    if (next === "COMMERCIAL_INVOICE" || next === "PACKING_LIST") setChargeVat(false);
    if (next === "QUOTE" || next === "PROFORMA_INVOICE") setChargeVat(true);
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

  function notesForSave() {
    if (!isCommercialInvoice) return notes;
    const exportDetails = [
      `Country of Origin: ${exportCountryOfOrigin || "United Kingdom"}`,
      `Reason for export: ${exportReason || "E-commerce sale"}`,
      `Incoterms: ${incoterms || "DAP"}`,
      `Shipment notes: ${shipmentNotes || "No loose batteries"}`,
    ].join("\n");
    return [exportDetails, notes ? `Admin/customer notes:\n${notes}` : ""].filter(Boolean).join("\n\n");
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
        billingAddress: composeAddress(address),
        lines: linesForSave(),
        notes: notesForSave(),
        paymentTerms,
        paymentLink,
        bankDetails,
        shippingCountry,
        shippingCost,
        amountPaid,
        autoGeneratePaymentLink: isPayable && autoGeneratePaymentLink,
        taxRate: chargeVat ? 0.2 : 0,
        chargeVat,
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
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm flex items-center gap-2.5">
        <Link href="/admin/invoices" className="text-gray-400 hover:text-navy-950 transition-colors p-1"><ArrowLeft size={18}/></Link>
        <div>
          <h1 className="font-display font-900 text-navy-950 text-2xl">New {label(type)}</h1>
          <p className="text-xs text-gray-500 mt-0.5">Docs Producer creates quotes, proformas, custom commercial invoices and packing lists. Combay company/exporter details are locked on output documents.</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-slate-50 px-3 py-1.5 font-900 text-navy-950">Create/edit quote, proforma, custom commercial invoice or packing list. Compact document workflow.</span>
          <span className="rounded-full bg-amber-50 px-3 py-1.5 font-900 text-amber-700">Totals update live</span>
          <span className="rounded-full bg-green-50 px-3 py-1.5 font-900 text-green-700">Use View / Print after save</span>
        </div>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_320px] gap-4">
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2.5 mb-3 flex-wrap">
              <p className="font-display font-700 text-sm text-navy-950">Document type:</p>
              {(["QUOTE", "PROFORMA_INVOICE", "COMMERCIAL_INVOICE", "PACKING_LIST"] as const).map((item) => (
                <button key={item} onClick={() => setDocType(item)} className={`font-display font-600 text-sm px-4 py-1.5 rounded-md border transition-colors ${type === item ? "bg-navy-950 text-white border-navy-950" : "border-gray-200 text-gray-600 hover:border-navy-950"}`}>{label(item)}</button>
              ))}
            </div>
            <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <strong className="block text-navy-950">Locked Combay details</strong>
              Generated documents always use Combay Limited as the company/exporter with the official address, CRN, EORI, email, website and telephone. Admin can edit customer, consignee, line items, values, HS codes, origin, shipping, terms and notes.
            </div>
            <div className="grid sm:grid-cols-2 gap-2.5">
              <div><label className="label text-xs">Customer Name *</label><input className="input text-xs py-2" value={customer.customerName} onChange={(e) => setCustomer((c) => ({ ...c, customerName: e.target.value }))} placeholder="John Smith"/></div>
              <div><label className="label text-xs">Company</label><input className="input text-xs py-2" value={customer.company} onChange={(e) => setCustomer((c) => ({ ...c, company: e.target.value }))}/></div>
              <div><label className="label text-xs">Email *</label><input type="email" className="input text-xs py-2" value={customer.customerEmail} onChange={(e) => setCustomer((c) => ({ ...c, customerEmail: e.target.value }))} placeholder="customer@company.com"/></div>
              <div><label className="label text-xs">Phone</label><input className="input text-xs py-2" value={customer.customerPhone} onChange={(e) => setCustomer((c) => ({ ...c, customerPhone: e.target.value }))}/></div>
              <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label className="label text-xs mb-0">Customer / delivery address</label>
                  <span className="text-[11px] text-slate-500">Shown as normal address lines on the document, not JSON/code.</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <input className="input text-xs py-2 sm:col-span-2" value={address.line1} onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))} placeholder="Address line 1" />
                  <input className="input text-xs py-2 sm:col-span-2" value={address.line2} onChange={(e) => setAddress((a) => ({ ...a, line2: e.target.value }))} placeholder="Address line 2" />
                  <input className="input text-xs py-2" value={address.city} onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))} placeholder="Town / City" />
                  <input className="input text-xs py-2" value={address.county} onChange={(e) => setAddress((a) => ({ ...a, county: e.target.value }))} placeholder="County / State" />
                  <input className="input text-xs py-2" value={address.postcode} onChange={(e) => setAddress((a) => ({ ...a, postcode: e.target.value }))} placeholder="Postcode / ZIP" />
                  <input className="input text-xs py-2" value={address.country} onChange={(e) => setAddress((a) => ({ ...a, country: e.target.value }))} placeholder="Country" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="font-display font-700 text-navy-950 mb-3">Line Items</h2>
            <div className="space-y-2 mb-3 overflow-x-auto">
              <div className="hidden min-w-[920px] sm:grid grid-cols-[minmax(240px,1fr)_74px_82px_82px_56px_78px_76px_24px] gap-1.5 px-1">
                {["Description", "SKU", "HS Code", "Origin", "Qty", isPackingList ? "Unit" : "Unit (£)", "Total", ""].map((heading) => <p key={heading} className="font-display font-700 text-[10px] text-gray-400 uppercase tracking-wider">{heading}</p>)}
              </div>
              {lines.map((line, index) => (
                <div key={index} className="grid min-w-[920px] grid-cols-[minmax(240px,1fr)_74px_82px_82px_56px_78px_76px_24px] gap-1.5 items-center">
                  <input className="input text-xs py-2" value={line.description} onChange={(e) => setLine(index, "description", e.target.value)} placeholder="Description..."/>
                  <input className="input text-xs py-2" value={line.sku} onChange={(e) => setLine(index, "sku", e.target.value)} placeholder="SKU"/>
                  <input className="input text-xs py-2" value={line.hsCode} onChange={(e) => setLine(index, "hsCode", e.target.value)} placeholder="9027.30.00"/>
                  <input className="input text-xs py-2" value={line.origin} onChange={(e) => setLine(index, "origin", e.target.value)} placeholder="UK"/>
                  <input type="number" className="input text-xs py-2 text-center" value={line.quantity} min="0" step="1" onChange={(e) => setLine(index, "quantity", Number(e.target.value))}/>
                  <input type="number" className="input text-xs py-2" value={isPackingList ? "" : line.unitPrice || ""} step="0.01" min="0" disabled={isPackingList} onChange={(e) => setLine(index, "unitPrice", Number(e.target.value))} placeholder={isPackingList ? "N/A" : "0.00"}/>
                  <div className="font-display font-800 text-navy-950 text-xs text-right whitespace-nowrap">{isPackingList ? "—" : fmt(Number(line.quantity || 0) * Number(line.unitPrice || 0))}</div>
                  <button onClick={() => setLines((current) => current.filter((_, i) => i !== index))} className="text-red-400 hover:text-red-600 p-1 transition-colors" disabled={lines.length === 1}><Trash2 size={13}/></button>
                </div>
              ))}
            </div>
            <button onClick={() => setLines((current) => [...current, newLine()])} className="inline-flex items-center gap-1.5 text-accent font-display font-800 text-xs hover:text-accent-dark transition-colors"><Plus size={14}/> Add Line</button>
          </div>


          {isCommercialInvoice && <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="font-display font-700 text-navy-950 mb-1">Commercial invoice export details</h2>
            <p className="text-xs text-gray-500 mb-3">These fields appear on the commercial invoice. Combay exporter details stay locked.</p>
            <div className="grid sm:grid-cols-2 gap-2.5">
              <div><label className="label text-xs">Country of origin shown on document</label><input className="input text-xs py-2" value={exportCountryOfOrigin} onChange={(e) => setExportCountryOfOrigin(e.target.value)} placeholder="United Kingdom" /></div>
              <div><label className="label text-xs">Reason for export</label><input className="input text-xs py-2" value={exportReason} onChange={(e) => setExportReason(e.target.value)} placeholder="E-commerce sale / return / warranty replacement" /></div>
              <div className="sm:col-span-2"><label className="label text-xs">Incoterms / delivery responsibility text</label><textarea className="textarea text-xs py-2" rows={2} value={incoterms} onChange={(e) => setIncoterms(e.target.value)} placeholder="DAP — delivered door to door. Buyer/consignee is responsible for import duty, taxes and customs clearance charges." /></div>
              <div><label className="label text-xs">Shipment notes</label><input className="input text-xs py-2" value={shipmentNotes} onChange={(e) => setShipmentNotes(e.target.value)} placeholder="No loose batteries" /></div>
            </div>
          </div>}

          {discountAllowed && <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="font-display font-700 text-navy-950 mb-1">Discount</h2>
            <p className="text-xs text-gray-500 mb-3">Only applies to Quotes and Proforma Invoices. Choose whether the discount is applied across line items or as a discount against the total invoice value.</p>
            <div className="grid sm:grid-cols-4 gap-2.5">
              <div><label className="label text-xs">Discount application</label><select className="input text-xs py-2" value={discountMode} onChange={(e) => setDiscountMode(e.target.value as DiscountMode)}><option value="NONE">No discount</option><option value="LINE_ITEMS">Apply to line items</option><option value="TOTAL_VALUE">Apply to total invoice value</option></select></div>
              <div><label className="label text-xs">Discount type</label><select className="input text-xs py-2" value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)} disabled={discountMode === "NONE"}><option value="PERCENTAGE">Percentage %</option><option value="FIXED">Fixed amount £</option></select></div>
              <div><label className="label text-xs">Discount value</label><input type="number" min="0" step="0.01" className="input text-xs py-2" value={discountValue || ""} onChange={(e) => setDiscountValue(Number(e.target.value))} disabled={discountMode === "NONE"} placeholder={discountType === "PERCENTAGE" ? "10" : "50.00"}/></div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600"><strong className="block text-navy-950">Calculated discount</strong>{fmt(discount)}<br/><span>Original subtotal: {fmt(grossSubtotal)}</span></div>
            </div>
          </div>}

          {!isPackingList && <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="font-display font-700 text-navy-950 mb-3">Shipping and VAT</h2>
            <div className="grid sm:grid-cols-2 gap-2.5">
              <div><label className="label text-xs">Shipping / destination country</label><input className="input text-xs py-2" value={shippingCountry} onChange={(e) => setShippingCountry(e.target.value)} placeholder="e.g. United Kingdom / China / UAE" /></div>
              <div><label className="label text-xs">Shipping cost</label><input type="number" min="0" step="0.01" className="input text-xs py-2" value={shippingCost || ""} onChange={(e) => setShippingCost(Number(e.target.value))} placeholder="0.00" /></div>
            </div>
            <label className="mt-4 flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              <input type="checkbox" checked={chargeVat} onChange={(e) => setChargeVat(e.target.checked)} className="mt-1" />
              <span><strong className="block text-navy-950">Charge VAT</strong>Ticked = add 20% VAT. Unticked = no VAT charged. Commercial invoices can use no VAT while still showing customs values.</span>
            </label>
          </div>}

          {isPayable && <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
            <h2 className="font-display font-700 text-navy-950">Payment options</h2>
            <label className="flex items-start gap-2 text-sm text-gray-600"><input type="checkbox" checked={autoGeneratePaymentLink} onChange={(e) => setAutoGeneratePaymentLink(e.target.checked)} className="mt-1" /> Auto-generate Stripe payment link for the final balance due using the configured Stripe API key.</label>
            <div><label className="label text-xs">Stripe payment link</label><input className="input text-xs py-2" value={paymentLink} onChange={(e) => { setPaymentLink(e.target.value); if (e.target.value) setAutoGeneratePaymentLink(false); }} placeholder="Auto-generated after save, or paste manual Stripe link"/></div>
            <div><label className="label text-xs">Bank transfer details</label><textarea className="textarea text-sm py-2" rows={7} value={bankDetails} onChange={(e) => setBankDetails(e.target.value)} /></div>
          </div>}

          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
            <div><label className="label text-xs">Terms</label><textarea className="textarea text-sm py-2" rows={4} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}/></div>
            <div><label className="label text-xs">Notes</label><textarea className="textarea text-sm py-2" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional customer-facing notes..."/></div>
          </div>
        </div>

        <div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 sticky top-24 shadow-sm">
            <h2 className="font-display font-700 text-navy-950 mb-3">Totals</h2>
            <div className="space-y-1.5 text-sm mb-4">
              {isPackingList ? <div className="text-gray-600 text-sm">Packing lists do not show invoice totals, payment links or balances.</div> : <>
              <div className="flex justify-between text-gray-600"><span>Subtotal before discount</span><span className="font-600">{fmt(grossSubtotal)}</span></div>
              {discount > 0 && <div className="flex justify-between text-green-700"><span>Discount</span><span className="font-600">-{fmt(discount)}</span></div>}
              <div className="flex justify-between text-gray-600"><span>Discounted subtotal</span><span className="font-600">{fmt(subtotal)}</span></div>
              {amountPaid > 0 && <div className="flex justify-between text-green-700"><span>Paid / credit</span><span className="font-600">-{fmt(amountPaid)}</span></div>}
              <div className="flex justify-between text-gray-600"><span>{chargeVat ? "VAT 20%" : "VAT not charged"}</span><span className="font-600">{fmt(tax)}</span></div>
              <div className="flex justify-between text-gray-600"><span>Shipping</span><span className="font-600">{fmt(Number(shippingCost || 0))}</span></div>
              <div className="flex justify-between font-display font-800 text-navy-950 text-base border-t border-gray-200 pt-2"><span>Balance due</span><span>{fmt(balanceDue)}</span></div>
              </>}
            </div>
            <div className="space-y-2">
              <button onClick={saveDocument} disabled={saving || !customer.customerName || !customer.customerEmail} className="btn-primary w-full py-2.5 text-xs"><Save size={14}/> {saving ? "Saving..." : "Save Document"}</button>
              {createdId && <a href={`/api/invoices/${createdId}/html`} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full py-2 text-xs flex items-center justify-center gap-2"><Download size={14}/> View / Print</a>}
            </div>
            {message && <p className={`text-xs mt-3 ${createdId ? "text-green-700" : "text-red-600"}`}>{message}</p>}
            {isPayable && <p className="text-xs text-gray-400 text-center mt-2">Payment links are generated from the balance due when Stripe keys are configured.</p>}
            {isCommercialInvoice && <p className="text-xs text-gray-400 text-center mt-2">Commercial invoice values are editable customs values. No Stripe payment link is generated.</p>}
            {(!customer.customerEmail || !customer.customerName) && <p className="text-xs text-gray-400 text-center mt-2">Fill in customer name and email to save</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
