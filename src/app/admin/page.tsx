import Link from "next/link";
import { Activity, ClipboardList, FileText, Mail, Package, Receipt, RefreshCw, Settings, ShieldCheck, ShoppingCart, Tag, UsersRound, Wrench } from "lucide-react";
import { prisma, withDatabase } from "@/lib/db";
import { ensureOperationalTables } from "@/lib/operationalSchema";

export const dynamic = "force-dynamic";

const primaryActions = [
  { label: "Products", description: "Catalogue, stock, images, pricing, shipping and eBay listing control.", href: "/admin/products", icon: Package },
  { label: "eBay Sync", description: "OAuth, imports, live publishing, category mapping and sync diagnostics.", href: "/admin/ebay", icon: RefreshCw },
  { label: "Operations", description: "Stock/eBay reconciliation, system health checks, inventory risks and category repair.", href: "/admin/operations", icon: Activity },
  { label: "Orders", description: "Paid orders, dispatch, tracking, stock movements and fulfilment.", href: "/admin/orders", icon: ShoppingCart },
  { label: "Invoices & Quotes", description: "Quotes, proformas, paid invoices, commercial invoices and packing lists.", href: "/admin/invoices", icon: Receipt },
  { label: "Users", description: "Customers, admin accounts, access controls and account support.", href: "/admin/users", icon: UsersRound },
  { label: "Email automation", description: "Templates, broadcast email, scheduled campaigns and consent preferences.", href: "/admin/marketing", icon: Mail },
];

const operationalActions = [
  { label: "Visual CMS", href: "/admin/content", icon: FileText },
  { label: "Promotions", href: "/admin/promotions", icon: Tag },
  { label: "Requests", href: "/admin/requests", icon: Wrench },
  { label: "Support", href: "/admin/support", icon: ShieldCheck },
  { label: "Send custom email", href: "/admin/marketing/broadcast", icon: Mail },
  { label: "Launch QA", href: "/admin/qa", icon: ClipboardList },
];

function money(value: unknown) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(value || 0));
}

async function loadDashboardData() {
  const result = await withDatabase(async () => {
    await ensureOperationalTables();
    const activeOrderWhere: any = {
      paymentStatus: { in: ["PAID", "PARTIAL"] as any },
      status: { notIn: ["CANCELLED", "REFUNDED"] as any },
    };
    const [ordersForStats, returnsCount, quoteRequests, supportTickets, notifications] = await Promise.all([
      prisma.order.findMany({
        where: activeOrderWhere,
        select: { id: true, total: true, salesChannel: true, status: true, paymentStatus: true },
        orderBy: { createdAt: "desc" },
        take: 250,
      }),
      prisma.return.count({ where: { status: { notIn: ["CANCELLED", "REJECTED"] as any } } }).catch(() => 0),
      prisma.quoteRequest.count({ where: { status: { in: ["NEW", "IN_REVIEW"] as any } } }).catch(() => 0),
      prisma.supportTicket.count({ where: { status: { notIn: ["RESOLVED", "CLOSED"] as any } } }).catch(() => 0),
      prisma.adminNotification.findMany({ where: { isRead: false }, orderBy: { createdAt: "desc" }, take: 6 }).catch(() => []),
    ]);

    const channels = ["WEBSITE", "EBAY", "INVOICE", "MANUAL"];
    const byChannel = Object.fromEntries(channels.map((channel) => [channel, { count: 0, value: 0 }])) as Record<string, { count: number; value: number }>;
    for (const order of ordersForStats as any[]) {
      const channel = byChannel[order.salesChannel || "WEBSITE"] ? order.salesChannel || "WEBSITE" : "MANUAL";
      byChannel[channel].count += 1;
      byChannel[channel].value += Number(order.total || 0);
    }
    const totalValue = Object.values(byChannel).reduce((sum, stats) => sum + stats.value, 0);
    return { orders: ordersForStats, returnsCount, quoteRequests, supportTickets, notifications, byChannel, totalValue, grossValue: totalValue };
  });
  if (result.ok) return result.data;
  return { orders: [], returnsCount: 0, quoteRequests: 0, supportTickets: 0, notifications: [], byChannel: { WEBSITE: { count: 0, value: 0 }, EBAY: { count: 0, value: 0 }, INVOICE: { count: 0, value: 0 }, MANUAL: { count: 0, value: 0 } }, totalValue: 0 };
}

export default async function AdminDashboard() {
  const data = await loadDashboardData();
  const paidOrderCount = data.orders.length;
  const returnRate = paidOrderCount ? `${((data.returnsCount / paidOrderCount) * 100).toFixed(1)}%` : "0%";

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-900 uppercase tracking-[0.18em] text-accent">Combay operations</p>
            <h1 className="mt-1 font-display text-2xl font-900 tracking-tight text-navy-950">Operations dashboard</h1>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">Sales, open customer activity, marketplace readiness and fulfilment signals in one place.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/products/new" className="btn-primary text-xs py-2">Add product</Link>
            <Link href="/" target="_blank" className="btn-secondary text-xs py-2">View site ↗</Link>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-base font-900 text-navy-950">Notifications</h2>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-900 text-amber-700">{data.notifications.length} unread</span>
        </div>
        <div className="divide-y divide-slate-100">
          {data.notifications.length ? data.notifications.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between gap-3 py-2 text-xs">
              <div className="min-w-0">
                <p className="truncate font-900 text-navy-950">{item.title}</p>
                <p className="truncate text-slate-500">{item.customerName || item.customerEmail || item.message || item.type}</p>
              </div>
              <span className="shrink-0 text-slate-400">{new Date(item.createdAt).toLocaleString("en-GB")}</span>
            </div>
          )) : <p className="py-2 text-xs text-slate-500">No unread customer/sales notifications.</p>}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[11px] font-900 uppercase text-slate-400">Sales value</p><p className="mt-1 font-display text-2xl font-900 text-navy-950">{money(data.totalValue)}</p><p className="text-[11px] text-slate-500">Net of cancelled/refunded/returned orders</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[11px] font-900 uppercase text-slate-400">Paid orders</p><p className="mt-1 font-display text-2xl font-900 text-navy-950">{paidOrderCount}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[11px] font-900 uppercase text-slate-400">Returns / rate</p><p className="mt-1 font-display text-2xl font-900 text-navy-950">{data.returnsCount} · {returnRate}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[11px] font-900 uppercase text-slate-400">Open activity</p><p className="mt-1 font-display text-2xl font-900 text-navy-950">{data.quoteRequests + data.supportTickets}</p><p className="text-xs text-slate-500">Quotes {data.quoteRequests} · Support {data.supportTickets}</p></div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-display text-base font-900 text-navy-950">Sales by channel</h2>
        <div className="grid gap-2 md:grid-cols-4">
          {Object.entries(data.byChannel).map(([channel, stats]: any) => (
            <div key={channel} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-900 uppercase tracking-wide text-slate-500">{channel.toLowerCase()}</p>
              <p className="mt-1 font-900 text-navy-950">{money(stats.value)}</p>
              <p className="text-xs text-slate-500">{stats.count} order{stats.count === 1 ? "" : "s"}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-display text-xl font-900 text-navy-950">Core work areas</h2></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {primaryActions.map((item) => {
            const Icon = item.icon;
            return <Link key={item.href} href={item.href} className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-accent/50 hover:shadow-card"><span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#F4F7FA] text-[#2D4F7A] group-hover:bg-[#FFF8E8] group-hover:text-[#C9872F]"><Icon size={19} /></span><h3 className="font-display text-base font-900 text-navy-950">{item.label}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p></Link>;
          })}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2"><Settings size={18} className="text-accent" /><h2 className="font-display text-base font-900 text-navy-950">Quick links</h2></div>
        <div className="flex flex-wrap gap-2">
          {operationalActions.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-800 text-slate-600 transition-colors hover:bg-slate-50 hover:text-navy-950"><Icon size={15} className="text-[#C9872F]" />{item.label}</Link>; })}
        </div>
      </section>
    </div>
  );
}
