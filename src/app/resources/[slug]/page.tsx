import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, PlayCircle } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import { getSiteContent } from "@/lib/siteContent";
import { getResourceBySlug } from "@/lib/resources";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const result = await getResourceBySlug(params.slug, true);
  const item = result.ok ? result.data : null;
  if (!item) return { title: "Resource" };
  return { title: item.seoTitle || item.title, description: item.seoDescription || item.excerpt || undefined };
}

function typeLabel(type: string) {
  return String(type || "technical-article").replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function ResourceDetailPage({ params }: { params: { slug: string } }) {
  const [content, result] = await Promise.all([getSiteContent(), getResourceBySlug(params.slug, true)]);
  const item = result.ok ? result.data : null;
  if (!item) notFound();
  const paragraphs = String(item.content || item.excerpt || "").split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);

  return (
    <main className="bg-slate-50">
      <TopBar />
      <Navigation />
      <article>
        <section className="bg-[#1C334F] text-white">
          <div className="site-shell py-8 lg:py-10">
            <Link href="/resources" className="mb-5 inline-flex items-center gap-2 text-xs font-900 text-white/70 hover:text-[#E8A44A]"><ArrowLeft size={14} /> Back to resources</Link>
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#E8A44A]">{typeLabel(item.type)}</p>
            <h1 className="max-w-5xl font-display text-3xl font-900 leading-tight lg:text-5xl">{item.title}</h1>
            {item.excerpt ? <p className="mt-4 max-w-3xl text-sm leading-6 text-white/72">{item.excerpt}</p> : null}
          </div>
        </section>

        <section className="site-shell py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {item.coverImageUrl ? <img src={item.coverImageUrl} alt={item.title} className="max-h-[520px] w-full object-cover" /> : <div className="flex h-56 items-center justify-center bg-slate-100"><BookOpen className="text-slate-300" size={48} /></div>}
              <div className="prose prose-slate max-w-none p-5 lg:p-7">
                {paragraphs.map((paragraph, index) => <p key={index} className="whitespace-pre-line text-sm leading-7 text-slate-600">{paragraph}</p>)}
              </div>
            </div>

            <aside className="space-y-4">
              {item.videoUrl ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="mb-3 flex items-center gap-2 font-display text-sm font-900 text-[#1C334F]"><PlayCircle size={16} className="text-[#C9872F]" /> Video</p>
                  <a href={item.videoUrl} target="_blank" rel="noopener noreferrer" className="btn-primary w-full justify-center py-2 text-xs">Open video</a>
                </div>
              ) : null}
              {item.tags?.length ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="mb-3 font-display text-sm font-900 text-[#1C334F]">Tags</p>
                  <div className="flex flex-wrap gap-1.5">{item.tags.map((tag: string) => <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-800 text-slate-600">{tag}</span>)}</div>
                </div>
              ) : null}
            </aside>
          </div>
        </section>
      </article>
      <Footer content={{ description: content.footer.description, backgroundImageUrl: content.footer.backgroundImageUrl, contact: content.contact }} />
    </main>
  );
}
