"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, Wrench, RotateCcw, FileText, Tag, Receipt, LogOut, UsersRound, MessageSquare, RefreshCw, Sparkles, Mail, ClipboardCheck, Truck } from "lucide-react";
import { signOut } from "next-auth/react";

const NAV = [
  { href:"/admin",            label:"Dashboard",         icon:<LayoutDashboard size={15}/> },
  { href:"/admin/products",   label:"Products",          icon:<Package size={15}/> },
  { href:"/admin/ebay",       label:"eBay Sync",         icon:<RefreshCw size={15}/> },
  { href:"/admin/shipping",   label:"Shipping",          icon:<Truck size={15}/> },
  { href:"/admin/products/ai", label:"Product AI",        icon:<Sparkles size={15}/> },
  { href:"/admin/orders",     label:"Orders",            icon:<ShoppingCart size={15}/> },
  { href:"/admin/invoices",   label:"Invoices & Quotes", icon:<Receipt size={15}/> },
  { href:"/admin/users",      label:"Users",             icon:<UsersRound size={15}/> },
  { href:"/admin/leads",      label:"Leads",             icon:<UsersRound size={15}/> },
  { href:"/admin/requests",   label:"Requests",          icon:<Wrench size={15}/> },
  { href:"/admin/support",    label:"Support",           icon:<MessageSquare size={15}/> },
  { href:"/admin/returns",    label:"Returns",           icon:<RotateCcw size={15}/> },
  { href:"/admin/content",    label:"Visual CMS",        icon:<FileText size={15}/> },
  { href:"/admin/promotions", label:"Promotions",        icon:<Tag size={15}/> },
  { href:"/admin/marketing",  label:"Email automation",   icon:<Mail size={15}/> },
  { href:"/admin/marketing/broadcast", label:"Send custom email", icon:<Mail size={15}/> },
  { href:"/admin/qa",        label:"Launch QA",          icon:<ClipboardCheck size={15}/> },
];

export default function AdminSidebar() {
  const path = usePathname();
  return (
    <aside className="w-56 bg-navy-950 text-white flex flex-col flex-shrink-0">
      <div className="px-4 py-5 border-b border-white/8">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-accent rounded-md flex items-center justify-center">
            <span className="text-navy-950 font-display font-800 text-xs">CB</span>
          </div>
          <div>
            <p className="font-display font-800 text-white text-sm tracking-tight">COMBAY</p>
            <p className="font-mono text-[9px] text-white/30 tracking-widest uppercase">Admin Panel</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map(n => {
          const active = n.href==="/admin" ? path==="/admin" : path.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href}
              className={`flex min-w-0 items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-display font-700 transition-all ${
                active ? "bg-white/10 text-white border-l-2 border-accent pl-2.5" : "text-white/50 border-l-2 border-transparent hover:bg-white/5 hover:text-white"}`}>
              <span className={active?"text-accent shrink-0":"shrink-0"}>{n.icon}</span><span className="truncate">{n.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="px-2 py-3 border-t border-white/8 space-y-0.5">
        <Link href="/" target="_blank" className="flex items-center gap-2.5 px-3 py-2 text-white/40 hover:text-white text-sm font-display font-600 transition-colors">
          ↗ View Site
        </Link>
        <button onClick={()=>signOut({callbackUrl:"/"})}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-white/40 hover:text-red-400 text-sm font-display font-600 transition-colors">
          <LogOut size={14}/> Sign Out
        </button>
      </div>
    </aside>
  );
}
