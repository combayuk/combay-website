import { getProductBySku, type CatalogProduct } from "@/lib/catalog";

export const CART_STORAGE_KEY = "combay_cart_v1";

export type CartLine = {
  sku: string;
  qty: number;
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

export function readCartLines(): CartLine[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((line) => line && typeof line.sku === "string" && Number.isFinite(Number(line.qty)))
      .map((line) => ({ sku: line.sku, qty: Math.max(1, Math.floor(Number(line.qty))) }));
  } catch {
    return [];
  }
}

export function writeCartLines(lines: CartLine[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
  window.dispatchEvent(new CustomEvent("combay-cart-updated"));
}

export function addCartItem(sku: string, qty = 1) {
  const lines = readCartLines();
  const existing = lines.find((line) => line.sku === sku);

  if (existing) {
    existing.qty += qty;
  } else {
    lines.push({ sku, qty });
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
      const product = getProductBySku(line.sku);
      if (!product) return null;
      const price = product.priceOnRequest || product.price === null ? 0 : product.price;
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
