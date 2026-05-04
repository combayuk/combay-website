import { CATEGORIES, PRODUCTS, type CatalogProduct, type ConditionCode } from "@/lib/catalog";

export type AdminProductStatus = "PUBLISHED" | "DRAFT" | "ARCHIVED";

export type AdminProduct = CatalogProduct & {
  status: AdminProductStatus;
  createdAt: string;
  updatedAt: string;
  source: "catalog" | "admin" | "ebay" | "csv";
  adminNotes?: string;
  weightKg?: string;
  dimensionsCm?: string;
  locationBin?: string;
  hsCode?: string;
};

const STORAGE_KEY = "combay_admin_products_v1";

const nowIso = () => new Date().toISOString();

export function toAdminProduct(product: CatalogProduct, index = 0): AdminProduct {
  return {
    ...product,
    status: "PUBLISHED",
    createdAt: "2026-05-01T09:00:00.000Z",
    updatedAt: "2026-05-01T09:00:00.000Z",
    source: "catalog",
    locationBin: index % 2 === 0 ? "WH-A" : "WH-B",
  };
}

export function getBaseAdminProducts(): AdminProduct[] {
  return PRODUCTS.map(toAdminProduct);
}

export function getStoredAdminProducts(): AdminProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredAdminProducts(products: AdminProduct[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

export function getAllAdminProducts(): AdminProduct[] {
  const base = getBaseAdminProducts();
  const stored = getStoredAdminProducts();
  const merged = new Map<string, AdminProduct>();
  base.forEach((product) => merged.set(product.id, product));
  stored.forEach((product) => merged.set(product.id, product));
  return Array.from(merged.values()).sort((a, b) => a.sku.localeCompare(b.sku));
}

export function getAdminProductById(id: string): AdminProduct | undefined {
  return getAllAdminProducts().find((product) => product.id === id || product.slug === id || product.sku === id);
}

export function getNextSku(): string {
  const max = getAllAdminProducts().reduce((highest, product) => {
    const match = product.sku.match(/^CBUK(\d{5})$/i);
    if (!match) return highest;
    return Math.max(highest, Number(match[1]));
  }, 0);
  return `CBUK${String(max + 1).padStart(5, "0")}`;
}

export function slugifyProductTitle(title: string, fallbackSku: string) {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || fallbackSku.toLowerCase();
}

export function upsertAdminProduct(product: AdminProduct) {
  const stored = getStoredAdminProducts();
  const next = stored.filter((item) => item.id !== product.id);
  next.push({ ...product, updatedAt: nowIso(), source: product.source === "catalog" ? "admin" : product.source });
  saveStoredAdminProducts(next);
}

export function deleteAdminProduct(id: string) {
  const baseProduct = getBaseAdminProducts().find((product) => product.id === id);
  const stored = getStoredAdminProducts().filter((product) => product.id !== id);
  if (baseProduct) {
    stored.push({ ...baseProduct, status: "ARCHIVED", updatedAt: nowIso(), source: "admin" });
  }
  saveStoredAdminProducts(stored);
}

export function duplicateAdminProduct(id: string) {
  const product = getAdminProductById(id);
  if (!product) return null;
  const sku = getNextSku();
  const duplicate: AdminProduct = {
    ...product,
    id: `prod-${sku.toLowerCase()}`,
    sku,
    slug: slugifyProductTitle(`${product.title} copy`, sku),
    title: `${product.title} copy`,
    status: "DRAFT",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    source: "admin",
  };
  upsertAdminProduct(duplicate);
  return duplicate;
}

export function createBlankAdminProduct(): AdminProduct {
  const sku = getNextSku();
  return {
    id: `prod-${sku.toLowerCase()}`,
    slug: sku.toLowerCase(),
    sku,
    title: "",
    brand: "",
    manufacturer: "",
    model: "",
    mpn: "",
    category: "Automation & Control",
    categorySlug: "automation-control",
    condition: "USED" as ConditionCode,
    price: null,
    priceOnRequest: false,
    stockQty: 1,
    stockStatus: "IN_STOCK",
    leadTime: "UK dispatch normally within 1–2 working days after cleared payment.",
    warranty: "30-day return-to-base warranty unless otherwise stated.",
    dispatchNote: "Packed for courier dispatch with serial number recorded before shipment.",
    image: null,
    description: "",
    productOverview: "",
    specs: [],
    documents: [],
    tags: [],
    status: "DRAFT",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    source: "admin",
  };
}

function normaliseCategory(label: string) {
  const trimmed = label.trim() || "Automation & Control";
  const match = CATEGORIES.find((category) => category.label.toLowerCase() === trimmed.toLowerCase());
  if (match && match.slug) return { label: match.label, slug: match.slug };
  return { label: trimmed, slug: slugifyProductTitle(trimmed, "category") };
}

function normaliseCondition(value: string): ConditionCode {
  const cleaned = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (["NEW", "NEW_OPEN_BOX", "USED", "FOR_PARTS"].includes(cleaned)) return cleaned as ConditionCode;
  if (cleaned.includes("OPEN")) return "NEW_OPEN_BOX";
  if (cleaned.includes("PART") || cleaned.includes("REPAIR")) return "FOR_PARTS";
  return "USED";
}

function parseBoolean(value: string | undefined) {
  return ["true", "yes", "y", "1", "poa"].includes(String(value ?? "").trim().toLowerCase());
}

function csvSplitLine(line: string) {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && insideQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function nextSkuFromProducts(products: AdminProduct[]) {
  const max = products.reduce((highest, product) => {
    const match = product.sku.match(/^CBUK(\d{5})$/i);
    if (!match) return highest;
    return Math.max(highest, Number(match[1]));
  }, 0);
  return `CBUK${String(max + 1).padStart(5, "0")}`;
}

export function importAdminProductsFromCsv(csvText: string) {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { imported: 0, updated: 0, errors: ["CSV must include a header row and at least one product row."] };
  }

  const headers = csvSplitLine(lines[0]).map((header) => header.trim().toLowerCase());
  const requiredHeaders = ["title", "brand", "mpn", "category"];
  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));

  if (missingHeaders.length) {
    return { imported: 0, updated: 0, errors: [`Missing required columns: ${missingHeaders.join(", ")}.`] };
  }

  const currentProducts = getAllAdminProducts();
  const bySku = new Map(currentProducts.map((product) => [product.sku.toLowerCase(), product]));
  const nextProducts = [...getStoredAdminProducts()];
  const nextById = new Map(nextProducts.map((product) => [product.id, product]));
  const errors: string[] = [];
  let imported = 0;
  let updated = 0;

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const values = csvSplitLine(lines[lineIndex]);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));

    const title = row.title?.trim();
    if (!title) {
      errors.push(`Row ${lineIndex + 1}: missing title.`);
      continue;
    }

    const suppliedSku = row.sku?.trim();
    const existing = suppliedSku ? bySku.get(suppliedSku.toLowerCase()) : undefined;
    const sku = suppliedSku || nextSkuFromProducts([...currentProducts, ...Array.from(nextById.values())]);
    const category = normaliseCategory(row.category ?? "Automation & Control");
    const priceOnRequest = parseBoolean(row.price_on_request);
    const price = priceOnRequest ? null : row.price ? Number(row.price) : null;
    const stockQty = Number(row.stock_qty || row.quantity || 0);
    const image = row.item_pic_url || row.image_url || row.image || null;
    const condition = normaliseCondition(row.condition ?? "USED");
    const id = existing?.id ?? `prod-${sku.toLowerCase()}`;
    const slug = existing?.slug ?? slugifyProductTitle(title, sku);

    const product: AdminProduct = {
      ...(existing ?? createBlankAdminProduct()),
      id,
      slug,
      sku,
      title,
      brand: row.brand ?? "",
      manufacturer: row.manufacturer || row.brand || "",
      model: row.model ?? "",
      mpn: row.mpn ?? "",
      category: category.label,
      categorySlug: category.slug,
      condition,
      price: Number.isFinite(price as number) ? price : null,
      priceOnRequest,
      stockQty: Number.isFinite(stockQty) ? stockQty : 0,
      stockStatus: stockQty <= 0 ? "OUT_OF_STOCK" : stockQty <= 2 ? "LOW_STOCK" : "IN_STOCK",
      leadTime: row.lead_time || "UK dispatch normally within 1–2 working days after cleared payment.",
      warranty: row.warranty || "30-day return-to-base warranty unless otherwise stated.",
      dispatchNote: row.dispatch_note || "Packed for courier dispatch with serial number recorded before shipment.",
      image: image || null,
      description: row.description || title,
      productOverview: row.product_overview || row.description || title,
      specs: existing?.specs ?? [],
      documents: existing?.documents ?? [],
      tags: [row.brand, row.manufacturer, row.model, row.mpn, row.category].filter(Boolean),
      status: (row.status?.toUpperCase() as AdminProductStatus) || "PUBLISHED",
      source: "csv",
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
      locationBin: row.location_bin || existing?.locationBin,
      hsCode: row.hs_code || existing?.hsCode,
      weightKg: row.weight_kg || existing?.weightKg,
      dimensionsCm: row.dimensions_cm || existing?.dimensionsCm,
      adminNotes: row.admin_notes || existing?.adminNotes,
    };

    nextById.set(product.id, product);
    bySku.set(product.sku.toLowerCase(), product);
    if (existing) updated += 1;
    else imported += 1;
  }

  saveStoredAdminProducts(Array.from(nextById.values()));
  return { imported, updated, errors };
}

export const CONDITION_OPTIONS: { value: ConditionCode; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "NEW_OPEN_BOX", label: "New open box" },
  { value: "USED", label: "Used tested" },
  { value: "FOR_PARTS", label: "For parts / repair" },
];
