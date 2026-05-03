"use client";
import { useState } from "react";
import Link from "next/link";
import { Input, Textarea, Select } from "@/components/ui/FormField";

const STEPS = [
  { n:"01", t:"Submit Request",        d:"Fill our online form or email service@combay.co.uk. Tell us what you have and the fault — no obligation." },
  { n:"02", t:"Quote Within 48 Hours", d:"We send a detailed repair quote. All-inclusive pricing, no hidden charges." },
  { n:"03", t:"Book & Make Payment",   d:"Confirm the repair and make payment. We then arrange collection at your convenience." },
  { n:"04", t:"Free Collection",       d:"Our courier collects from your site at zero cost. You get a tracking number immediately." },
  { n:"05", t:"Repair & Test",         d:"Engineers diagnose, repair, and fully test to manufacturer specification." },
  { n:"06", t:"Returned with Warranty",d:"Your equipment returns with a 60-day checking warranty and a full test report." },
];

const SERVICES = [
  { icon:"🔧", title:"Component Repair",   desc:"Board-level repair of PLCs, drives, HMIs, test instruments and scientific equipment. Root-cause diagnosis, not patch fixes.", items:["PLCs & Controllers","AC / DC Drives","HMI Panels","Test & Measurement","Scientific Instruments","Power Supplies"] },
  { icon:"📐", title:"Calibration",         desc:"Full calibration to manufacturer specification with traceable certificates. Ideal for audit and compliance.",                   items:["Multimeters","Oscilloscopes","Pressure Gauges","Temperature Probes","Power Analysers","Detectors"] },
  { icon:"🔩", title:"Installation & Setup",desc:"On-site installation and commissioning including configuration, integration and operator handover.",                          items:["PLC Programming","Drive Configuration","Network Commissioning","System Integration","Operator Training","SCADA Setup"] },
  { icon:"🛡", title:"Preventative Maintenance",desc:"Scheduled site visits to catch faults before they cause downtime. Reduces emergency costs and extends equipment life.",     items:["Annual PPM Plans","Condition Monitoring","Firmware Updates","Thermal Imaging","Cleaning & Inspection","Compliance Reporting"] },
];

export default function RepairContent() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div>
      {/* Hero */}
      <section className="bg-navy-950 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-2xl">
            <p className="font-mono text-xs tracking-widest uppercase text-accent mb-3">Repair Services</p>
            <h1 className="font-display font-900 text-4xl lg:text-5xl mb-4 leading-tight">
              Repair, don&apos;t <em className="not-italic text-accent">replace.</em>
            </h1>
            <p className="text-gray-300 text-lg mb-8 leading-relaxed">
              Combay engineers repair, calibrate, and maintain industrial and commercial equipment at up to 40% below manufacturer costs — with a 60-day warranty on every completed job.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8">
              {[{ v:"40%", l:"Cheaper than OEM" },{ v:"60d", l:"Repair warranty" },{ v:"48h", l:"Quote turnaround" },{ v:"Free", l:"Collection & return" }].map(s => (
                <div key={s.l}>
                  <div className="font-display font-800 text-2xl text-accent">{s.v}</div>
                  <div className="text-gray-400 text-xs mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="#quote" className="bg-accent text-navy-900 font-display font-700 px-6 py-3 rounded hover:bg-accent-dark transition-colors">Get a Free Quote →</a>
              <a href="tel:+447340383334" className="border border-white/30 text-white font-display font-600 px-6 py-3 rounded hover:border-white/60 transition-colors">Call +44 7340 383334</a>
            </div>
          </div>
        </div>
      </section>

      {/* Services grid */}
      <section className="py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-mono text-xs tracking-widest uppercase text-accent mb-2">What We Cover</p>
          <h2 className="font-display font-800 text-3xl text-navy-900 mb-8">All-in-one repair capability.</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SERVICES.map(s => (
              <div key={s.title} className="border border-gray-200 rounded-xl p-5 hover:border-accent/40 hover:shadow-sm transition-all">
                <div className="text-2xl mb-3">{s.icon}</div>
                <h3 className="font-display font-700 text-navy-900 text-sm mb-2">{s.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed mb-3">{s.desc}</p>
                <ul className="space-y-1">
                  {s.items.map(item => (
                    <li key={item} className="text-xs text-gray-500 flex items-center gap-1.5"><span className="text-accent">·</span>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-14 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-mono text-xs tracking-widest uppercase text-accent mb-2">The Process</p>
          <h2 className="font-display font-800 text-3xl text-navy-900 mb-8">Six steps to a fixed, warranted unit.</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {STEPS.map(s => (
              <div key={s.n} className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="font-mono text-accent text-xs mb-2">{s.n}</div>
                <h3 className="font-display font-700 text-navy-900 mb-1.5">{s.t}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 bg-navy-900 text-white rounded-xl p-5">
            <strong className="font-display font-700">No fix, no fee guarantee: </strong>
            <span className="text-gray-300 text-sm">If we cannot repair your equipment, we will offer a free replacement (if available in stock) or a full refund of your repair payment. Collection and return shipping is covered by Combay.</span>
          </div>
        </div>
      </section>

      {/* Quote Form */}
      <section id="quote" className="py-14 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <p className="font-mono text-xs tracking-widest uppercase text-accent mb-2">Request a Quote</p>
          <h2 className="font-display font-800 text-3xl text-navy-900 mb-2">Tell us what needs fixing.</h2>
          <p className="text-gray-500 mb-8 text-sm">No-obligation. We respond within 48 hours. Collection is always free.</p>

          {submitted ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
              <div className="text-4xl mb-3">✓</div>
              <h3 className="font-display font-700 text-green-800 text-xl mb-2">Request Received</h3>
              <p className="text-green-700 text-sm">We&apos;ll get back to you within 48 hours with a quote. Check your inbox for a confirmation email.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="First Name" required placeholder="John" />
                <Input label="Last Name" required placeholder="Smith" />
                <Input label="Email Address" type="email" required placeholder="john@company.com" />
                <Input label="Phone" type="tel" placeholder="+44 7700 000000" />
                <Input label="Company" placeholder="Your company name" />
                <Select
                  label="Type of Service"
                  required
                  options={[
                    { value:"", label:"Select service..." },
                    { value:"repair", label:"Repair" },
                    { value:"calibration", label:"Calibration" },
                    { value:"installation", label:"Installation & Setup" },
                    { value:"ppm", label:"Preventative Maintenance" },
                    { value:"multiple", label:"Multiple services" },
                  ]}
                />
                <Select
                  label="Equipment Type"
                  required
                  options={[
                    { value:"", label:"Select type..." },
                    { value:"plc", label:"PLC / Controller" },
                    { value:"drive", label:"AC / DC Drive" },
                    { value:"hmi", label:"HMI Panel" },
                    { value:"test", label:"Test & Measurement" },
                    { value:"scientific", label:"Scientific Instrument" },
                    { value:"other", label:"Other" },
                  ]}
                />
                <Input label="Manufacturer / Model" placeholder="e.g. Siemens S7-400" />
              </div>
              <Textarea
                label="Fault Description"
                required
                rows={4}
                placeholder="Describe the fault in as much detail as possible..."
              />
              <div>
                <label className="block font-display font-600 text-sm text-navy-900 mb-1.5">Photos / Documents (optional)</label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center text-sm text-gray-400 hover:border-accent cursor-pointer transition-colors">
                  Click to attach photos or documents
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-navy-900 text-white font-display font-700 px-6 py-3 rounded hover:bg-navy-800 transition-colors disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send Repair Request →"}
                </button>
                <p className="text-xs text-gray-400">No obligation · Free collection · 48h response</p>
              </div>
              <p className="text-xs text-gray-400">
                Or email directly: <a href="mailto:service@combay.co.uk" className="text-accent hover:text-accent-dark font-600">service@combay.co.uk</a>
              </p>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
