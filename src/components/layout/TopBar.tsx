"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Mail, Phone, ShieldCheck } from "lucide-react";

export default function TopBar() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const customerHref = session?.user ? "/portal" : "/portal/login";
  const adminHref = role === "ADMIN" ? "/admin" : "/admin-login";

  return (
    <div className="bg-[#06101F] text-white text-xs border-b border-white/10">
      <div className="site-shell flex h-9 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4 text-white/75">
          <a href="mailto:sales@combay.co.uk" className="flex min-w-0 items-center gap-1.5 transition-colors hover:text-white">
            <Mail size={12} className="flex-shrink-0 text-[#D99611]" />
            <span className="hidden font-800 text-white/45 sm:inline">Orders & quotes</span>
            <span className="truncate">sales@combay.co.uk</span>
          </a>
          <a href="tel:+447340383334" className="hidden items-center gap-1.5 transition-colors hover:text-white sm:flex">
            <Phone size={12} className="text-[#D99611]" />
            <span>+44 7340 383334</span>
          </a>
          <span className="hidden items-center gap-1.5 text-white/45 lg:flex">
            <ShieldCheck size={12} className="text-[#D99611]" />
            UK based · 30-day warranty · B2B procurement support
          </span>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
          <Link href={customerHref} className="font-800 text-white/80 transition-colors hover:text-white">Customer Portal</Link>
          <span className="text-white/15">|</span>
          <Link href={adminHref} className="font-800 text-white/80 transition-colors hover:text-white">Admin Portal</Link>
          <Link href="/contact?type=quote" className="hidden rounded-sm bg-[#D99611] px-3 py-1 font-900 text-[#06101F] transition-colors hover:bg-[#F4B83A] sm:inline-flex">Request quote</Link>
        </div>
      </div>
    </div>
  );
}
