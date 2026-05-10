import Link from "next/link";
import {
  ClipboardCheck,
  FileText,
  Mail,
  Package,
  Receipt,
  RefreshCw,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Tag,
  UsersRound,
  Wrench,
} from "lucide-react";

const primaryActions = [
  {
    label: "Products",
    description: "Manage catalogue records, stock, images, pricing, documents and product metadata.",
    href: "/admin/products",
    icon: Package,
  },
  {
    label: "eBay Sync",
    description: "OAuth status, resumable imports, category remap and sync logs.",
    href: "/admin/ebay",
    icon: RefreshCw,
  },
  {
    label: "Orders",
    description: "Review paid orders, fulfilment, paid invoices and customer order status.",
    href: "/admin/orders",
    icon: ShoppingCart,
  },
  {
    label: "Invoices & Quotes",
    description: "Create and edit quotes, proformas, paid invoices, commercial invoices and packing lists.",
    href: "/admin/invoices",
    icon: Receipt,
  },
  {
    label: "Users",
    description: "Registered customers, admin accounts, suspension controls and access management.",
    href: "/admin/users",
    icon: UsersRound,
  },
  {
    label: "Email automation",
    description: "Campaign templates, broadcast mail, automation schedules and unsubscribe management.",
    href: "/admin/marketing",
    icon: Mail,
  },
];

const operationalActions = [
  { label: "Launch QA checklist", href: "/admin/qa", icon: ClipboardCheck },
  { label: "Visual CMS", href: "/admin/content", icon: FileText },
  { label: "Promotions", href: "/admin/promotions", icon: Tag },
  { label: "Requests", href: "/admin/requests", icon: Wrench },
  { label: "Support", href: "/admin/support", icon: ShieldCheck },
  { label: "Send custom email", href: "/admin/marketing/broadcast", icon: Mail },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-7">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-900 uppercase tracking-[0.18em] text-accent">Combay admin</p>
            <h1 className="mt-1 font-display text-3xl font-900 tracking-tight text-navy-950">Operations dashboard</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Use this dashboard as a clean launch hub. Configuration is handled inside the dedicated admin modules and Vercel environment variables, not by browser-only demo settings.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/qa" className="btn-primary text-sm py-2">
              Launch QA checklist
            </Link>
            <Link href="/" target="_blank" className="btn-secondary text-sm py-2">
              View site ↗
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-900 text-navy-950">Core work areas</h2>
            <p className="text-sm text-slate-500">Direct links to the production-backed admin modules.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {primaryActions.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-accent/50 hover:shadow-card"
              >
                <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4F7FA] text-[#2D4F7A] group-hover:bg-[#FFF8E8] group-hover:text-[#C9872F]">
                  <Icon size={19} />
                </span>
                <h3 className="font-display text-base font-900 text-navy-950">{item.label}</h3>
                <p className="mt-1 text-sm leading-5 text-slate-500">{item.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck size={18} className="text-accent" />
            <h2 className="font-display text-lg font-900 text-navy-950">Launch hygiene reminders</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              "Use Admin → eBay for marketplace credentials and sync status.",
              "Use Vercel environment variables for secrets; do not store production keys in browser localStorage.",
              "Run the launch QA checklist before public launch and after each major patch.",
              "Keep background-removal parked for V2 unless a better image pipeline is selected.",
            ].map((item) => (
              <div key={item} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Settings size={18} className="text-accent" />
            <h2 className="font-display text-lg font-900 text-navy-950">Quick links</h2>
          </div>
          <div className="space-y-1.5">
            {operationalActions.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-800 text-slate-600 transition-colors hover:bg-slate-50 hover:text-navy-950"
                >
                  <Icon size={15} className="text-[#C9872F]" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
