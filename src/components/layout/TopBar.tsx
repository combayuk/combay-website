"use client";
import Link from "next/link";
import { Mail, Phone, ShieldCheck } from "lucide-react";

export default function TopBar() {
  const customerHref = "/portal/login";

  return (
    <div className="bg-[#2D4F7A] text-white text-xs border-b border-white/10">
      <div className="site-shell flex h-9 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4 text-white/75">
          <a href="mailto:sales@combay.co.uk" className="flex min-w-0 items-center gap-1.5 transition-colors hover:text-white">
            <Mail size={12} className="flex-shrink-0 text-[#E8A44A]" />
            <span className="hidden font-800 text-white/45 sm:inline">Orders & quotes</span>
            <span className="truncate">sales@combay.co.uk</span>
          </a>
          <a href="tel:+447340383334" className="hidden items-center gap-1.5 transition-colors hover:text-white sm:flex">
            <Phone size={12} className="text-[#E8A44A]" />
            <span>+44 7340 383334</span>
          </a>
          <span className="hidden items-center gap-1.5 text-white/45 lg:flex">
            <ShieldCheck size={12} className="text-[#E8A44A]" />
            UK based · 30-day warranty · B2B procurement support
          </span>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
          <Link href={customerHref} className="font-800 text-white/80 transition-colors hover:text-white">Customer Portal</Link>
          <Link href="/contact?type=quote" className="hidden rounded-sm bg-[#E8A44A] px-3 py-1 font-900 text-[#2D4F7A] transition-colors hover:bg-[#E8A44A] sm:inline-flex">Request quote</Link>
        </div>
      </div>
    </div>
  );
}
