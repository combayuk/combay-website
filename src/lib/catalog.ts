export type ConditionCode = "NEW" | "NEW_OPEN_BOX" | "USED" | "FOR_PARTS";
export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "POA";

export type CatalogCategory = {
  label: string;
  slug: string;
};

export type ProductVariantOption = {
  id: string;
  sku?: string | null;
  label: string;
  optionName?: string | null;
  optionValue?: string | null;
  price?: number | null;
  stockQty: number;
  sortOrder?: number;
};

export type CatalogProduct = {
  id: string;
  slug: string;
  sku: string;
  title: string;
  brand: string;
  manufacturer: string;
  model: string;
  mpn: string;
  category: string;
  categorySlug: string;
  condition: ConditionCode;
  price: number | null;
  priceOnRequest: boolean;
  stockQty: number;
  stockStatus: StockStatus;
  leadTime: string;
  warranty: string;
  dispatchNote: string;
  image: string | null;
  videoUrl?: string | null;
  itemLocation?: string | null;
  images?: { url: string; alt?: string | null; isPrimary?: boolean; sortOrder?: number }[];
  variants?: ProductVariantOption[];
  description: string;
  productOverview: string;
  specs: { label: string; value: string }[];
  documents: { name: string; url: string; fileType: string }[];
  tags: string[];
};

export const CATEGORIES: CatalogCategory[] = [
  { label: "All Categories", slug: "" },
  { label: "Automation & Control", slug: "automation-control" },
  { label: "PLCs & Industrial Controllers", slug: "plcs-industrial-controllers" },
  { label: "HMI & Operator Panels", slug: "hmi-operator-panels" },
  { label: "Sensors & Encoders", slug: "sensors-encoders" },
  { label: "Drives & Motion", slug: "drives-motion" },
  { label: "Motors & Gearboxes", slug: "motors-gearboxes" },
  { label: "Power Supplies & Transformers", slug: "power-supplies-transformers" },
  { label: "Electrical Components", slug: "electrical-components" },
  { label: "Cables & Connectors", slug: "cables-connectors" },
  { label: "Pneumatics & Hydraulics", slug: "pneumatics-hydraulics" },
  { label: "Process Instrumentation", slug: "process-instrumentation" },
  { label: "Safety & Detection", slug: "safety-detection" },
  { label: "Test & Measurement", slug: "test-measurement" },
  { label: "Lab & Scientific", slug: "lab-scientific" },
  { label: "IT & Networking", slug: "it-networking" },
  { label: "AV & Broadcast", slug: "av-broadcast" },
  { label: "Machine Tools & Workshop", slug: "machine-tools-workshop" },
  { label: "Industrial Components & Spares", slug: "industrial-components-spares" },
];

export const CONDITION_LABELS: Record<ConditionCode, { label: string; description: string; color: string }> = {
  NEW: {
    label: "New",
    description: "Unused stock, normally supplied in original or replacement packaging.",
    color: "text-green-700 bg-green-50 border-green-200",
  },
  NEW_OPEN_BOX: {
    label: "New open box",
    description: "Unused or surplus item where packaging has been opened or replaced.",
    color: "text-blue-700 bg-blue-50 border-blue-200",
  },
  USED: {
    label: "Used tested",
    description: "Pre-owned item visually inspected and power/function checked where practical.",
    color: "text-yellow-800 bg-yellow-50 border-yellow-200",
  },
  FOR_PARTS: {
    label: "For parts / repair",
    description: "Sold for spares, repair or refurbishment. No functional warranty unless stated.",
    color: "text-red-700 bg-red-50 border-red-200",
  },
};

export const PRODUCTS: CatalogProduct[] = [
  {
    id: "prod-cbuk00001",
    slug: "siemens-s7-400-cpu-412-2-6es7412-2xj05-0ab0",
    sku: "CBUK00001",
    title: "Siemens SIMATIC S7-400 CPU 412-2 PLC Module",
    brand: "Siemens",
    manufacturer: "Siemens AG",
    model: "CPU 412-2",
    mpn: "6ES7412-2XJ05-0AB0",
    category: "Automation & Control",
    categorySlug: "automation-control",
    condition: "USED",
    price: 1240,
    priceOnRequest: false,
    stockQty: 2,
    stockStatus: "LOW_STOCK",
    leadTime: "UK dispatch normally within 1–2 working days after cleared payment.",
    warranty: "30-day return-to-base warranty unless otherwise stated.",
    dispatchNote: "Packed for courier dispatch with serial number recorded before shipment.",
    image: null,
    videoUrl: null,
    description: "Used Siemens S7-400 CPU module for process and plant automation. Suitable for replacement stock, breakdown support and legacy system maintenance.",
    productOverview: "The SIMATIC S7-400 range is widely used in industrial control systems where dependable PLC replacement stock is required. This listing is structured for engineering procurement with SKU, MPN, condition and dispatch information clearly visible.",
    specs: [
      { label: "Series", value: "SIMATIC S7-400" },
      { label: "Module type", value: "CPU / PLC processor" },
      { label: "MPN", value: "6ES7412-2XJ05-0AB0" },
      { label: "Typical application", value: "Industrial automation, PLC replacement, plant maintenance" },
    ],
    documents: [{ name: "Siemens S7-400 system manual", url: "#", fileType: "PDF" }],
    tags: ["PLC", "S7-400", "Siemens", "CPU", "6ES7412"],
  },
  {
    id: "prod-cbuk00002",
    slug: "thermo-scientific-nicolet-is5-ftir-spectrometer-id5-atr",
    sku: "CBUK00002",
    title: "Thermo Scientific Nicolet iS5 FTIR Spectrometer with ID5 ATR",
    brand: "Thermo Scientific",
    manufacturer: "Thermo Fisher Scientific",
    model: "Nicolet iS5",
    mpn: "Nicolet iS5 / ID5 ATR",
    category: "Lab & Scientific",
    categorySlug: "lab-scientific",
    condition: "USED",
    price: 2450,
    priceOnRequest: false,
    stockQty: 1,
    stockStatus: "LOW_STOCK",
    leadTime: "Specialist packing. Dispatch normally within 2–3 working days.",
    warranty: "30-day return-to-base warranty covering arrival as described.",
    dispatchNote: "Ships on reinforced packaging; collection welcome by appointment.",
    image: null,
    videoUrl: null,
    description: "Compact FTIR spectrometer package for materials identification, QA laboratories and teaching environments. Supplied as used scientific equipment subject to pre-dispatch visual and power checks.",
    productOverview: "Industrial and laboratory buyers often need clear accessory details. This product record separates main instrument, accessory, condition and documents so it can later sync cleanly from eBay or CSV imports.",
    specs: [
      { label: "Instrument type", value: "FTIR spectrometer" },
      { label: "Accessory", value: "ID5 ATR" },
      { label: "Application", value: "Materials identification, QA, education" },
      { label: "Included", value: "Instrument/accessory as described in listing" },
    ],
    documents: [{ name: "Nicolet iS5 product information", url: "#", fileType: "PDF" }],
    tags: ["FTIR", "Spectrometer", "ATR", "Thermo", "Nicolet"],
  },
  {
    id: "prod-cbuk00003",
    slug: "abb-acs550-75kw-ac-drive-inverter",
    sku: "CBUK00003",
    title: "ABB ACS550 AC Drive Inverter 75kW",
    brand: "ABB",
    manufacturer: "ABB",
    model: "ACS550",
    mpn: "ACS550-01 Series",
    category: "Drives & Motion",
    categorySlug: "drives-motion",
    condition: "USED",
    price: 890,
    priceOnRequest: false,
    stockQty: 3,
    stockStatus: "IN_STOCK",
    leadTime: "UK dispatch normally within 1–2 working days.",
    warranty: "30-day return-to-base warranty unless sold for parts.",
    dispatchNote: "Weight and pallet requirements confirmed before dispatch.",
    image: null,
    videoUrl: null,
    description: "ABB variable speed drive for industrial motor control, plant maintenance and spare part replacement.",
    productOverview: "Large drives require clear dispatch and condition information. This record supports weight/dimensions fields later in the admin product editor.",
    specs: [
      { label: "Power rating", value: "75kW" },
      { label: "Drive family", value: "ACS550" },
      { label: "Use case", value: "Motor speed control / VFD replacement" },
      { label: "Supply", value: "Industrial three-phase applications" },
    ],
    documents: [{ name: "ABB ACS550 user manual", url: "#", fileType: "PDF" }],
    tags: ["ABB", "ACS550", "Drive", "VFD", "Inverter"],
  },
  {
    id: "prod-cbuk00004",
    slug: "tektronix-mdo3054-mixed-domain-oscilloscope",
    sku: "CBUK00004",
    title: "Tektronix MDO3054 Mixed Domain Oscilloscope",
    brand: "Tektronix",
    manufacturer: "Tektronix",
    model: "MDO3054",
    mpn: "MDO3054",
    category: "Test & Measurement",
    categorySlug: "test-measurement",
    condition: "USED",
    price: 875,
    priceOnRequest: false,
    stockQty: 1,
    stockStatus: "LOW_STOCK",
    leadTime: "Dispatch normally within 1–2 working days after checks.",
    warranty: "30-day return-to-base warranty for arrival as described.",
    dispatchNote: "Calibration status is stated only where certificate is included.",
    image: null,
    videoUrl: null,
    description: "Mixed domain oscilloscope for electronics diagnostics, maintenance workshops and engineering labs.",
    productOverview: "Test equipment listings should clearly distinguish functionality checks from formal calibration. The site should avoid implying calibration unless documentation is uploaded.",
    specs: [
      { label: "Bandwidth", value: "500 MHz class" },
      { label: "Channels", value: "4 analogue channels" },
      { label: "Instrument type", value: "Mixed domain oscilloscope" },
      { label: "Calibration", value: "Not included unless stated" },
    ],
    documents: [{ name: "Tektronix MDO3000 series datasheet", url: "#", fileType: "PDF" }],
    tags: ["Oscilloscope", "Tektronix", "MDO3054", "Test equipment"],
  },
  {
    id: "prod-cbuk00005",
    slug: "cisco-catalyst-3750-network-switch-stack",
    sku: "CBUK00005",
    title: "Cisco Catalyst 3750 Stackable Network Switch",
    brand: "Cisco",
    manufacturer: "Cisco Systems",
    model: "Catalyst 3750",
    mpn: "WS-C3750 Series",
    category: "IT & Networking",
    categorySlug: "it-networking",
    condition: "USED",
    price: 435,
    priceOnRequest: false,
    stockQty: 4,
    stockStatus: "IN_STOCK",
    leadTime: "Dispatch normally within 1 working day.",
    warranty: "30-day return-to-base warranty.",
    dispatchNote: "Configuration wiped where practical before dispatch.",
    image: null,
    videoUrl: null,
    description: "Used Cisco stackable switch for replacement stock, lab use or network maintenance.",
    productOverview: "Networking products need clear reset/configuration wording and exact MPN fields to support procurement searches.",
    specs: [
      { label: "Series", value: "Catalyst 3750" },
      { label: "Type", value: "Stackable managed switch" },
      { label: "Use case", value: "Network replacement, lab, maintenance" },
      { label: "Configuration", value: "Wiped/reset where practical" },
    ],
    documents: [{ name: "Cisco Catalyst 3750 datasheet", url: "#", fileType: "PDF" }],
    tags: ["Cisco", "Catalyst", "3750", "Switch", "Network"],
  },
  {
    id: "prod-cbuk00006",
    slug: "msa-general-monitors-tl105-test-lamp-flame-detector",
    sku: "CBUK00006",
    title: "MSA General Monitors TL105 Test Lamp for Flame Detectors",
    brand: "MSA General Monitors",
    manufacturer: "MSA Safety",
    model: "TL105",
    mpn: "TL105 / 71655-2",
    category: "Safety & Detection",
    categorySlug: "safety-detection",
    condition: "USED",
    price: 420,
    priceOnRequest: false,
    stockQty: 2,
    stockStatus: "LOW_STOCK",
    leadTime: "Dispatch normally within 1–2 working days.",
    warranty: "30-day return-to-base warranty unless otherwise stated.",
    dispatchNote: "Hazardous area suitability must be verified by buyer before use.",
    image: null,
    videoUrl: null,
    description: "Specialist test lamp used for flame detection system checks in industrial and safety environments.",
    productOverview: "Safety equipment records need conservative wording and buyer verification notes to avoid overstatement of certification or suitability.",
    specs: [
      { label: "Instrument type", value: "Flame detector test lamp" },
      { label: "Model", value: "TL105" },
      { label: "Part reference", value: "71655-2" },
      { label: "Application", value: "Flame detection testing" },
    ],
    documents: [{ name: "MSA TL105 information sheet", url: "#", fileType: "PDF" }],
    tags: ["MSA", "General Monitors", "TL105", "Flame detector", "Test lamp"],
  },
  {
    id: "prod-cbuk00007",
    slug: "barco-rlm-w12-projector-used-av",
    sku: "CBUK00007",
    title: "Barco RLM W12 Projector for AV / Installation Use",
    brand: "Barco",
    manufacturer: "Barco",
    model: "RLM W12",
    mpn: "RLM-W12",
    category: "AV & Broadcast",
    categorySlug: "av-broadcast",
    condition: "USED",
    price: 3200,
    priceOnRequest: false,
    stockQty: 1,
    stockStatus: "LOW_STOCK",
    leadTime: "Specialist packed dispatch within 2–3 working days.",
    warranty: "30-day return-to-base warranty for arrival as described.",
    dispatchNote: "Lens, lamp hours and accessories must be checked against listing notes.",
    image: null,
    videoUrl: null,
    description: "Professional projector suitable for event, installation and AV replacement applications.",
    productOverview: "AV products should capture lamp hours, lens information and accessories as structured product fields during later admin build-out.",
    specs: [
      { label: "Type", value: "Professional projector" },
      { label: "Model", value: "RLM W12" },
      { label: "Use case", value: "AV installation / events / replacement" },
      { label: "Accessory note", value: "Lens/accessories as listed" },
    ],
    documents: [{ name: "Barco RLM W12 datasheet", url: "#", fileType: "PDF" }],
    tags: ["Barco", "Projector", "RLM W12", "AV"],
  },
  {
    id: "prod-cbuk00008",
    slug: "endress-hauser-promag-flow-meter-process-instrument",
    sku: "CBUK00008",
    title: "Endress+Hauser Promag Electromagnetic Flow Meter",
    brand: "Endress+Hauser",
    manufacturer: "Endress+Hauser",
    model: "Promag",
    mpn: "Promag Series",
    category: "Process Instrumentation",
    categorySlug: "process-instrumentation",
    condition: "NEW_OPEN_BOX",
    price: null,
    priceOnRequest: true,
    stockQty: 1,
    stockStatus: "POA",
    leadTime: "Dispatch time confirmed after specification review.",
    warranty: "Warranty/return terms confirmed with quote due to configuration-specific suitability.",
    dispatchNote: "Buyer must confirm process compatibility and exact part configuration.",
    image: null,
    videoUrl: null,
    description: "Process flow measurement equipment for industrial plant applications. Exact configuration should be confirmed before purchase.",
    productOverview: "Process instruments often require quote-led sale because configuration, calibration and site suitability affect purchase decision.",
    specs: [
      { label: "Instrument type", value: "Electromagnetic flow meter" },
      { label: "Series", value: "Promag" },
      { label: "Application", value: "Process flow measurement" },
      { label: "Sale type", value: "Quote recommended" },
    ],
    documents: [{ name: "Promag product overview", url: "#", fileType: "PDF" }],
    tags: ["Endress", "Hauser", "Promag", "Flow meter", "Process"],
  },
];

export function getProductBySlug(slug: string): CatalogProduct | undefined {
  return PRODUCTS.find((product) => product.slug === slug);
}

export function getProductBySku(sku: string): CatalogProduct | undefined {
  return PRODUCTS.find((product) => product.sku.toLowerCase() === sku.toLowerCase());
}

export function productMatchesQuery(product: CatalogProduct, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    product.sku,
    product.title,
    product.brand,
    product.manufacturer,
    product.model,
    product.mpn,
    product.category,
    product.categorySlug,
    ...product.tags,
    ...product.specs.map((spec) => `${spec.label} ${spec.value}`),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function searchProducts({
  query = "",
  category = "",
  condition = "",
  priceMin,
  priceMax,
}: {
  query?: string;
  category?: string;
  condition?: string;
  priceMin?: number | null;
  priceMax?: number | null;
}): CatalogProduct[] {
  return PRODUCTS.filter((product) => {
    if (!productMatchesQuery(product, query)) return false;
    if (category && product.categorySlug !== category) return false;
    if (condition && product.condition !== condition) return false;
    if (typeof priceMin === "number" && !product.priceOnRequest && product.price !== null && product.price < priceMin) return false;
    if (typeof priceMax === "number" && !product.priceOnRequest && product.price !== null && product.price > priceMax) return false;
    return true;
  });
}
