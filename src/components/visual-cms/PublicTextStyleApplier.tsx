"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { CmsTextStyle } from "@/lib/siteContent";

function pageKeyFromPath(pathname: string) {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/repair")) return "repair";
  if (pathname.startsWith("/asset-recovery")) return "assetRecovery";
  if (pathname.startsWith("/about")) return "about";
  if (pathname.startsWith("/contact")) return "contact";
  if (pathname.startsWith("/faq")) return "faq";
  if (pathname.startsWith("/terms")) return "terms";
  if (pathname.startsWith("/privacy-policy")) return "privacy";
  if (pathname.startsWith("/returns-policy")) return "returns";
  if (pathname.startsWith("/warranty")) return "warranty";
  if (pathname.startsWith("/payment-policy")) return "payment";
  return "";
}

function textStyleKey(pageKey: string, text: string) {
  const normalised = String(text || "").trim().toLowerCase().replace(/\s+/g, " ");
  let hash = 0;
  for (let i = 0; i < normalised.length; i += 1) hash = ((hash << 5) - hash + normalised.charCodeAt(i)) | 0;
  return `${pageKey}:${Math.abs(hash).toString(36)}`;
}

function applyStyle(el: HTMLElement, style: CmsTextStyle) {
  el.style.fontSize = style.fontSize || "";
  el.style.fontFamily = style.fontFamily || "";
  el.style.fontWeight = style.fontWeight || "";
  el.style.fontStyle = style.italic ? "italic" : "";
  el.style.color = style.colour || "";
  el.style.textAlign = style.align || "";
  el.style.lineHeight = style.lineHeight || "";
  el.classList.toggle("vcms-style-heading-live", style.textKind === "heading");
  el.classList.toggle("vcms-style-subheading-live", style.textKind === "subheading");
  el.classList.toggle("vcms-style-caption-live", style.textKind === "caption");
}

export default function PublicTextStyleApplier() {
  const pathname = usePathname();

  useEffect(() => {
    const pageKey = pageKeyFromPath(pathname || "");
    if (!pageKey) return;

    let cancelled = false;
    fetch("/api/admin/content", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (cancelled || !data?.content?.textStyles) return;
        const styles = data.content.textStyles as Record<string, CmsTextStyle>;
        const selector = "main h1,main h2,main h3,main h4,main p,main li,main label,main a,main button,footer p,footer a,footer span,footer h4";
        document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
          const text = el.textContent?.trim();
          if (!text || el.closest("script,style,svg")) return;
          const style = styles[textStyleKey(pageKey, text)];
          if (style) applyStyle(el, style);
        });
      })
      .catch(() => null);

    return () => { cancelled = true; };
  }, [pathname]);

  return null;
}
