import Link from "next/link";

const MANUFACTURERS = ["LGC","Thermo Scientific","Rigel Medical","GE","Yamaha","ABB","Siemens","EZIO","GARMIN","Proofvision","Stratasys","Trilogy Communication","OHAUS","EXFO","B&C Electronics","Associated Research","Bambu Lab","Dräger","Honeywell","Adderlink","BARCO","Bentley Nevada","Christie","Electro Freeze","EPSON","VIAVI","JDSU","LOYTEC","Mitsubishi","MSA","Nuway","Probel","Wandel & Golterman"];

export default function Footer() {
  return (
    <footer className="bg-navy-950 text-white/50">
      {/* Ticker */}
      <div className="border-b border-white/5 py-3 overflow-hidden">
        <p className="font-mono text-[9px] text-white/20 tracking-[0.2em] uppercase text-center mb-2">Manufacturers We Source & Supply</p>
        <div className="flex animate-ticker">
          {[...MANUFACTURERS,...MANUFACTURERS].map((m,i)=>(
            <span key={i} className="flex-shrink-0 px-5 text-xs font-display font-600 text-white/30 border-r border-white/5 whitespace-nowrap">{m}</span>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-accent rounded-md flex items-center justify-center">
                <span className="text-navy-950 font-display font-800 text-xs">CB</span>
              </div>
              <span className="font-display font-800 text-white text-lg tracking-tight">COMBAY</span>
            </div>
            <p className="text-xs leading-relaxed text-white/30 max-w-xs mb-5">
              UK-based industrial and commercial equipment specialists. Buy, repair, or sell surplus stock — backed by engineers.
            </p>
            <div className="space-y-1.5 text-xs text-white/40">
              <a href="mailto:info@combay.co.uk"             className="flex items-center gap-2 hover:text-accent transition-colors">✉ info@combay.co.uk</a>
              <a href="mailto:service@combay.co.uk"          className="flex items-center gap-2 hover:text-accent transition-colors">✉ service@combay.co.uk <span className="text-white/20">(repairs)</span></a>
              <a href="mailto:procurement@combay.co.uk"      className="flex items-center gap-2 hover:text-accent transition-colors">✉ procurement@combay.co.uk</a>
              <a href="tel:+447340383334"                    className="flex items-center gap-2 hover:text-accent transition-colors">☎ +44 7340 383334</a>
              <span className="flex items-center gap-2">⌖ Chelmsford, Essex, UK</span>
            </div>
          </div>

          <div>
            <h4 className="font-display font-700 text-white/70 text-xs uppercase tracking-widest mb-3">Shop</h4>
            <ul className="space-y-2 text-xs">
              {["All Categories","Lab & Scientific","Automation & Control","IT & Networking","Test & Detection","Display & AV","Oil & Gas","New Arrivals"].map(l=>(
                <li key={l}><Link href="/shop" className="hover:text-accent transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-700 text-white/70 text-xs uppercase tracking-widest mb-3">Services</h4>
            <ul className="space-y-2 text-xs">
              {[
                {l:"Repair Services",           h:"/repair"},
                {l:"Calibration",               h:"/repair#calibration"},
                {l:"Installation",              h:"/repair#installation"},
                {l:"Asset Recovery",            h:"/asset-recovery"},
                {l:"Request a Quote",           h:"/contact?type=quote"},
                {l:"Download Stock Template",   h:"/stock-list-template.csv"},
              ].map(i=>(
                <li key={i.l}><Link href={i.h} className="hover:text-accent transition-colors">{i.l}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-700 text-white/70 text-xs uppercase tracking-widest mb-3">Company</h4>
            <ul className="space-y-2 text-xs mb-5">
              {[{l:"About",h:"/about"},{l:"Manufacturers",h:"/manufacturers"},{l:"Contact",h:"/contact"},{l:"Portal",h:"/portal"},{l:"FAQs",h:"/faq"}].map(i=>(
                <li key={i.l}><Link href={i.h} className="hover:text-accent transition-colors">{i.l}</Link></li>
              ))}
            </ul>
            <h4 className="font-display font-700 text-white/70 text-xs uppercase tracking-widest mb-3">Policies</h4>
            <ul className="space-y-2 text-xs">
              {[
                {l:"Condition Codes",  h:"/condition-codes"},
                {l:"Returns",         h:"/returns-policy"},
                {l:"Warranty",        h:"/warranty"},
                {l:"Payment",         h:"/payment-policy"},
                {l:"Shipping",        h:"/shipping-policy"},
                {l:"Terms",           h:"/terms"},
                {l:"Privacy",         h:"/privacy-policy"},
              ].map(i=>(
                <li key={i.l}><Link href={i.h} className="hover:text-accent transition-colors">{i.l}</Link></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/20">
          <span>© {new Date().getFullYear()} Combay Ltd. Registered in England & Wales.</span>
          <a href="https://wa.me/447340383334" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[#25D366] hover:text-[#1EBE5A] transition-colors font-display font-600">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            WhatsApp
          </a>
        </div>
      </div>
    </footer>
  );
}
