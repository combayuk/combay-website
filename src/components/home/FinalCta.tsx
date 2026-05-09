import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cmsBackgroundStyle } from "@/lib/cmsBackground";

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
    <section className="bg-[#D99611] py-14 lg:py-20" style={cmsBackgroundStyle(content?.backgroundImageUrl, "rgba(217,150,17,.9)")}>
      <div className="site-shell">
        <div className="rounded-2xl border border-[#06101F]/12 bg-white/22 p-6 text-center shadow-sm backdrop-blur md:p-10">
          <p className="font-mono text-[11px] font-900 uppercase tracking-[0.18em] text-[#06101F]/60">{content?.eyebrow || "Get Started Today"}</p>
          <h2 className="mx-auto mt-2 max-w-3xl font-display text-3xl font-900 leading-[1.08] tracking-[-0.03em] text-[#06101F] lg:text-5xl">{content?.heading || "Ready to keep things running?"}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#06101F]/78">{content?.body || "Whether you need equipment, a repair, or want to recover cash on surplus stock — Combay responds within 24 hours."}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {content?.primaryLabel !== "__HIDDEN__" ? <Link href={content?.primaryHref || "/shop"} className="rounded-md bg-[#06101F] px-6 py-3 text-sm font-900 text-white transition-colors hover:bg-[#102840]">{content?.primaryLabel || "Browse Stock"} <ArrowRight size={15} className="ml-1 inline" /></Link> : null}
            {content?.secondaryLabel !== "__HIDDEN__" ? <Link href={content?.secondaryHref || "/repair"} className="rounded-md border border-[#06101F]/20 bg-white/45 px-6 py-3 text-sm font-900 text-[#06101F] transition-colors hover:bg-white/70">{content?.secondaryLabel || "Book a Repair"}</Link> : null}
            {content?.tertiaryLabel !== "__HIDDEN__" ? <Link href={content?.tertiaryHref || "/asset-recovery"} className="rounded-md border border-[#06101F]/20 bg-white/45 px-6 py-3 text-sm font-900 text-[#06101F] transition-colors hover:bg-white/70">{content?.tertiaryLabel || "Sell Your Stock"}</Link> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
