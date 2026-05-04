import type { Metadata } from "next";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Manufacturers",
  description: "Combay sources and supplies from the world's leading industrial and commercial equipment manufacturers.",
};

const MANUFACTURERS = [
  { name:"Siemens",                cat:"Automation & Control" },
  { name:"ABB",                    cat:"Automation & Control" },
  { name:"Mitsubishi",             cat:"Automation & Control" },
  { name:"Mitsubishi MHI",         cat:"Automation & Control" },
  { name:"Honeywell",              cat:"Automation & Control" },
  { name:"LOYTEC",                 cat:"Automation & Control" },
  { name:"Emerson",                cat:"Automation & Control" },
  { name:"Thermo Scientific",      cat:"Lab & Scientific" },
  { name:"LGC",                    cat:"Lab & Scientific" },
  { name:"OHAUS",                  cat:"Lab & Scientific" },
  { name:"Stratasys",              cat:"Lab & Scientific" },
  { name:"Bambu Lab",              cat:"Lab & Scientific" },
  { name:"Associated Research",    cat:"Test & Detection" },
  { name:"EXFO",                   cat:"Test & Detection" },
  { name:"VIAVI",                  cat:"Test & Detection" },
  { name:"JDSU",                   cat:"Test & Detection" },
  { name:"Wandel & Golterman",     cat:"Test & Detection" },
  { name:"Fluke",                  cat:"Test & Detection" },
  { name:"Tektronix",              cat:"Test & Detection" },
  { name:"Rigel Medical",          cat:"Medical & Safety" },
  { name:"Dräger",                 cat:"Medical & Safety" },
  { name:"MSA",                    cat:"Medical & Safety" },
  { name:"GE",                     cat:"Industrial" },
  { name:"B&C Electronics",        cat:"Industrial" },
  { name:"Nuway",                  cat:"Industrial" },
  { name:"Henry Systems Holland",  cat:"Industrial" },
  { name:"Intec",                  cat:"Industrial" },
  { name:"Yamaha",                 cat:"Audio & Broadcast" },
  { name:"Trilogy Communication",  cat:"Audio & Broadcast" },
  { name:"Probel",                 cat:"Audio & Broadcast" },
  { name:"BARCO",                  cat:"Display & AV" },
  { name:"Christie",               cat:"Display & AV" },
  { name:"EPSON",                  cat:"Display & AV" },
  { name:"Proofvision",            cat:"Display & AV" },
  { name:"Adderlink",              cat:"IT & Networking" },
  { name:"EZIO",                   cat:"IT & Networking" },
  { name:"Cisco",                  cat:"IT & Networking" },
  { name:"Bentley Nevada",         cat:"Oil & Gas" },
  { name:"GARMIN",                 cat:"Navigation & GPS" },
  { name:"Electro Freeze",         cat:"Food Service" },
];

const categories = Array.from(new Set(MANUFACTURERS.map((m) => m.cat)));

export default function ManufacturersPage() {
  return (
    <main>
      <TopBar />
      <Navigation />
      <section className="bg-navy-950 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-mono text-xs tracking-widest uppercase text-accent mb-3">Sourcing</p>
          <h1 className="font-display font-900 text-4xl mb-3">Manufacturers We Source &amp; Supply From</h1>
          <p className="text-gray-400 max-w-xl text-sm">Combay works with leading industrial and commercial manufacturers. Can&apos;t find your brand? Contact us — we may still be able to source it.</p>
        </div>
      </section>
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="space-y-8">
            {categories.map(cat => (
              <div key={cat}>
                <h2 className="font-display font-700 text-sm text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-2 mb-4">{cat}</h2>
                <div className="flex flex-wrap gap-2">
                  {MANUFACTURERS.filter(m => m.cat === cat).map(m => (
                    <Link key={m.name} href={`/shop?manufacturer=${encodeURIComponent(m.name)}`}
                      className="bg-gray-50 border border-gray-200 text-navy-900 font-display font-600 text-sm px-4 py-2 rounded hover:border-accent hover:text-accent hover:bg-accent/5 transition-all">
                      {m.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 bg-navy-900 text-white rounded-xl p-6">
            <h3 className="font-display font-700 text-lg mb-2">Can&apos;t find a manufacturer?</h3>
            <p className="text-gray-300 text-sm mb-4">We source from hundreds of brands. Contact our sourcing team with your specific requirement.</p>
            <a href="mailto:info@combay.co.uk" className="btn-primary inline-block">Contact Sourcing Team →</a>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
