import type { CSSProperties } from "react";

export function cmsBackgroundStyle(value?: string, overlay = "rgba(3,14,33,.88)"): CSSProperties | undefined {
  const raw = String(value || "").trim();
  if (!raw) return undefined;
  if (raw.startsWith("linear-gradient") || raw.startsWith("radial-gradient")) {
    return { backgroundImage: raw, backgroundSize: "cover", backgroundPosition: "center" };
  }
  if (raw.startsWith("#") || raw.startsWith("rgb") || raw.startsWith("hsl")) {
    return { backgroundColor: raw };
  }
  return { backgroundImage: `linear-gradient(${overlay},${overlay}), url(${raw})`, backgroundSize: "cover", backgroundPosition: "center" };
}
