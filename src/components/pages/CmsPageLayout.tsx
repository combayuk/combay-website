import Link from "next/link";
import VisualWidgetZone from "@/components/visual-cms/VisualWidgetZone";
import { cmsBackgroundStyle } from "@/lib/cmsBackground";
import type { CmsBlock, CmsPage, CmsStep, SiteContent } from "@/lib/siteContent";

function Paragraphs({ text, className }: { text?: string; className: string }) {
  const parts = String(text || "").split(/\n{1,}/).map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return null;
  return <div className={className}>{parts.map((part, index) => <p key={index}>{part}</p>)}</div>;
}

function adaptiveGridClass(count: number) {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "md:grid-cols-2";
  if (count === 3) return "md:grid-cols-3";
  return "md:grid-cols-2 xl:grid-cols-4";
}

function blockBg(background?: string) {
  if (background === "accent") return "border-[#E6C06E] bg-[#FFF8E8]";
  if (background === "dark") return "border-[#2D4F7A] bg-[#2D4F7A] text-white";
  if (background === "soft") return "border-slate-200 bg-slate-50";
  return "border-slate-200 bg-white";
}

function CmsBlockCard({ block, index, count }: { block: CmsBlock; index: number; count: number }) {
  const isDark = block.background === "dark";
  return (
    <article data-vcms-item="page.blocks" data-vcms-index={index} className={`${blockBg(block.background)} flex min-h-[250px] flex-col rounded-2xl border p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#E8A44A]/50 hover:shadow-lg`}>
      {block.imageUrl ? <img src={block.imageUrl} alt={block.title} className="mb-5 h-36 w-full rounded-xl object-cover" /> : <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-current/10 bg-current/5 text-2xl">{block.icon || "•"}</div>}
      <p className="mb-2 font-mono text-[10px] font-800 uppercase tracking-[0.18em] text-[#C9872F]">{block.blockType || "service"}</p>
      <h3 className={`font-display text-xl font-900 tracking-[-0.02em] ${isDark ? "text-white" : "text-[#2D4F7A]"}`}>{block.title}</h3>
      {block.subtitle ? <p className="mt-1 text-sm font-900 text-[#C9872F]">{block.subtitle}</p> : null}
      <Paragraphs text={block.body} className={`mt-4 flex-1 space-y-2 text-sm leading-7 ${isDark ? "text-white/64" : "text-slate-600"}`} />
      {block.linkLabel ? <Link href={block.linkHref || "#"} className="mt-5 inline-flex text-sm font-900 text-[#C9872F] hover:text-[#2D4F7A]">{block.linkLabel} →</Link> : null}
    </article>
  );
}

function HeroSection({ page }: { page: CmsPage }) {
  return (
    <section className="relative overflow-hidden bg-[#2D4F7A] py-14 text-white lg:py-20" style={cmsBackgroundStyle(page.backgroundImageUrl, "rgba(6,16,31,.94)")}>
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)", backgroundSize: "52px 52px" }} />
      <div className="site-shell relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
        <div className="max-w-3xl">
          <p className="section-label">{page.eyebrow}</p>
          <h1 className="mt-3 font-display text-4xl font-900 leading-[1.05] tracking-[-0.04em] text-white lg:text-6xl">{page.heading} <span className="text-[#E8A44A]">{page.accent}</span></h1>
          <Paragraphs text={page.body} className="mt-5 max-w-2xl space-y-3 text-base leading-8 text-white/68" />
          <div className="mt-8 flex flex-wrap gap-3">
            {page.primaryLabel !== "__HIDDEN__" && page.primaryLabel ? <Link href={page.primaryHref} className="btn-primary">{page.primaryLabel}</Link> : null}
            {page.secondaryLabel !== "__HIDDEN__" && page.secondaryLabel ? <Link href={page.secondaryHref} className="btn-outline-white">{page.secondaryLabel}</Link> : null}
          </div>
        </div>
        {page.heroImageUrl ? <div className="hidden rounded-2xl border border-white/15 bg-white/10 p-3 shadow-2xl lg:block"><img src={page.heroImageUrl} alt={page.eyebrow} className="h-80 w-full rounded-xl object-cover" /></div> : null}
      </div>
    </section>
  );
}

function ContactBar({ contact }: { contact?: SiteContent["contact"] }) {
  if (!contact) return null;
  const cards = [
    ["Order’s/Quotes", contact.salesEmail, `mailto:${contact.salesEmail}`],
    ["General/Media Inquiries", contact.infoEmail, `mailto:${contact.infoEmail}`],
    ["Phone", contact.phone, `tel:${contact.phone}`],
    ["Location", contact.location, "#"],
  ];
  return <section className="border-y border-slate-200 bg-[#F4F6F8] py-8"><div className="site-shell grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label, value, href]) => href === "#" ? <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><strong className="block text-sm font-900 text-[#2D4F7A]">{label}</strong><span className="mt-1 block text-sm text-slate-500">{value}</span></div> : <a key={label} href={href} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#E8A44A]/50"><strong className="block text-sm font-900 text-[#2D4F7A]">{label}</strong><span className="mt-1 block text-sm text-slate-500">{value}</span></a>)}</div></section>;
}

function ContentSection({ page }: { page: CmsPage }) {
  if (!page.sectionHeading && !page.blocks.length) return null;
  return (
    <section className="section-pad bg-white" data-vcms-collection="page.blocks">
      <div className="site-shell">
        <div className="mb-8 max-w-3xl">
          <p className="section-label">{page.sectionEyebrow}</p>
          <h2 className="section-heading mt-2 text-3xl lg:text-5xl">{page.sectionHeading}</h2>
          <Paragraphs text={page.sectionBody} className="mt-4 space-y-3 text-sm leading-7 text-slate-600" />
        </div>
        {page.blocks.length > 0 ? <div className={`grid gap-4 ${adaptiveGridClass(page.blocks.length)}`}>{page.blocks.map((block, index) => <CmsBlockCard key={`${block.title}-${index}`} block={block} index={index} count={page.blocks.length} />)}</div> : null}
      </div>
    </section>
  );
}

function ProcessSection({ steps }: { steps: CmsStep[] }) {
  if (!steps.length) return null;
  return (
    <section className="section-pad border-y border-slate-200 bg-[#F4F6F8]" data-vcms-collection="page.steps">
      <div className="site-shell">
        <p className="section-label">Process</p>
        <h2 className="section-heading mt-2 text-3xl lg:text-5xl">How it works.</h2>
        <div className={`mt-9 grid gap-4 ${adaptiveGridClass(steps.length)}`}>{steps.map((step, index) => <article key={`${step.number}-${index}`} data-vcms-item="page.steps" data-vcms-index={index} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">{step.imageUrl ? <img src={step.imageUrl} alt={step.title} className="mb-4 h-32 w-full rounded-xl object-cover" /> : null}<div className="mb-4 font-mono text-xs font-900 text-[#C9872F]">{step.number}</div><h3 className="font-display text-lg font-900 text-[#2D4F7A]">{step.title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{step.body}</p></article>)}</div>
      </div>
    </section>
  );
}

type Contact = SiteContent["contact"];
export default function CmsPageLayout({ page, pageKey = "page", visualWidgets = {}, contact, children, formTitle }: { page: CmsPage; pageKey?: string; visualWidgets?: SiteContent["visualWidgets"]; contact?: Contact; children?: React.ReactNode; formTitle?: string }) {
  const order = Array.isArray(page.sectionOrder) && page.sectionOrder.length ? page.sectionOrder : ["hero", "contactBar", "content", "process", "formOrCta"];
  return (
    <>
      {order.map((section, index) => {
        const before = <VisualWidgetZone pageKey={pageKey} zone={`before-${section}-${index}`} allWidgets={visualWidgets} />;
        const after = <VisualWidgetZone pageKey={pageKey} zone={`after-${section}-${index}`} allWidgets={visualWidgets} />;
        let body: React.ReactNode = null;
        if (section === "hero") body = <HeroSection page={page} />;
        if (section === "contactBar") body = <ContactBar contact={contact} />;
        if (section === "content") body = <ContentSection page={page} />;
        if (section === "process") body = <ProcessSection steps={page.steps} />;
        if (section === "formOrCta") body = children ? <section id="request" className="section-pad bg-white"><div className="site-shell"><div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"><p className="section-label">Get Started</p><h2 className="section-heading mt-2 text-3xl">{formTitle || page.ctaHeading}</h2><Paragraphs text={page.ctaBody} className="mt-3 space-y-2 text-sm leading-7 text-slate-600" /> <div className="mt-7">{children}</div></div></div></section> : <section className="bg-[#E8A44A] py-14"><div className="site-shell text-center"><h2 className="font-display text-3xl font-900 text-[#2D4F7A]">{page.ctaHeading}</h2><Paragraphs text={page.ctaBody} className="mx-auto mt-3 max-w-2xl space-y-2 text-sm leading-7 text-[#2D4F7A]/75" /><div className="mt-6 flex flex-wrap justify-center gap-3">{page.ctaPrimaryLabel !== "__HIDDEN__" && page.ctaPrimaryLabel ? <Link href={page.ctaPrimaryHref} className="rounded-md bg-[#2D4F7A] px-6 py-3 text-sm font-900 text-white">{page.ctaPrimaryLabel}</Link> : null}{page.ctaSecondaryLabel !== "__HIDDEN__" && page.ctaSecondaryLabel ? <Link href={page.ctaSecondaryHref} className="rounded-md border border-[#2D4F7A]/20 bg-white/40 px-6 py-3 text-sm font-900 text-[#2D4F7A]">{page.ctaSecondaryLabel}</Link> : null}</div></div></section>;
        return <div key={`${section}-${index}`}>{before}{body}{after}</div>;
      })}
    </>
  );
}
