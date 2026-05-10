"use client";
import Link from "next/link";
import { PUBLIC_CATEGORY_GROUPS } from "@/lib/categoryTaxonomy";
import type { CmsCategory } from "@/lib/siteContent";

const DEFAULT_INDUSTRIES = PUBLIC_CATEGORY_GROUPS.map((group, index) => ({
  label: group.label,
  slug: group.slug,
  image: group.image,
  icon: "▣",
  iconType: "image",
  description: group.subcategories.length ? `${group.subcategories.length} groups` : "Stock",
  order: index,
  visible: true,
}));

function normaliseCategories(categories?: CmsCategory[]) {
  const source = Array.isArray(categories) && categories.length ? categories : DEFAULT_INDUSTRIES;
  return source
    .filter((category) => category.visible !== false)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .map((category) => ({
      label: category.label,
      slug: category.slug,
      image: category.image,
      icon: category.icon || "▣",
      iconType: category.iconType || "image",
      description: category.description || "Stock",
    }));
}

export default function IndustryStrip({ categories }: { categories?: CmsCategory[] }) {
  const industries = normaliseCategories(categories);
  return (
    <section className="border-y border-slate-200 bg-[#F4F6F8] py-8" data-vcms-collection="categories">
      <div className="site-shell">
        <div className="mb-4 flex items-center gap-3">
          <p className="font-mono text-[11px] font-800 uppercase tracking-[0.18em] text-slate-500">Serving industries</p>
          <div className="h-px flex-1 bg-slate-200" />
          <Link href="/shop" className="text-xs font-900 text-[#C9872F] transition-colors hover:text-[#2D4F7A]">Browse all →</Link>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {industries.map((industry, index) => (
            <Link key={industry.slug} href={`/shop?category=${industry.slug}`} data-vcms-item="categories" data-vcms-index={index} className="group rounded-xl border border-slate-200 bg-white p-3.5 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#E8A44A]/45 hover:shadow-md">
              <span className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-xl bg-white p-2 transition-colors group-hover:bg-[#FFF8E8]">
                {industry.iconType === "library" ? (
                  <span className="text-3xl leading-none" aria-hidden="true">{industry.icon}</span>
                ) : (
                  <img src={industry.image || industry.icon} alt="" className="h-full w-full object-contain" />
                )}
              </span>
              <span className="block text-[11px] font-900 leading-tight text-[#2D4F7A]">{industry.label}</span>
              <span className="mt-1 block truncate font-mono text-[10px] text-slate-400">{industry.description}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
