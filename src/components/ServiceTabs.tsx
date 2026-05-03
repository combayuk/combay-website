"use client";
import { useState } from "react";
import Link from "next/link";

const tabs = [
  {
    id: "buy",
    label: "Replace or Buy Equipment",
    icon: "🛒",
    heading: "Replace parts to keep operations running.",
    sub: "Buy affordable & reliable equipment to start new operations. Tested items from diverse industries, ready to dispatch. 30-day warranty and after-sales support included.",
    points: [
      "Affordable pricing backed by reliability",
      "30-day warranty on all purchases",
      "30 days after-sales support",
      "ASAP dispatch — items ready to ship",
      "All industries covered",
    ],
    cta1: { label: "Browse Categories", href: "/shop" },
    cta2: { label: "View All Stock", href: "/shop" },
    highlight: {
      label: "Featured Stock",
      items: [
        { name: "Siemens S7-400 PLC Module", cat: "Automation", price: "£1,240", grade: "Grade A" },
        { name: "Thermo Scientific IS5 FT-IR", cat: "Lab & Scientific", price: "£2,450", grade: "Grade A" },
        { name: "ABB ACS550 AC Drive", cat: "Automation", price: "£890", grade: "Grade B" },
        { name: "Cisco 2960 Switch ×3", cat: "IT & Networking", price: "£435", grade: "Grade A" },
      ],
    },
  },
  {
    id: "repair",
    label: "Repair Your Goods",
    icon: "🔧",
    heading: "Replacement costs too high?",
    sub: "Why not try Combay's repair service? Free collection, 40% lower quote than manufacturer & most repairers, 60-day checking warranty. Calibration, Repair, Preventative Maintenance, Installation — all covered.",
    points: [
      "60-day checking warranty on all repairs",
      "40% lower than manufacturer quotes",
      "Free collection & drop-off from your site",
      "Quote within 48 hours",
      "Calibration, repair, PPM & installation",
    ],
    cta1: { label: "Book a Repair", href: "/repair" },
    cta2: { label: "Download Repair Form", href: "/repair#form" },
    highlight: {
      label: "Services Covered",
      items: [
        { name: "Component & Board Repair", cat: "PLCs, Drives, HMIs, Test Gear", price: "From quote", grade: "Free collection" },
        { name: "Calibration", cat: "Multimeters, Oscilloscopes, Pressure", price: "From quote", grade: "Certificate included" },
        { name: "Installation & Setup", cat: "On-site commissioning", price: "From quote", grade: "Engineer visit" },
        { name: "Preventative Maintenance", cat: "Scheduled PPM plans", price: "From quote", grade: "Annual plans" },
      ],
    },
  },
  {
    id: "sell",
    label: "Sell Your Unwanted Goods",
    icon: "💷",
    heading: "Recover cash on surplus stock.",
    sub: "Rather than disposing of it, sell your unwanted or surplus stock to Combay for a fair value — with free collection and payment on the spot. We buy all sorts of industrial and commercial equipment from almost all industries.",
    points: [
      "Instant cash or card payment on collection",
      "Free collection from warehouse, office or home",
      "No stock list needed — free assessment visit",
      "Trade-in option — deduct from your next purchase",
      "We clear anything from single items to full warehouses",
    ],
    cta1: { label: "Sell to Combay", href: "/asset-recovery" },
    cta2: { label: "Download Stock List Template", href: "/asset-recovery#template" },
    highlight: {
      label: "How It Works",
      items: [
        { name: "Send us a disposal request", cat: "Stock list or a few photos", price: "Step 1", grade: "Email us" },
        { name: "We arrange a visit & quote", cat: "If needed, free assessment", price: "Step 2", grade: "24h response" },
        { name: "We collect from your site", cat: "Same day or as preferred", price: "Step 3", grade: "Free collection" },
        { name: "We pay you on collection", cat: "Cash or card, prior to goods leaving", price: "Step 4", grade: "Instant payment" },
      ],
    },
  },
];

export default function ServiceTabs() {
  const [active, setActive] = useState(0);
  const tab = tabs[active];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">

        {/* Section label */}
        <div className="mb-8">
          <p className="font-mono text-xs tracking-widest uppercase text-accent mb-2">What We Do</p>
          <h2 className="font-display font-800 text-3xl lg:text-4xl text-navy-900">
            Everything you need to keep <em className="not-italic text-accent">things running.</em>
          </h2>
        </div>

        {/* Tab buttons */}
        <div className="flex flex-wrap gap-2 mb-8">
          {tabs.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setActive(i)}
              className={`flex items-center gap-2 font-display font-600 text-sm px-5 py-3 rounded-lg border transition-all duration-200 ${
                i === active
                  ? "bg-navy-900 text-white border-navy-900"
                  : "bg-white text-navy-800 border-gray-200 hover:border-navy-900"
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          {/* Left: text */}
          <div>
            <h3 className="font-display font-800 text-2xl text-navy-900 mb-3">{tab.heading}</h3>
            <p className="text-gray-600 leading-relaxed mb-6">{tab.sub}</p>
            <ul className="space-y-2.5 mb-8">
              {tab.points.map((pt) => (
                <li key={pt} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <span className="text-accent mt-0.5 flex-shrink-0">✓</span>
                  {pt}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              <Link
                href={tab.cta1.href}
                className="bg-navy-900 text-white font-display font-700 px-5 py-2.5 rounded hover:bg-navy-800 transition-colors"
              >
                {tab.cta1.label} →
              </Link>
              <Link
                href={tab.cta2.href}
                className="border border-gray-300 text-navy-900 font-display font-600 px-5 py-2.5 rounded hover:border-navy-900 transition-colors"
              >
                {tab.cta2.label}
              </Link>
            </div>
          </div>

          {/* Right: highlight cards */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <p className="font-mono text-xs tracking-widest uppercase text-gray-400 mb-4">{tab.highlight.label}</p>
            <div className="space-y-3">
              {tab.highlight.items.map((item) => (
                <div key={item.name} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="font-display font-600 text-sm text-navy-900">{item.name}</div>
                    <div className="text-gray-400 text-xs mt-0.5">{item.cat}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display font-700 text-accent text-sm">{item.price}</div>
                    <div className="text-gray-400 text-xs">{item.grade}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
