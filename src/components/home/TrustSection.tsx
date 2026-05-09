import { BadgeCheck, Gauge, PackageCheck, PoundSterling } from "lucide-react";

const clients = ["Nutrein", "AG Solutions", "Fiber Logic", "Poole IT", "Transend (UK) Ltd"];
const reasons = [
  { Icon: PoundSterling, title: "Affordability", sub: "Lower costs — always.", desc: "Fair pricing for equipment purchases and repair work, without hidden platform fees.", stat: "40%", sl: "below manufacturer repair" },
  { Icon: BadgeCheck, title: "Reliability", sub: "Warranted on everything.", desc: "Every item sold carries warranty cover and every repair is checked before return.", stat: "30d", sl: "purchase warranty" },
  { Icon: PackageCheck, title: "Extensive Stock", sub: "~10,000 items and growing.", desc: "Industrial, lab, AV and networking stock across multiple categories and manufacturers.", stat: "10K+", sl: "items across categories" },
  { Icon: Gauge, title: "Engineer Founded", sub: "We understand downtime.", desc: "Built for maintenance, operations and procurement teams that need straight answers quickly.", stat: "24h", sl: "typical quote response" },
];

export default function TrustSection({ content }: { content?: { eyebrow?: string; heading?: string; accent?: string; clients?: string[] } }) {
  const visibleClients = Array.isArray(content?.clients) && content.clients.length ? content.clients : clients;
  return (
    <>
      <section className="section-pad bg-[#06101F] text-white">
        <div className="site-shell">
          <div className="mb-10 grid gap-5 lg:grid-cols-[0.85fr_1fr] lg:items-end">
            <div>
              <p className="section-label">{content?.eyebrow || "Why businesses use Combay"}</p>
              <h2 className="mt-2 font-display text-3xl font-900 leading-[1.08] tracking-[-0.03em] text-white lg:text-5xl">
                {content?.heading || "Built by engineers,"} <span className="text-[#F4B83A]">{content?.accent || "for engineers."}</span>
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-white/62 lg:justify-self-end">A procurement-friendly supply partner for teams who need tested stock, repair options and responsive support without unnecessary sales theatre.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {reasons.map(({ Icon, ...reason }) => (
              <article key={reason.title} className="rounded-2xl border border-white/10 bg-white/[0.055] p-6 transition-colors hover:border-[#D99611]/45 hover:bg-white/[0.075]">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-[#D99611]/25 bg-[#D99611]/12 text-[#F4B83A]"><Icon size={20} /></div>
                <h3 className="font-display text-base font-900 text-white">{reason.title}</h3>
                <p className="mt-1 text-xs font-900 uppercase tracking-wide text-[#F4B83A]">{reason.sub}</p>
                <p className="mt-4 min-h-[76px] text-sm leading-7 text-white/60">{reason.desc}</p>
                <div className="mt-5 border-t border-white/10 pt-4">
                  <div className="font-display text-3xl font-900 text-[#F4B83A]">{reason.stat}</div>
                  <p className="mt-1 text-xs text-white/45">{reason.sl}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-9">
        <div className="site-shell text-center">
          <p className="font-mono text-[11px] font-800 uppercase tracking-[0.18em] text-slate-400">Companies supplied</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            {visibleClients.map((client) => <div key={client} className="rounded-md border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-900 text-[#06101F]">{client}</div>)}
          </div>
        </div>
      </section>
    </>
  );
}
