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
    aliases: [
      "industrial automation",
      "control systems",
      "automation",
      "industrial control",
      "factory automation",
      "controls",
    ],
    subcategories: [
      {
        label: "PLCs & Industrial Controllers",
        slug: "plcs-industrial-controllers",
        aliases: [
          "plc",
          "programmable controller",
          "programmable logic controller",
          "s7",
          "simatic",
          "allen bradley",
          "control logix",
          "controllogix",
          "compactlogix",
          "micrologix",
          "modicon",
          "input module",
          "output module",
          "i/o module",
          "io module",
          "cpu module",
          "controller",
          "bus coupler",
          "beckhoff",
          "omron plc",
          "mitsubishi plc",
          "fanuc controller",
          "pilz",
        ],
      },
      {
        label: "HMI & Operator Panels",
        slug: "hmi-operator-panels",
        aliases: [
          "hmi",
          "operator panel",
          "touch panel",
          "touchscreen",
          "panelview",
          "simatic panel",
          "comfort panel",
          "basic panel",
          "magelis",
          "proface",
          "weintek",
        ],
      },
      {
        label: "Drives & Motion",
        slug: "drives-motion",
        aliases: [
          "drive",
          "vfd",
          "variable frequency drive",
          "inverter",
          "servo",
          "servo drive",
          "servo amplifier",
          "motion",
          "sinamics",
          "powerflex",
          "altivar",
          "danfoss",
          "lenze",
          "yaskawa",
          "axis",
          "soft starter",
          "motor starter",
        ],
      },
      {
        label: "Sensors & Encoders",
        slug: "sensors-encoders",
        aliases: [
          "sensor",
          "encoder",
          "photoelectric",
          "proximity",
          "transducer",
          "detector",
          "probe",
          "sick",
          "ifm",
          "pepperl",
          "keyence",
          "balluff",
          "limit switch",
          "reed switch",
          "measuring sensor",
        ],
      },
      {
        label: "Motors & Gearboxes",
        slug: "motors-gearboxes",
        aliases: [
          "motor",
          "gearbox",
          "gearmotor",
          "gear motor",
          "actuator",
          "electric motor",
          "servo motor",
          "stepper",
          "sew eurodrive",
          "rotary actuator",
          "linear actuator",
        ],
      },
    ],
  },
  {
    label: "Electrical & Components",
    slug: "electrical-components",
    image: "/images/categories/real/electrical-components.svg",
    aliases: [
      "electrical",
      "electronic components",
      "electrical equipment",
      "switchgear",
      "industrial components",
      "electrical supplies",
      "industrial electrical",
    ],
    subcategories: [
      {
        label: "Power Supplies & Transformers",
        slug: "power-supplies-transformers",
        aliases: [
          "power supply",
          "psu",
          "power module",
          "transformer",
          "ups",
          "rectifier",
          "24vdc",
          "dc power",
          "ac adapter",
          "sitransformer",
          "sitop",
          "battery charger",
        ],
      },
      {
        label: "Switchgear, Relays & Contactors",
        slug: "switchgear-relays-contactors",
        aliases: [
          "relay",
          "contactor",
          "breaker",
          "circuit breaker",
          "mcb",
          "rcd",
          "fuse",
          "switchgear",
          "isolator",
          "disconnect",
          "overload",
          "terminal block",
          "din rail",
          "abb contactor",
          "schneider breaker",
        ],
      },
      {
        label: "Cables & Connectors",
        slug: "cables-connectors",
        aliases: [
          "cable",
          "connector",
          "plug",
          "socket",
          "cordset",
          "terminal",
          "adapter",
          "lead",
          "loom",
          "harness",
          "m12",
          "db9",
          "profibus cable",
          "ethernet cable",
        ],
      },
      {
        label: "Pneumatics & Hydraulics",
        slug: "pneumatics-hydraulics",
        aliases: [
          "pneumatic",
          "hydraulic",
          "valve",
          "solenoid valve",
          "cylinder",
          "pump",
          "filter",
          "regulator",
          "manifold",
          "festo",
          "smc",
          "rexroth",
          "parker",
          "norgren",
          "air preparation",
          "hydraulic valve",
        ],
      },
      {
        label: "Industrial Spares",
        slug: "industrial-components-spares",
        aliases: [
          "spares",
          "spare parts",
          "industrial parts",
          "miscellaneous industrial",
          "other industrial",
          "maintenance spares",
          "accessory",
          "module",
          "assembly",
        ],
      },
    ],
  },
  {
    label: "Lab & Scientific",
    slug: "lab-scientific",
    image: "/images/categories/real/lab-instrument.svg",
    aliases: [
      "laboratory",
      "scientific",
      "lab equipment",
      "analytical",
      "healthcare lab dental",
      "medical lab",
      "medical laboratory",
      "biotech",
      "life science",
    ],
    subcategories: [
      {
        label: "Spectrometers",
        slug: "spectrometers",
        aliases: [
          "spectrometer",
          "spectrophotometer",
          "ftir",
          "uv vis",
          "uv/vis",
          "uv-vis",
          "nir",
          "infrared",
          "nicolet",
          "lambda",
          "perkinelmer lambda",
          "thermo nicolet",
          "atomic absorption",
          "aa spectrometer",
          "flame spectrometer",
          "mass spectrometer",
          "raman",
        ],
      },
      {
        label: "Chromatography",
        slug: "chromatography",
        aliases: [
          "chromatography",
          "hplc",
          "gc",
          "lc",
          "uhplc",
          "uplc",
          "gcms",
          "lcms",
          "mass spec",
          "autosampler",
          "fraction collector",
          "detector",
          "waters",
          "agilent",
          "shimadzu",
          "dionex",
        ],
      },
      {
        label: "Microscopes & Imaging",
        slug: "microscopes-imaging",
        aliases: [
          "microscope",
          "imaging",
          "camera head",
          "objective",
          "zeiss",
          "leica",
          "olympus",
          "nikon microscope",
          "fluorescence",
          "slide scanner",
        ],
      },
      {
        label: "Centrifuges & Lab Prep",
        slug: "centrifuges-lab-prep",
        aliases: [
          "centrifuge",
          "incubator",
          "shaker",
          "balance",
          "pipette",
          "autoclave",
          "water bath",
          "hotplate",
          "magnetic stirrer",
          "vortex",
          "sample prep",
          "lab prep",
          "microplate",
          "plate reader",
          "thermal cycler",
          "pcr",
        ],
      },
      {
        label: "General Lab Equipment",
        slug: "general-lab-equipment",
        aliases: [
          "thermo",
          "perkin",
          "fisher",
          "eppendorf",
          "sartorius",
          "laboratory equipment",
          "scientific equipment",
          "freezer",
          "fridge",
          "oven",
          "environmental chamber",
          "bioreactor",
          "illumina",
          "sequencer",
        ],
      },
    ],
  },
  {
    label: "Test & Measurement",
    slug: "test-measurement",
    image: "/images/categories/real/oscilloscope.svg",
    aliases: [
      "test equipment",
      "measurement",
      "calibration",
      "detection",
      "electronic test",
      "inspection",
      "test measurement inspection",
    ],
    subcategories: [
      {
        label: "Oscilloscopes",
        slug: "oscilloscopes",
        aliases: [
          "oscilloscope",
          "scope",
          "mdo",
          "dso",
          "mixed signal oscilloscope",
          "tektronix oscilloscope",
          "keysight oscilloscope",
          "lecroy",
        ],
      },
      {
        label: "Analysers & Meters",
        slug: "analysers-meters",
        aliases: [
          "analyser",
          "analyzer",
          "meter",
          "multimeter",
          "dmm",
          "clamp meter",
          "power analyser",
          "power analyzer",
          "spectrum analyser",
          "spectrum analyzer",
          "network analyser",
          "network analyzer",
          "logic analyzer",
          "fluke",
          "anritsu",
          "rohde",
          "keysight",
          "agilent",
          "hioki",
        ],
      },
      {
        label: "Signal & Calibration",
        slug: "signal-calibration",
        aliases: [
          "signal generator",
          "function generator",
          "waveform generator",
          "calibrator",
          "calibration",
          "source measure",
          "smu",
          "frequency counter",
          "load bank",
          "electronic load",
        ],
      },
      {
        label: "Data Acquisition",
        slug: "data-acquisition",
        aliases: [
          "daq",
          "data acquisition",
          "logger",
          "recorder",
          "data logger",
          "chart recorder",
          "yokogawa recorder",
          "national instruments",
          "ni daq",
        ],
      },
      {
        label: "Safety & Detection",
        slug: "safety-detection",
        aliases: [
          "flame detector",
          "gas detector",
          "gas monitor",
          "light curtain",
          "emergency stop",
          "e stop",
          "e-stop",
          "interlock",
          "alarm",
          "msa",
          "general monitors",
          "drager",
          "draeger",
          "detector head",
        ],
      },
    ],
  },
  {
    label: "IT & Networking",
    slug: "it-networking",
    image: "/images/categories/real/server-switch.svg",
    aliases: [
      "networking",
      "information technology",
      "computer equipment",
      "telecom",
      "communications",
      "data centre",
      "datacenter",
    ],
    subcategories: [
      {
        label: "Servers & Storage",
        slug: "servers-storage",
        aliases: [
          "server",
          "storage",
          "nas",
          "san",
          "hard drive",
          "ssd",
          "blade",
          "rack server",
          "dell poweredge",
          "hp proliant",
          "lenovo server",
          "netapp",
          "emc",
        ],
      },
      {
        label: "Switches & Routers",
        slug: "switches-routers",
        aliases: [
          "network switch",
          "ethernet switch",
          "managed switch",
          "router",
          "firewall",
          "cisco",
          "juniper",
          "aruba",
          "fortinet",
          "sonicwall",
          "ethernet",
          "poe switch",
        ],
      },
      {
        label: "UPS & Power Protection",
        slug: "ups-power-protection",
        aliases: [
          "ups",
          "apc",
          "eaton ups",
          "battery backup",
          "power protection",
          "pdu",
          "rack pdu",
        ],
      },
      {
        label: "Network Cables & Fibre",
        slug: "network-cables-fibre",
        aliases: [
          "fibre",
          "fiber",
          "network cable",
          "sfp",
          "sfp+",
          "transceiver",
          "qsfp",
          "patch panel",
          "patch lead",
          "cat6",
          "cat5e",
        ],
      },
    ],
  },
  {
    label: "AV & Broadcast",
    slug: "av-broadcast",
    image: "/images/categories/real/projector.svg",
    aliases: [
      "display",
      "projectors",
      "audio broadcast",
      "broadcast",
      "video",
      "audio visual",
      "av equipment",
      "professional video",
    ],
    subcategories: [
      {
        label: "Projectors & Lenses",
        slug: "projectors-lenses",
        aliases: [
          "projector",
          "projector lens",
          "lens",
          "barco",
          "christie",
          "panasonic projector",
          "sony projector",
          "nec projector",
        ],
      },
      {
        label: "Broadcast Video",
        slug: "broadcast-video",
        aliases: [
          "broadcast",
          "video router",
          "matrix",
          "camera",
          "studio camera",
          "broadcast monitor",
          "blackmagic",
          "aja",
          "grass valley",
          "sony broadcast",
          "vision mixer",
          "video switcher",
        ],
      },
      {
        label: "Audio Equipment",
        slug: "audio-equipment",
        aliases: [
          "audio",
          "amplifier",
          "mixer",
          "speaker",
          "microphone",
          "dsp",
          "shure",
          "sennheiser",
          "yamaha mixer",
          "power amplifier",
        ],
      },
      {
        label: "Displays & Video Walls",
        slug: "displays-video-walls",
        aliases: [
          "display",
          "video wall",
          "screen",
          "signage",
          "interactive display",
          "webex board",
          "smart board",
          "lcd panel",
          "led wall",
        ],
      },
    ],
  },

  {
    label: "Military & Surplus",
    slug: "military-surplus",
    image: "/images/categories/real/military-surplus.svg",
    aliases: [
      "military surplus",
      "army surplus",
      "raf",
      "royal air force",
      "british forces",
      "uniform",
      "defence",
      "defense",
      "mod surplus",
    ],
    subcategories: [
      {
        label: "Uniforms & Clothing",
        slug: "uniforms-clothing",
        aliases: [
          "uniform",
          "shirt",
          "trousers",
          "skirt",
          "jacket",
          "wool",
          "no 1 dress",
          "no 2 dress",
          "raf skirt",
          "british army clothing",
        ],
      },
      {
        label: "Field Gear & Accessories",
        slug: "field-gear-accessories",
        aliases: [
          "field gear",
          "webbing",
          "belt",
          "pouch",
          "helmet",
          "bag",
          "rucksack",
          "kit",
          "accessory",
        ],
      },
      {
        label: "Surplus Equipment",
        slug: "surplus-equipment",
        aliases: [
          "military equipment",
          "surplus stock",
          "mod equipment",
          "defence equipment",
          "army surplus",
        ],
      },
    ],
  },
  {
    label: "Process & Workshop",
    slug: "process-workshop",
    image: "/images/categories/real/robot-arm.svg",
    aliases: [
      "manufacturing",
      "machine tools",
      "workshop",
      "oil gas",
      "process",
      "production equipment",
      "plant equipment",
    ],
    subcategories: [
      {
        label: "Process Instrumentation",
        slug: "process-instrumentation",
        aliases: [
          "flow",
          "flowmeter",
          "flow meter",
          "pressure",
          "level",
          "temperature",
          "transmitter",
          "process instrument",
          "instrumentation",
          "endress",
          "rosemount",
          "yokogawa",
          "abb transmitter",
          "control valve",
          "positioner",
        ],
      },
      {
        label: "Machine Tools & Workshop",
        slug: "machine-tools-workshop",
        aliases: [
          "cnc",
          "lathe",
          "milling",
          "workshop",
          "cutting",
          "drill",
          "fixture",
          "chuck",
          "press",
          "welder",
          "welding",
          "grinder",
          "saw",
          "machine tool",
        ],
      },
      {
        label: "Robotics & Handling",
        slug: "robotics-handling",
        aliases: [
          "robot",
          "robotics",
          "conveyor",
          "vision",
          "handling",
          "gripper",
          "cobot",
          "kuka",
          "abb robot",
          "fanuc robot",
          "pick and place",
        ],
      },
    ],
  },
];

export const PUBLIC_CATEGORY_LIST = [
  {
    label: "All Categories",
    slug: "",
    subcategories: [] as PublicSubcategory[],
  },
  ...PUBLIC_CATEGORY_GROUPS.map((group) => ({
    label: group.label,
    slug: group.slug,
    image: group.image,
    subcategories: group.subcategories,
  })),
];

const LEGACY_SELECTED_SLUGS: Record<string, string> = {
  // Older site slugs
  "test-detection": "test-measurement",
  "display-av": "av-broadcast",
  "audio-broadcast": "av-broadcast",
  manufacturing: "process-workshop",
  "oil-gas": "process-workshop",
  "lab-equipment": "lab-scientific",
  "industrial-automation-control": "automation-control",

  // Noisy eBay/import category slugs that should never appear as standalone public filters
  "ebay-import": "industrial-components-spares",
  uncategorised: "industrial-components-spares",
  uncategorized: "industrial-components-spares",
  "business-office-industrial": "industrial-components-spares",
  "business-industrial": "industrial-components-spares",
  "industrial-automation-motion-controls": "automation-control",
  "electrical-equipment-supplies": "electrical-components",
  "electronic-components-semiconductors": "electrical-components",
  "wire-cable-connectors": "cables-connectors",
  "connectors-cables": "cables-connectors",
  "healthcare-lab-dental": "lab-scientific",
  "medical-lab-equipment": "lab-scientific",
  "test-measurement-inspection": "test-measurement",
  "computer-tablets-networking": "it-networking",
  "enterprise-networking-servers": "it-networking",
  "servers-clients-terminals": "servers-storage",
  "switches-hubs": "switches-routers",
  "pro-audio-equipment": "audio-equipment",
  "tv-video-home-audio": "av-broadcast",
  "cameras-photo": "broadcast-video",
  "facility-maintenance-safety": "test-measurement",
  military: "military-surplus",
  "military-surplus-clothing": "uniforms-clothing",
  "collectables-militaria": "military-surplus",
  surplus: "military-surplus",
};

export function normaliseSelectedCategorySlug(slug?: string | null) {
  const clean = String(slug || "")
    .trim()
    .toLowerCase();
  return LEGACY_SELECTED_SLUGS[clean] || clean;
}

export function publicMasterCategorySlugs() {
  return PUBLIC_CATEGORY_GROUPS.map((group) => group.slug);
}

const slugToCanonical = new Map<string, CanonicalCategory>();
for (const group of PUBLIC_CATEGORY_GROUPS) {
  slugToCanonical.set(group.slug, {
    groupLabel: group.label,
    groupSlug: group.slug,
  });
  for (const sub of group.subcategories) {
    slugToCanonical.set(sub.slug, {
      groupLabel: group.label,
      groupSlug: group.slug,
      subcategoryLabel: sub.label,
      subcategorySlug: sub.slug,
    });
  }
}

export function getCanonicalBySlug(slug?: string | null) {
  return slugToCanonical.get(normaliseSelectedCategorySlug(slug));
}

export function isMasterCategorySlug(slug?: string | null) {
  const canonical = getCanonicalBySlug(slug);
  return Boolean(
    canonical &&
    canonical.groupSlug === normaliseSelectedCategorySlug(slug) &&
    !canonical.subcategorySlug,
  );
}

export function categorySlugBelongsToMaster(
  slug: string | undefined | null,
  masterSlug: string | undefined | null,
) {
  const selectedMaster = getCanonicalBySlug(masterSlug);
  const canonical = getCanonicalBySlug(slug);
  return Boolean(
    selectedMaster?.groupSlug &&
    canonical?.groupSlug &&
    selectedMaster.groupSlug === canonical.groupSlug,
  );
}

function normaliseText(value?: string | null) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function phraseScore(haystack: string, phrase: string) {
  const clean = normaliseText(phrase);
  if (!clean) return 0;
  if (haystack === clean) return clean.split(/\s+/).length * 8;
  if (haystack.includes(clean))
    return Math.max(4, clean.split(/\s+/).length * 5);
  const tokens = clean.split(/\s+/).filter((token) => token.length > 2);
  if (tokens.length > 1 && tokens.every((token) => haystack.includes(token)))
    return tokens.length * 2;
  return 0;
}

function scoreAliases(haystack: string, aliases: string[] = []) {
  return aliases.reduce(
    (score, alias) => score + phraseScore(haystack, alias),
    0,
  );
}

function categoryForSubcategory(slug: string): CanonicalCategory {
  const canonical = getCanonicalBySlug(slug);
  return (
    canonical || {
      groupLabel: "Electrical & Components",
      groupSlug: "electrical-components",
      subcategoryLabel: "Industrial Spares",
      subcategorySlug: "industrial-components-spares",
    }
  );
}

type TaxonomyRule = {
  slug: string;
  keywords: string[];
  brands?: string[];
  categoryHints?: string[];
  weight?: number;
};

const PRIORITY_RULES: TaxonomyRule[] = [
  {
    slug: "spectrometers",
    weight: 120,
    keywords: [
      "spectrometer",
      "spectrophotometer",
      "ftir",
      "uv vis",
      "uv/vis",
      "uv-vis",
      "nir",
      "infrared",
      "nicolet",
      "lambda",
      "atomic absorption",
      "raman",
    ],
    brands: [
      "perkinelmer",
      "perkin elmer",
      "thermo scientific",
      "thermo nicolet",
      "varian",
    ],
  },
  {
    slug: "chromatography",
    weight: 112,
    keywords: [
      "chromatography",
      "hplc",
      "gc",
      "lc ms",
      "lcms",
      "gcms",
      "autosampler",
      "fraction collector",
      "uhplc",
      "uplc",
    ],
    brands: ["waters", "agilent", "shimadzu", "dionex"],
  },
  {
    slug: "microscopes-imaging",
    weight: 106,
    keywords: [
      "microscope",
      "objective",
      "fluorescence",
      "slide scanner",
      "camera head",
    ],
    brands: ["zeiss", "leica", "olympus", "nikon"],
  },
  {
    slug: "centrifuges-lab-prep",
    weight: 98,
    keywords: [
      "centrifuge",
      "incubator",
      "shaker",
      "balance",
      "pipette",
      "autoclave",
      "water bath",
      "hotplate",
      "thermal cycler",
      "pcr",
      "microplate",
      "plate reader",
    ],
  },
  {
    slug: "general-lab-equipment",
    weight: 84,
    keywords: [
      "laboratory",
      "lab equipment",
      "scientific equipment",
      "freezer",
      "fridge",
      "oven",
      "bioreactor",
      "sequencer",
      "flow cytometer",
    ],
    brands: ["eppendorf", "sartorius", "fisher", "illumina"],
    categoryHints: ["healthcare lab dental", "medical lab"],
  },

  {
    slug: "oscilloscopes",
    weight: 110,
    keywords: [
      "oscilloscope",
      "mixed signal oscilloscope",
      "scope",
      "mdo",
      "dso",
    ],
    brands: ["tektronix", "lecroy"],
  },
  {
    slug: "analysers-meters",
    weight: 102,
    keywords: [
      "analyser",
      "analyzer",
      "meter",
      "multimeter",
      "spectrum analyser",
      "spectrum analyzer",
      "network analyser",
      "network analyzer",
      "power analyser",
      "power analyzer",
      "logic analyzer",
      "clamp meter",
    ],
    brands: ["fluke", "rohde", "anritsu", "keysight", "agilent", "hioki"],
  },
  {
    slug: "signal-calibration",
    weight: 96,
    keywords: [
      "signal generator",
      "function generator",
      "waveform generator",
      "calibrator",
      "calibration",
      "source measure",
      "smu",
      "frequency counter",
      "electronic load",
    ],
  },
  {
    slug: "data-acquisition",
    weight: 88,
    keywords: [
      "daq",
      "data acquisition",
      "data logger",
      "logger",
      "recorder",
      "chart recorder",
      "national instruments",
      "ni daq",
    ],
  },
  {
    slug: "safety-detection",
    weight: 80,
    keywords: [
      "gas detector",
      "flame detector",
      "light curtain",
      "emergency stop",
      "e stop",
      "interlock",
      "alarm",
      "msa",
      "general monitors",
      "draeger",
      "drager",
    ],
  },

  {
    slug: "plcs-industrial-controllers",
    weight: 110,
    keywords: [
      "plc",
      "programmable controller",
      "simatic",
      "s7",
      "cpu module",
      "input module",
      "output module",
      "i/o module",
      "io module",
      "bus coupler",
      "controllogix",
      "compactlogix",
      "micrologix",
      "modicon",
    ],
    brands: [
      "siemens",
      "allen bradley",
      "rockwell",
      "omron",
      "mitsubishi",
      "beckhoff",
      "fanuc",
      "pilz",
    ],
  },
  {
    slug: "hmi-operator-panels",
    weight: 104,
    keywords: [
      "hmi",
      "operator panel",
      "touch panel",
      "touchscreen",
      "panelview",
      "comfort panel",
      "basic panel",
      "magelis",
      "proface",
    ],
  },
  {
    slug: "drives-motion",
    weight: 100,
    keywords: [
      "drive",
      "vfd",
      "inverter",
      "servo drive",
      "servo amplifier",
      "motion control",
      "sinamics",
      "powerflex",
      "altivar",
      "soft starter",
    ],
    brands: ["danfoss", "lenze", "yaskawa", "sew eurodrive"],
  },
  {
    slug: "sensors-encoders",
    weight: 90,
    keywords: [
      "sensor",
      "encoder",
      "photoelectric",
      "proximity",
      "transducer",
      "probe",
      "limit switch",
    ],
    brands: ["sick", "ifm", "keyence", "balluff", "pepperl"],
  },
  {
    slug: "motors-gearboxes",
    weight: 82,
    keywords: [
      "motor",
      "gearbox",
      "gearmotor",
      "gear motor",
      "actuator",
      "servo motor",
      "stepper",
    ],
  },

  {
    slug: "power-supplies-transformers",
    weight: 86,
    keywords: [
      "power supply",
      "psu",
      "transformer",
      "rectifier",
      "24vdc",
      "battery charger",
      "sitop",
    ],
  },
  {
    slug: "switchgear-relays-contactors",
    weight: 84,
    keywords: [
      "relay",
      "contactor",
      "circuit breaker",
      "breaker",
      "mcb",
      "rcd",
      "fuse",
      "switchgear",
      "isolator",
      "overload",
      "terminal block",
      "din rail",
    ],
  },
  {
    slug: "cables-connectors",
    weight: 78,
    keywords: [
      "cable",
      "connector",
      "plug",
      "socket",
      "cordset",
      "terminal",
      "adapter",
      "lead",
      "harness",
      "sfp",
      "transceiver",
    ],
  },
  {
    slug: "pneumatics-hydraulics",
    weight: 82,
    keywords: [
      "pneumatic",
      "hydraulic",
      "solenoid valve",
      "cylinder",
      "pump",
      "filter regulator",
      "manifold",
      "air preparation",
    ],
    brands: ["festo", "smc", "rexroth", "parker", "norgren"],
  },

  {
    slug: "servers-storage",
    weight: 98,
    keywords: [
      "server",
      "storage",
      "nas",
      "san",
      "hard drive",
      "ssd",
      "blade",
      "rack server",
      "poweredge",
      "proliant",
      "netapp",
      "emc",
    ],
    brands: ["dell", "hp", "hewlett packard", "lenovo", "netapp", "emc"],
  },
  {
    slug: "switches-routers",
    weight: 102,
    keywords: [
      "network switch",
      "ethernet switch",
      "managed switch",
      "router",
      "firewall",
      "poe switch",
    ],
    brands: ["cisco", "juniper", "aruba", "fortinet", "sonicwall"],
  },
  {
    slug: "ups-power-protection",
    weight: 86,
    keywords: ["ups", "battery backup", "power protection", "pdu"],
    brands: ["apc", "eaton"],
  },
  {
    slug: "network-cables-fibre",
    weight: 72,
    keywords: [
      "fibre",
      "fiber",
      "network cable",
      "sfp",
      "qsfp",
      "patch panel",
      "patch lead",
      "cat6",
    ],
  },

  {
    slug: "projectors-lenses",
    weight: 102,
    keywords: ["projector", "projector lens", "lens"],
    brands: ["barco", "christie", "panasonic projector", "nec projector"],
  },
  {
    slug: "broadcast-video",
    weight: 94,
    keywords: [
      "broadcast",
      "video router",
      "matrix",
      "studio camera",
      "broadcast monitor",
      "vision mixer",
      "video switcher",
    ],
    brands: ["blackmagic", "aja", "grass valley"],
  },
  {
    slug: "audio-equipment",
    weight: 82,
    keywords: ["audio", "amplifier", "mixer", "speaker", "microphone", "dsp"],
    brands: ["shure", "sennheiser"],
  },
  {
    slug: "displays-video-walls",
    weight: 86,
    keywords: [
      "display",
      "video wall",
      "screen",
      "signage",
      "interactive display",
      "webex board",
      "smart board",
      "lcd panel",
      "led wall",
    ],
  },

  {
    slug: "uniforms-clothing",
    weight: 116,
    keywords: [
      "raf",
      "royal air force",
      "british army",
      "british forces",
      "uniform",
      "trousers",
      "skirt",
      "jacket",
      "wool",
      "no 1 dress",
      "no 2 dress",
      "military clothing",
    ],
    brands: ["raf", "royal air force", "british army"],
  },
  {
    slug: "field-gear-accessories",
    weight: 100,
    keywords: [
      "webbing",
      "helmet",
      "pouch",
      "belt",
      "field gear",
      "rucksack",
      "kit bag",
      "military accessory",
    ],
  },
  {
    slug: "surplus-equipment",
    weight: 90,
    keywords: [
      "military surplus",
      "army surplus",
      "mod surplus",
      "defence equipment",
      "surplus equipment",
      "militaria",
    ],
  },

  {
    slug: "process-instrumentation",
    weight: 94,
    keywords: [
      "flowmeter",
      "flow meter",
      "pressure transmitter",
      "level transmitter",
      "temperature transmitter",
      "process instrument",
      "instrumentation",
      "control valve",
      "positioner",
    ],
    brands: ["endress", "rosemount", "yokogawa"],
  },
  {
    slug: "machine-tools-workshop",
    weight: 82,
    keywords: [
      "cnc",
      "lathe",
      "milling",
      "workshop",
      "cutting",
      "drill",
      "fixture",
      "chuck",
      "press",
      "welder",
      "welding",
      "grinder",
      "saw",
    ],
  },
  {
    slug: "robotics-handling",
    weight: 84,
    keywords: [
      "robot",
      "robotics",
      "conveyor",
      "vision",
      "handling",
      "gripper",
      "pick and place",
      "cobot",
    ],
    brands: ["kuka"],
  },
];

function ruleScore(haystack: string, rule: TaxonomyRule) {
  const keywordScore = scoreAliases(haystack, rule.keywords);
  const brandScore = scoreAliases(haystack, rule.brands || []) * 0.75;
  const hintScore = scoreAliases(haystack, rule.categoryHints || []) * 0.8;
  const score = keywordScore + brandScore + hintScore;
  return score > 0 ? score + (rule.weight || 0) / 10 : 0;
}

function inferByRules(haystack: string) {
  let best: { score: number; slug: string } = { score: 0, slug: "" };
  for (const rule of PRIORITY_RULES) {
    const score = ruleScore(haystack, rule);
    if (score > best.score) best = { score, slug: rule.slug };
  }
  return best.score > 0 ? categoryForSubcategory(best.slug) : null;
}

function inferByScoring(
  haystack: string,
  preferredGroup?: CanonicalCategory | null,
) {
  let best: { score: number; category: CanonicalCategory } = {
    score: preferredGroup ? 1 : 0,
    category: preferredGroup || {
      groupLabel: "Electrical & Components",
      groupSlug: "electrical-components",
      subcategoryLabel: "Industrial Spares",
      subcategorySlug: "industrial-components-spares",
    },
  };

  for (const group of PUBLIC_CATEGORY_GROUPS) {
    const groupScore = scoreAliases(haystack, [
      group.label,
      group.slug,
      ...(group.aliases || []),
    ]);
    const groupBias = preferredGroup?.groupSlug === group.slug ? 5 : 0;
    if (groupScore + groupBias > best.score)
      best = {
        score: groupScore + groupBias,
        category: { groupLabel: group.label, groupSlug: group.slug },
      };
    for (const sub of group.subcategories) {
      const subScore =
        groupScore +
        groupBias +
        scoreAliases(haystack, [sub.label, sub.slug, ...(sub.aliases || [])]);
      if (subScore > best.score)
        best = {
          score: subScore,
          category: {
            groupLabel: group.label,
            groupSlug: group.slug,
            subcategoryLabel: sub.label,
            subcategorySlug: sub.slug,
          },
        };
    }
  }
  return best.category;
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
  // A canonical subcategory slug is already precise enough. A master slug is only a hint;
  // still inspect title/specs so imported products can fall under the right child category.
  if (exact?.subcategorySlug) return exact;

  const haystack = normaliseText(
    [
      args.title,
      args.category,
      args.categorySlug,
      args.brand,
      args.manufacturer,
      args.model,
      args.mpn,
      args.specsText,
    ]
      .filter(Boolean)
      .join(" "),
  );
  const ruleMatch = inferByRules(haystack);
  if (ruleMatch) return ruleMatch;

  const scored = inferByScoring(haystack, exact || null);
  return scored;
}

export function isPublicCategoryMatch(
  product: {
    category?: string | null;
    categorySlug?: string | null;
    subcategory?: string | null;
    subcategorySlug?: string | null;
    title?: string | null;
    brand?: string | null;
    manufacturer?: string | null;
    model?: string | null;
    mpn?: string | null;
    specs?: { label: string; value: string }[];
  },
  selectedSlug?: string | null,
) {
  const selected = normaliseSelectedCategorySlug(selectedSlug);
  if (!selected) return true;

  const directGroup = normaliseSelectedCategorySlug(product.categorySlug);
  const directSub = normaliseSelectedCategorySlug(product.subcategorySlug);
  if (selected === directGroup || selected === directSub) return true;
  if (
    isMasterCategorySlug(selected) &&
    (categorySlugBelongsToMaster(directSub, selected) ||
      categorySlugBelongsToMaster(directGroup, selected))
  )
    return true;

  const canonical = canonicalCategoryForText({
    title: product.title,
    category: product.category,
    categorySlug: product.subcategorySlug || product.categorySlug,
    brand: product.brand,
    manufacturer: product.manufacturer,
    model: product.model,
    mpn: product.mpn,
    specsText: product.specs?.map((s) => `${s.label} ${s.value}`).join(" "),
  });
  return (
    canonical.groupSlug === selected ||
    canonical.subcategorySlug === selected ||
    (isMasterCategorySlug(selected) && canonical.groupSlug === selected)
  );
}

export function selectedCategoryLabel(slug?: string | null) {
  const normalised = normaliseSelectedCategorySlug(slug);
  if (!normalised) return "All Categories";
  const found = getCanonicalBySlug(normalised);
  return found?.subcategoryLabel || found?.groupLabel || "Selected Category";
}
