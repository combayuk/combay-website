import { getProductBySku, type CatalogProduct } from "@/lib/catalog";

export const CART_STORAGE_KEY = "combay_cart_v1";

export type CartProductSnapshot = CatalogProduct;

export type CartLine = {
  sku: string;
  qty: number;
  product?: CartProductSnapshot;
};

export type CartProductLine = {
  product: CatalogProduct;
  qty: number;
  lineTotal: number;
};

export type CartSummary = {
  lines: CartProductLine[];
  subtotal: number;
  vat: number;
  total: number;
  hasUnavailableItems: boolean;
};

function normaliseLine(line: any): CartLine | null {
  if (!line || typeof line.sku !== "string" || !Number.isFinite(Number(line.qty))) return null;
  return {
    sku: line.sku,
    qty: Math.max(1, Math.floor(Number(line.qty))),
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

export function addCartItem(productOrSku: CatalogProduct | string, qty = 1) {
  const sku = typeof productOrSku === "string" ? productOrSku : productOrSku.sku;
  const product = typeof productOrSku === "string" ? undefined : productOrSku;
  const lines = readCartLines();
  const existing = lines.find((line) => line.sku === sku);

  if (existing) {
    existing.qty += qty;
    if (product) existing.product = product;
  } else {
    lines.push({ sku, qty, product });
  }

  writeCartLines(lines);
}

export function removeCartItem(sku: string) {
  writeCartLines(readCartLines().filter((line) => line.sku !== sku));
}

export function updateCartItemQty(sku: string, qty: number) {
  if (qty <= 0) {
    removeCartItem(sku);
    return;
  }

  writeCartLines(
    readCartLines().map((line) => (line.sku === sku ? { ...line, qty: Math.max(1, Math.floor(qty)) } : line))
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
      const price = product.priceOnRequest || product.price === null ? 0 : Number(product.price);
      return {
        product,
        qty: line.qty,
        lineTotal: price * line.qty,
      } satisfies CartProductLine;
    })
    .filter((line): line is CartProductLine => Boolean(line));

  const subtotal = productLines.reduce((sum, line) => sum + line.lineTotal, 0);
  const vat = subtotal * 0.2;
  const total = subtotal + vat;
  const hasUnavailableItems = productLines.some(
    (line) => line.product.stockQty <= 0 || line.product.priceOnRequest || line.product.price === null || line.qty > line.product.stockQty
  );

  return { lines: productLines, subtotal, vat, total, hasUnavailableItems };
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value);
}
