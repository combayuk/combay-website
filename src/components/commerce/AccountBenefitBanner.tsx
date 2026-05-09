import Link from "next/link";
import { BadgePercent, LogIn, UserPlus } from "lucide-react";

export default function AccountBenefitBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`rounded-xl border border-[#E8A44A]/35 bg-[#FFF8E8] text-[#2D4F7A] shadow-sm ${compact ? "p-4" : "p-4 sm:p-5"}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#E8A44A] text-[#2D4F7A]">
            <BadgePercent size={18} />
          </span>
          <div>
            <p className="font-display text-sm font-900 tracking-tight sm:text-base">Sign in or register for faster checkout and regular discount codes.</p>
            <p className="mt-1 text-xs leading-5 text-slate-700">Save addresses, receive eligible customer offers and speed up repeat B2B purchases.</p>
          </div>
        </div>
        <div className="flex flex-shrink-0 gap-2">
          <Link href="/portal/login" className="inline-flex items-center justify-center gap-1.5 rounded-md border border-[#E8A44A]/45 bg-white px-3.5 py-2 text-xs font-900 text-[#2D4F7A] transition-colors hover:border-[#2D4F7A]">
            <LogIn size={14} /> Sign in
          </Link>
          <Link href="/auth/register" className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#2D4F7A] px-3.5 py-2 text-xs font-900 text-white transition-colors hover:bg-[#355F8E]">
            <UserPlus size={14} /> Register
          </Link>
        </div>
      </div>
    </div>
  );
}
