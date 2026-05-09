export type PublicSubcategory = {
  label: string;
  slug: string;
  aliases?: string[];
};

export type PublicCategoryGroup = {
  label: string;
  slug: string;
  image: string;
  aliases?: string[];
  subcategories: PublicSubcategory[];
};

export type CanonicalCategory = {
  groupLabel: string;
  groupSlug: string;
  subcategoryLabel?: string;
  subcategorySlug?: string;
};

export const PUBLIC_CATEGORY_GROUPS: PublicCategoryGroup[] = [
  {
    label: "Automation & Control",
    slug: "automation-control",
    image: "/images/categories/real/plc-module.svg",
    aliases: ["industrial automation", "control systems", "automation", "industrial control"],
    subcategories: [
      { label: "PLCs & Industrial Controllers", slug: "plcs-industrial-controllers", aliases: ["plc", "programmable controller", "s7", "simatic", "input module", "output module", "i/o module", "io module", "cpu module", "controller"] },
      { label: "HMI & Operator Panels", slug: "hmi-operator-panels", aliases: ["hmi", "operator panel", "touch panel", "touchscreen", "panelview"] },
      { label: "Drives & Motion", slug: "drives-motion", aliases: ["drive", "vfd", "inverter", "servo", "motion", "sinamics", "powerflex", "axis"] },
      { label: "Sensors & Encoders", slug: "sensors-encoders", aliases: ["sensor", "encoder", "photoelectric", "proximity", "transducer", "detector", "probe"] },
      { label: "Motors & Gearboxes", slug: "motors-gearboxes", aliases: ["motor", "gearbox", "gearmotor", "gear motor", "actuator"] },
    ],
  },
  {
    label: "Electrical & Components",
    slug: "electrical-components",
    image: "/images/categories/real/electrical-components.svg",
    aliases: ["electrical", "electronic components", "switchgear", "industrial components"],
    subcategories: [
      { label: "Power Supplies & Transformers", slug: "power-supplies-transformers", aliases: ["power supply", "psu", "transformer", "ups", "rectifier", "24vdc", "dc power"] },
      { label: "Switchgear, Relays & Contactors", slug: "switchgear-relays-contactors", aliases: ["relay", "contactor", "breaker", "mcb", "rcd", "fuse", "switchgear", "isolator"] },
      { label: "Cables & Connectors", slug: "cables-connectors", aliases: ["cable", "connector", "plug", "socket", "cordset", "terminal", "adapter", "lead"] },
      { label: "Pneumatics & Hydraulics", slug: "pneumatics-hydraulics", aliases: ["pneumatic", "hydraulic", "valve", "cylinder", "pump", "filter", "regulator", "manifold", "festo", "smc", "rexroth"] },
      { label: "Industrial Spares", slug: "industrial-components-spares", aliases: ["spares", "spare parts", "industrial parts", "miscellaneous industrial", "other industrial"] },
    ],
  },
  {
    label: "Lab & Scientific",
    slug: "lab-scientific",
    image: "/images/categories/real/lab-instrument.svg",
    aliases: ["laboratory", "scientific", "lab equipment", "analytical"],
    subcategories: [
      { label: "Spectrometers", slug: "spectrometers", aliases: ["spectrometer", "ftir", "uv/vis", "uv-vis", "spectrophotometer", "nicolet", "lambda"] },
      { label: "Chromatography", slug: "chromatography", aliases: ["chromatography", "hplc", "gc", "lc", "waters", "agilent", "autosampler"] },
      { label: "Microscopes & Imaging", slug: "microscopes-imaging", aliases: ["microscope", "imaging", "camera head", "objective"] },
      { label: "Centrifuges & Lab Prep", slug: "centrifuges-lab-prep", aliases: ["centrifuge", "incubator", "shaker", "balance", "pipette", "lab prep"] },
      { label: "General Lab Equipment", slug: "general-lab-equipment", aliases: ["thermo", "perkin", "fisher", "laboratory equipment", "scientific equipment"] },
    ],
  },
  {
    label: "Test & Measurement",
    slug: "test-measurement",
    image: "/images/categories/real/oscilloscope.svg",
    aliases: ["test equipment", "measurement", "calibration", "detection"],
    subcategories: [
      { label: "Oscilloscopes", slug: "oscilloscopes", aliases: ["oscilloscope", "scope", "mdo", "dso"] },
      { label: "Analysers & Meters", slug: "analysers-meters", aliases: ["analyser", "analyzer", "meter", "multimeter", "power analyser", "power analyzer", "spectrum analyser", "spectrum analyzer"] },
      { label: "Signal & Calibration", slug: "signal-calibration", aliases: ["signal generator", "calibrator", "calibration", "function generator"] },
      { label: "Data Acquisition", slug: "data-acquisition", aliases: ["daq", "data acquisition", "logger", "recorder"] },
      { label: "Safety & Detection", slug: "safety-detection", aliases: ["flame detector", "gas detector", "light curtain", "emergency stop", "e-stop", "interlock", "alarm", "msa", "general monitors"] },
    ],
  },
  {
    label: "IT & Networking",
    slug: "it-networking",
    image: "/images/categories/real/server-switch.svg",
    aliases: ["networking", "information technology", "computer equipment"],
    subcategories: [
      { label: "Servers & Storage", slug: "servers-storage", aliases: ["server", "storage", "nas", "san", "hard drive", "ssd"] },
      { label: "Switches & Routers", slug: "switches-routers", aliases: ["switch", "router", "firewall", "cisco", "juniper", "ethernet"] },
      { label: "UPS & Power Protection", slug: "ups-power-protection", aliases: ["ups", "apc", "battery backup", "power protection"] },
      { label: "Network Cables & Fibre", slug: "network-cables-fibre", aliases: ["fibre", "fiber", "network cable", "sfp", "transceiver"] },
    ],
  },
  {
    label: "AV & Broadcast",
    slug: "av-broadcast",
    image: "/images/categories/real/projector.svg",
    aliases: ["display", "projectors", "audio broadcast", "broadcast", "video"],
    subcategories: [
      { label: "Projectors & Lenses", slug: "projectors-lenses", aliases: ["projector", "lens", "barco", "christie"] },
      { label: "Broadcast Video", slug: "broadcast-video", aliases: ["broadcast", "video router", "matrix", "camera", "monitor"] },
      { label: "Audio Equipment", slug: "audio-equipment", aliases: ["audio", "amplifier", "mixer", "speaker", "microphone"] },
      { label: "Displays & Video Walls", slug: "displays-video-walls", aliases: ["display", "video wall", "screen", "signage"] },
    ],
  },
  {
    label: "Process & Workshop",
    slug: "process-workshop",
    image: "/images/categories/real/robot-arm.svg",
    aliases: ["manufacturing", "machine tools", "workshop", "oil gas", "process"],
    subcategories: [
      { label: "Process Instrumentation", slug: "process-instrumentation", aliases: ["flow", "pressure", "level", "temperature", "transmitter", "process instrument", "instrumentation"] },
      { label: "Machine Tools & Workshop", slug: "machine-tools-workshop", aliases: ["cnc", "lathe", "milling", "workshop", "cutting", "drill", "fixture", "chuck"] },
      { label: "Robotics & Handling", slug: "robotics-handling", aliases: ["robot", "robotics", "conveyor", "vision", "handling"] },
    ],
  },
];

export const PUBLIC_CATEGORY_LIST = [
  { label: "All Categories", slug: "", subcategories: [] as PublicSubcategory[] },
  ...PUBLIC_CATEGORY_GROUPS.map((group) => ({ label: group.label, slug: group.slug, image: group.image, subcategories: group.subcategories })),
];

const LEGACY_SELECTED_SLUGS: Record<string, string> = {
  "test-detection": "test-measurement",
  "display-av": "av-broadcast",
  "audio-broadcast": "av-broadcast",
  "manufacturing": "process-workshop",
  "oil-gas": "process-workshop",
};

export function normaliseSelectedCategorySlug(slug?: string | null) {
  const clean = String(slug || "").trim();
  return LEGACY_SELECTED_SLUGS[clean] || clean;
}

const slugToCanonical = new Map<string, CanonicalCategory>();
for (const group of PUBLIC_CATEGORY_GROUPS) {
  slugToCanonical.set(group.slug, { groupLabel: group.label, groupSlug: group.slug });
  for (const sub of group.subcategories) {
    slugToCanonical.set(sub.slug, { groupLabel: group.label, groupSlug: group.slug, subcategoryLabel: sub.label, subcategorySlug: sub.slug });
  }
}

export function getCanonicalBySlug(slug?: string | null) {
  return slugToCanonical.get(normaliseSelectedCategorySlug(slug));
}

function normaliseText(value?: string | null) {
  return String(value || "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function scoreAliases(haystack: string, aliases: string[] = []) {
  let score = 0;
  for (const alias of aliases) {
    const clean = normaliseText(alias);
    if (!clean) continue;
    if (haystack.includes(clean)) score += Math.max(3, clean.split(/\s+/).length * 3);
  }
  return score;
}

export function canonicalCategoryForText(args: {
  title?: string | null;
  category?: string | null;
  categorySlug?: string | null;
  brand?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  mpn?: string | null;
  specsText?: string | null;
}): CanonicalCategory {
  const exact = getCanonicalBySlug(args.categorySlug);
  if (exact) return exact;

  const haystack = normaliseText([args.title, args.category, args.categorySlug, args.brand, args.manufacturer, args.model, args.mpn, args.specsText].filter(Boolean).join(" "));
  let best: { score: number; category: CanonicalCategory } = { score: 0, category: { groupLabel: "Electrical & Components", groupSlug: "electrical-components", subcategoryLabel: "Industrial Spares", subcategorySlug: "industrial-components-spares" } };

  for (const group of PUBLIC_CATEGORY_GROUPS) {
    const groupScore = scoreAliases(haystack, [group.label, group.slug, ...(group.aliases || [])]);
    if (groupScore > best.score) best = { score: groupScore, category: { groupLabel: group.label, groupSlug: group.slug } };
    for (const sub of group.subcategories) {
      const subScore = groupScore + scoreAliases(haystack, [sub.label, sub.slug, ...(sub.aliases || [])]);
      if (subScore > best.score) best = { score: subScore, category: { groupLabel: group.label, groupSlug: group.slug, subcategoryLabel: sub.label, subcategorySlug: sub.slug } };
    }
  }

  // Broad guard for common eBay marketplace buckets that should never become public categories.
  const noisy = /business|office|industrial|electrical equipment|other|miscellaneous|commercial|general/i.test(String(args.category || ""));
  return best.score > 0 || noisy ? best.category : best.category;
}

export function isPublicCategoryMatch(product: { category?: string | null; categorySlug?: string | null; title?: string | null; brand?: string | null; manufacturer?: string | null; model?: string | null; mpn?: string | null; specs?: { label: string; value: string }[] }, selectedSlug?: string | null) {
  const selected = normaliseSelectedCategorySlug(selectedSlug);
  if (!selected) return true;
  const canonical = canonicalCategoryForText({
    title: product.title,
    category: product.category,
    categorySlug: product.categorySlug,
    brand: product.brand,
    manufacturer: product.manufacturer,
    model: product.model,
    mpn: product.mpn,
    specsText: product.specs?.map((s) => `${s.label} ${s.value}`).join(" "),
  });
  return canonical.groupSlug === selected || canonical.subcategorySlug === selected;
}

export function selectedCategoryLabel(slug?: string | null) {
  const normalised = normaliseSelectedCategorySlug(slug);
  if (!normalised) return "All Categories";
  const found = getCanonicalBySlug(normalised);
  return found?.subcategoryLabel || found?.groupLabel || "Selected Category";
}
