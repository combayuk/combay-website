import Link from "next/link";
import { CheckCircle2, Circle, ExternalLink, ShieldCheck } from "lucide-react";

const sections = [
  {
    title: "Public website",
    items: [
      "Home page loads on desktop and mobile.",
      "Mega menu opens without covering the full first viewport.",
      "Master category links visually select the correct shop filter.",
      "Subcategory links visually select the nested filter.",
      "Search works by SKU, MPN, model, brand and product title.",
      "Product detail gallery shows original images without broken URLs.",
    ],
  },
  {
    title: "Commerce flow",
    items: [
      "Simple product can be added to cart.",
      "Variation product forces option selection before cart/checkout/RFQ.",
      "Quantity cannot exceed available stock.",
      "Checkout pre-fills logged-in customer details where present.",
      "Stripe-paid order moves into the correct order/paid-invoice flow.",
      "Paid invoice shows paid state and shipping where relevant.",
    ],
  },
  {
    title: "Admin operations",
    items: [
      "Admin login and customer login remain separate.",
      "Admin users page lists email and phone and can create/delete secondary admins.",
      "sales@combay.co.uk primary admin cannot be deleted.",
      "Suspended customer cannot sign in or re-register with the same email/phone.",
      "Invoices, quotes, packing lists and commercial invoices can be created and viewed.",
      "Visual CMS opens with live-page parity and no cropped edit panel.",
    ],
  },
  {
    title: "Email and automation",
    items: [
      "Resend sender/domain configuration is valid.",
      "Registration verification email arrives.",
      "Forgot-password reset email arrives and redirects to the correct login page after reset.",
      "Marketing automation preview matches sent layout.",
      "Unsubscribe link and List-Unsubscribe behaviour are present.",
      "No unwanted CTA buttons are present in customer emails while this is parked.",
    ],
  },
  {
    title: "eBay and integrations",
    items: [
      "eBay account deletion endpoint challenge and POST notification return 200.",
      "eBay Developer Portal test notification succeeds.",
      "Sync first 10, first 50 and resumable sync-all behaviour work.",
      "Remap categories only keeps public shop filters clean.",
      "Background-removal worker remains parked for V2 and no bad processed images are live.",
      "No generated image-worker files remain on the VPS from the failed test batch.",
    ],
  },
  {
    title: "Launch environment",
    items: [
      "Production Vercel env vars are present and not duplicated incorrectly.",
      "NEXTAUTH_SECRET is set in production.",
      "DATABASE_URL points to the intended Neon/Postgres database.",
      "Stripe webhook secret is set for production if Stripe is live.",
      "Resend API key is set and current.",
      "eBay callback/RuName and marketplace endpoint match the Developer Portal.",
    ],
  },
];

export default function AdminQaPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-900 uppercase tracking-[0.18em] text-accent">Launch QA</p>
            <h1 className="mt-1 font-display text-2xl font-900 tracking-tight text-navy-950">Smoke-test checklist</h1>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
              This page is intentionally a checklist, not a new feature module. Use it after each deploy to avoid regressions across existing completed phases.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/" target="_blank" className="btn-secondary text-xs py-2">
              Public site <ExternalLink size={14} />
            </Link>
            <Link href="/admin/ebay" className="btn-primary text-xs py-2">
              eBay sync
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        {sections.map((section) => (
          <section key={section.title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck size={15} className="text-accent" />
              <h2 className="font-display text-base font-900 text-navy-950">{section.title}</h2>
            </div>
            <ul className="space-y-2">
              {section.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs leading-5 text-slate-600">
                  <Circle size={13} className="mt-0.5 flex-shrink-0 text-slate-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="rounded-xl border border-green-200 bg-green-50 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={19} className="mt-0.5 flex-shrink-0 text-green-700" />
          <div>
            <h2 className="font-display text-base font-900 text-green-900">QA rule going forward</h2>
            <p className="mt-1 text-xs leading-5 text-green-800">
              Before starting any new feature phase, confirm the gap against the current codebase first. Existing completed modules should be QA-tested, not rebuilt.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
