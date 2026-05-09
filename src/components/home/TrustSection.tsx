import { Gauge, PackageCheck, ShieldCheck, Wrench } from "lucide-react";
import { cmsBackgroundStyle } from "@/lib/cmsBackground";

const clients = ["Nutrein", "AG Solutions", "Fiber Logic", "Poole IT", "Transend (UK) Ltd"];
const reasons = [
  { Icon: PackageCheck, title: "Stockholding", sub: "Real stock, not catalogue promises.", desc: "We focus on tested equipment that can be inspected, graded and moved quickly when a line, lab or site is waiting.", stat: "10K+", sl: "items across categories" },
  { Icon: ShieldCheck, title: "Tested & warranted", sub: "Confidence before dispatch.", desc: "Items are checked, described clearly and supplied with warranty cover unless the listing states otherwise.", stat: "30d", sl: "purchase warranty" },
  { Icon: Wrench, title: "Repair-first thinking", sub: "Reduce replacement spend.", desc: "Where practical, we help businesses repair drives, instruments, controls and commercial equipment instead of replacing them unnecessarily.", stat: "40%", sl: "below OEM repair target" },
  { Icon: Gauge, title: "Procurement response", sub: "Built for urgent decisions.", desc: "Straight answers on availability, condition, dispatch, repair route and surplus recovery — without unnecessary sales theatre.", stat: "24h", sl: "typical quote response" },
];

const proofPoints = [
  "Industrial automation",
  "Lab & scientific",
  "Test & detection",
  "AV & broadcast",
  "IT & networking",
  "Oil & gas support",
];

export default function TrustSection({ content }: { content?: { eyebrow?: string; heading?: string; accent?: string; clients?: string[]; backgroundImageUrl?: string } }) {
  const visibleClients = Array.isArray(content?.clients) && content.clients.length ? content.clients : clients;
  return (
    <>
      <section
        className="relative overflow-hidden bg-[#2D4F7A] text-white"
        style={cmsBackgroundStyle(content?.backgroundImageUrl || "/images/hero/industrial-automation-bg.svg", "rgba(6,16,31,.92)")}
      >
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
        <div className="absolute -right-24 top-16 hidden h-80 w-80 rounded-full border border-[#E8A44A]/20 lg:block" />
        <div className="site-shell relative py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1fr] lg:items-start">
            <div>
              <p className="section-label">{content?.eyebrow || "Why businesses use Combay"}</p>
              <h2 className="mt-2 font-display text-3xl font-900 leading-[1.06] tracking-[-0.04em] text-white lg:text-5xl">
                {content?.heading || "Built by engineers,"} <span className="text-[#E8A44A]">{content?.accent || "for engineers."}</span>
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-white/64">
                Combay is designed as a specialist supply desk for maintenance, procurement and engineering teams — stockholding, repair route and asset recovery in one place.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2 text-xs font-800 text-white/62 sm:grid-cols-3">
                {proofPoints.map((point) => (
                  <div key={point} className="border border-white/10 bg-white/[0.045] px-3 py-2">{point}</div>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {reasons.map(({ Icon, ...reason }) => (
                <article key={reason.title} className="group border border-white/10 bg-white/[0.055] p-5 transition-colors hover:border-[#E8A44A]/45 hover:bg-white/[0.08]">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center border border-[#E8A44A]/25 bg-[#E8A44A]/12 text-[#E8A44A]"><Icon size={19} /></div>
                    <div className="text-right">
                      <div className="font-display text-2xl font-900 text-[#E8A44A]">{reason.stat}</div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-white/38">{reason.sl}</p>
                    </div>
                  </div>
                  <h3 className="font-display text-base font-900 text-white">{reason.title}</h3>
                  <p className="mt-1 text-xs font-900 uppercase tracking-wide text-[#E8A44A]">{reason.sub}</p>
                  <p className="mt-3 text-sm leading-6 text-white/60">{reason.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-9">
        <div className="site-shell text-center">
          <p className="font-mono text-[11px] font-800 uppercase tracking-[0.18em] text-slate-400">Companies supplied</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            {visibleClients.map((client) => <div key={client} className="rounded-md border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-900 text-[#2D4F7A]">{client}</div>)}
          </div>
        </div>
      </section>
    </>
  );
}
