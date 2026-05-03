import type { Metadata } from "next";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Combay",
  description: "Combay is a UK-based industrial equipment specialist. Buy, repair or sell surplus equipment — backed by engineers who understand operations.",
};

export default function AboutPage() {
  return (
    <main>
      <TopBar />
      <Navigation />
      <section className="bg-navy-950 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 max-w-2xl">
          <p className="font-mono text-xs tracking-widest uppercase text-accent mb-3">About Combay</p>
          <h1 className="font-display font-900 text-4xl lg:text-5xl mb-4">Engineer founded. <em className="not-italic text-accent">Operationally focused.</em></h1>
          <p className="text-gray-300 text-lg leading-relaxed">Combay was built by engineers who understand what happens when critical equipment stops running. We built the platform we always wished existed when dealing with equipment sourcing, repair, and disposal.</p>
        </div>
      </section>
      <section className="py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-12">
          <div>
            <p className="section-label">Our Story</p>
            <h2 className="section-heading text-3xl mb-5">Built to solve a real problem.</h2>
            <div className="space-y-4 text-gray-600 text-sm leading-relaxed">
              <p>Industrial operations depend on equipment that is often obsolete, expensive to replace, or slow to source through traditional channels. Lead times from manufacturers and distributors frequently run into weeks or months — unacceptable when a production line or lab is down.</p>
              <p>Combay was founded to offer a better route: a specialist platform where businesses can quickly source tested, warranted industrial and commercial equipment at fair prices — or have it repaired by engineers who actually understand the equipment.</p>
              <p>We stock approximately 10,000 items across all major industrial categories. Every item is inspected, graded, and warranted before it leaves us.</p>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { n:"~10,000", l:"Items in stock across all industries" },
              { n:"30 Days", l:"Warranty on every item sold" },
              { n:"60 Days", l:"Checking warranty on every repair" },
              { n:"40%",     l:"Lower than manufacturer repair quotes" },
            ].map(s => (
              <div key={s.n} className="flex items-center gap-5 bg-gray-50 border border-gray-200 rounded-xl p-5">
                <div className="font-display font-900 text-3xl text-accent w-24 flex-shrink-0">{s.n}</div>
                <div className="font-display font-600 text-navy-900">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-14 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <p className="section-label">What We Do</p>
          <h2 className="section-heading text-3xl mb-8">Three ways we help businesses.</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon:"🛒", title:"Buy Equipment",    body:"Source tested industrial and commercial equipment across all categories. New, used, and refurbished items with 30-day warranty.", href:"/shop",           cta:"Browse Stock" },
              { icon:"🔧", title:"Repair Equipment", body:"Cost-effective repair service with free collection, 60-day warranty, and quotes within 48 hours. 40% below manufacturer pricing.", href:"/repair",         cta:"Book a Repair" },
              { icon:"💷", title:"Sell Surplus Stock",body:"Recover cash on unwanted or surplus equipment. Fair value, free collection, payment before goods leave your site.",            href:"/asset-recovery", cta:"Sell to Combay" },
            ].map(s => (
              <div key={s.title} className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="text-3xl mb-4">{s.icon}</div>
                <h3 className="font-display font-700 text-navy-900 mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">{s.body}</p>
                <Link href={s.href} className="btn-secondary text-xs py-2 px-4">{s.cta} →</Link>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-12 bg-accent">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-display font-900 text-3xl text-navy-900 mb-3">Ready to work with us?</h2>
          <p className="text-navy-800 mb-6 text-sm">Browse our stock, book a repair, or sell your surplus equipment today.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/shop"  className="bg-navy-900 text-white font-display font-700 px-6 py-3 rounded hover:bg-navy-800 transition-colors">Browse Stock →</Link>
            <Link href="/contact" className="bg-white/25 border border-navy-900/20 text-navy-900 font-display font-700 px-6 py-3 rounded hover:bg-white/40 transition-colors">Contact Us</Link>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
