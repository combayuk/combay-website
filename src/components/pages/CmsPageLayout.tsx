import Link from "next/link";
import type { CmsBlock, CmsPage, CmsStep, SiteContent } from "@/lib/siteContent";
import { cmsBackgroundStyle } from "@/lib/cmsBackground";
import VisualWidgetZone from "@/components/visual-cms/VisualWidgetZone";

function Paragraphs({ text, className }: { text: string; className: string }) {
  const parts = String(text || "").split(/\n{1,}/).map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return null;
  return <div className={className}>{parts.map((part, index) => <p key={index}>{part}</p>)}</div>;
}

function cardWidth(width?: string, blockType?: string) {
  // Only true banners/promotions should span. Normal cards are governed by the adaptive grid,
  // otherwise copied cards can become larger than the card they were copied from.
  if (width === "full" || blockType === "promotion" || blockType === "slider" || blockType === "animation") return "lg:col-span-full";
  return "";
}

function adaptiveGridClass(count: number) {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "sm:grid-cols-2";
  if (count === 3) return "sm:grid-cols-2 lg:grid-cols-3";
  return "sm:grid-cols-2 lg:grid-cols-4";
}

function adaptiveItemClass(count: number, index: number) {
  if (count === 1) return "max-w-2xl";
  if (count === 5 && index >= 3) return "lg:col-span-2";
  return "";
}

function blockBg(background?: string) {
  if (background === "accent") return "bg-accent/10 border-accent/40";
  if (background === "dark") return "bg-navy-950 text-white border-navy-950";
  if (background === "soft") return "bg-gray-50 border-gray-200";
  return "bg-white border-gray-200";
}

function animationClass(animation?: string) {
  if (animation === "float") return "hover:-translate-y-1";
  if (animation === "pulse") return "hover:shadow-lg";
  if (animation === "slide") return "hover:translate-x-1";
  return "";
}

function CmsBlockCard({ block, index, count }: { block: CmsBlock; index: number; count: number }) {
  const align = block.align === "center" ? "text-center" : block.align === "right" ? "text-right" : "text-left";
  const isDark = block.background === "dark";
  const type = block.blockType || "icon";
  const isBanner = type === "promotion" || type === "slider" || type === "animation";
  return (
    <div data-vcms-item="page.blocks" data-vcms-index={index} className={`${cardWidth(block.width, block.blockType)} ${adaptiveItemClass(count, index)} ${blockBg(block.background)} ${align} ${animationClass(block.animation)} border rounded-xl p-6 transition-all hover:border-accent/40 hover:shadow-sm`}>
      {block.imageUrl ? <img src={block.imageUrl} alt={block.title} className={`w-full ${isBanner ? "h-56" : "h-32"} object-cover rounded-lg mb-4`} /> : <div className="text-3xl mb-3">{block.icon}</div>}
      {type !== "text" ? <p className="font-mono text-[10px] uppercase tracking-widest text-accent mb-2">{type}</p> : null}
      <h3 className={`font-display font-800 mb-1 ${isDark ? "text-white" : "text-navy-900"}`}>{block.title}</h3>
      <p className="text-accent text-xs font-600 mb-2">{block.subtitle}</p>
      <Paragraphs text={block.body} className={`text-xs leading-relaxed mb-4 space-y-2 ${isDark ? "text-white/70" : "text-gray-500"}`} />
      {block.linkLabel && <Link href={block.linkHref || "#"} className="text-accent font-display font-700 text-xs hover:text-accent-dark">{block.linkLabel} →</Link>}
    </div>
  );
}

function HeroSection({ page }: { page: CmsPage }) {
  const heroStyle = cmsBackgroundStyle(page.backgroundImageUrl);
  return (
    <section className="bg-navy-950 text-white py-16" style={heroStyle}>
      <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-[1fr_420px] gap-10 items-center">
        <div className="max-w-2xl">
          <p className="font-mono text-xs tracking-widest uppercase text-accent mb-3">{page.eyebrow}</p>
          <h1 className="font-display font-900 text-4xl lg:text-5xl mb-4">{page.heading} <em className="not-italic text-accent">{page.accent}</em></h1>
          <Paragraphs text={page.body} className="text-gray-300 text-lg leading-relaxed mb-8 space-y-3" />
          <div className="flex flex-wrap gap-3">{page.primaryLabel !== "__HIDDEN__" && page.primaryLabel ? <Link href={page.primaryHref} className="btn-primary">{page.primaryLabel}</Link> : null}{page.secondaryLabel !== "__HIDDEN__" && page.secondaryLabel ? <Link href={page.secondaryHref} className="border border-white/30 text-white font-display font-600 px-5 py-2.5 rounded hover:border-white transition-colors">{page.secondaryLabel}</Link> : null}</div>
        </div>
        {page.heroImageUrl && <div className="hidden lg:block bg-white/5 border border-white/10 rounded-2xl p-3"><img src={page.heroImageUrl} alt={page.eyebrow} className="w-full h-80 object-cover rounded-xl"/></div>}
      </div>
    </section>
  );
}

function ContactBar({ contact }: { contact?: SiteContent["contact"] }) {
  if (!contact) return null;
  return <section className="py-8 bg-gray-50 border-y border-gray-200"><div className="max-w-7xl mx-auto px-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm"><a className="bg-white border border-gray-200 rounded-xl p-4 hover:border-accent" href={`mailto:${contact.salesEmail}`}><strong className="block text-navy-900">Order’s/Quotes</strong><span className="text-gray-500">{contact.salesEmail}</span></a><a className="bg-white border border-gray-200 rounded-xl p-4 hover:border-accent" href={`mailto:${contact.infoEmail}`}><strong className="block text-navy-900">General/Media Inquiries</strong><span className="text-gray-500">{contact.infoEmail}</span></a><a className="bg-white border border-gray-200 rounded-xl p-4 hover:border-accent" href={`tel:${contact.phone}`}><strong className="block text-navy-900">Phone</strong><span className="text-gray-500">{contact.phone}</span></a><div className="bg-white border border-gray-200 rounded-xl p-4"><strong className="block text-navy-900">Location</strong><span className="text-gray-500">{contact.location}</span></div></div></section>;
}

function ContentSection({ page }: { page: CmsPage }) {
  if (!page.sectionHeading && !page.blocks.length) return null;
  return <section className="py-14 bg-white" data-vcms-collection="page.blocks"><div className="max-w-7xl mx-auto px-4"><p className="section-label">{page.sectionEyebrow}</p><h2 className="section-heading text-3xl mb-2">{page.sectionHeading}</h2><Paragraphs text={page.sectionBody} className="text-gray-500 mb-8 text-sm max-w-3xl leading-relaxed space-y-3" />{page.blocks.length > 0 && <div className={`grid ${adaptiveGridClass(page.blocks.length)} gap-5`}>{page.blocks.map((b,i)=><CmsBlockCard key={`${b.title}-${i}`} block={b} index={i} count={page.blocks.length}/>)}</div>}</div></section>;
}

function ProcessSection({ steps }: { steps: CmsStep[] }) {
  if (!steps.length) return null;
  return <section className="py-14 bg-gray-50" data-vcms-collection="page.steps"><div className="max-w-7xl mx-auto px-4"><p className="section-label">Process</p><h2 className="section-heading text-3xl mb-8">How it works.</h2><div className={`grid ${adaptiveGridClass(steps.length)} gap-5`}>{steps.map((s,i)=><div key={`${s.number}-${i}`} data-vcms-item="page.steps" data-vcms-index={i} className={`bg-white border border-gray-200 rounded-lg p-5 ${adaptiveItemClass(steps.length, i)}`}>{s.imageUrl && <img src={s.imageUrl} alt={s.title} className="w-full h-28 object-cover rounded mb-4"/>}<div className="font-mono text-accent text-xs mb-3">{s.number}</div><h3 className="font-display font-700 text-navy-900 mb-2">{s.title}</h3><p className="text-gray-500 text-xs leading-relaxed">{s.body}</p></div>)}</div></div></section>;
}

type Contact = SiteContent["contact"];
export default function CmsPageLayout({ page, pageKey = "page", visualWidgets = {}, contact, children, formTitle }: { page: CmsPage; pageKey?: string; visualWidgets?: SiteContent["visualWidgets"]; contact?: Contact; children?: React.ReactNode; formTitle?: string }) {
  const order = Array.isArray(page.sectionOrder) && page.sectionOrder.length ? page.sectionOrder : ["hero", "contactBar", "content", "process", "formOrCta"];
  const widgetsFor = (zone: string) => visualWidgets?.[`${pageKey}:${zone}`] || [];
  const rendered = order.map((section, index) => {
    if (section === "hero") return <><VisualWidgetZone pageKey={pageKey} zone={`before-${section}-${index}`} allWidgets={visualWidgets} /><HeroSection key={`${section}-${index}`} page={page} /><VisualWidgetZone pageKey={pageKey} zone={`after-${section}-${index}`} allWidgets={visualWidgets} /></>;
    if (section === "contactBar") return <><VisualWidgetZone pageKey={pageKey} zone={`before-${section}-${index}`} allWidgets={visualWidgets} /><ContactBar key={`${section}-${index}`} contact={contact} /><VisualWidgetZone pageKey={pageKey} zone={`after-${section}-${index}`} allWidgets={visualWidgets} /></>;
    if (section === "content") return <><VisualWidgetZone pageKey={pageKey} zone={`before-${section}-${index}`} allWidgets={visualWidgets} /><ContentSection key={`${section}-${index}`} page={page} /><VisualWidgetZone pageKey={pageKey} zone={`after-${section}-${index}`} allWidgets={visualWidgets} /></>;
    if (section === "process") return <><VisualWidgetZone pageKey={pageKey} zone={`before-${section}-${index}`} allWidgets={visualWidgets} /><ProcessSection key={`${section}-${index}`} steps={page.steps} /><VisualWidgetZone pageKey={pageKey} zone={`after-${section}-${index}`} allWidgets={visualWidgets} /></>;
    if (section === "formOrCta") return children ? <><VisualWidgetZone pageKey={pageKey} zone={`before-${section}-${index}`} allWidgets={visualWidgets} /><section key={`${section}-${index}`} id="request" className="py-14 bg-white"><div className="max-w-3xl mx-auto px-4"><p className="section-label">Get Started</p><h2 className="section-heading text-3xl mb-2">{formTitle || page.ctaHeading}</h2><Paragraphs text={page.ctaBody} className="text-gray-500 mb-8 text-sm space-y-2" />{children}</div></section><VisualWidgetZone pageKey={pageKey} zone={`after-${section}-${index}`} allWidgets={visualWidgets} /></> : <><VisualWidgetZone pageKey={pageKey} zone={`before-${section}-${index}`} allWidgets={visualWidgets} /><section key={`${section}-${index}`} className="py-12 bg-accent"><div className="max-w-3xl mx-auto px-4 text-center"><h2 className="font-display font-900 text-3xl text-navy-900 mb-3">{page.ctaHeading}</h2><Paragraphs text={page.ctaBody} className="text-navy-800 mb-6 text-sm space-y-2" /><div className="flex flex-wrap justify-center gap-3">{page.ctaPrimaryLabel !== "__HIDDEN__" && page.ctaPrimaryLabel ? <Link href={page.ctaPrimaryHref} className="bg-navy-900 text-white font-display font-700 px-6 py-3 rounded hover:bg-navy-800 transition-colors">{page.ctaPrimaryLabel}</Link> : null}{page.ctaSecondaryLabel !== "__HIDDEN__" && page.ctaSecondaryLabel ? <Link href={page.ctaSecondaryHref} className="bg-white/25 border border-navy-900/20 text-navy-900 font-display font-700 px-6 py-3 rounded hover:bg-white/40 transition-colors">{page.ctaSecondaryLabel}</Link> : null}</div></div></section><VisualWidgetZone pageKey={pageKey} zone={`after-${section}-${index}`} allWidgets={visualWidgets} /></>;
    return null;
  });
  return <>{rendered}</>;
}
