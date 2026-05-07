"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Mail, Phone } from "lucide-react";

export default function TopBar() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const customerHref = session?.user ? "/portal" : "/portal/login";
  const adminHref = role === "ADMIN" ? "/admin" : "/admin-login";

  return (
    <div className="bg-navy-950 text-white text-xs py-2 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-5 min-w-0">
          <a href="mailto:sales@combay.co.uk" className="flex items-center gap-1.5 hover:text-accent transition-colors min-w-0">
            <Mail size={11} className="text-accent flex-shrink-0" />
            <span className="text-white/60 font-display font-600 hidden sm:inline">Order’s/Quotes:</span>
            <span className="truncate">sales@combay.co.uk</span>
          </a>
          <a href="tel:+447340383334" className="hidden sm:flex items-center gap-1.5 hover:text-accent transition-colors">
            <Phone size={11} className="text-steel" />
            <span>+44 7340 383334</span>
          </a>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <Link href={customerHref} className="hover:text-accent transition-colors font-display font-600 whitespace-nowrap">
            Customer Portal
          </Link>
          <span className="text-white/15">|</span>
          <Link href={adminHref} className="hover:text-accent transition-colors font-display font-600 whitespace-nowrap">
            Admin Portal
          </Link>
          <span className="text-white/15 hidden sm:inline">|</span>
          <Link href="/asset-recovery" className="text-accent font-display font-600 hover:text-accent-light transition-colors hidden md:inline">
            Sell Your Stock →
          </Link>
          <Link href="/contact?type=quote" className="bg-accent text-navy-950 font-display font-700 px-3 py-1 rounded hover:bg-accent-dark transition-colors hidden sm:inline">
            Get a Quote
          </Link>
        </div>
      </div>
    </div>
  );
}
