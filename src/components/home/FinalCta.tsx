import Link from "next/link";

type FinalCtaContent = {
  eyebrow?: string;
  heading?: string;
  body?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  tertiaryLabel?: string;
  tertiaryHref?: string;
  backgroundImageUrl?: string;
};

export default function FinalCta({ content }: { content?: FinalCtaContent }) {
  return (
    <section className="py-16 bg-accent" style={{ backgroundImage: content?.backgroundImageUrl ? `linear-gradient(rgba(238,179,44,.88),rgba(238,179,44,.88)), url(${content.backgroundImageUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}>
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p className="font-mono text-xs tracking-widest uppercase text-navy-900/50 mb-2">{content?.eyebrow || "Get Started Today"}</p>
        <h2 className="font-display font-900 text-3xl lg:text-4xl text-navy-900 mb-4">{content?.heading || "Ready to keep things running?"}</h2>
        <p className="text-navy-800 mb-8 max-w-xl mx-auto">{content?.body || "Whether you need equipment, a repair, or want to recover cash on surplus stock — Combay responds within 24 hours."}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href={content?.primaryHref || "/shop"} className="bg-navy-900 text-white font-display font-700 px-6 py-3 rounded hover:bg-navy-800 transition-colors">{content?.primaryLabel || "Browse Stock →"}</Link>
          <Link href={content?.secondaryHref || "/repair"} className="bg-white/25 text-navy-900 border border-navy-900/20 font-display font-700 px-6 py-3 rounded hover:bg-white/40 transition-colors">{content?.secondaryLabel || "Book a Repair"}</Link>
          <Link href={content?.tertiaryHref || "/asset-recovery"} className="bg-white/25 text-navy-900 border border-navy-900/20 font-display font-700 px-6 py-3 rounded hover:bg-white/40 transition-colors">{content?.tertiaryLabel || "Sell Your Stock"}</Link>
        </div>
      </div>
    </section>
  );
}
