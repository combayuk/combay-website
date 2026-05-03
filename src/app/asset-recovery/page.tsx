import type { Metadata } from "next";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import AssetForm from "@/components/forms/AssetForm";

export const metadata: Metadata = {
  title: "Asset Recovery",
  description: "Sell your surplus or unwanted industrial equipment to Combay. Free collection, fair value, instant payment. We come to you.",
};

export default function AssetRecoveryPage() {
  return (
    <main>
      <TopBar />
      <Navigation />

      <section className="bg-navy-950 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 max-w-2xl">
          <p className="font-mono text-xs tracking-widest uppercase text-accent mb-3">Asset Recovery Program</p>
          <h1 className="font-display font-900 text-4xl lg:text-5xl mb-4">Recover cash on your <em className="not-italic text-accent">unwanted equipment.</em></h1>
          <p className="text-gray-300 text-lg leading-relaxed mb-8">Fair value for surplus stock. Free collection. Payment before goods leave your site. No stock list needed.</p>
          <div className="flex gap-8 mb-8">
            {[["Same Day","Collection available"],["Cash","On collection"],["Free","No shipping costs"],["24h","Quote response"]].map(([v,l])=>(
              <div key={l}><div className="font-display font-800 text-xl text-accent">{v}</div><div className="text-gray-400 text-xs mt-0.5">{l}</div></div>
            ))}
          </div>
          <a href="#request" className="btn-primary">Start Recovery Request →</a>
        </div>
      </section>

      <section className="py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <p className="section-label">How It Works</p>
          <h2 className="section-heading text-3xl mb-2">It&apos;s that simple.</h2>
          <p className="text-gray-500 mb-8 text-sm">We collect from warehouses, offices, and homes — any location, any quantity.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              ["01","Send a disposal request","Email us with a stock list or a few photos. No formal list needed — we assess for free."],
              ["02","We visit &amp; quote","We arrange a visit if needed and send a fair value quote within 24 hours."],
              ["03","We collect — free","Same day or as per your preference. Warehouse, office, home — anywhere."],
              ["04","You get paid","Payment before goods leave your site. Cash, bank transfer, or card."],
            ].map(([n,t,d])=>(
              <div key={n as string} className="border border-gray-200 rounded-xl p-5">
                <div className="font-mono text-accent text-xs mb-3">{n}</div>
                <h3 className="font-display font-700 text-navy-900 mb-2" dangerouslySetInnerHTML={{__html: t as string}}/>
                <p className="text-gray-500 text-xs leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <p className="section-label">Benefits</p>
          <h2 className="section-heading text-3xl mb-8">With Combay you get:</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              ["💷","Instant payment","Cash or card — paid before goods leave your site."],
              ["🚚","Free collection","We come to you. No shipping, no hassle."],
              ["🔄","Trade-in option","Deduct fair value of your goods from a Combay purchase."],
              ["📋","No stock list needed","Send a few photos or let us assess in person."],
              ["⚖️","Fair market value","We pay honestly. WIN-WIN."],
              ["🏭","Any quantity","Single items to full warehouse clearances."],
            ].map(([icon,t,d])=>(
              <div key={t as string} className="bg-white border border-gray-200 rounded-xl p-5 flex gap-4">
                <span className="text-2xl flex-shrink-0">{icon}</span>
                <div>
                  <h3 className="font-display font-700 text-navy-900 text-sm mb-1">{t}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-navy-900 text-white rounded-2xl p-8 lg:p-10">
            <p className="section-label">Need to Exchange?</p>
            <h2 className="font-display font-800 text-3xl text-white mb-3">We handle trade-ins too.</h2>
            <p className="text-gray-300 mb-6 max-w-xl text-sm leading-relaxed">
              If you have stock to sell and also need equipment from our catalogue, we deduct the fair value of your goods from your purchase. No shipping needed — we drop and collect on the same visit.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/shop" className="btn-primary">Browse Our Stock →</Link>
              <a href="mailto:procurement@combay.co.uk" className="border border-white/30 text-white font-display font-600 text-sm px-5 py-2.5 rounded hover:border-white transition-colors">Email Us</a>
            </div>
          </div>
        </div>
      </section>

      <section id="request" className="py-14 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4">
          <p className="section-label">Get Started</p>
          <h2 className="section-heading text-3xl mb-2">Tell us what you have.</h2>
          <p className="text-gray-500 mb-8 text-sm">We respond within 24 hours. No obligation. All enquiries handled by our procurement team.</p>
          <AssetForm />
        </div>
      </section>

      <Footer />
    </main>
  );
}
