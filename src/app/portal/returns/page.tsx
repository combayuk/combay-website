import type { Metadata } from "next";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
export const metadata: Metadata = { title: "Returns — Combay Portal" };
export default function ReturnsPage() {
  return (
    <main><TopBar /><Navigation />
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-navy-950 text-white py-10"><div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-3"><Link href="/portal" className="hover:text-accent">Portal</Link><span>/</span><span>Returns</span></div>
        <h1 className="font-display font-900 text-3xl text-white">Request a Return</h1>
      </div></div>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 mb-6 text-sm">
          <strong className="font-display font-700 text-navy-900">30-day return guarantee.</strong> Returns can be requested up to 30 days from confirmed delivery. After 30 days, the button is disabled.
        </div>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
          <div className="px-5 py-3.5 border-b border-gray-100 font-display font-700 text-navy-900 text-sm">Eligible Orders</div>
          {[{ id:"CB-001", item:"Siemens S7-400 CPU 412-1", date:"28 Apr 2025", eligible:true },
            { id:"CB-002", item:"ABB ACS550 Drive", date:"15 Mar 2025", eligible:true },
            { id:"CB-003", item:"Cisco 2960 Switch ×3", date:"02 Feb 2025", eligible:false }].map(o=>(
            <div key={o.id} className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 last:border-0">
              <div>
                <div className="font-display font-700 text-sm text-navy-900">{o.item}</div>
                <div className="text-xs text-gray-400">{o.id} · Delivered {o.date}</div>
              </div>
              <button disabled={!o.eligible}
                className={`font-display font-700 text-xs px-3 py-1.5 rounded transition-colors ${o.eligible?"bg-navy-900 text-white hover:bg-navy-800":"bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
                {o.eligible?"Request Return":"Expired"}
              </button>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-500 text-center">Questions? <a href="mailto:info@combay.co.uk" className="text-accent font-600">info@combay.co.uk</a></p>
      </div>
    </div>
    <Footer /></main>
  );
}
