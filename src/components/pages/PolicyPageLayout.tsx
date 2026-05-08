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
      <section className="py-14 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <p className="section-label">{policy.eyebrow}</p>
          <h1 className="page-heading text-4xl mb-6">{policy.heading}</h1>
          <p className="text-gray-400 text-xs mb-8">Last updated: {policy.lastUpdated}</p>
          <Paragraphs text={policy.body} className="text-gray-700 text-sm leading-relaxed mb-6 space-y-4" />
          <Paragraphs text={policy.footer} className="text-gray-500 text-sm space-y-2" />
        </div>
      </section>
      <Footer content={{ description: content.footer.description, backgroundImageUrl: content.footer.backgroundImageUrl, contact: content.contact }} />
    </main>
  );
}
