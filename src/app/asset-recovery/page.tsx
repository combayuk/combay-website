import TopBar from "@/components/TopBar";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Asset Recovery — Combay",
  description: "Sell your surplus or unwanted industrial equipment to Combay. Free collection, instant payment, fair value. We come to you.",
};

export default function AssetRecoveryPage() {
  return (
    <main>
      <TopBar />
      <Navigation />

      {/* Hero */}
      <section className="bg-navy-950 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-2xl">
            <p className="font-mono text-xs tracking-widest uppercase text-accent mb-3">Asset Recovery Program</p>
            <h1 className="font-display font-900 text-4xl lg:text-5xl mb-4">
              Recover cash on your <em className="not-italic text-accent">unwanted stock.</em>
            </h1>
            <p className="text-gray-300 text-lg mb-8">
              Rather than disposing of surplus equipment, sell it to Combay for a fair value. We collect for free and pay you before goods leave your site.
            </p>
            <div className="flex gap-8 mb-8">
              {[
                { v: "Same Day", l: "Collection available" },
                { v: "Cash", l: "On collection" },
                { v: "Free", l: "No shipping costs" },
                { v: "24h", l: "Quote response" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="font-display font-800 text-xl text-accent">{s.v}</div>
                  <div className="text-gray-400 text-xs mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
            <a href="mailto:procurement@combay.co.uk" className="inline-flex items-center bg-accent text-navy-900 font-display font-700 px-5 py-2.5 rounded hover:bg-accent-dark transition-colors">
              Email procurement@combay.co.uk →
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-mono text-xs tracking-widest uppercase text-accent mb-2">How It Works</p>
          <h2 className="font-display font-800 text-3xl text-navy-900 mb-2">It's that simple.</h2>
          <p className="text-gray-500 mb-8">We don't just collect from warehouses — we collect from your home, office, or any place where goods are stored.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { n: "01", t: "Send a disposal request", d: "Email us with a stock list or a few pictures roughly showing your stock. No formal list needed." },
              { n: "02", t: "We arrange a visit & quote", d: "We arrange a visit if needed and send you a fair value quote within 24 hours." },
              { n: "03", t: "We collect", d: "Usually same day or as per your preference. From warehouses, offices, homes — anywhere." },
              { n: "04", t: "We pay you", d: "Payment is made prior to your equipment leaving. Cash, bank transfer, or card." },
            ].map((s) => (
              <div key={s.n} className="border border-gray-200 rounded-xl p-5">
                <div className="font-mono text-accent text-xs mb-3">{s.n}</div>
                <h3 className="font-display font-700 text-navy-900 mb-2">{s.t}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-14 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-mono text-xs tracking-widest uppercase text-accent mb-2">Why Combay Makes It Easy</p>
          <h2 className="font-display font-800 text-3xl text-navy-900 mb-8">You get:</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: "💷", t: "Instant payment on collection", d: "Cash or Card — paid before goods leave your site." },
              { icon: "🚚", t: "No shipping needed", d: "We come to collect. You don't lift a finger." },
              { icon: "🔄", t: "Optional trade-in", d: "We deduct the fair value of your goods from your next purchase with us." },
              { icon: "📋", t: "No stock list? No problem", d: "We offer a free visit and assess the goods ourselves." },
              { icon: "⚖️", t: "Fair value", d: "We pay you a fair market value for your stock. WIN-WIN." },
              { icon: "🏭", t: "Any quantity", d: "From a few surplus items to full warehouse clearances including liquidation/administration." },
            ].map((b) => (
              <div key={b.t} className="bg-white border border-gray-200 rounded-xl p-5 flex gap-4">
                <span className="text-2xl flex-shrink-0">{b.icon}</span>
                <div>
                  <h3 className="font-display font-700 text-navy-900 text-sm mb-1">{b.t}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{b.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Exchange section */}
      <section className="py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-navy-900 text-white rounded-2xl p-8 lg:p-10">
            <p className="font-mono text-xs tracking-widest uppercase text-accent mb-3">Need to Exchange Instead?</p>
            <h2 className="font-display font-800 text-3xl mb-3">We also handle exchanges.</h2>
            <p className="text-gray-300 mb-6 max-w-xl">
              If you have stock to sell and also need some of our equipment, we deduct the fair value quote from your total purchase value. No shipping needed — we drop and collect the same day!
            </p>
            <div className="flex gap-3">
              <a href="/shop" className="bg-accent text-navy-900 font-display font-700 px-5 py-2.5 rounded hover:bg-accent-dark transition-colors">
                Browse Our Stock →
              </a>
              <a href="mailto:procurement@combay.co.uk" className="border border-white/30 text-white font-display font-600 px-5 py-2.5 rounded hover:border-white transition-colors">
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Contact / CTA */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="font-mono text-xs tracking-widest uppercase text-accent mb-2">Get Started</p>
          <h2 className="font-display font-800 text-3xl text-navy-900 mb-3">Ready to sell your stock?</h2>
          <p className="text-gray-500 mb-6">
            Email us at <strong>procurement@combay.co.uk</strong> with your disposal request and we will get back to you within 24 hours.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="mailto:procurement@combay.co.uk" className="bg-navy-900 text-white font-display font-700 px-6 py-3 rounded hover:bg-navy-800 transition-colors">
              Email procurement@combay.co.uk →
            </a>
            <a
              id="template"
              href="/stock-list-template.xlsx"
              className="border border-gray-300 text-navy-900 font-display font-600 px-6 py-3 rounded hover:border-navy-900 transition-colors"
            >
              Download Stock List Template
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
