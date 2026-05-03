import type { Metadata } from "next";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import RepairForm from "@/components/forms/RepairForm";

export const metadata: Metadata = {
  title: "Repair Services",
  description: "Industrial equipment repair, calibration, installation and PPM. 40% cheaper than manufacturer, free collection, 60-day warranty.",
};

export default function RepairPage() {
  return (
    <main>
      <TopBar />
      <Navigation />

      {/* Hero */}
      <section className="bg-navy-950 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-2xl">
            <p className="font-mono text-xs tracking-widest uppercase text-accent mb-3">Repair Services</p>
            <h1 className="font-display font-900 text-4xl lg:text-5xl mb-4">Don&apos;t replace — <em className="not-italic text-accent">repair instead.</em></h1>
            <p className="text-gray-300 text-lg mb-8 leading-relaxed">
              Our engineers repair, calibrate, and service industrial and commercial equipment at up to 40% below manufacturer cost — with a 60-day warranty on every job.
            </p>
            <div className="flex gap-8 mb-8">
              {[["40%","Below OEM cost"],["60d","Repair warranty"],["48h","Quote turnaround"],["Free","Collection & return"]].map(([v,l])=>(
                <div key={l}><div className="font-display font-800 text-2xl text-accent">{v}</div><div className="text-gray-400 text-xs mt-0.5">{l}</div></div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="#request" className="btn-primary">Get a Free Quote →</a>
              <a href="tel:+447340383334" className="border border-white/30 text-white font-display font-600 px-5 py-2.5 rounded hover:border-white transition-colors">Call Us</a>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <p className="section-label">Our Services</p>
          <h2 className="section-heading text-3xl mb-8">What we repair &amp; service.</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon:"🔧", title:"Component Repair", id:"repair",
                desc:"Board-level repair of PLCs, drives, HMIs, test instruments and scientific equipment. We fix the root cause.",
                items:["PLCs & Controllers","AC / DC Drives","HMI Panels","Test & Measurement","Scientific Instruments"] },
              { icon:"📐", title:"Calibration", id:"calibration",
                desc:"Calibration to manufacturer specification with full traceability certificates for audit and compliance.",
                items:["Multimeters & Clamps","Oscilloscopes","Pressure Gauges","Temperature Probes","Power Analysers"] },
              { icon:"🔩", title:"Installation & Setup", id:"installation",
                desc:"On-site commissioning of new or refurbished equipment, including configuration and operator handover.",
                items:["PLC Programming","Drive Configuration","Network Integration","System Commissioning","Operator Training"] },
              { icon:"🛡", title:"Preventative Maintenance", id:"ppm",
                desc:"Scheduled PPM visits to keep critical equipment running. Reduces emergency breakdowns and extends asset life.",
                items:["Annual PPM Plans","Condition Monitoring","Firmware Updates","Thermal Imaging","Compliance Reports"] },
            ].map(s => (
              <div key={s.id} id={s.id} className="border border-gray-200 rounded-xl p-6 hover:border-accent/40 hover:shadow-sm transition-all">
                <div className="text-2xl mb-3">{s.icon}</div>
                <h3 className="font-display font-700 text-navy-900 mb-2">{s.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed mb-4">{s.desc}</p>
                <ul className="space-y-1">
                  {s.items.map(i=>(
                    <li key={i} className="text-xs text-gray-500 flex items-center gap-1.5"><span className="text-accent">·</span>{i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-14 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <p className="section-label">How It Works</p>
          <h2 className="section-heading text-3xl mb-8">Six steps to a fixed, warranted unit.</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              ["01","Submit a Request","Fill in the form below or email service@combay.co.uk. Tell us what you have and the fault — no obligation."],
              ["02","Receive a Quote","We send a detailed quote within 48 hours. If you proceed, we arrange collection."],
              ["03","Free Collection","Our courier collects from your site at no cost. You receive a tracking number."],
              ["04","Diagnosis & Repair","Our engineers diagnose and repair the fault. We contact you if anything unexpected is found."],
              ["05","Quality Test","Every repaired unit is tested to manufacturer specification before return."],
              ["06","Return & 60-Day Warranty","Your equipment is shipped back with a 60-day checking warranty and full repair report."],
            ].map(([n,t,d])=>(
              <div key={n} className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="font-mono text-accent text-xs mb-3">{n}</div>
                <h3 className="font-display font-700 text-navy-900 mb-2">{t}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 bg-navy-900 text-white rounded-xl p-5 text-sm leading-relaxed">
            <strong className="font-display font-700">No fix, no fee guarantee:</strong> If we are unable to repair for any reason, we offer a free replacement (if we have suitable stock) or a full refund of your repair charges. Collection and return shipping is borne by us.
          </div>
        </div>
      </section>

      {/* Request form */}
      <section id="request" className="py-14 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <p className="section-label">Get a Quote</p>
          <h2 className="section-heading text-3xl mb-2">Request a repair quote.</h2>
          <p className="text-gray-500 mb-8 text-sm">No obligation. We respond within 48 hours. Collection is always free.</p>
          <RepairForm />
        </div>
      </section>

      <Footer />
    </main>
  );
}
