import { PRODUCTS, type CatalogProduct, type ConditionCode } from "@/lib/catalog";

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

export const CONDITION_OPTIONS: { value: ConditionCode; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "NEW_OPEN_BOX", label: "New open box" },
  { value: "USED", label: "Used tested" },
  { value: "FOR_PARTS", label: "For parts / repair" },
];
