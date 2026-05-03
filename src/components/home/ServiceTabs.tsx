"use client";
import { useState } from "react";
import Link from "next/link";

const tabs = [
  {
    id:"buy", label:"Replace or Buy Equipment", icon:"🛒",
    heading:"Replace parts. Start new operations.",
    body:"Affordable, tested equipment from all industries. 30-day warranty on every item. After-sales support included. Dispatch within 48 hours.",
    points:["30-day return to base warranty","30 days after-sales support","~10,000 items across all industries","ASAP dispatch on available stock","New, used & refurbished items listed"],
    cta1:{ label:"Browse Categories", href:"/shop" },
    cta2:{ label:"View All Stock",    href:"/shop" },
    cards:[
      { name:"Siemens S7-400 PLC Module",    cat:"Automation",       price:"£1,240", grade:"Grade A" },
      { name:"Thermo Scientific FT-IR IS5",  cat:"Lab & Scientific", price:"£2,450", grade:"Grade A" },
      { name:"ABB ACS550 AC Drive",          cat:"Automation",       price:"£890",   grade:"Grade B" },
      { name:"Cisco Catalyst 2960 Stack",    cat:"IT & Networking",  price:"£435",   grade:"Grade A" },
    ],
  },
  {
    id:"repair", label:"Repair Your Goods", icon:"🔧",
    heading:"40% lower than manufacturer quotes.",
    body:"Combay's repair service covers calibration, component repair, installation, and preventative maintenance. Free collection from your site. 60-day checking warranty on all jobs. No fix = full refund.",
    points:["60-day checking warranty on all repairs","40% lower quotes than manufacturer / distributor","Free collection and return from your site","Quote within 48 hours of submission","Calibration, PPM & installation all covered"],
    cta1:{ label:"Book a Repair",           href:"/repair" },
    cta2:{ label:"Download Repair Form",    href:"/repair#form" },
    cards:[
      { name:"Component & Board Repair",       cat:"PLCs, Drives, HMIs, Test Gear",   price:"From quote",  grade:"Free collection" },
      { name:"Calibration",                    cat:"Multimeters, Oscilloscopes, Gauges",price:"From quote", grade:"Cert included" },
      { name:"Installation & Setup",           cat:"On-site commissioning",            price:"From quote",  grade:"Engineer visit" },
      { name:"Preventative Maintenance",       cat:"Scheduled PPM plans",             price:"From quote",  grade:"Annual plans" },
    ],
  },
  {
    id:"sell", label:"Sell Your Unwanted Goods", icon:"💷",
    heading:"Cash for your surplus equipment.",
    body:"Rather than disposing of surplus stock, sell it to us. Fair value, free collection, payment before goods leave your site. We handle everything from a single item to a full warehouse clearance.",
    points:["Instant payment on collection (cash or card)","Free collection — warehouse, office, home","No stock list needed — we assess for free","Optional trade-in on your next purchase","Anything from single items to full clearances"],
    cta1:{ label:"Sell to Combay",                href:"/asset-recovery" },
    cta2:{ label:"Download Stock List Template",  href:"/asset-recovery#template" },
    cards:[
      { name:"Submit disposal request",  cat:"Stock list or a few photos",     price:"Step 1", grade:"Email us" },
      { name:"We quote & arrange visit", cat:"Free assessment if needed",       price:"Step 2", grade:"24h response" },
      { name:"We collect — free",        cat:"Same day or per your preference", price:"Step 3", grade:"Any location" },
      { name:"Paid on collection",       cat:"Before goods leave your site",    price:"Step 4", grade:"Cash or card" },
    ],
  },
];

export default function ServiceTabs() {
  const [active, setActive] = useState(0);
  const tab = tabs[active];
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <p className="section-label">What We Do</p>
          <h2 className="section-heading text-3xl lg:text-4xl">
            Everything you need to keep <em className="not-italic text-accent">things running.</em>
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {tabs.map((t, i) => (
            <button key={t.id} onClick={() => setActive(i)}
              className={`flex items-center gap-2 font-display font-600 text-sm px-5 py-2.5 rounded-lg border transition-all duration-150 ${
                i === active ? "bg-navy-900 text-white border-navy-900" : "bg-white text-navy-800 border-gray-200 hover:border-navy-900"
              }`}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <div>
            <h3 className="font-display font-800 text-2xl text-navy-900 mb-3">{tab.heading}</h3>
            <p className="text-gray-600 leading-relaxed mb-6">{tab.body}</p>
            <ul className="space-y-2.5 mb-8">
              {tab.points.map(pt => (
                <li key={pt} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <span className="text-accent mt-0.5 flex-shrink-0 font-700">✓</span>{pt}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              <Link href={tab.cta1.href} className="btn-primary">{tab.cta1.label} →</Link>
              <Link href={tab.cta2.href} className="btn-secondary">{tab.cta2.label}</Link>
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <p className="font-mono text-xs tracking-widest uppercase text-gray-400 mb-4">
              {["Featured Stock","Services Covered","How It Works"][active]}
            </p>
            <div className="space-y-2.5">
              {tab.cards.map(c => (
                <div key={c.name} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="font-display font-600 text-sm text-navy-900">{c.name}</div>
                    <div className="text-gray-400 text-xs mt-0.5">{c.cat}</div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className="font-display font-700 text-accent text-sm">{c.price}</div>
                    <div className="text-gray-400 text-xs">{c.grade}</div>
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
