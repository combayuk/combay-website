import type { Metadata } from "next";
import { Suspense } from "react";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import ContactForm from "@/components/forms/ContactForm";
import { getSiteContent } from "@/lib/siteContent";
import { cmsBackgroundStyle } from "@/lib/cmsBackground";
import VisualWidgetZone from "@/components/visual-cms/VisualWidgetZone";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contact Combay", description: "Get in touch with Combay." };

export default async function ContactPage() {
  const c = await getSiteContent();
  const page = c.pages.contact;
  const heroStyle = cmsBackgroundStyle(page.backgroundImageUrl);

  return (
    <main>
      <TopBar />
      <Navigation />
      <VisualWidgetZone pageKey="contact" zone="top" widgets={c.visualWidgets?.["contact:top"] || []} />

      <section className="bg-navy-950 text-white py-12" style={heroStyle}>
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-mono text-[10px] tracking-widest uppercase text-accent mb-2">{page.eyebrow}</p>
          <h1 className="font-display font-800 text-4xl mb-2">{page.heading} <em className="not-italic text-accent">{page.accent}</em></h1>
          <p className="text-white/65 text-sm max-w-2xl">{page.body}</p>
        </div>
      </section>
      <VisualWidgetZone pageKey="contact" zone="afterHero" widgets={c.visualWidgets?.["contact:afterHero"] || []} />

      <section className="py-10 bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <a className="bg-white border border-gray-200 rounded-xl p-4 hover:border-accent" href={`mailto:${c.contact.salesEmail}`}>
            <strong className="block text-navy-900">Orders / Quotes</strong>
            <span className="text-gray-500">{c.contact.salesEmail}</span>
          </a>
          <a className="bg-white border border-gray-200 rounded-xl p-4 hover:border-accent" href={`mailto:${c.contact.infoEmail}`}>
            <strong className="block text-navy-900">General / Media Inquiries</strong>
            <span className="text-gray-500">{c.contact.infoEmail}</span>
          </a>
          <a className="bg-white border border-gray-200 rounded-xl p-4 hover:border-accent" href={`tel:${c.contact.phone}`}>
            <strong className="block text-navy-900">Phone</strong>
            <span className="text-gray-500">{c.contact.phone}</span>
          </a>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <strong className="block text-navy-900">Location</strong>
            <span className="text-gray-500">{c.contact.location}</span>
          </div>
        </div>
      </section>
      <VisualWidgetZone pageKey="contact" zone="afterContactCards" widgets={c.visualWidgets?.["contact:afterContactCards"] || []} />

      <section id="form" className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-[1.05fr_.95fr] gap-8 items-start">
            <div>
              <p className="section-label">{page.sectionEyebrow}</p>
              <h2 className="section-heading text-3xl mb-2">{page.sectionHeading}</h2>
              <p className="text-gray-500 mb-6 text-sm max-w-2xl">{page.sectionBody}</p>
              <Suspense fallback={<div className="text-gray-400 text-sm">Loading form...</div>}>
                <ContactForm />
              </Suspense>
            </div>
            <aside className="space-y-4 lg:pt-12">
              <div className="bg-surface border border-gray-200 rounded-xl p-4">
                <p className="font-display font-700 text-navy-950 text-sm mb-1">Business Hours</p>
                <p className="text-gray-500 text-xs leading-relaxed whitespace-pre-line">{c.contact.businessHours}</p>
              </div>
              {c.contact.mapEmbedUrl && (
                <div id="map" className="rounded-2xl overflow-hidden border border-gray-200 shadow-card bg-white">
                  <iframe src={c.contact.mapEmbedUrl} width="100%" height="260" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Combay location" />
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>
      <VisualWidgetZone pageKey="contact" zone="beforeFooter" widgets={c.visualWidgets?.["contact:beforeFooter"] || []} />

      <Footer content={{ description: c.footer.description, backgroundImageUrl: c.footer.backgroundImageUrl, contact: c.contact }} />
    </main>
  );
}
