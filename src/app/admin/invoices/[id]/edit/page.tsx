"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Plus, RefreshCw, Save, Trash2 } from "lucide-react";

type LineItem = { id?: string; description: string; sku?: string | null; hsCode?: string; origin?: string; quantity: number; unitPrice: number; lineTotal?: number };
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

const blankLine = (): LineItem => ({ description: "", sku: "", hsCode: "", origin: "", quantity: 1, unitPrice: 0 });

type AddressFields = {
  line1: string;
  line2: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
};

type CommercialExportFields = {
  countryOfOrigin: string;
  reasonForExport: string;
  incoterms: string;
  shipmentNotes: string;
  adminNotes: string;
};

const blankAddress = (): AddressFields => ({ line1: "", line2: "", city: "", county: "", postcode: "", country: "" });
const blankExportFields = (): CommercialExportFields => ({
  countryOfOrigin: "United Kingdom",
  reasonForExport: "E-commerce sale",
  incoterms: "DAP",
  shipmentNotes: "No loose batteries",
  adminNotes: "",
});

function valueFromObject(obj: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function parseAddress(raw: unknown): AddressFields {
  if (!raw) return blankAddress();
  const text = typeof raw === "string" ? raw.trim() : raw;
  if (typeof text === "string" && text.startsWith("{")) {
    try {
      return parseAddress(JSON.parse(text));
    } catch {}
  }
  if (text && typeof text === "object") {
    const obj = text as Record<string, unknown>;
    return {
      line1: valueFromObject(obj, ["line1", "addressLine1", "address1", "street", "street1", "address"]),
      line2: valueFromObject(obj, ["line2", "addressLine2", "address2", "street2"]),
      city: valueFromObject(obj, ["city", "town", "townCity", "locality"]),
      county: valueFromObject(obj, ["county", "state", "province", "region"]),
      postcode: valueFromObject(obj, ["postcode", "postalCode", "zip", "zipCode"]),
      country: valueFromObject(obj, ["country", "countryName"]),
    };
  }
  const lines = String(text).split(/\n|,/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return blankAddress();
  return {
    line1: lines[0] || "",
    line2: lines[1] || "",
    city: lines[2] || "",
    county: lines[3] || "",
    postcode: lines[4] || "",
    country: lines[5] || "",
  };
}

function composeAddress(address: AddressFields) {
  const cityLine = [address.city, address.county, address.postcode].map((v) => v.trim()).filter(Boolean).join(", ");
  return [address.line1, address.line2, cityLine, address.country].map((v) => v.trim()).filter(Boolean).join("\n");
}

const EXPORT_NOTE_LABELS = ["Country of Origin", "Reason for export", "Incoterms", "Shipment notes", "Admin/customer notes"];
function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function exportNoteBoundary() {
  return `\\n(?:${EXPORT_NOTE_LABELS.map(escapeRegex).join("|")}):|$`;
}
function noteField(notes: unknown, label: string, fallback = "") {
  const text = String(notes ?? "");
  const escaped = escapeRegex(label);
  const match = new RegExp(`${escaped}:\\s*([\\s\\S]*?)(?=${exportNoteBoundary()})`, "i").exec(text);
  return match?.[1]?.trim() || fallback;
}

function cleanCommercialNotes(notes: unknown) {
  let text = String(notes ?? "");
  for (const label of EXPORT_NOTE_LABELS.filter((item) => item !== "Admin/customer notes")) {
    text = text.replace(new RegExp(`(?:^|\\n)${escapeRegex(label)}:\\s*[\\s\\S]*?(?=${exportNoteBoundary()})`, "gi"), "");
  }
  return text.replace(/^Admin\/customer notes:\s*/gim, "").trim();
}

function parseCommercialExportFields(notes: unknown): CommercialExportFields {
  return {
    countryOfOrigin: noteField(notes, "Country of Origin", "United Kingdom"),
    reasonForExport: noteField(notes, "Reason for export", "E-commerce sale"),
    incoterms: noteField(notes, "Incoterms", "DAP"),
    shipmentNotes: noteField(notes, "Shipment notes", "No loose batteries"),
    adminNotes: cleanCommercialNotes(notes),
  };
}

function composeCommercialNotes(fields: CommercialExportFields) {
  const exportDetails = [
    `Country of Origin: ${fields.countryOfOrigin || "United Kingdom"}`,
    `Reason for export: ${fields.reasonForExport || "E-commerce sale"}`,
    `Incoterms: ${fields.incoterms || "DAP"}`,
    `Shipment notes: ${fields.shipmentNotes || "No loose batteries"}`,
  ].join("\n");
  return [exportDetails, fields.adminNotes ? `Admin/customer notes:\n${fields.adminNotes}` : ""].filter(Boolean).join("\n\n");
}


function extractLineMeta(description: string, label: string) {
  const match = new RegExp(`${label}:\\s*([^\\n]+)`, "i").exec(description);
  return match?.[1]?.trim() || "";
}

function cleanLineDescription(description: string) {
  return description
    .replace(/HS Code:\s*[^\n]+/gi, "")
    .replace(/Origin:\s*[^\n]+/gi, "")
    .trim();
}

function lineFromDocumentLine(line: LineItem): LineItem {
  const rawDescription = line.description || "";
  return {
    description: cleanLineDescription(rawDescription),
    sku: line.sku || "",
    hsCode: line.hsCode || extractLineMeta(rawDescription, "HS Code"),
    origin: line.origin || extractLineMeta(rawDescription, "Origin"),
    quantity: Number(line.quantity || 1),
    unitPrice: Number(line.unitPrice || 0),
  };
}

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
  const [address, setAddress] = useState<AddressFields>(() => blankAddress());
  const [exportFields, setExportFields] = useState<CommercialExportFields>(() => blankExportFields());

  useEffect(() => {
    fetch(`/api/invoices/${params.id}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (data.document) {
          const parsedExportFields = parseCommercialExportFields(data.document.notes);
          setDoc(data.document.type === "COMMERCIAL_INVOICE" ? { ...data.document, notes: parsedExportFields.adminNotes } : data.document);
          setAddress(parseAddress(data.document.billingAddress));
          setExportFields(parsedExportFields);
          setLines((data.document.lines?.length ? data.document.lines : [blankLine()]).map(lineFromDocumentLine));
          setChargeVat(Number(data.document.tax || 0) > 0);
        }
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  const isPackingList = doc?.type === "PACKING_LIST";
  const isCommercialInvoice = doc?.type === "COMMERCIAL_INVOICE";
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
    return [...lines, { description: `Discount - ${label}`, sku: "", hsCode: "", origin: "", quantity: 1, unitPrice: -discount }];
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
        billingAddress: composeAddress(address),
        shippingCountry: doc.shippingCountry,
        shippingCost: shippingCost,
        amountPaid: amountPaid,
        paymentLink: doc.paymentLink,
        bankDetails: doc.bankDetails,
        paymentTerms: doc.paymentTerms,
        notes: isCommercialInvoice ? composeCommercialNotes(exportFields) : doc.notes,
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
    const parsedExportFields = parseCommercialExportFields(data.document.notes);
    setDoc(data.document.type === "COMMERCIAL_INVOICE" ? { ...data.document, notes: parsedExportFields.adminNotes } : data.document);
    setAddress(parseAddress(data.document.billingAddress));
    setExportFields(parsedExportFields);
    setLines((data.document.lines?.length ? data.document.lines : lines).map(lineFromDocumentLine));
    setRegeneratePaymentLink(false);
    setMessage(`${data.document.documentNumber} updated.${data.document.paymentLink ? " Payment link available." : ""}`);
  }

  if (loading) return <div className="text-sm text-gray-500">Loading document…</div>;
  if (!doc) return <div className="text-sm text-red-600">Document not found.</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm flex items-center gap-2.5">
        <Link href="/admin/invoices" className="text-gray-400 hover:text-navy-950 transition-colors p-1"><ArrowLeft size={18}/></Link>
        <div>
          <h1 className="font-display font-900 text-navy-950 text-2xl">Edit {doc.documentNumber}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{label(doc.type)} · Edit customer/consignee details, line items, HS/origin, values, terms and notes. Combay company/exporter details are locked.</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-slate-50 px-3 py-1.5 font-900 text-navy-950">Edit customer, customs fields, line items, terms and totals in a compact document workflow.</span>
          <span className="rounded-full bg-amber-50 px-3 py-1.5 font-900 text-amber-700">Totals update live</span>
          <span className="rounded-full bg-green-50 px-3 py-1.5 font-900 text-green-700">Use View / Print after save</span>
        </div>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_320px] gap-4">
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="font-display font-700 text-navy-950 mb-3">Customer details</h2>
            <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <strong className="block text-navy-950">Locked Combay details</strong>
              Generated documents always use Combay Limited as the company/exporter. Edit the consignee/customer, shipment notes, customs line data and values below.
            </div>
            <div className="grid sm:grid-cols-2 gap-2.5">
              <div><label className="label text-xs">Customer Name</label><input className="input text-xs py-2" value={doc.customerName} onChange={(e) => setField("customerName", e.target.value)}/></div>
              <div><label className="label text-xs">Company</label><input className="input text-xs py-2" value={doc.company || ""} onChange={(e) => setField("company", e.target.value)}/></div>
              <div><label className="label text-xs">Email</label><input type="email" className="input text-xs py-2" value={doc.customerEmail} onChange={(e) => setField("customerEmail", e.target.value)}/></div>
              <div><label className="label text-xs">Phone</label><input className="input text-xs py-2" value={doc.customerPhone || ""} onChange={(e) => setField("customerPhone", e.target.value)}/></div>
              <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label className="label text-xs mb-0">Customer / delivery address</label>
                  <span className="text-[11px] text-slate-500">Editable address fields. Saved documents will not show JSON/code.</span>
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
            <div className="space-y-2 overflow-x-auto mb-3">
              <div className="hidden min-w-[920px] sm:grid grid-cols-[minmax(240px,1fr)_74px_82px_82px_56px_78px_76px_24px] gap-1.5 px-1">
                {["Description", "SKU", "HS Code", "Origin", "Qty", isPackingList ? "Unit" : "Unit (£)", "Total", ""].map((heading) => <p key={heading} className="font-display font-700 text-[10px] text-gray-400 uppercase tracking-wider">{heading}</p>)}
              </div>
              {lines.map((line, index) => (
                <div key={index} className="grid min-w-[920px] grid-cols-[minmax(240px,1fr)_74px_82px_82px_56px_78px_76px_24px] gap-1.5 items-center">
                  <textarea className="textarea text-xs py-2 min-h-[40px]" value={line.description} onChange={(e) => setLine(index, "description", e.target.value)} placeholder="Item description..." />
                  <input className="input text-xs py-2" value={line.sku || ""} onChange={(e) => setLine(index, "sku", e.target.value)} placeholder="SKU" />
                  <input className="input text-xs py-2" value={line.hsCode || ""} onChange={(e) => setLine(index, "hsCode", e.target.value)} placeholder="9027.30.00" />
                  <input className="input text-xs py-2" value={line.origin || ""} onChange={(e) => setLine(index, "origin", e.target.value)} placeholder="UK" />
                  <input type="number" className="input text-xs py-2 text-center" value={line.quantity} min="0" step="1" onChange={(e) => setLine(index, "quantity", Number(e.target.value))}/>
                  <input type="number" className="input text-xs py-2" value={isPackingList ? "" : line.unitPrice || ""} disabled={isPackingList} step="0.01" min="0" onChange={(e) => setLine(index, "unitPrice", Number(e.target.value))} placeholder={isPackingList ? "N/A" : "0.00"}/>
                  <div className="font-display font-800 text-navy-950 text-xs text-right whitespace-nowrap">{isPackingList ? "—" : fmt(Number(line.quantity || 0) * Number(line.unitPrice || 0))}</div>
                  <button onClick={() => setLines((current) => current.filter((_, i) => i !== index))} className="text-red-400 hover:text-red-600 p-1" disabled={lines.length === 1}><Trash2 size={13}/></button>
                </div>
              ))}
            </div>
            <button onClick={() => setLines((current) => [...current, blankLine()])} className="inline-flex items-center gap-1.5 text-accent font-display font-800 text-xs hover:text-accent-dark"><Plus size={14}/> Add Line</button>
          </div>

          {isCommercialInvoice && <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="font-display font-700 text-navy-950 mb-1">Commercial invoice export details</h2>
            <p className="text-xs text-gray-500 mb-3">Change these fields directly. They are printed on the commercial invoice. Combay exporter details remain locked.</p>
            <div className="grid sm:grid-cols-2 gap-2.5">
              <div><label className="label text-xs">Country of origin shown on document</label><input className="input text-xs py-2" value={exportFields.countryOfOrigin} onChange={(e) => setExportFields((f) => ({ ...f, countryOfOrigin: e.target.value }))} placeholder="United Kingdom" /></div>
              <div><label className="label text-xs">Reason for export</label><input className="input text-xs py-2" value={exportFields.reasonForExport} onChange={(e) => setExportFields((f) => ({ ...f, reasonForExport: e.target.value }))} placeholder="E-commerce sale / return / warranty replacement" /></div>
              <div className="sm:col-span-2"><label className="label text-xs">Incoterms / delivery responsibility text</label><textarea className="textarea text-xs py-2" rows={2} value={exportFields.incoterms} onChange={(e) => setExportFields((f) => ({ ...f, incoterms: e.target.value }))} placeholder="DAP — delivered door to door. Buyer/consignee is responsible for import duty, taxes and customs clearance charges." /></div>
              <div className="sm:col-span-2"><label className="label text-xs">Shipment notes</label><input className="input text-xs py-2" value={exportFields.shipmentNotes} onChange={(e) => setExportFields((f) => ({ ...f, shipmentNotes: e.target.value }))} placeholder="No loose batteries" /></div>
            </div>
          </div>}

          {discountAllowed && <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="font-display font-700 text-navy-950 mb-1">Discount</h2>
            <p className="text-xs text-gray-500 mb-3">Only applies to Quotes and Proforma Invoices. Apply a new discount to line items or to the total invoice value.</p>
            <div className="grid sm:grid-cols-4 gap-2.5">
              <div><label className="label text-xs">Discount application</label><select className="input text-xs py-2" value={discountMode} onChange={(e) => setDiscountMode(e.target.value as DiscountMode)}><option value="NONE">No discount</option><option value="LINE_ITEMS">Apply to line items</option><option value="TOTAL_VALUE">Apply to total invoice value</option></select></div>
              <div><label className="label text-xs">Discount type</label><select className="input text-xs py-2" value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)} disabled={discountMode === "NONE"}><option value="PERCENTAGE">Percentage %</option><option value="FIXED">Fixed amount £</option></select></div>
              <div><label className="label text-xs">Discount value</label><input type="number" min="0" step="0.01" className="input text-xs py-2" value={discountValue || ""} onChange={(e) => setDiscountValue(Number(e.target.value))} disabled={discountMode === "NONE"} placeholder={discountType === "PERCENTAGE" ? "10" : "50.00"}/></div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600"><strong className="block text-navy-950">Calculated discount</strong>{fmt(discount)}<br/><span>Original subtotal: {fmt(grossSubtotal)}</span></div>
            </div>
          </div>}

          {!isPackingList && <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="font-display font-700 text-navy-950 mb-3">Shipping / payment / VAT</h2>
            <div className="grid sm:grid-cols-2 gap-2.5">
              <div><label className="label text-xs">Shipping to country</label><input className="input text-xs py-2" value={doc.shippingCountry || ""} onChange={(e) => setField("shippingCountry", e.target.value)} /></div>
              <div><label className="label text-xs">Shipping cost</label><input type="number" step="0.01" min="0" className="input text-xs py-2" value={shippingCost || ""} onChange={(e) => setField("shippingCost", Number(e.target.value))} /></div>
              <div><label className="label text-xs">Amount paid / credit</label><input type="number" step="0.01" min="0" className="input text-xs py-2" value={amountPaid || ""} onChange={(e) => setField("amountPaid", Number(e.target.value))} /></div>
              <div><label className="label text-xs">Payment link</label><input className="input text-xs py-2" value={doc.paymentLink || ""} onChange={(e) => setField("paymentLink", e.target.value)} /></div>
            </div>
            <label className="mt-4 flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              <input type="checkbox" checked={chargeVat} onChange={(e) => setChargeVat(e.target.checked)} className="mt-1" />
              <span><strong className="block text-navy-950">Charge VAT</strong>Ticked = add 20% VAT. Unticked = no VAT charged. Commercial invoices can use no VAT while still showing customs values.</span>
            </label>
            {isProforma && <label className="flex items-start gap-2 text-sm text-gray-600 mt-4"><input type="checkbox" checked={regeneratePaymentLink} onChange={(e) => setRegeneratePaymentLink(e.target.checked)} className="mt-1"/> Regenerate Stripe payment link for updated balance due</label>}
            {isProforma && <div className="mt-3"><label className="label text-xs">Bank transfer details</label><textarea className="textarea text-sm py-2" rows={7} value={doc.bankDetails || ""} onChange={(e) => setField("bankDetails", e.target.value)} /></div>}
          </div>}

          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
            <div><label className="label text-xs">Terms</label><textarea className="textarea text-sm py-2" rows={4} value={doc.paymentTerms || ""} onChange={(e) => setField("paymentTerms", e.target.value)}/></div>
            <div><label className="label text-xs">{isCommercialInvoice ? "Additional notes" : "Notes"}</label><textarea className="textarea text-sm py-2" rows={2} value={isCommercialInvoice ? exportFields.adminNotes : doc.notes || ""} onChange={(e) => isCommercialInvoice ? setExportFields((f) => ({ ...f, adminNotes: e.target.value })) : setField("notes", e.target.value)}/></div>
          </div>
        </div>

        <div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 sticky top-24 shadow-sm">
            <h2 className="font-display font-700 text-navy-950 mb-3">Summary</h2>
            <div className="space-y-1.5 text-sm mb-4">
              {isPackingList ? <div className="text-gray-600 text-sm">Packing lists do not show payment totals.</div> : <>
                <div className="flex justify-between text-gray-600"><span>Subtotal before discount</span><span>{fmt(grossSubtotal)}</span></div>
                {discount > 0 && <div className="flex justify-between text-green-700"><span>Discount</span><span>-{fmt(discount)}</span></div>}
                <div className="flex justify-between text-gray-600"><span>Discounted subtotal</span><span>{fmt(subtotal)}</span></div>
                <div className="flex justify-between text-gray-600"><span>{chargeVat ? "VAT 20%" : "VAT not charged"}</span><span>{fmt(tax)}</span></div>
                <div className="flex justify-between text-gray-600"><span>Shipping</span><span>{fmt(shippingCost)}</span></div>
                {amountPaid > 0 && <div className="flex justify-between text-green-700"><span>Paid / credit</span><span>-{fmt(amountPaid)}</span></div>}
                <div className="flex justify-between font-display font-800 text-navy-950 text-base border-t border-gray-200 pt-2"><span>Balance due</span><span>{fmt(balanceDue)}</span></div>
              </>}
            </div>
            <div className="space-y-2">
              <button onClick={save} disabled={saving || !doc.customerName || !doc.customerEmail} className="btn-primary w-full py-2.5 text-xs"><Save size={14}/> {saving ? "Saving..." : "Save Changes"}</button>
              <a href={`/api/invoices/${doc.id}/html`} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full py-2 text-xs flex items-center justify-center gap-2"><Download size={14}/> View / Print</a>
            </div>
            {message && <p className={`text-xs mt-3 ${message.includes("updated") ? "text-green-700" : "text-red-600"}`}>{message}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
