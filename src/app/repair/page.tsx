import TopBar from "@/components/TopBar";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import Link from "next/link";

export const metadata = {
  title: "Repair Services — Combay",
  description: "Industrial equipment repair, calibration, installation and preventative maintenance. 40% cheaper than manufacturer, free collection, 60-day warranty.",
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
            <h1 className="font-display font-900 text-4xl lg:text-5xl mb-4">
              Repair, don't <em className="not-italic text-accent">replace.</em>
            </h1>
            <p className="text-gray-300 text-lg mb-8">
              Our engineers repair, calibrate, and service industrial and commercial equipment at up to 40% less than manufacturer costs — with a 60-day warranty on every job.
            </p>
            <div className="flex gap-8 mb-8">
              {[
                { v: "40%", l: "Cheaper than OEM" },
                { v: "60d", l: "Repair warranty" },
                { v: "48h", l: "Quote turnaround" },
                { v: "Free", l: "Collection & return" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="font-display font-800 text-2xl text-accent">{s.v}</div>
                  <div className="text-gray-400 text-xs mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <a href="#quote" className="bg-accent text-navy-900 font-display font-700 px-5 py-2.5 rounded hover:bg-accent-dark transition-colors">
                Get a Free Quote →
              </a>
              <a href="tel:+447340383334" className="border border-white/30 text-white font-display font-600 px-5 py-2.5 rounded hover:border-white transition-colors">
                Call: +44 7340 383334
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-mono text-xs tracking-widest uppercase text-accent mb-2">Our Services</p>
          <h2 className="font-display font-800 text-3xl text-navy-900 mb-8">What we repair & service.</h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: "🔧",
                title: "Component Repair",
                desc: "Board-level repair of PLCs, drives, HMIs, test instruments and scientific equipment. We fix the root cause, not just the symptom.",
                items: ["PLCs & Controllers", "AC / DC Drives", "HMI Panels", "Test & Measurement", "Scientific Instruments"],
              },
              {
                icon: "📐",
                title: "Calibration",
                desc: "Calibration to manufacturer spec with full certificates. Ideal for audit and compliance requirements.",
                items: ["Multimeters & Clamps", "Oscilloscopes", "Pressure Gauges", "Temperature Probes", "Power Analysers"],
              },
              {
                icon: "🔩",
                title: "Installation & Setup",
                desc: "On-site installation and commissioning of new or refurbished equipment, including configuration and handover.",
                items: ["PLC Programming", "Drive Configuration", "Network Setup", "System Integration", "Operator Training"],
              },
              {
                icon: "🛡",
                title: "Preventative Maintenance",
                desc: "Scheduled maintenance visits to keep critical equipment running. Reduces emergency breakdowns and extends asset life.",
                items: ["Annual PPM Plans", "Condition Monitoring", "Software Updates", "Firmware Flashing", "Thermal Imaging"],
              },
            ].map((s) => (
              <div key={s.title} className="border border-gray-200 rounded-xl p-6 hover:border-accent/40 hover:shadow-sm transition-all">
                <div className="text-2xl mb-3">{s.icon}</div>
                <h3 className="font-display font-700 text-navy-900 mb-2">{s.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed mb-4">{s.desc}</p>
                <ul className="space-y-1">
                  {s.items.map((item) => (
                    <li key={item} className="text-xs text-gray-600 flex items-center gap-1.5">
                      <span className="text-accent text-xs">·</span>{item}
                    </li>
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
          <p className="font-mono text-xs tracking-widest uppercase text-accent mb-2">How It Works</p>
          <h2 className="font-display font-800 text-3xl text-navy-900 mb-8">Six steps to a fixed, warranted unit.</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { n: "01", t: "Submit a Request", d: "Fill in our online form or email us at service@combay.co.uk. Tell us what you have and what the fault is — no obligation." },
              { n: "02", t: "Receive a Quote", d: "We'll send a detailed quote within 48 hours. If you're happy to proceed, we arrange collection." },
              { n: "03", t: "Free Collection", d: "Our courier collects from your site at no cost. You'll get a tracking number and confirmation." },
              { n: "04", t: "Diagnosis & Repair", d: "Our engineers diagnose and repair the fault. We'll contact you if anything unexpected is found." },
              { n: "05", t: "Quality Test", d: "Every repaired unit is tested to manufacturer spec before return. We issue a full test report." },
              { n: "06", t: "Return & Warranty", d: "Your equipment is shipped back with a 60-day checking warranty and full repair documentation." },
            ].map((s) => (
              <div key={s.n} className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="font-mono text-accent text-xs mb-3">{s.n}</div>
                <h3 className="font-display font-700 text-navy-900 mb-2">{s.t}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 bg-navy-900 text-white rounded-xl p-5 text-sm">
            <strong className="font-display font-700">No fix, no fee guarantee:</strong> If we are unable to repair for any reason, we will offer a free replacement (if we have the stock) or a full refund on your repair charges. Collection and return shipping borne by us.
          </div>
        </div>
      </section>

      {/* Quote form */}
      <section id="quote" className="py-14 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <p className="font-mono text-xs tracking-widest uppercase text-accent mb-2">Get a Quote</p>
          <h2 className="font-display font-800 text-3xl text-navy-900 mb-2">Tell us what needs fixing.</h2>
          <p className="text-gray-500 mb-8">Fill in the form and we'll get back to you within 48 hours with a no-obligation quote. Collection is always free.</p>

          <div className="grid sm:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block font-display font-600 text-sm text-navy-900 mb-1.5">First Name *</label>
              <input type="text" className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block font-display font-600 text-sm text-navy-900 mb-1.5">Last Name *</label>
              <input type="text" className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block font-display font-600 text-sm text-navy-900 mb-1.5">Company</label>
              <input type="text" className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block font-display font-600 text-sm text-navy-900 mb-1.5">Email *</label>
              <input type="email" className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block font-display font-600 text-sm text-navy-900 mb-1.5">Phone</label>
              <input type="tel" className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block font-display font-600 text-sm text-navy-900 mb-1.5">Type of Service *</label>
              <select className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-accent">
                <option value="">Select service type...</option>
                <option>Repair</option>
                <option>Calibration</option>
                <option>Installation & Setup</option>
                <option>Preventative Maintenance</option>
                <option>Multiple services</option>
              </select>
            </div>
            <div>
              <label className="block font-display font-600 text-sm text-navy-900 mb-1.5">Equipment Type *</label>
              <select className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-accent">
                <option value="">Select equipment type...</option>
                <option>PLC / Controller</option>
                <option>AC / DC Drive</option>
                <option>HMI Panel</option>
                <option>Test & Measurement</option>
                <option>Scientific Instrument</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block font-display font-600 text-sm text-navy-900 mb-1.5">Manufacturer / Model</label>
              <input type="text" className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-accent" placeholder="e.g. Siemens S7-300" />
            </div>
          </div>
          <div className="mb-5">
            <label className="block font-display font-600 text-sm text-navy-900 mb-1.5">Fault Description *</label>
            <textarea rows={4} className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-accent resize-none" placeholder="Describe the fault or service required..." />
          </div>
          <div className="mb-6">
            <label className="block font-display font-600 text-sm text-navy-900 mb-1.5">Attach Photos / Documents</label>
            <div className="border-2 border-dashed border-gray-200 rounded px-4 py-6 text-center text-sm text-gray-400 hover:border-accent cursor-pointer transition-colors">
              Click to attach photos or documents
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="bg-navy-900 text-white font-display font-700 px-6 py-3 rounded hover:bg-navy-800 transition-colors"
            >
              Send Quote Request →
            </button>
            <p className="text-xs text-gray-400">No obligation · 48h response · Free collection</p>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500 mb-2">Or email us directly at</p>
            <a href="mailto:service@combay.co.uk" className="font-display font-700 text-accent text-lg hover:text-accent-dark transition-colors">
              service@combay.co.uk
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
