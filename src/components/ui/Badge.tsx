import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center text-xs font-display font-600 px-2.5 py-0.5 rounded border", className)}>{children}</span>;
}
