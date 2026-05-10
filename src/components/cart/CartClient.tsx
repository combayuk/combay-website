"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight } from "lucide-react";
import AccountBenefitBanner from "@/components/commerce/AccountBenefitBanner";
import {
  formatCurrency,
  getCartSummary,
  readCartLines,
  removeCartItem,
  updateCartItemQty,
  type CartLine,
} from "@/lib/cart";

export default function CartClient() {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    setLines(readCartLines());

    const sync = () => setLines(readCartLines());
    window.addEventListener("storage", sync);
    window.addEventListener("combay-cart-updated", sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("combay-cart-updated", sync as EventListener);
    };
  }, []);

  const summary = useMemo(() => getCartSummary(lines), [lines]);

  function changeQty(sku: string, qty: number, variantId?: string, variantSku?: string | null, availableQty?: number) {
    const maxQty = Math.max(0, Number(availableQty ?? qty));
    const nextQty = maxQty > 0 ? Math.min(Math.max(1, qty), maxQty) : 0;
    updateCartItemQty(sku, nextQty, variantId, variantSku);
    setLines(readCartLines());
  }

  function remove(sku: string, variantId?: string, variantSku?: string | null) {
    removeCartItem(sku, variantId, variantSku);
    setLines(readCartLines());
  }

  if (summary.lines.length === 0) {
    return (
      <div className="bg-gray-50 min-h-screen py-14">
        <div className="max-w-3xl mx-auto px-4 text-center bg-white border border-gray-200 rounded-2xl p-10">
          <ShoppingCart size={34} className="mx-auto text-gray-300 mb-4" />
          <h1 className="font-display font-800 text-2xl text-navy-950 mb-2">Your cart is empty</h1>
          <p className="text-sm text-gray-500 mb-6">Add stocked products from the inventory to begin a purchase request.</p>
          <Link href="/shop" className="btn-primary">Browse inventory</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-navy-950 text-white py-10">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-mono text-xs tracking-widest uppercase text-accent mb-2">Checkout preparation</p>
          <h1 className="font-display font-900 text-3xl lg:text-4xl">Your cart</h1>
          <p className="text-gray-400 text-sm mt-2">Review items before entering delivery details. Prices shown exclude VAT until checkout summary.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-4">
          <AccountBenefitBanner />
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {summary.lines.map(({ product, variant, qty, lineTotal, availableQty }) => {
            const unavailable = availableQty <= 0 || product.priceOnRequest || qty > availableQty;
            return (
              <div key={`${product.sku}-${variant?.id || variant?.sku || "base"}`} className="p-5 border-b border-gray-100 last:border-b-0 grid md:grid-cols-[96px_1fr_auto] gap-4">
                <Link href={`/shop/${product.slug}`} className="bg-surface border border-gray-200 rounded-xl aspect-square flex items-center justify-center">
                  {product.image ? <img src={product.image} alt={product.title} className="object-contain w-full h-full p-3" /> : <span className="text-3xl text-gray-300">📦</span>}
                </Link>

                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-mono text-[11px] text-gray-400">{product.sku}{variant?.sku ? ` / ${variant.sku}` : ""}</span>
                    {unavailable && <span className="badge text-red-700 bg-red-50 border-red-200">Action needed</span>}
                  </div>
                  <Link href={`/shop/${product.slug}`} className="font-display font-800 text-navy-950 hover:text-accent transition-colors">{product.title}</Link>{variant && <p className="text-xs text-navy-700 font-display font-700 mt-1">Variation: {variant.label}</p>}
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-500 mt-2">
                    <p><span className="text-gray-400">Brand:</span> {product.brand}</p>
                    <p><span className="text-gray-400">MPN:</span> {product.mpn}</p>
                    <p><span className="text-gray-400">Condition:</span> {product.condition.replaceAll("_", " ")}</p>
                    <p><span className="text-gray-400">Stock:</span> {availableQty}</p>
                  </div>
                  {unavailable && (
                    <p className="text-xs text-red-600 mt-2">This item cannot proceed to checkout until stock/price is confirmed. Use Request Quote for this item.</p>
                  )}
                </div>

                <div className="md:text-right">
                  <p className="font-display font-800 text-navy-950 mb-3">{product.priceOnRequest || product.price === null ? "POA" : formatCurrency(lineTotal)}</p>
                  <div className="inline-flex items-center border border-gray-200 rounded-lg overflow-hidden mb-3">
                    <button onClick={() => changeQty(product.sku, qty - 1, variant?.id, variant?.sku, availableQty)} className="p-2 hover:bg-gray-50" aria-label="Decrease quantity"><Minus size={13} /></button>
                    <span className="px-3 text-sm font-display font-700 min-w-10 text-center">{qty}</span>
                    <button onClick={() => changeQty(product.sku, qty + 1, variant?.id, variant?.sku, availableQty)} disabled={qty >= availableQty} className="p-2 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Increase quantity"><Plus size={13} /></button>
                  </div>
                  <button onClick={() => remove(product.sku, variant?.id, variant?.sku)} className="flex md:ml-auto items-center gap-1 text-xs text-red-500 hover:text-red-700 font-600">
                    <Trash2 size={13} /> Remove
                  </button>
                </div>
              </div>
            );
          })}
          </div>
        </div>

        <aside className="bg-white border border-gray-200 rounded-2xl p-5 h-fit sticky top-24">
          <h2 className="font-display font-800 text-xl text-navy-950 mb-4">Order summary</h2>
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-display font-700 text-navy-950">{formatCurrency(summary.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">VAT estimate</span><span className="font-display font-700 text-navy-950">{formatCurrency(summary.vat)}</span></div>
            <div className="border-t border-gray-200 pt-2 flex justify-between text-base"><span className="font-display font-800 text-navy-950">Total</span><span className="font-display font-900 text-navy-950">{formatCurrency(summary.total)}</span></div>
          </div>
          <p className="text-xs text-gray-500 mb-4">Final delivery cost and VAT treatment are confirmed at checkout. Export orders may require manual confirmation.</p>
          {summary.hasUnavailableItems ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 mb-4">One or more items require quote confirmation before checkout.</div>
          ) : null}
          <Link href="/checkout" className={`btn-primary w-full ${summary.hasUnavailableItems ? "pointer-events-none opacity-50" : ""}`}>Proceed to checkout <ArrowRight size={14} /></Link>
          <Link href="/shop" className="btn-secondary w-full mt-2">Continue shopping</Link>
        </aside>
      </div>
    </div>
  );
}
