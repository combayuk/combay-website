"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";

const REVIEWS_URL = "https://www.google.com/search?q=combay&sca_esv=460606e7be098232&sxsrf=ANbL-n6pOgocwXhA7VdTaAx3h4CiIDuI9Q%3A1778320031304&source=hp&ei=nwL_aY25D--thbIPpYfckA4&iflsig=AFdpzrgAAAAAaf8Qr-7Qu2un85E2dOkoLqLhuIG-JLSg&ved=0ahUKEwjNhIqu9quUAxXvVkEAHaUDF-IQ4dUDCCA&uact=5&oq=combay&gs_lp=Egdnd3Mtd2l6IgZjb21iYXkyBxAAGIAEGAoyBxAuGIAEGAoyBxAuGIAEGAoyDBAAGIAEGAoYCxixAzIMEAAYgAQYChgLGLEDMgwBAAGIAEGAoYCxixAzIJEAAYgAQYChgLMgwBAAGIAEGAoYCxixAzIPAuGIAEGAoYCxjHARjRA0ijAlAAWABwAHgAkAEAmAFNoAFNqgEBMbgBA8gBAPgBAvgBAZgCAaACV5gDAJIHATGgB9wLsgcBMbgHV8IHAzItMcgHB4AIAQ&sclient=gws-wiz#lrd=0x47d8ebd855e8ae33:0x4af7e895e4d52ce8,1,,,,";
const WRITE_REVIEW_URL = "https://g.page/r/Cegs1eSV6PdKEAE/review";

type GoogleReviewPayload = { rating: number; total: number; name: string; live: boolean };
type Props = { compact?: boolean; className?: string };

export default function GoogleReviewsBadge({ compact = false, className = "" }: Props) {
  const [data, setData] = useState<GoogleReviewPayload>({ rating: 5, total: 0, name: "Combay", live: false });

  useEffect(() => {
    let active = true;
    fetch("/api/google-reviews", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!active || !payload?.ok) return;
        setData({
          rating: Number(payload.rating || 5),
          total: Number(payload.total || 0),
          name: String(payload.name || "Combay"),
          live: Boolean(payload.live),
        });
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, []);

  const totalText = data.total > 0 ? `${data.total.toLocaleString()} Google reviews` : "Google reviews";

  if (compact) {
    return (
      <div className={`inline-flex flex-col gap-1 rounded-md border border-white/15 bg-white/10 px-3 py-2 text-white backdrop-blur ${className}`}>
        <a href={REVIEWS_URL} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-2">
          <span className="flex items-center gap-0.5 text-[#E8A44A]" aria-label={`${data.rating} star Google rating`}>
            {[0, 1, 2, 3, 4].map((star) => (
              <Star key={star} size={14} fill="currentColor" />
            ))}
          </span>
          <span className="text-xs font-900 text-white group-hover:text-[#E8A44A]">{data.rating.toFixed(1)} Google rating</span>
          <span className="text-[11px] text-white/55">{data.total > 0 ? `${data.total.toLocaleString()} reviews` : "Reviews"}</span>
        </a>
        <a href={WRITE_REVIEW_URL} target="_blank" rel="noopener noreferrer" className="text-[11px] font-800 text-white/65 underline decoration-[#E8A44A] decoration-2 underline-offset-4 hover:text-white">
          Write us a review
        </a>
      </div>
    );
  }

  return (
    <section className="border-y border-slate-200 bg-white py-7">
      <div className="site-shell">
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-[#F8FAFC] p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <a href={REVIEWS_URL} target="_blank" rel="noopener noreferrer" className="group flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-1 text-[#E8A44A]" aria-label={`${data.rating} star Google rating`}>
              {[0, 1, 2, 3, 4].map((star) => (
                <Star key={star} size={22} fill="currentColor" />
              ))}
            </div>
            <div>
              <p className="font-display text-xl font-900 text-[#2D4F7A]">{data.rating.toFixed(1)} / 5.0 on Google</p>
              <p className="text-sm font-700 text-slate-500 group-hover:text-[#2D4F7A]">{totalText}</p>
            </div>
          </a>
          <a href={WRITE_REVIEW_URL} target="_blank" rel="noopener noreferrer" className="text-sm font-900 text-[#2D4F7A] underline decoration-[#E8A44A] decoration-2 underline-offset-4 hover:text-[#C9872F]">
            Write us a review
          </a>
        </div>
      </div>
    </section>
  );
}
