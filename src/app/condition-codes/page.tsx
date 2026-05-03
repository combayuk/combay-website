import type { Metadata } from "next";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = { title:"Condition Codes", description:"Understand Combay item condition grades: New, New Open Box, Used, For Parts." };

const CODES = [
  { code:"New", dot:"bg-green-500", color:"text-green-700 bg-green-50 border-green-200",
    desc:"Item is new in its original packaging. Manufacturer warranty may or may not be available. Our 30-day return guarantee applies.",
    points:["Original packaging intact","May include manufacturer warranty","30-day Combay return guarantee"] },
  { code:"New (Open Box)", dot:"bg-blue-500", color:"text-blue-700 bg-blue-50 border-blue-200",
    desc:"Item is new and opened, with or without original packaging. Manufacturer warranty may or may not be available. Our 30-day return guarantee applies.",
    points:["Unused item, opened packaging","May not include original box","30-day Combay return guarantee"] },
  { code:"Used", dot:"bg-yellow-500", color:"text-yellow-700 bg-yellow-50 border-yellow-200",
    desc:"Item is in used condition with core functions fully operational. Some items may have minor untested faults due to large inventory processing. Read listing descriptions carefully.",
    points:["Core functions operational","May show cosmetic wear","Minor untested faults possible — read description","30-day Combay return guarantee"] },
  { code:"For Parts / Not Working", dot:"bg-red-500", color:"text-red-700 bg-red-50 border-red-200",
    desc:"Item has a known minor or major fault or damage. All known faults are disclosed in the listing description. Suitable for parts sourcing or expert repair.",
    points:["Known fault — detailed in listing","Suitable for parts or repair","No return guarantee unless significantly misdescribed"] },
];

export default function ConditionCodesPage() {
  return (
    <main>
      <TopBar /><Navigation />
      <section className="py-14 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <p className="section-label">Buying Guide</p>
          <h1 className="page-heading text-4xl mb-2">Condition Codes</h1>
          <p className="text-gray-500 mb-10 text-sm">Every item in our catalogue is assigned a condition code. Understanding these helps you make the right purchase decision.</p>
          <div className="space-y-5">
            {CODES.map(c => (
              <div key={c.code} className="border border-gray-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${c.dot} flex-shrink-0`}/>
                  <span className={`badge border ${c.color}`}>{c.code}</span>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-4">{c.desc}</p>
                <ul className="space-y-1.5">
                  {c.points.map(p => <li key={p} className="flex items-start gap-2 text-xs text-gray-500"><span className="text-accent mt-0.5">·</span>{p}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-5 text-sm text-gray-600">
            <strong className="font-display font-700 text-navy-900 block mb-1">Unsure about an item?</strong>
            Email <a href="mailto:info@combay.co.uk" className="text-accent">info@combay.co.uk</a> quoting the item URL, or use the Ask a Question button on any product page.
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
