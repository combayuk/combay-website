import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import { getSiteContent, type PolicyPageContent } from "@/lib/siteContent";

function Paragraphs({ text, className }: { text: string; className: string }) {
  const parts = String(text || "").split(/\n{1,}/).map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return null;
  return <div className={className}>{parts.map((part, index) => <p key={index}>{part}</p>)}</div>;
}

export default async function PolicyPageLayout({ policyKey }: { policyKey: "terms" | "privacy" | "returns" | "warranty" | "payment" }) {
  const content = await getSiteContent();
  const policy: PolicyPageContent = content.policies[policyKey];
  return (
    <main>
      <TopBar />
      <Navigation />
      <section className="border-b border-slate-200 bg-[#F4F6F8] py-12">
        <div className="site-shell">
          <div className="max-w-4xl">
            <p className="section-label">{policy.eyebrow}</p>
            <h1 className="page-heading mt-3 text-4xl lg:text-5xl">{policy.heading}</h1>
            <p className="mt-4 text-sm text-slate-500">Last updated: {policy.lastUpdated}</p>
          </div>
        </div>
      </section>
      <section className="bg-white py-12 lg:py-16">
        <div className="site-shell">
          <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="hidden lg:block">
              <div className="sticky top-28 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-display font-900 text-[#06101F]">Combay policy document</p>
                <p className="mt-2 leading-6">For order, warranty, payment and returns questions, contact sales@combay.co.uk.</p>
              </div>
            </aside>
            <article className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-9">
              <Paragraphs text={policy.body} className="space-y-5 text-sm leading-8 text-slate-700" />
              {policy.footer ? <div className="mt-8 border-t border-slate-200 pt-6"><Paragraphs text={policy.footer} className="space-y-2 text-sm leading-7 text-slate-500" /></div> : null}
            </article>
          </div>
        </div>
      </section>
      <Footer content={{ description: content.footer.description, backgroundImageUrl: content.footer.backgroundImageUrl, contact: content.contact }} />
    </main>
  );
}
