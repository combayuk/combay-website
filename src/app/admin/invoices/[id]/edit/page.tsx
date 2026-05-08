"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Plus, RefreshCw, Save, Trash2 } from "lucide-react";

type LineItem = { id?: string; description: string; sku?: string | null; quantity: number; unitPrice: number; lineTotal?: number };
type DiscountMode = "NONE" | "LINE_ITEMS" | "TOTAL_VALUE";
type DiscountType = "PERCENTAGE" | "FIXED";
type Doc = {
  id: string;
  documentNumber: string;
  type: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  company?: string | null;
  billingAddress?: string | null;
  shippingCountry?: string | null;
  shippingCost?: number;
  amountPaid?: number;
  tax?: number;
  paymentLink?: string | null;
  bankDetails?: string | null;
  paymentTerms?: string | null;
  notes?: string | null;
  lines: LineItem[];
};

function fmt(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(value || 0));
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

const blankLine = (): LineItem => ({ description: "", sku: "", quantity: 1, unitPrice: 0 });

export default function EditDocumentPage({ params }: { params: { id: string } }) {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [lines, setLines] = useState<LineItem[]>([blankLine()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [regeneratePaymentLink, setRegeneratePaymentLink] = useState(false);
  const [discountMode, setDiscountMode] = useState<DiscountMode>("NONE");
  const [discountType, setDiscountType] = useState<DiscountType>("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState(0);
  const [chargeVat, setChargeVat] = useState(true);

  useEffect(() => {
    fetch(`/api/invoices/${params.id}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (data.document) {
          setDoc(data.document);
          setLines((data.document.lines?.length ? data.document.lines : [blankLine()]).map((line: LineItem) => ({
            description: line.description || "",
            sku: line.sku || "",
            quantity: Number(line.quantity || 1),
            unitPrice: Number(line.unitPrice || 0),
          })));
          setChargeVat(Number(data.document.tax || 0) > 0);
        }
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  const isPackingList = doc?.type === "PACKING_LIST";
  const isProforma = doc?.type === "PROFORMA_INVOICE";
  const discountAllowed = doc?.type === "QUOTE" || doc?.type === "PROFORMA_INVOICE";
  const grossSubtotal = useMemo(() => isPackingList ? 0 : lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0), [lines, isPackingList]);
  const discount = discountAllowed && discountMode !== "NONE" ? discountFor(grossSubtotal, discountType, discountValue) : 0;
  const subtotal = Math.max(money(grossSubtotal - discount), 0);
  const tax = isPackingList || !chargeVat ? 0 : money(subtotal * 0.2);
  const shippingCost = isPackingList ? 0 : Number(doc?.shippingCost || 0);
  const total = isPackingList ? 0 : subtotal + tax + shippingCost;
  const amountPaid = isPackingList ? 0 : Number(doc?.amountPaid || 0);
  const balanceDue = Math.max(total - amountPaid, 0);

  function setField(key: keyof Doc, value: string | number) {
    setDoc((current) => current ? { ...current, [key]: value } : current);
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
    return [...lines, { description: `Discount - ${label}`, sku: "", quantity: 1, unitPrice: -discount }];
  }

  async function save() {
    if (!doc) return;
    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/invoices/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: doc.customerName,
        customerEmail: doc.customerEmail,
        customerPhone: doc.customerPhone,
        company: doc.company,
        billingAddress: doc.billingAddress,
        shippingCountry: doc.shippingCountry,
        shippingCost: shippingCost,
        amountPaid: amountPaid,
        paymentLink: doc.paymentLink,
        bankDetails: doc.bankDetails,
        paymentTerms: doc.paymentTerms,
        notes: doc.notes,
        lines: linesForSave(),
        regeneratePaymentLink,
        taxRate: chargeVat ? 0.2 : 0,
        chargeVat,
        tax,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !data.ok) {
      setMessage(data.error || data.reason || "Could not update document.");
      return;
    }
    setDoc(data.document);
    setLines(data.document.lines || lines);
    setRegeneratePaymentLink(false);
    setMessage(`${data.document.documentNumber} updated.${data.document.paymentLink ? " Payment link available." : ""}`);
  }

  if (loading) return <div className="text-sm text-gray-500">Loading document…</div>;
  if (!doc) return <div className="text-sm text-red-600">Document not found.</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/invoices" className="text-gray-400 hover:text-navy-950 transition-colors p-1"><ArrowLeft size={18}/></Link>
        <div>
          <h1 className="font-display font-800 text-navy-950 text-2xl">Edit {doc.documentNumber}</h1>
          <p className="text-xs text-gray-400 mt-1">{label(doc.type)} · Edit customer details, line items, terms, notes and payment details.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-display font-700 text-navy-950 mb-4">Customer details</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className="label text-xs">Customer Name</label><input className="input text-sm" value={doc.customerName} onChange={(e) => setField("customerName", e.target.value)}/></div>
              <div><label className="label text-xs">Company</label><input className="input text-sm" value={doc.company || ""} onChange={(e) => setField("company", e.target.value)}/></div>
              <div><label className="label text-xs">Email</label><input type="email" className="input text-sm" value={doc.customerEmail} onChange={(e) => setField("customerEmail", e.target.value)}/></div>
              <div><label className="label text-xs">Phone</label><input className="input text-sm" value={doc.customerPhone || ""} onChange={(e) => setField("customerPhone", e.target.value)}/></div>
              <div className="sm:col-span-2"><label className="label text-xs">Customer / delivery address</label><textarea className="textarea text-sm" rows={2} value={doc.billingAddress || ""} onChange={(e) => setField("billingAddress", e.target.value)}/></div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-display font-700 text-navy-950 mb-4">Line Items</h2>
            <div className="space-y-2 overflow-x-auto mb-3">
              <div className="hidden sm:grid grid-cols-[1fr_110px_80px_110px_95px_30px] gap-2 px-1 min-w-[720px]">
                {["Description", "SKU", "Qty", isPackingList ? "Unit" : "Unit (£)", "Total", ""].map((heading) => <p key={heading} className="font-display font-700 text-[10px] text-gray-400 uppercase tracking-wider">{heading}</p>)}
              </div>
              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-[1fr_110px_80px_110px_95px_30px] gap-2 items-center min-w-[720px]">
                  <textarea className="textarea text-sm py-2 min-h-[44px]" value={line.description} onChange={(e) => setLine(index, "description", e.target.value)} placeholder="Item description..." />
                  <input className="input text-sm py-2" value={line.sku || ""} onChange={(e) => setLine(index, "sku", e.target.value)} placeholder="SKU" />
                  <input type="number" className="input text-sm py-2 text-center" value={line.quantity} min="0" step="1" onChange={(e) => setLine(index, "quantity", Number(e.target.value))}/>
                  <input type="number" className="input text-sm py-2" value={isPackingList ? "" : line.unitPrice || ""} disabled={isPackingList} step="0.01" min="0" onChange={(e) => setLine(index, "unitPrice", Number(e.target.value))} placeholder={isPackingList ? "N/A" : "0.00"}/>
                  <div className="font-display font-700 text-navy-950 text-sm text-right whitespace-nowrap">{isPackingList ? "—" : fmt(Number(line.quantity || 0) * Number(line.unitPrice || 0))}</div>
                  <button onClick={() => setLines((current) => current.filter((_, i) => i !== index))} className="text-red-400 hover:text-red-600 p-1" disabled={lines.length === 1}><Trash2 size={13}/></button>
                </div>
              ))}
            </div>
            <button onClick={() => setLines((current) => [...current, blankLine()])} className="flex items-center gap-1.5 text-accent font-display font-600 text-sm hover:text-accent-dark"><Plus size={14}/> Add Line</button>
          </div>



          {discountAllowed && <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-display font-700 text-navy-950 mb-1">Discount</h2>
            <p className="text-xs text-gray-500 mb-4">Only applies to Quotes and Proforma Invoices. Apply a new discount to line items or to the total invoice value.</p>
            <div className="grid sm:grid-cols-4 gap-3">
              <div><label className="label">Discount application</label><select className="input text-sm" value={discountMode} onChange={(e) => setDiscountMode(e.target.value as DiscountMode)}><option value="NONE">No discount</option><option value="LINE_ITEMS">Apply to line items</option><option value="TOTAL_VALUE">Apply to total invoice value</option></select></div>
              <div><label className="label">Discount type</label><select className="input text-sm" value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)} disabled={discountMode === "NONE"}><option value="PERCENTAGE">Percentage %</option><option value="FIXED">Fixed amount £</option></select></div>
              <div><label className="label">Discount value</label><input type="number" min="0" step="0.01" className="input text-sm" value={discountValue || ""} onChange={(e) => setDiscountValue(Number(e.target.value))} disabled={discountMode === "NONE"} placeholder={discountType === "PERCENTAGE" ? "10" : "50.00"}/></div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600"><strong className="block text-navy-950">Calculated discount</strong>{fmt(discount)}<br/><span>Original subtotal: {fmt(grossSubtotal)}</span></div>
            </div>
          </div>}

          {!isPackingList && <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-display font-700 text-navy-950 mb-4">Shipping / payment / VAT</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className="label">Shipping to country</label><input className="input text-sm" value={doc.shippingCountry || ""} onChange={(e) => setField("shippingCountry", e.target.value)} /></div>
              <div><label className="label">Shipping cost</label><input type="number" step="0.01" min="0" className="input text-sm" value={shippingCost || ""} onChange={(e) => setField("shippingCost", Number(e.target.value))} /></div>
              <div><label className="label">Amount paid / credit</label><input type="number" step="0.01" min="0" className="input text-sm" value={amountPaid || ""} onChange={(e) => setField("amountPaid", Number(e.target.value))} /></div>
              <div><label className="label">Payment link</label><input className="input text-sm" value={doc.paymentLink || ""} onChange={(e) => setField("paymentLink", e.target.value)} /></div>
            </div>
            <label className="mt-4 flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              <input type="checkbox" checked={chargeVat} onChange={(e) => setChargeVat(e.target.checked)} className="mt-1" />
              <span><strong className="block text-navy-950">Charge VAT</strong>Ticked = add 20% VAT. Unticked = no VAT charged on this Quote/Proforma.</span>
            </label>
            {isProforma && <label className="flex items-start gap-2 text-sm text-gray-600 mt-4"><input type="checkbox" checked={regeneratePaymentLink} onChange={(e) => setRegeneratePaymentLink(e.target.checked)} className="mt-1"/> Regenerate Stripe payment link for updated balance due</label>}
            {isProforma && <div className="mt-3"><label className="label">Bank transfer details</label><textarea className="textarea text-sm" rows={7} value={doc.bankDetails || ""} onChange={(e) => setField("bankDetails", e.target.value)} /></div>}
          </div>}

          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div><label className="label">Terms</label><textarea className="textarea text-sm" rows={5} value={doc.paymentTerms || ""} onChange={(e) => setField("paymentTerms", e.target.value)}/></div>
            <div><label className="label">Notes</label><textarea className="textarea text-sm" rows={3} value={doc.notes || ""} onChange={(e) => setField("notes", e.target.value)}/></div>
          </div>
        </div>

        <div>
          <div className="bg-white border border-gray-200 rounded-xl p-5 sticky top-20">
            <h2 className="font-display font-700 text-navy-950 mb-4">Summary</h2>
            <div className="space-y-2 text-sm mb-5">
              {isPackingList ? <div className="text-gray-600 text-sm">Packing lists do not show payment totals.</div> : <>
                <div className="flex justify-between text-gray-600"><span>Subtotal before discount</span><span>{fmt(grossSubtotal)}</span></div>
                {discount > 0 && <div className="flex justify-between text-green-700"><span>Discount</span><span>-{fmt(discount)}</span></div>}
                <div className="flex justify-between text-gray-600"><span>Discounted subtotal</span><span>{fmt(subtotal)}</span></div>
                <div className="flex justify-between text-gray-600"><span>{chargeVat ? "VAT 20%" : "VAT not charged"}</span><span>{fmt(tax)}</span></div>
                <div className="flex justify-between text-gray-600"><span>Shipping</span><span>{fmt(shippingCost)}</span></div>
                {amountPaid > 0 && <div className="flex justify-between text-green-700"><span>Paid / credit</span><span>-{fmt(amountPaid)}</span></div>}
                <div className="flex justify-between font-display font-800 text-navy-950 text-lg border-t border-gray-200 pt-2"><span>Balance due</span><span>{fmt(balanceDue)}</span></div>
              </>}
            </div>
            <div className="space-y-2">
              <button onClick={save} disabled={saving || !doc.customerName || !doc.customerEmail} className="btn-primary w-full py-3"><Save size={14}/> {saving ? "Saving..." : "Save Changes"}</button>
              <a href={`/api/invoices/${doc.id}/html`} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full py-2.5 flex items-center justify-center gap-2"><Download size={14}/> View / Print</a>
            </div>
            {message && <p className={`text-xs mt-3 ${message.includes("updated") ? "text-green-700" : "text-red-600"}`}>{message}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
