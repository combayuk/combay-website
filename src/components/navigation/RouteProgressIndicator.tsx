"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function normaliseInternalHref(rawHref: string | null) {
  if (!rawHref || typeof window === "undefined") return "";
  try {
    const url = new URL(rawHref, window.location.origin);
    if (url.origin !== window.location.origin) return "";
    if (url.pathname.startsWith("/_next") || url.pathname.startsWith("/api/")) return "";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "";
  }
}

function findNavigableAnchor(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  const anchor = target.closest("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  return anchor;
}

function shouldIgnoreAnchor(anchor: HTMLAnchorElement, event?: MouseEvent) {
  if (anchor.dataset.noInstantNav === "true") return true;
  if (anchor.target && anchor.target !== "_self") return true;
  if (anchor.hasAttribute("download")) return true;
  if (event?.metaKey || event?.ctrlKey || event?.shiftKey || event?.altKey) return true;
  if (event && event.button !== 0) return true;
  const href = normaliseInternalHref(anchor.getAttribute("href"));
  if (!href) return true;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (href === current) return true;
  const nextUrl = new URL(href, window.location.origin);
  const currentUrl = new URL(current, window.location.origin);
  if (nextUrl.pathname === currentUrl.pathname && nextUrl.search === currentUrl.search && nextUrl.hash) return true;
  return false;
}

export default function RouteProgressIndicator() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const routeKey = useMemo(() => `${pathname}?${searchParams?.toString() ?? ""}`, [pathname, searchParams]);
  const [active, setActive] = useState(false);
  const [showLabel, setShowLabel] = useState(false);
  const [pendingHref, setPendingHref] = useState("");
  const activeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const labelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimers() {
    if (activeTimer.current) clearTimeout(activeTimer.current);
    if (labelTimer.current) clearTimeout(labelTimer.current);
    if (clearTimer.current) clearTimeout(clearTimer.current);
  }

  function start(href: string) {
    clearTimers();
    setPendingHref(href);
    setActive(true);
    setShowLabel(false);
    labelTimer.current = setTimeout(() => setShowLabel(true), 280);
    activeTimer.current = setTimeout(() => {
      setActive(false);
      setShowLabel(false);
    }, 14000);
  }

  useEffect(() => {
    function onPointerOver(event: PointerEvent) {
      const anchor = findNavigableAnchor(event.target);
      if (!anchor || shouldIgnoreAnchor(anchor)) return;
      const href = normaliseInternalHref(anchor.getAttribute("href"));
      if (href) router.prefetch(href);
    }

    function onFocusIn(event: FocusEvent) {
      const anchor = findNavigableAnchor(event.target);
      if (!anchor || shouldIgnoreAnchor(anchor)) return;
      const href = normaliseInternalHref(anchor.getAttribute("href"));
      if (href) router.prefetch(href);
    }

    function onClick(event: MouseEvent) {
      const anchor = findNavigableAnchor(event.target);
      if (!anchor || shouldIgnoreAnchor(anchor, event)) return;
      const href = normaliseInternalHref(anchor.getAttribute("href"));
      if (!href) return;
      start(href);
    }

    window.addEventListener("pointerover", onPointerOver, { passive: true });
    window.addEventListener("focusin", onFocusIn);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("pointerover", onPointerOver);
      window.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("click", onClick, true);
      clearTimers();
    };
  }, [router]);

  useEffect(() => {
    if (!active) return;
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => {
      setActive(false);
      setShowLabel(false);
      setPendingHref("");
    }, 420);
  }, [routeKey]);

  if (!active) return null;

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-[9999] h-1 bg-[#E8A44A]/20" aria-hidden="true">
        <div className="h-full w-2/3 animate-combay-route-progress rounded-r-full bg-[#E8A44A] shadow-[0_0_14px_rgba(232,164,74,0.65)]" />
      </div>
      {showLabel ? (
        <div className="fixed bottom-4 right-4 z-[9999] max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-900 text-[#2D4F7A] shadow-xl">
          Loading page…
          {pendingHref ? <span className="ml-1 font-700 text-slate-400">{pendingHref.split("?")[0]}</span> : null}
        </div>
      ) : null}
    </>
  );
}
