"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, Wrench, RotateCcw, FileText, Tag, Settings, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

const NAV = [
  { href:"/admin",           label:"Dashboard",   icon:<LayoutDashboard size={16}/> },
  { href:"/admin/products",  label:"Products",    icon:<Package size={16}/> },
  { href:"/admin/orders",    label:"Orders",      icon:<ShoppingCart size={16}/> },
  { href:"/admin/requests",  label:"Requests",    icon:<Wrench size={16}/> },
  { href:"/admin/returns",   label:"Returns",     icon:<RotateCcw size={16}/> },
  { href:"/admin/content",   label:"Content",     icon:<FileText size={16}/> },
  { href:"/admin/promotions",label:"Promotions",  icon:<Tag size={16}/> },
];

export default function AdminSidebar() {
  const path = usePathname();
  return (
    <aside className="w-56 bg-navy-900 text-white flex flex-col flex-shrink-0">
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-accent rounded flex items-center justify-center">
            <span className="text-navy-900 font-display font-900 text-xs">C</span>
          </div>
          <div>
            <p className="font-display font-800 text-white text-sm">COMBAY</p>
            <p className="font-mono text-[10px] text-gray-400 tracking-wider">ADMIN</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {NAV.map(n => {
          const active = n.href === "/admin" ? path === "/admin" : path.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-display font-600 transition-colors border-l-2 ${
                active ? "bg-white/10 text-white border-accent" : "text-gray-400 border-transparent hover:bg-white/5 hover:text-white"}`}>
              {n.icon}{n.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-2 py-4 border-t border-white/10">
        <Link href="/" className="flex items-center gap-2.5 px-3 py-2 text-gray-400 hover:text-white text-sm font-display font-600 transition-colors">
          ← View Site
        </Link>
        <button onClick={() => signOut({ callbackUrl:"/" })}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-400 hover:text-red-400 text-sm font-display font-600 transition-colors">
          <LogOut size={14}/> Sign Out
        </button>
      </div>
    </aside>
  );
}
