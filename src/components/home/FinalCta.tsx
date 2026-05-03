import Link from "next/link";

export default function FinalCta() {
  return (
    <section className="py-16 bg-accent">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p className="font-mono text-xs tracking-widest uppercase text-navy-900/50 mb-2">Get Started Today</p>
        <h2 className="font-display font-900 text-3xl lg:text-4xl text-navy-900 mb-4">Ready to keep things running?</h2>
        <p className="text-navy-800 mb-8 max-w-xl mx-auto">
          Whether you need equipment, a repair, or want to recover cash on surplus stock — Combay responds within 24 hours.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/shop" className="bg-navy-900 text-white font-display font-700 px-6 py-3 rounded hover:bg-navy-800 transition-colors">Browse Stock →</Link>
          <Link href="/repair" className="bg-white/25 text-navy-900 border border-navy-900/20 font-display font-700 px-6 py-3 rounded hover:bg-white/40 transition-colors">Book a Repair</Link>
          <Link href="/asset-recovery" className="bg-white/25 text-navy-900 border border-navy-900/20 font-display font-700 px-6 py-3 rounded hover:bg-white/40 transition-colors">Sell Your Stock</Link>
        </div>
      </div>
    </section>
  );
}
