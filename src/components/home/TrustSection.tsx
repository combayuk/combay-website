import Link from "next/link";

const clients = ["Nutrein","AG Solutions","Fiber Logic","Poole IT","Transend (UK) Ltd"];

const reasons = [
  { icon:"£",  title:"Affordability",     sub:"Lower costs — always.",       desc:"Whether buying or using our repair service, Combay prices are set fairly. No hidden fees.",                      stat:"40%",  sl:"cheaper than manufacturer repair" },
  { icon:"✓",  title:"Reliability",       sub:"Warranted on everything.",    desc:"Every item sold carries a 30-day warranty. Repair jobs carry a 60-day checking warranty.",                        stat:"30d",  sl:"warranty on all purchases" },
  { icon:"⊞",  title:"Extensive Stock",   sub:"~10,000 items and growing.",  desc:"Approx 10,000 items from all industries — new, used, and repaired — with new inventory added regularly.",        stat:"10K+", sl:"items across all categories" },
  { icon:"⚙",  title:"Engineer Founded",  sub:"We understand operations.",   desc:"Combay was built by engineers who understand operational deadlocks. We help you get back up fast.",              stat:"24h",  sl:"average quote response time" },
];

export default function TrustSection({ content }: { content?: { eyebrow?: string; heading?: string; accent?: string; clients?: string[] } }) {
  const visibleClients = Array.isArray(content?.clients) && content.clients.length ? content.clients : clients;
  return (
    <>
      <section className="py-16 bg-navy-950 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-10">
            <p className="section-label">{content?.eyebrow || "Why Businesses Use Combay"}</p>
            <h2 className="section-heading text-3xl lg:text-4xl text-white">
              {content?.heading || "Built by engineers,"} <em className="not-italic text-accent">{content?.accent || "for engineers."}</em>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {reasons.map(r => (
              <div key={r.title} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-accent/30 transition-colors">
                <div className="w-9 h-9 bg-accent/10 border border-accent/20 rounded-lg flex items-center justify-center text-accent font-display font-700 text-base mb-4">{r.icon}</div>
                <h3 className="font-display font-700 text-white text-sm mb-0.5">{r.title}</h3>
                <p className="text-accent text-xs font-600 mb-2">{r.sub}</p>
                <p className="text-gray-400 text-xs leading-relaxed mb-4">{r.desc}</p>
                <div className="font-display font-800 text-xl text-accent">{r.stat}</div>
                <div className="text-gray-500 text-xs mt-0.5">{r.sl}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="font-mono text-xs tracking-widest uppercase text-gray-400 mb-5">Top Companies We Supply To</p>
          <div className="flex flex-wrap justify-center gap-3">
            {visibleClients.map(c => (
              <div key={c} className="bg-gray-50 border border-gray-200 rounded px-5 py-2.5 font-display font-600 text-sm text-navy-900">{c}</div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
