"use client";
import Link from "next/link";

export default function TopBar() {
  return (
    <div className="bg-navy-900 text-white text-xs py-2 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: contact */}
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5">
            <span className="text-accent font-display font-600">Sales:</span>
            <a href="mailto:info@combay.co.uk" className="hover:text-accent transition-colors">
              info@combay.co.uk
            </a>
          </span>
          <span className="hidden sm:flex items-center gap-1.5">
            <span className="text-steel">Phone:</span>
            <a href="tel:+447340383334" className="hover:text-accent transition-colors">
              +44 7340 383334
            </a>
          </span>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-4">
          <Link href="/portal" className="hover:text-accent transition-colors hidden sm:inline">
            My Account
          </Link>
          <span className="text-navy-700 hidden sm:inline">|</span>
          <Link href="/portal" className="hover:text-accent transition-colors">
            Sign In
          </Link>
          <span className="text-navy-700">|</span>
          <Link href="/asset-recovery" className="text-accent hover:text-accent-light font-600 transition-colors">
            Sell Your Stock →
          </Link>
          <span className="text-navy-700 hidden sm:inline">|</span>
          <Link
            href="/contact"
            className="hidden sm:inline bg-accent text-navy-900 font-display font-700 px-3 py-1 rounded text-xs hover:bg-accent-dark transition-colors"
          >
            Request a Quote
          </Link>
        </div>
      </div>
    </div>
  );
}
