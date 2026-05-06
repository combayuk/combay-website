"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function PromotionCodeCopyButton({ code, compact = false }: { code: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copyCode}
      className={`inline-flex items-center gap-1.5 rounded-md border font-mono font-800 tracking-wide transition-colors ${compact ? "px-2 py-1 text-[11px]" : "px-3 py-2 text-xs"} ${copied ? "border-green-300 bg-green-50 text-green-700" : "border-amber-300 bg-white text-navy-950 hover:border-accent hover:bg-amber-50"}`}
      title={`Copy ${code}`}
    >
      {copied ? <Check size={compact ? 12 : 14} /> : <Copy size={compact ? 12 : 14} />}
      {copied ? "Copied" : code}
    </button>
  );
}
