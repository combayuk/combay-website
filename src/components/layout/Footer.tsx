import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { cmsBackgroundStyle } from "@/lib/cmsBackground";

type FooterContent = { description?: string; backgroundImageUrl?: string; contact?: { salesEmail?: string; infoEmail?: string; phone?: string; location?: string; whatsapp?: string } };

const shopLinks = ["All Categories", "Lab & Scientific", "Automation & Control", "IT & Networking", "Test & Detection", "Display & AV", "Oil & Gas", "New Arrivals"];
const serviceLinks = [
  { label: "Repair Services", href: "/repair" },
  { label: "Calibration", href: "/repair#calibration" },
  { label: "Installation", href: "/repair#installation" },
  { label: "Preventative Maintenance", href: "/repair#ppm" },
  { label: "Asset Recovery", href: "/asset-recovery" },
  { label: "Request a Quote", href: "/contact" },
];
const companyLinks = [
  { label: "About Us", href: "/about" },
  { label: "Manufacturers", href: "/manufacturers" },
  { label: "Contact", href: "/contact" },
  { label: "Customer Portal", href: "/portal" },
  { label: "FAQs", href: "/faq" },
];
const policyLinks = [
  { label: "Condition Codes", href: "/condition-codes" },
  { label: "Returns Policy", href: "/returns-policy" },
  { label: "Warranty", href: "/warranty" },
  { label: "Payment Policy", href: "/payment-policy" },
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy-policy" },
];

function LinkList({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h4 className="mb-3 font-display text-sm font-900 text-white">{title}</h4>
      <ul className="space-y-1.5 text-sm">
        {links.map((link) => <li key={link.label}><Link href={link.href} className="text-white/55 transition-colors hover:text-[#E8A44A]">{link.label}</Link></li>)}
      </ul>
    </div>
  );
}

export default function Footer({ content }: { content?: FooterContent }) {
  const contact = content?.contact || {};
  const sales = contact.salesEmail || "sales@combay.co.uk";
  const info = contact.infoEmail || "info@combay.co.uk";
  const phone = contact.phone || "+44 7340 383334";
  const location = contact.location || "Chelmsford, Essex, UK";
  return (
    <footer className="bg-[#2D4F7A] text-white" style={cmsBackgroundStyle(content?.backgroundImageUrl, "rgba(6,16,31,.96)")}>
      <div className="site-shell py-10 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_2fr]">
          <div>
            <Link href="/" className="inline-flex items-center">
              <img src="/images/combay-footer-logo.svg" alt="Combay" className="h-20 w-auto max-w-[320px] object-contain" />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/58">{content?.description || "UK-based industrial and commercial equipment specialists. Buy, repair, or sell surplus stock — backed by engineers."}</p>
            <div className="mt-5 space-y-2.5 text-sm text-white/65">
              <a href={`mailto:${sales}`} className="flex items-center gap-2 transition-colors hover:text-[#E8A44A]"><Mail size={15} className="text-[#E8A44A]" /> Orders / Quotes: {sales}</a>
              <a href={`mailto:${info}`} className="flex items-center gap-2 transition-colors hover:text-[#E8A44A]"><Mail size={15} className="text-[#E8A44A]" /> General / Media: {info}</a>
              <a href={`tel:${phone}`} className="flex items-center gap-2 transition-colors hover:text-[#E8A44A]"><Phone size={15} className="text-[#E8A44A]" /> {phone}</a>
              <span className="flex items-center gap-2"><MapPin size={15} className="text-[#E8A44A]" /> {location}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div>
              <h4 className="mb-3 font-display text-sm font-900 text-white">Shop</h4>
              <ul className="space-y-1.5 text-sm">{shopLinks.map((label) => <li key={label}><Link href="/shop" className="text-white/55 transition-colors hover:text-[#E8A44A]">{label}</Link></li>)}</ul>
            </div>
            <LinkList title="Services" links={serviceLinks} />
            <LinkList title="Company" links={companyLinks} />
            <LinkList title="Policies" links={policyLinks} />
          </div>
        </div>
        <div className="mt-9 flex flex-col gap-3 border-t border-white/10 pt-5 text-xs text-white/38 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Combay Ltd. All rights reserved. Registered in England & Wales.</span>
          <a href={`https://wa.me/${contact.whatsapp || "447340383334"}`} target="_blank" rel="noopener noreferrer" className="font-900 text-[#25D366] transition-colors hover:text-[#7EF0A2]">Chat on WhatsApp</a>
        </div>
      </div>
    </footer>
  );
}
