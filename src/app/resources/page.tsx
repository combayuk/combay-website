import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, PlayCircle, Search, Wrench } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import { getSiteContent } from "@/lib/siteContent";
import { listResources } from "@/lib/resources";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resources",
  description: "Technical guides, product demonstrations, installation notes and working product videos from Combay.",
};

function typeLabel(type: string) {
  return String(type || "technical-article").replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ResourceCard({ item }: { item: any }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#E8A44A]/60 hover:shadow-md">
      <Link href={`/resources/${item.slug}`} className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-slate-100">
        {item.coverImageUrl ? <img src={item.coverImageUrl} alt={item.title} className="h-full w-full object-cover" /> : <BookOpen className="text-slate-300" size={44} />}
        {item.videoUrl ? <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2 py-1 text-[11px] font-900 text-[#2D4F7A]"><PlayCircle className="mr-1 inline" size={13} /> Video</span> : null}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="mb-2 text-[11px] font-900 uppercase tracking-wide text-[#C9872F]">{typeLabel(item.type)}</p>
        <Link href={`/resources/${item.slug}`} className="font-display text-base font-900 leading-5 text-[#1C334F] hover:text-[#2D4F7A]">{item.title}</Link>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{item.excerpt || "Technical resource from Combay."}</p>
        <div className="mt-auto pt-4">
          <Link href={`/resources/${item.slug}`} className="text-xs font-900 text-[#2D4F7A] hover:text-[#C9872F]">Read resource →</Link>
        </div>
      </div>
    </article>
  );
}

export default async function ResourcesPage({ searchParams }: { searchParams?: { q?: string; type?: string; page?: string } }) {
  const content = await getSiteContent();
  const result = await listResources({ publicOnly: true, query: searchParams?.q || "", type: searchParams?.type || "all", page: Number(searchParams?.page || 1), pageSize: 24 });
  const data = result.ok ? result.data : { resources: [], total: 0, page: 1, totalPages: 1 };
  const resources = data.resources || [];

  return (
    <main className="bg-slate-50">
      <TopBar />
      <Navigation />
      <section className="bg-[#1C334F] text-white">
        <div className="site-shell py-10 lg:py-12">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#E8A44A]">Resources</p>
          <div className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <h1 className="font-display text-3xl font-900 leading-tight lg:text-5xl">Technical guides, product videos and installation notes.</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/70">Browse practical resources for used industrial, laboratory, automation, AV and test equipment. Admin can publish articles, images and working-product videos from the Resources tab.</p>
            </div>
            <form action="/resources" className="rounded-2xl border border-white/10 bg-white/8 p-3">
              <label className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-slate-700">
                <Search size={16} className="text-[#C9872F]" />
                <input name="q" defaultValue={searchParams?.q || ""} placeholder="Search guides, SKUs or topics" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
              </label>
            </form>
          </div>
        </div>
      </section>

      <section className="site-shell py-8">
        {resources.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {resources.map((item: any) => <ResourceCard key={item.id} item={item} />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
            <Wrench className="mx-auto mb-3 text-slate-300" size={40} />
            <p className="font-display text-lg font-900 text-[#1C334F]">No resources published yet.</p>
            <p className="mt-2 text-sm text-slate-500">Published admin resources will appear here.</p>
          </div>
        )}
      </section>
      <Footer content={{ description: content.footer.description, backgroundImageUrl: content.footer.backgroundImageUrl, contact: content.contact }} />
    </main>
  );
}
