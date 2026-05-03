import TopBar from "@/components/TopBar";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Manufacturers — Combay",
  description: "Combay sources and supplies equipment from the world's leading industrial and commercial manufacturers.",
};

const manufacturers = [
  { name: "Siemens", cat: "Automation & Control" },
  { name: "ABB", cat: "Automation & Control" },
  { name: "Mitsubishi", cat: "Automation & Control" },
  { name: "Mitsubishi MHI", cat: "Automation & Control" },
  { name: "Honeywell", cat: "Automation & Control" },
  { name: "LOYTEC", cat: "Automation & Control" },
  { name: "Thermo Scientific", cat: "Lab & Scientific" },
  { name: "LGC", cat: "Lab & Scientific" },
  { name: "OHAUS", cat: "Lab & Scientific" },
  { name: "Stratasys", cat: "Lab & Scientific" },
  { name: "Bambu Lab", cat: "Lab & Scientific" },
  { name: "Associated Research", cat: "Test & Detection" },
  { name: "EXFO", cat: "Test & Detection" },
  { name: "VIAVI", cat: "Test & Detection" },
  { name: "JDSU", cat: "Test & Detection" },
  { name: "Wandel & Golterman", cat: "Test & Detection" },
  { name: "Rigel Medical", cat: "Medical & Safety" },
  { name: "Dräger", cat: "Medical & Safety" },
  { name: "MSA", cat: "Medical & Safety" },
  { name: "GE", cat: "Industrial" },
  { name: "B&C Electronics", cat: "Industrial" },
  { name: "Nuway", cat: "Industrial" },
  { name: "Henry Systems Holland", cat: "Industrial" },
  { name: "Intec", cat: "Industrial" },
  { name: "Yamaha", cat: "Audio & Broadcast" },
  { name: "Trilogy Communication", cat: "Audio & Broadcast" },
  { name: "Probel", cat: "Audio & Broadcast" },
  { name: "BARCO", cat: "Display & AV" },
  { name: "Christie", cat: "Display & AV" },
  { name: "EPSON", cat: "Display & AV" },
  { name: "Proofvision", cat: "Display & AV" },
  { name: "Adderlink", cat: "IT & Networking" },
  { name: "EZIO", cat: "IT & Networking" },
  { name: "Bentley Nevada", cat: "Oil & Gas" },
  { name: "GARMIN", cat: "Navigation" },
  { name: "Electro Freeze", cat: "Food Service" },
];

const categories = Array.from(new Set(manufacturers.map((m) => m.cat)));

export default function ManufacturersPage() {
  return (
    <main>
      <TopBar />
      <Navigation />

      <section className="py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-mono text-xs tracking-widest uppercase text-accent mb-2">Sourcing</p>
          <h1 className="font-display font-900 text-4xl text-navy-900 mb-2">Manufacturers We Source & Supply From</h1>
          <p className="text-gray-500 mb-10 max-w-xl">
            Combay works with the world's leading industrial and commercial manufacturers. Can't find a brand you need? Contact us — we may still be able to source it.
          </p>

          <div className="space-y-8">
            {categories.map((cat) => (
              <div key={cat}>
                <h2 className="font-display font-700 text-navy-900 text-sm border-b border-gray-200 pb-2 mb-4">{cat}</h2>
                <div className="flex flex-wrap gap-2">
                  {manufacturers
                    .filter((m) => m.cat === cat)
                    .map((m) => (
                      <a
                        key={m.name}
                        href={`/shop?manufacturer=${encodeURIComponent(m.name)}`}
                        className="bg-gray-50 border border-gray-200 text-navy-900 font-display font-600 text-sm px-4 py-2 rounded hover:border-accent hover:bg-accent/5 hover:text-accent transition-all"
                      >
                        {m.name}
                      </a>
                    ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 bg-navy-900 text-white rounded-xl p-6">
            <h3 className="font-display font-700 text-lg mb-2">Can't find a manufacturer?</h3>
            <p className="text-gray-300 text-sm mb-4">
              We source from hundreds of brands across all industries. If you need a specific part or piece of equipment from a manufacturer not listed, contact our sourcing team.
            </p>
            <a href="mailto:info@combay.co.uk" className="bg-accent text-navy-900 font-display font-700 px-5 py-2.5 rounded hover:bg-accent-dark transition-colors inline-block">
              Contact Sourcing Team →
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
