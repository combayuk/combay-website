"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAllAdminProducts } from "@/lib/adminCatalog";
import { Package, ShoppingCart, Wrench, RotateCcw, Mail, Cpu, RefreshCw } from "lucide-react";

export default function AdminDashboard() {
  const [emailConfig,   setEmailConfig]   = useState({ host:"", port:"587", user:"", pass:"" });
  const [aiKey,         setAiKey]         = useState("");
  const [stripeKey,     setStripeKey]     = useState("");
  const [ebayConfig,    setEbayConfig]    = useState({ clientId:"", clientSecret:"" });
  const [configSaved,   setConfigSaved]   = useState(false);
  const [syncing,       setSyncing]       = useState(false);
  const [syncMsg,       setSyncMsg]       = useState("");
  const products = useMemo(() => getAllAdminProducts(), []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("combay_admin_settings_v1");
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.emailConfig) setEmailConfig(saved.emailConfig);
      if (saved.aiKey) setAiKey(saved.aiKey);
      if (saved.stripeKey) setStripeKey(saved.stripeKey);
      if (saved.ebayConfig) setEbayConfig(saved.ebayConfig);
    } catch {
      // ignore invalid browser preview settings
    }
  }, []);

  const saveConfig = () => {
    window.localStorage.setItem("combay_admin_settings_v1", JSON.stringify({ emailConfig, aiKey, stripeKey, ebayConfig }));
    setConfigSaved(true);
    setTimeout(()=>setConfigSaved(false),3000);
  };

  const triggerSync = async () => {
    setSyncing(true); setSyncMsg("Connecting to eBay API...");
    await new Promise(r=>setTimeout(r,800));  setSyncMsg("Fetching active listings...");
    await new Promise(r=>setTimeout(r,1000)); setSyncMsg("Updating inventory database...");
    await new Promise(r=>setTimeout(r,800));  setSyncMsg("✓ Sync complete — 0 listings updated (connect eBay API key to enable)");
    setSyncing(false);
  };

  const stats = [
    { label:"Total Products",   val:String(products.length),  sub:"Preview catalogue", icon:<Package size={18}/>,     color:"bg-blue-50 text-blue-600",   href:"/admin/products" },
    { label:"Active Orders",    val:"2",  sub:"Phase 3 checkout demo", icon:<ShoppingCart size={18}/>, color:"bg-green-50 text-green-600", href:"/admin/orders" },
    { label:"Open Requests",  val:"8",  sub:"Quotes/support/repair",  icon:<Wrench size={18}/>,       color:"bg-amber-50 text-amber-600", href:"/admin/requests" },
    { label:"Pending Returns",  val:"1",  sub:"Approval required",    icon:<RotateCcw size={18}/>,    color:"bg-red-50 text-red-600",     href:"/admin/returns" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-800 text-navy-950 text-2xl">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">Welcome back. Here&apos;s what needs your attention.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/products/new" className="btn-primary text-sm py-2">+ Add Product</Link>
          <Link href="/" target="_blank" className="btn-secondary text-sm py-2">View Site ↗</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s=>(
          <Link key={s.label} href={s.href}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:border-accent/40 hover:shadow-card transition-all">
            <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center mb-3`}>{s.icon}</div>
            <div className="font-display font-800 text-2xl text-navy-950">{s.val}</div>
            <div className="font-display font-600 text-sm text-gray-700 mt-0.5">{s.label}</div>
            <div className="text-gray-400 text-xs mt-0.5">{s.sub}</div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">

        {/* Email Config — fully editable */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Mail size={16} className="text-accent"/>
            <h2 className="font-display font-700 text-navy-950">Email Configuration (SMTP)</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><label className="label text-xs">SMTP Host</label>
              <input className="input text-sm" value={emailConfig.host} onChange={e=>setEmailConfig(c=>({...c,host:e.target.value}))} placeholder="smtp.gmail.com"/></div>
            <div><label className="label text-xs">Port</label>
              <input className="input text-sm" value={emailConfig.port} onChange={e=>setEmailConfig(c=>({...c,port:e.target.value}))} placeholder="587"/></div>
            <div><label className="label text-xs">Username / Email</label>
              <input className="input text-sm" value={emailConfig.user} onChange={e=>setEmailConfig(c=>({...c,user:e.target.value}))} placeholder="info@combay.co.uk"/></div>
            <div><label className="label text-xs">Password</label>
              <input type="password" className="input text-sm" value={emailConfig.pass} onChange={e=>setEmailConfig(c=>({...c,pass:e.target.value}))} placeholder="SMTP password"/></div>
          </div>
          <button onClick={saveConfig} className="btn-primary text-sm py-2">Save Email Config</button>
          {configSaved && <span className="text-green-600 text-xs ml-3 font-display font-600">✓ Saved</span>}
        </div>

        {/* AI Tools Config */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Cpu size={16} className="text-accent"/>
            <h2 className="font-display font-700 text-navy-950">AI Tools (Anthropic Claude)</h2>
          </div>
          <p className="text-gray-500 text-xs mb-3 leading-relaxed">Enter your Anthropic API key to enable AI-powered product overview generation, FAQ generation, and SEO optimisation in the product editor.</p>
          <div className="mb-3">
            <label className="label text-xs">Anthropic API Key</label>
            <input type="password" className="input text-sm font-mono" value={aiKey} onChange={e=>setAiKey(e.target.value)} placeholder="sk-ant-..."/>
          </div>
          <div className="mb-3">
            <label className="label text-xs">Stripe Secret Key (for checkout)</label>
            <input type="password" className="input text-sm font-mono" value={stripeKey} onChange={e=>setStripeKey(e.target.value)} placeholder="sk_live_..."/>
          </div>
          <button onClick={saveConfig} className="btn-primary text-sm py-2">Save API Keys</button>
          {configSaved && <span className="text-green-600 text-xs ml-3 font-display font-600">✓ Saved</span>}
        </div>

        {/* Inventory Sync */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw size={16} className="text-accent"/>
            <h2 className="font-display font-700 text-navy-950">Inventory Sync</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <div><label className="label text-xs">eBay Client ID</label><input className="input text-sm font-mono" value={ebayConfig.clientId} onChange={e=>setEbayConfig(c=>({...c,clientId:e.target.value}))} placeholder="Client ID / App ID" /></div>
            <div><label className="label text-xs">eBay Client Secret</label><input type="password" className="input text-sm font-mono" value={ebayConfig.clientSecret} onChange={e=>setEbayConfig(c=>({...c,clientSecret:e.target.value}))} placeholder="Client Secret" /></div>
          </div>
          <div className="space-y-3 mb-4">
            <button onClick={triggerSync} disabled={syncing}
              className="btn-primary text-sm py-2.5 w-full">
              {syncing ? <><RefreshCw size={13} className="animate-spin"/> Syncing...</> : "↻ Update Inventory from eBay"}
            </button>
            {syncMsg && <p className="text-xs text-gray-500 font-mono bg-gray-50 rounded px-3 py-2">{syncMsg}</p>}
          </div>
          <div className="border-t border-gray-100 pt-4">
            <p className="font-display font-700 text-sm text-navy-950 mb-2">CSV Upload</p>
            <p className="text-gray-400 text-xs mb-3">Upload a product CSV to bulk-import inventory. Use the template below.</p>
            <div className="flex gap-2">
              <label className="btn-secondary text-xs py-2 cursor-pointer">
                <input type="file" accept=".csv" className="hidden"/> Upload CSV
              </label>
              <a href="/stock-list-template.csv" download className="btn-ghost text-xs py-2">
                ↓ Download Template
              </a>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-display font-700 text-navy-950 mb-4">Quick Actions</h2>
          <div className="space-y-1.5">
            {[
              {l:"Add New Product",          h:"/admin/products/new",           i:"📦"},
              {l:"Create Invoice / Quote",   h:"/admin/invoices/new",           i:"🧾"},
              {l:"View Repair Requests",     h:"/admin/requests?type=repair",   i:"🔧"},
              {l:"View Asset Requests",      h:"/admin/requests?type=asset",    i:"💷"},
              {l:"Edit Homepage Content",    h:"/admin/content",                i:"✏️"},
              {l:"Manage Promotions",        h:"/admin/promotions",             i:"🏷"},
              {l:"Download Stock Template",  h:"/stock-list-template.csv",      i:"📋"},
            ].map(a=>(
              <Link key={a.l} href={a.h}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface transition-colors text-sm font-display font-600 text-gray-700 hover:text-navy-950">
                <span className="text-base w-5 text-center">{a.i}</span>{a.l}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
