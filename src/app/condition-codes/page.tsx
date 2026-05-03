import TopBar from "@/components/TopBar";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Condition Codes — Combay",
  description: "Understand Combay's item condition codes: New, New (open box), Used, and For Parts / Not Working.",
};

const codes = [
  {
    code: "New",
    badge: "bg-green-50 text-green-700 border-green-200",
    dot: "bg-green-500",
    description: "Item is new in its original packaging. Manufacturer warranty may or may not be available, however our 30-day return guarantee still applies.",
    notes: ["Original packaging intact", "May include manufacturer warranty", "30-day Combay return guarantee applies"],
  },
  {
    code: "New (Open or No Box)",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    description: "Item is new and opened, with or without its original packaging. Manufacturer warranty may or may not be available, however our 30-day return guarantee still applies.",
    notes: ["Item is unused but may have open packaging", "May not include original box", "30-day Combay return guarantee applies"],
  },
  {
    code: "Used",
    badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
    dot: "bg-yellow-500",
    description: "Item is in used condition with its core functions (e.g. power and operation) fully working. Some items are listed in used condition but may have a minor fault or have not been fully tested due to large inventory processing. It is advised to read item descriptions carefully.",
    notes: ["Core functions are operational", "May show cosmetic wear", "Minor untested faults possible — read description", "30-day Combay return guarantee applies"],
  },
  {
    code: "For Parts or Not Working",
    badge: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
    description: "Item may have a minor or major fault or damage. Descriptions clearly mention the type of fault diagnosed and any other testing conducted.",
    notes: ["Has a known fault — details in listing description", "Suitable for parts sourcing or expert repair", "All known faults are disclosed", "30-day return guarantee does not apply unless item is significantly different from description"],
  },
];

export default function ConditionCodesPage() {
  return (
    <main>
      <TopBar />
      <Navigation />

      <section className="py-14 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <p className="font-mono text-xs tracking-widest uppercase text-accent mb-2">Buying Guide</p>
          <h1 className="font-display font-900 text-4xl text-navy-900 mb-2">Condition Codes</h1>
          <p className="text-gray-500 mb-10">
            Every item in our catalogue is assigned a condition code. Understanding these helps you make the right purchase decision.
          </p>

          <div className="space-y-5">
            {codes.map((c) => (
              <div key={c.code} className="border border-gray-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`w-2 h-2 rounded-full ${c.dot} flex-shrink-0`} />
                  <span className={`font-display font-700 text-sm px-3 py-1 rounded border ${c.badge}`}>{c.code}</span>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-4">{c.description}</p>
                <ul className="space-y-1.5">
                  {c.notes.map((n) => (
                    <li key={n} className="flex items-start gap-2 text-xs text-gray-500">
                      <span className="text-accent mt-0.5">·</span> {n}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-5 text-sm text-gray-600">
            <strong className="font-display font-700 text-navy-900 block mb-1">Unsure about an item's condition?</strong>
            Drop us an email at <a href="mailto:info@combay.co.uk" className="text-accent hover:text-accent-dark font-600">info@combay.co.uk</a> quoting the item URL and we'll provide further information. Alternatively, use the <strong>Ask a Question</strong> button on any product page.
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
