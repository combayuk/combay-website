"use client";
import { useState } from "react";
import { Plus, Trash2, Send, Download, ArrowLeft } from "lucide-react";
import Link from "next/link";

type LineItem = { desc: string; qty: number; unit: number };
const newLine = (): LineItem => ({ desc:"", qty:1, unit:0 });

export default function InvoiceGenerator() {
  const [type,    setType]    = useState<"invoice"|"quote">("quote");
  const [to,      setTo]      = useState({ name:"", company:"", email:"", address:"" });
  const [lines,   setLines]   = useState<LineItem[]>([newLine()]);
  const [notes,   setNotes]   = useState("Payment terms: 100% in advance. All prices exclusive of VAT unless stated.");
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [refNum]              = useState(`CB-${Date.now().toString(36).toUpperCase().slice(-6)}`);

  const subtotal = lines.reduce((a,l)=>a+l.qty*l.unit, 0);
  const vat      = subtotal * 0.20;
  const total    = subtotal + vat;
  const fmt      = (n: number) => `£${n.toFixed(2)}`;
  const setLine  = (i: number, k: keyof LineItem, v: any) => setLines(ls=>ls.map((l,j)=>j===i?{...l,[k]:v}:l));

  async function handleSend() {
    setLoading(true);
    await new Promise(r=>setTimeout(r,1000));
    setLoading(false);
    setSent(true);
  }

  if (sent) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="font-display font-700 text-navy-950 text-xl mb-2">{type==="invoice"?"Invoice":"Quote"} Sent</h2>
        <p className="text-gray-500 text-sm mb-4">Sent to <strong>{to.email}</strong></p>
        <button onClick={()=>setSent(false)} className="btn-secondary text-sm">Create Another</button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/invoices" className="text-gray-400 hover:text-navy-950 transition-colors p-1"><ArrowLeft size={18}/></Link>
        <h1 className="font-display font-800 text-navy-950 text-2xl">
          New {type==="invoice"?"Invoice":"Quote"}
          <span className="font-mono text-sm text-gray-400 ml-3">{refNum}</span>
        </h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <p className="font-display font-700 text-sm text-navy-950">Document type:</p>
              {(["quote","invoice"] as const).map(t=>(
                <button key={t} onClick={()=>setType(t)}
                  className={`font-display font-600 text-sm px-4 py-1.5 rounded-md border capitalize transition-colors ${type===t?"bg-navy-950 text-white border-navy-950":"border-gray-200 text-gray-600 hover:border-navy-950"}`}>{t}</button>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className="label text-xs">Customer Name *</label><input className="input text-sm" value={to.name} onChange={e=>setTo(t=>({...t,name:e.target.value}))} placeholder="John Smith"/></div>
              <div><label className="label text-xs">Company</label><input className="input text-sm" value={to.company} onChange={e=>setTo(t=>({...t,company:e.target.value}))}/></div>
              <div><label className="label text-xs">Email *</label><input type="email" className="input text-sm" value={to.email} onChange={e=>setTo(t=>({...t,email:e.target.value}))} placeholder="customer@company.com"/></div>
              <div><label className="label text-xs">Address</label><input className="input text-sm" value={to.address} onChange={e=>setTo(t=>({...t,address:e.target.value}))} placeholder="City, Postcode"/></div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-display font-700 text-navy-950 mb-4">Line Items</h2>
            <div className="space-y-2 mb-3">
              <div className="hidden sm:grid grid-cols-[1fr_72px_100px_80px_28px] gap-2 px-1">
                {["Description","Qty","Unit (£)","Total",""].map(h=><p key={h} className="font-display font-700 text-[10px] text-gray-400 uppercase tracking-wider">{h}</p>)}
              </div>
              {lines.map((l,i)=>(
                <div key={i} className="grid grid-cols-[1fr_72px_100px_80px_28px] gap-2 items-center">
                  <input className="input text-sm py-2" value={l.desc} onChange={e=>setLine(i,"desc",e.target.value)} placeholder="Item..."/>
                  <input type="number" className="input text-sm py-2 text-center" value={l.qty} min="1" onChange={e=>setLine(i,"qty",+e.target.value)}/>
                  <input type="number" className="input text-sm py-2" value={l.unit||""} step="0.01" min="0" onChange={e=>setLine(i,"unit",+e.target.value)} placeholder="0.00"/>
                  <div className="font-display font-700 text-navy-950 text-sm text-right whitespace-nowrap">{fmt(l.qty*l.unit)}</div>
                  <button onClick={()=>setLines(ls=>ls.filter((_,j)=>j!==i))} className="text-red-400 hover:text-red-600 p-1 transition-colors"><Trash2 size={13}/></button>
                </div>
              ))}
            </div>
            <button onClick={()=>setLines(ls=>[...ls,newLine()])} className="flex items-center gap-1.5 text-accent font-display font-600 text-sm hover:text-accent-dark transition-colors">
              <Plus size={14}/> Add Line
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <label className="label">Notes / Payment Terms</label>
            <textarea className="textarea text-sm" rows={3} value={notes} onChange={e=>setNotes(e.target.value)}/>
          </div>
        </div>

        <div>
          <div className="bg-white border border-gray-200 rounded-xl p-5 sticky top-20">
            <h2 className="font-display font-700 text-navy-950 mb-4">Totals</h2>
            <div className="space-y-2 text-sm mb-5">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span className="font-600">{fmt(subtotal)}</span></div>
              <div className="flex justify-between text-gray-600"><span>VAT 20%</span><span className="font-600">{fmt(vat)}</span></div>
              <div className="flex justify-between font-display font-800 text-navy-950 text-lg border-t border-gray-200 pt-2">
                <span>Total</span><span>{fmt(total)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <button onClick={handleSend} disabled={loading||!to.email||!to.name} className="btn-primary w-full py-3">
                <Send size={14}/> {loading?"Sending...":type==="invoice"?"Send Invoice":"Send Quote"}
              </button>
              <button className="btn-secondary w-full py-2.5"><Download size={14}/> Download PDF</button>
            </div>
            {(!to.email||!to.name) && <p className="text-xs text-gray-400 text-center mt-2">Fill in customer name and email to send</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
