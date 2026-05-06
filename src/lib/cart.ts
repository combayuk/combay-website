import { getProductBySku, type CatalogProduct, type ProductVariantOption } from "@/lib/catalog";

export const CART_STORAGE_KEY = "combay_cart_v1";

export type CartProductSnapshot = CatalogProduct;

export type CartLine = {
  sku: string;
  qty: number;
  variantId?: string;
  variantSku?: string | null;
  variantLabel?: string | null;
  product?: CartProductSnapshot;
};

export type CartProductLine = {
  product: CatalogProduct;
  variant: ProductVariantOption | null;
  qty: number;
  unitPrice: number;
  availableQty: number;
  lineTotal: number;
};

export type CartSummary = {
  lines: CartProductLine[];
  subtotal: number;
  vat: number;
  total: number;
  hasUnavailableItems: boolean;
};

function lineKey(line: Pick<CartLine, "sku" | "variantId" | "variantSku">) {
  return `${line.sku}::${line.variantId || line.variantSku || "base"}`;
}

function findVariant(product: CatalogProduct, line: Pick<CartLine, "variantId" | "variantSku">) {
  const variants = product.variants ?? [];
  if (!variants.length) return null;
  return variants.find((variant) => variant.id === line.variantId || (line.variantSku && variant.sku === line.variantSku)) ?? null;
}

function normaliseLine(line: any): CartLine | null {
  if (!line || typeof line.sku !== "string" || !Number.isFinite(Number(line.qty))) return null;
  return {
    sku: line.sku,
    qty: Math.max(1, Math.floor(Number(line.qty))),
    variantId: typeof line.variantId === "string" ? line.variantId : undefined,
    variantSku: typeof line.variantSku === "string" ? line.variantSku : undefined,
    variantLabel: typeof line.variantLabel === "string" ? line.variantLabel : undefined,
    product: line.product && typeof line.product === "object" ? line.product : undefined,
  };
}

export function readCartLines(): CartLine[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normaliseLine).filter((line): line is CartLine => Boolean(line));
  } catch {
    return [];
  }
}

export function writeCartLines(lines: CartLine[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
  window.dispatchEvent(new CustomEvent("combay-cart-updated"));
}

export function addCartItem(productOrSku: CatalogProduct | string, qty = 1, variant?: ProductVariantOption | null) {
  const sku = typeof productOrSku === "string" ? productOrSku : productOrSku.sku;
  const product = typeof productOrSku === "string" ? undefined : productOrSku;
  const incoming: CartLine = {
    sku,
    qty: Math.max(1, Math.floor(Number(qty || 1))),
    product,
    variantId: variant?.id,
    variantSku: variant?.sku ?? undefined,
    variantLabel: variant?.label ?? undefined,
  };
  const lines = readCartLines();
  const existing = lines.find((line) => lineKey(line) === lineKey(incoming));

  if (existing) {
    existing.qty += incoming.qty;
    if (product) existing.product = product;
    if (variant) {
      existing.variantId = variant.id;
      existing.variantSku = variant.sku;
      existing.variantLabel = variant.label;
    }
  } else {
    lines.push(incoming);
  }

  writeCartLines(lines);
}

export function removeCartItem(sku: string, variantId?: string, variantSku?: string | null) {
  writeCartLines(readCartLines().filter((line) => lineKey(line) !== lineKey({ sku, variantId, variantSku })));
}

export function updateCartItemQty(sku: string, qty: number, variantId?: string, variantSku?: string | null) {
  if (qty <= 0) {
    removeCartItem(sku, variantId, variantSku);
    return;
  }

  writeCartLines(
    readCartLines().map((line) => (lineKey(line) === lineKey({ sku, variantId, variantSku }) ? { ...line, qty: Math.max(1, Math.floor(qty)) } : line))
  );
}

export function clearCart() {
  writeCartLines([]);
}

export function getCartSummary(lines: CartLine[]): CartSummary {
  const productLines = lines
    .map((line) => {
      const product = line.product ?? getProductBySku(line.sku);
      if (!product) return null;
      const variant = findVariant(product, line);
      const unitPrice = variant?.price !== null && variant?.price !== undefined ? Number(variant.price) : product.priceOnRequest || product.price === null ? 0 : Number(product.price);
      const availableQty = variant ? variant.stockQty : product.stockQty;
      return {
        product,
        variant,
        qty: line.qty,
        unitPrice,
        availableQty,
        lineTotal: unitPrice * line.qty,
      } satisfies CartProductLine;
    })
    .filter((line): line is CartProductLine => Boolean(line));

  const subtotal = productLines.reduce((sum, line) => sum + line.lineTotal, 0);
  const vat = subtotal * 0.2;
  const total = subtotal + vat;
  const hasUnavailableItems = productLines.some(
    (line) => line.availableQty <= 0 || line.product.priceOnRequest || line.unitPrice <= 0 || line.qty > line.availableQty
  );

  return { lines: productLines, subtotal, vat, total, hasUnavailableItems };
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value);
}
