import Link from "next/link";

const manufacturers = [
  "LGC", "Thermo Scientific", "Rigel Medical", "GE", "Yamaha", "ABB", "Siemens",
  "EZIO", "GARMIN", "Proofvision", "Stratasys", "Trilogy Communication", "OHAUS",
  "EXFO", "B&C Electronics", "Associated Research", "Bambu Lab", "Dräger", "Honeywell",
  "Adderlink", "BARCO", "Bentley Nevada", "Christie", "Electro Freeze", "EPSON",
  "Henry Systems Holland", "Intec", "VIAVI", "JDSU", "LOYTEC", "Mitsubishi",
  "Mitsubishi MHI", "MSA", "Nuway", "Probel", "Wandel & Golterman",
];

const clients = ["Nutrein", "AG Solutions", "Fiber Logic", "Poole IT", "Transend (UK) Ltd"];

const reasons = [
  {
    icon: "£",
    title: "Affordability",
    sub: "Lower costs — always.",
    desc: "Whether buying or using our repair service, Combay prices are set fairly and competitively. No hidden fees, no inflated margins.",
    stat: "40%",
    statLabel: "cheaper than manufacturer repair quotes, on average",
  },
  {
    icon: "✓",
    title: "Reliability",
    sub: "Warranted on everything.",
    desc: "Every item sold carries a 30-day warranty as standard. Repair jobs get a 60-day checking warranty.",
    stat: "30d",
    statLabel: "warranty on all purchases as standard",
  },
  {
    icon: "⊞",
    title: "Extensive Stock",
    sub: "10,000 items and growing.",
    desc: "Approx 10,000 items from all industries — new, used, and repaired — with new inventory added daily.",
    stat: "10K+",
    statLabel: "items across all industry categories",
  },
  {
    icon: "⚙",
    title: "Engineer Founded",
    sub: "We get it.",
    desc: "Combay was built by engineers who understand operational deadlocks. We're here to help you get back up, fast.",
    stat: "24h",
    statLabel: "average quote response time",
  },
];

export default function TrustSection() {
  const doubled = [...manufacturers, ...manufacturers];

  return (
    <>
      {/* Why Combay */}
      <section className="py-16 bg-navy-950 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-10">
            <p className="font-mono text-xs tracking-widest uppercase text-accent mb-2">Why Businesses Use Combay</p>
            <h2 className="font-display font-800 text-3xl lg:text-4xl">
              Built by engineers, <em className="not-italic text-accent">for engineers.</em>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {reasons.map((r) => (
              <div key={r.title} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-accent/40 transition-colors">
                <div className="w-10 h-10 bg-accent/10 border border-accent/20 rounded-lg flex items-center justify-center text-accent font-display font-700 text-lg mb-4">
                  {r.icon}
                </div>
                <h3 className="font-display font-700 text-white text-sm mb-0.5">{r.title}</h3>
                <p className="text-accent text-xs font-600 mb-2">{r.sub}</p>
                <p className="text-gray-400 text-xs leading-relaxed mb-4">{r.desc}</p>
                <div>
                  <div className="font-display font-800 text-2xl text-accent">{r.stat}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{r.statLabel}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Clients */}
      <section className="py-8 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-mono text-xs tracking-widest uppercase text-gray-400 text-center mb-5">Top Companies We Supply To</p>
          <div className="flex flex-wrap justify-center gap-4">
            {clients.map((c) => (
              <div key={c} className="bg-gray-50 border border-gray-200 rounded px-5 py-2.5 font-display font-600 text-sm text-navy-900">
                {c}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Manufacturer ticker */}
      <section className="py-6 bg-gray-50 border-b border-gray-200 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 mb-3">
          <p className="font-mono text-xs tracking-widest uppercase text-gray-400">Manufacturers We Source & Supply From</p>
        </div>
        <div className="relative">
          <div className="flex animate-[ticker_40s_linear_infinite]">
            {doubled.map((m, i) => (
              <span key={i} className="flex items-center flex-shrink-0 px-5 font-display font-600 text-sm text-navy-800 border-r border-gray-200">
                {m}
              </span>
            ))}
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <Link href="/manufacturers" className="text-accent font-display font-600 text-xs hover:text-accent-dark transition-colors">
            View all manufacturers →
          </Link>
        </div>
      </section>
    </>
  );
}
