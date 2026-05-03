import type { Metadata } from "next";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
export const metadata: Metadata = { title: "My Orders — Combay Portal" };
const ORDERS = [
  { id:"CB-001", date:"28 Apr 2025", items:"Siemens S7-400 CPU 412-1", total:"£1,240", status:"Dispatched", tracking:"JD000099999" },
  { id:"CB-002", date:"15 Mar 2025", items:"ABB ACS550 Drive 7.5kW", total:"£890", status:"Delivered", tracking:"JD000088888" },
  { id:"CB-003", date:"02 Feb 2025", items:"Cisco 2960 Switch ×3", total:"£435", status:"Delivered", tracking:"JD000077777" },
];
const SC: Record<string,string> = { Dispatched:"text-purple-700 bg-purple-50", Delivered:"text-green-700 bg-green-50", Processing:"text-blue-700 bg-blue-50" };
export default function OrdersPage() {
  return (
    <main><TopBar /><Navigation />
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-navy-950 text-white py-10"><div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-3"><Link href="/portal" className="hover:text-accent">Portal</Link><span>/</span><span>Orders</span></div>
        <h1 className="font-display font-900 text-3xl text-white">My Orders</h1>
      </div></div>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{["Order","Date","Item","Total","Status","Actions"].map(h=><th key={h} className="text-left px-5 py-3 font-display font-700 text-navy-900 text-xs">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ORDERS.map(o=>(
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5 font-display font-700 text-navy-900">{o.id}</td>
                  <td className="px-5 py-3.5 text-gray-500">{o.date}</td>
                  <td className="px-5 py-3.5 text-navy-900">{o.items}</td>
                  <td className="px-5 py-3.5 font-display font-700 text-accent">{o.total}</td>
                  <td className="px-5 py-3.5"><span className={`text-xs font-display font-600 px-2.5 py-1 rounded ${SC[o.status]||"text-gray-700 bg-gray-50"}`}>{o.status}</span></td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <Link href={`/portal/tracking?order=${o.id}`} className="text-xs text-accent font-600 hover:text-accent-dark">Track</Link>
                      {o.status==="Delivered"&&<Link href={`/portal/returns?order=${o.id}`} className="text-xs text-gray-500 font-600 hover:text-navy-900">Return</Link>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <Footer /></main>
  );
}
