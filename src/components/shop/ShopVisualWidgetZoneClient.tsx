"use client";

import { useEffect, useState } from "react";
import VisualWidgetZone from "@/components/visual-cms/VisualWidgetZone";
import type { VisualWidget } from "@/lib/siteContent";

type VisualWidgetsMap = Record<string, VisualWidget[]>;

type ShopChromePayload = {
  ok?: boolean;
  content?: {
    visualWidgets?: VisualWidgetsMap;
  };
};

let cachedWidgets: VisualWidgetsMap | null = null;
let chromePromise: Promise<VisualWidgetsMap> | null = null;

async function loadShopWidgets(): Promise<VisualWidgetsMap> {
  if (cachedWidgets) return cachedWidgets;
  if (!chromePromise) {
    chromePromise = fetch("/api/shop/chrome", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: ShopChromePayload | null) => {
        const widgets = payload?.content?.visualWidgets ?? {};
        cachedWidgets = widgets;
        return widgets;
      })
      .catch(() => ({}));
  }
  return chromePromise;
}

export default function ShopVisualWidgetZoneClient({ zone }: { zone: string }) {
  const [widgets, setWidgets] = useState<VisualWidgetsMap | null>(cachedWidgets);

  useEffect(() => {
    let cancelled = false;
    loadShopWidgets().then((loaded) => {
      if (!cancelled) setWidgets(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!widgets) return null;
  return <VisualWidgetZone pageKey="shop" zone={zone} allWidgets={widgets} />;
}
