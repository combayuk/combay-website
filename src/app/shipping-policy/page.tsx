import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import { listShippingPolicies } from "@/lib/shipping";

export const metadata = { title: "Shipping Policy" };
export const dynamic = "force-dynamic";

function money(value: unknown) {
  if (value === null || value === undefined || value === "") return "Quote required";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(value));
}
function days(min?: number | null, max?: number | null) {
  if (!min && !max) return "To be confirmed";
  return min === max || !max ? `${min || max} working days` : `${min}–${max} working days`;
}

export default async function Page() {
  const { policies } = await listShippingPolicies();
  const publicPolicies = (policies ?? []).filter((policy: any) => policy.isActive !== false);

  return (
    <main><TopBar /><Navigation />
      <section className="bg-white py-14"><div className="mx-auto max-w-5xl px-4">
        <p className="section-label">Policies</p>
        <h1 className="page-heading mb-4 text-4xl">Shipping Policy</h1>
        <p className="mb-8 max-w-3xl text-sm leading-7 text-gray-600">Combay ships second-hand industrial, automation, electrical, laboratory and technical equipment in practical packaging tiers. Shipping is calculated from the product shipping profile, destination zone and any product-specific handling requirement. Heavy, irregular, palletised or export-sensitive items may require a manual shipping quote before payment or dispatch.</p>

        <div className="grid gap-4 lg:grid-cols-3">
          <InfoCard title="UK delivery" body="Typical parcel delivery is 2–3 working days after dispatch unless a listing states specialist handling or manual quote required." />
          <InfoCard title="Europe delivery" body="European delivery is usually 3–5 working days after dispatch for parcel-sized items. Freight and export-sensitive goods are quoted manually." />
          <InfoCard title="Worldwide delivery" body="Worldwide delivery is usually 6–8 working days for parcel-sized items. Larger equipment may require crating, freight or export review." />
        </div>

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3"><h2 className="font-display text-lg font-900 text-navy-950">Current shipping profiles</h2><p className="text-xs text-gray-500">These public profiles are driven by the Combay admin shipping-policy system.</p></div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Profile</th><th className="px-4 py-3">Weight / type</th><th className="px-4 py-3">UK</th><th className="px-4 py-3">Europe</th><th className="px-4 py-3">Worldwide</th><th className="px-4 py-3">Dispatch</th></tr></thead><tbody className="divide-y divide-slate-100">
            {publicPolicies.map((policy: any) => {
              const uk = policy.rates?.find((rate: any) => rate.zone?.name === "UK");
              const eu = policy.rates?.find((rate: any) => rate.zone?.name === "Europe");
              const ww = policy.rates?.find((rate: any) => rate.zone?.name === "Worldwide");
              return <tr key={policy.id || policy.name}><td className="px-4 py-3"><p className="font-display font-900 text-navy-950">{policy.name}</p><p className="mt-1 text-xs text-gray-500">{policy.manualQuoteRequired ? "Manual quote profile" : policy.description}</p></td><td className="px-4 py-3 text-gray-600">{policy.maxWeightKg ? `Up to ${policy.maxWeightKg}kg` : policy.packagingType || "Specialist"}</td><td className="px-4 py-3">{money(uk?.cost)}</td><td className="px-4 py-3">{money(eu?.cost)}</td><td className="px-4 py-3">{money(ww?.cost)}</td><td className="px-4 py-3">{days(uk?.dispatchMinDays, uk?.dispatchMaxDays)}</td></tr>;
            })}
          </tbody></table></div>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <InfoCard title="Heavy / specialist orders" body="Some items require manual confirmation because size, weight, packing, pallet freight, tail-lift delivery, crating, insurance or export handling cannot be estimated safely before review." />
          <InfoCard title="Collection option" body="Collection by appointment may be available for selected equipment. Collection-only products will be clearly marked during checkout or quotation." />
          <InfoCard title="International restrictions" body="We do not ship to destinations restricted by applicable UK, UN or carrier rules. Some products may also be restricted by manufacturer, export, battery, hazardous goods or customs requirements." />
          <InfoCard title="Quotes and invoices" body="For quote-led orders, shipping can be confirmed on the quotation or proforma invoice before payment. Once an order or invoice is created, the shipping amount is saved on that document." />
        </section>

        <p className="mt-8 text-sm text-gray-500">Questions about delivery or export shipping: <a href="mailto:sales@combay.co.uk" className="text-accent">sales@combay.co.uk</a> · +44 7340 383334</p>
      </div></section>
    <Footer /></main>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><h2 className="font-display text-base font-900 text-navy-950">{title}</h2><p className="mt-2 text-sm leading-6 text-gray-600">{body}</p></div>;
}
