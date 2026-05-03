import type { Metadata } from "next";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
export const metadata: Metadata = { title: "Order Tracking — Combay Portal" };
export default function TrackingPage() {
  return (
    <main><TopBar /><Navigation />
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-navy-950 text-white py-10"><div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-3"><Link href="/portal" className="hover:text-accent">Portal</Link><span>/</span><span>Tracking</span></div>
        <h1 className="font-display font-900 text-3xl text-white">Track Your Order</h1>
      </div></div>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <p className="font-display font-700 text-navy-900 mb-3">Order CB-001 — Siemens S7-400 CPU 412-1</p>
          <div className="space-y-3">
            {[
              { status:"Order Confirmed", date:"28 Apr 2025 09:15", done:true },
              { status:"Payment Received", date:"28 Apr 2025 09:22", done:true },
              { status:"Dispatched — JD000099999", date:"29 Apr 2025 14:30", done:true },
              { status:"Out for Delivery", date:"30 Apr 2025 08:00", done:false },
              { status:"Delivered", date:"—", done:false },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-700 ${step.done?"bg-accent text-navy-900":"bg-gray-100 text-gray-400"}`}>{step.done?"✓":""}</div>
                <div>
                  <div className={`font-display font-600 text-sm ${step.done?"text-navy-900":"text-gray-400"}`}>{step.status}</div>
                  <div className="text-xs text-gray-400">{step.date}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">Carrier: Royal Mail Tracked 24 · <a href="#" className="text-accent font-600">View carrier tracking →</a></p>
          </div>
        </div>
        <p className="text-sm text-gray-500 text-center">Tracking not updating? <a href="mailto:info@combay.co.uk" className="text-accent font-600">Contact us</a></p>
      </div>
    </div>
    <Footer /></main>
  );
}
