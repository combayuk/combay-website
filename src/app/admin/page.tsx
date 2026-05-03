import { Package, ShoppingCart, Wrench, RotateCcw, TrendingUp, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  const stats = [
    { label:"Total Products",    val:"0",  icon:<Package size={20}/>,      color:"bg-blue-50 text-blue-600",   href:"/admin/products" },
    { label:"Active Orders",     val:"0",  icon:<ShoppingCart size={20}/>,  color:"bg-green-50 text-green-600", href:"/admin/orders" },
    { label:"Repair Requests",   val:"0",  icon:<Wrench size={20}/>,        color:"bg-yellow-50 text-yellow-600",href:"/admin/requests" },
    { label:"Pending Returns",   val:"0",  icon:<RotateCcw size={20}/>,     color:"bg-red-50 text-red-600",     href:"/admin/returns" },
  ];
  return (
    <div>
      <h1 className="font-display font-800 text-navy-900 text-2xl mb-6">Dashboard</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <Link key={s.label} href={s.href} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-accent/40 hover:shadow-sm transition-all">
            <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center mb-3`}>{s.icon}</div>
            <div className="font-display font-800 text-2xl text-navy-900">{s.val}</div>
            <div className="text-gray-500 text-xs mt-0.5">{s.label}</div>
          </Link>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-display font-700 text-navy-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { label:"Add New Product", href:"/admin/products/new", icon:"+" },
              { label:"View All Orders", href:"/admin/orders",       icon:"📋" },
              { label:"View Repair Requests", href:"/admin/requests?type=repair", icon:"🔧" },
              { label:"View Asset Recovery Requests", href:"/admin/requests?type=asset", icon:"💷" },
              { label:"Edit Homepage Content", href:"/admin/content",icon:"✏️" },
            ].map(a => (
              <Link key={a.label} href={a.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-sm font-display font-600 text-navy-900">
                <span>{a.icon}</span>{a.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-display font-700 text-navy-900 mb-4">System Status</h2>
          <div className="space-y-2.5">
            {[
              { label:"Database", status:"Connected", ok:true },
              { label:"Email (SMTP)", status:"Configure in .env", ok:false },
              { label:"File Uploads", status:"Local filesystem", ok:true },
              { label:"AI Tools (Anthropic)", status:"Configure ANTHROPIC_API_KEY", ok:false },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 font-display font-600">{s.label}</span>
                <span className={`text-xs font-600 ${s.ok ? "text-green-600" : "text-yellow-600"}`}>
                  {s.ok ? "✓" : "⚠"} {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
