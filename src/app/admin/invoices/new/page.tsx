"use client";

import { useState } from "react";
import { ArrowLeft, Download, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";

const newLine = () => ({ description: "", sku: "", quantity: 1, unitPrice: 0 });
type LineItem = ReturnType<typeof newLine>;

function fmt(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(value ?? 0));
}

export default function InvoiceGenerator() {
  const [type, setType] = useState<"INVOICE" | "QUOTE">("QUOTE");
  const [customer, setCustomer] = useState({ customerName: "", company: "", customerEmail: "", customerPhone: "", billingAddress: "" });
  const [lines, setLines] = useState<LineItem[]>([newLine()]);
  const [notes, setNotes] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Payment terms: 100% in advance unless stated otherwise. Quotes are subject to availability.");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [createdId, setCreatedId] = useState("");

  const subtotal = lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0);
  const tax = subtotal * 0.2;
  const total = subtotal + tax;

  function setLine(index: number, key: keyof LineItem, value: string | number) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, [key]: value } : line)));
  }

  async function saveDocument() {
    setSaving(true);
    setMessage("");
    setCreatedId("");

    const response = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, ...customer, lines, notes, paymentTerms, taxRate: 0.2 }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok || !data.ok) {
      setMessage(data.error || data.reason || "Could not save document.");
      return;
    }

    setCreatedId(data.document.id);
    setMessage(`${data.document.documentNumber} saved. Use View/Print to download as PDF from the browser.`);
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/invoices" className="text-gray-400 hover:text-navy-950 transition-colors p-1"><ArrowLeft size={18}/></Link>
        <div>
          <h1 className="font-display font-800 text-navy-950 text-2xl">New {type === "INVOICE" ? "Invoice" : "Quote"}</h1>
          <p className="text-xs text-gray-400 mt-1">This creates a database record. Email sending comes in the email phase.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <p className="font-display font-700 text-sm text-navy-950">Document type:</p>
              {(["QUOTE", "INVOICE"] as const).map((item) => (
                <button key={item} onClick={() => setType(item)} className={`font-display font-600 text-sm px-4 py-1.5 rounded-md border capitalize transition-colors ${type === item ? "bg-navy-950 text-white border-navy-950" : "border-gray-200 text-gray-600 hover:border-navy-950"}`}>{item.toLowerCase()}</button>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className="label text-xs">Customer Name *</label><input className="input text-sm" value={customer.customerName} onChange={(e) => setCustomer((c) => ({ ...c, customerName: e.target.value }))} placeholder="John Smith"/></div>
              <div><label className="label text-xs">Company</label><input className="input text-sm" value={customer.company} onChange={(e) => setCustomer((c) => ({ ...c, company: e.target.value }))}/></div>
              <div><label className="label text-xs">Email *</label><input type="email" className="input text-sm" value={customer.customerEmail} onChange={(e) => setCustomer((c) => ({ ...c, customerEmail: e.target.value }))} placeholder="customer@company.com"/></div>
              <div><label className="label text-xs">Phone</label><input className="input text-sm" value={customer.customerPhone} onChange={(e) => setCustomer((c) => ({ ...c, customerPhone: e.target.value }))}/></div>
              <div className="sm:col-span-2"><label className="label text-xs">Billing / delivery address</label><textarea className="textarea text-sm" rows={2} value={customer.billingAddress} onChange={(e) => setCustomer((c) => ({ ...c, billingAddress: e.target.value }))}/></div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-display font-700 text-navy-950 mb-4">Line Items</h2>
            <div className="space-y-2 mb-3">
              <div className="hidden sm:grid grid-cols-[1fr_100px_72px_110px_90px_28px] gap-2 px-1">
                {["Description", "SKU", "Qty", "Unit (£)", "Total", ""].map((heading) => <p key={heading} className="font-display font-700 text-[10px] text-gray-400 uppercase tracking-wider">{heading}</p>)}
              </div>
              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-[1fr_100px_72px_110px_90px_28px] gap-2 items-center">
                  <input className="input text-sm py-2" value={line.description} onChange={(e) => setLine(index, "description", e.target.value)} placeholder="Item description..."/>
                  <input className="input text-sm py-2" value={line.sku} onChange={(e) => setLine(index, "sku", e.target.value)} placeholder="SKU"/>
                  <input type="number" className="input text-sm py-2 text-center" value={line.quantity} min="0" step="1" onChange={(e) => setLine(index, "quantity", Number(e.target.value))}/>
                  <input type="number" className="input text-sm py-2" value={line.unitPrice || ""} step="0.01" min="0" onChange={(e) => setLine(index, "unitPrice", Number(e.target.value))} placeholder="0.00"/>
                  <div className="font-display font-700 text-navy-950 text-sm text-right whitespace-nowrap">{fmt(Number(line.quantity || 0) * Number(line.unitPrice || 0))}</div>
                  <button onClick={() => setLines((current) => current.filter((_, i) => i !== index))} className="text-red-400 hover:text-red-600 p-1 transition-colors" disabled={lines.length === 1}><Trash2 size={13}/></button>
                </div>
              ))}
            </div>
            <button onClick={() => setLines((current) => [...current, newLine()])} className="flex items-center gap-1.5 text-accent font-display font-600 text-sm hover:text-accent-dark transition-colors"><Plus size={14}/> Add Line</button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div><label className="label">Payment Terms</label><textarea className="textarea text-sm" rows={3} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}/></div>
            <div><label className="label">Notes</label><textarea className="textarea text-sm" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional internal/customer-facing notes..."/></div>
          </div>
        </div>

        <div>
          <div className="bg-white border border-gray-200 rounded-xl p-5 sticky top-20">
            <h2 className="font-display font-700 text-navy-950 mb-4">Totals</h2>
            <div className="space-y-2 text-sm mb-5">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span className="font-600">{fmt(subtotal)}</span></div>
              <div className="flex justify-between text-gray-600"><span>VAT 20%</span><span className="font-600">{fmt(tax)}</span></div>
              <div className="flex justify-between font-display font-800 text-navy-950 text-lg border-t border-gray-200 pt-2"><span>Total</span><span>{fmt(total)}</span></div>
            </div>
            <div className="space-y-2">
              <button onClick={saveDocument} disabled={saving || !customer.customerName || !customer.customerEmail} className="btn-primary w-full py-3"><Save size={14}/> {saving ? "Saving..." : "Save Document"}</button>
              {createdId && <a href={`/api/invoices/${createdId}/html`} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full py-2.5 flex items-center justify-center gap-2"><Download size={14}/> View / Print</a>}
            </div>
            {message && <p className={`text-xs mt-3 ${createdId ? "text-green-700" : "text-red-600"}`}>{message}</p>}
            {(!customer.customerEmail || !customer.customerName) && <p className="text-xs text-gray-400 text-center mt-2">Fill in customer name and email to save</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
