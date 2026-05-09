import { Gauge, PackageCheck, ShieldCheck, Wrench } from "lucide-react";
import { cmsBackgroundStyle } from "@/lib/cmsBackground";

const clients = ["Nutrein", "AG Solutions", "Fiber Logic", "Poole IT", "Transend (UK) Ltd"];
const reasons = [
  { Icon: PackageCheck, title: "Stock you can act on", desc: "Used and surplus equipment is checked, described clearly and prepared for procurement teams that need fast decisions.", stat: "10K+", sl: "items across categories" },
  { Icon: ShieldCheck, title: "Warranty-led supply", desc: "We avoid vague surplus listings. Items are graded, supplied with clear terms and backed by return-to-base cover where applicable.", stat: "30d", sl: "purchase warranty" },
  { Icon: Wrench, title: "Repair before replace", desc: "Our repair route helps reduce replacement spend on drives, instruments, controls and commercial equipment where repair is practical.", stat: "60d", sl: "repair warranty" },
  { Icon: Gauge, title: "Procurement response", desc: "Straight answers on availability, condition, dispatch, collection, repair route and surplus recovery without unnecessary sales theatre.", stat: "24h", sl: "typical response" },
];

export default function TrustSection({ content }: { content?: { eyebrow?: string; heading?: string; accent?: string; clients?: string[]; backgroundImageUrl?: string } }) {
  const visibleClients = Array.isArray(content?.clients) && content.clients.length ? content.clients : clients;
  return (
    <>
      <section
        className="relative overflow-hidden border-y border-slate-200 bg-[#F8FAFC] text-[#2D4F7A]"
        style={cmsBackgroundStyle(content?.backgroundImageUrl || "linear-gradient(135deg,#FFFFFF 0%,#F8FAFC 64%,#F7E7C5 100%)", "rgba(248,250,252,.94)")}
      >
        <div className="absolute inset-0 opacity-[0.28]" style={{ backgroundImage: "linear-gradient(rgba(45,79,122,.10) 1px, transparent 1px), linear-gradient(90deg, rgba(45,79,122,.10) 1px, transparent 1px)", backgroundSize: "58px 58px" }} />
        <div className="site-shell relative py-14 lg:py-16">
          <div className="grid gap-9 lg:grid-cols-[0.82fr_1fr] lg:items-start">
            <div>
              <p className="section-label">{content?.eyebrow || "Why businesses use Combay"}</p>
              <h2 className="mt-2 font-display text-3xl font-900 leading-[1.06] tracking-[-0.04em] text-[#2D4F7A] lg:text-5xl">
                {content?.heading || "Built by engineers,"} <span className="text-[#C9872F]">{content?.accent || "for engineers."}</span>
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600">
                Combay is built around the realities of maintenance stores, obsolete spares, lab assets and urgent procurement: identify the item, confirm condition, give a practical route, and move quickly.
              </p>
              <div className="mt-7 rounded-2xl border border-[#2D4F7A]/12 bg-white p-5 shadow-sm">
                <p className="font-display text-lg font-900 text-[#2D4F7A]">Specialist supply desk, not a generic marketplace.</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">Buy tested equipment, repair valuable units and recover value from redundant stock through one industrial-focused team.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {reasons.map(({ Icon, ...reason }) => (
                <article key={reason.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#E8A44A]/60 hover:shadow-md">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E8A44A]/35 bg-[#FFF8E8] text-[#C9872F]"><Icon size={19} /></div>
                    <div className="text-right">
                      <div className="font-display text-2xl font-900 leading-none text-[#2D4F7A]">{reason.stat}</div>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-400">{reason.sl}</p>
                    </div>
                  </div>
                  <h3 className="font-display text-base font-900 text-[#2D4F7A]">{reason.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{reason.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-9" data-vcms-collection="trust.clients">
        <div className="site-shell text-center">
          <p className="font-mono text-[11px] font-800 uppercase tracking-[0.18em] text-slate-400">Companies supplied</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            {visibleClients.map((client, index) => <div key={`${client}-${index}`} data-vcms-item="trust.clients" data-vcms-index={index} className="rounded-md border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-900 text-[#2D4F7A]">{client}</div>)}
          </div>
        </div>
      </section>
    </>
  );
}
