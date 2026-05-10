"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
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
  const itemCount = summary.lines.reduce((sum, line) => sum + line.qty, 0);

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
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="mx-auto max-w-3xl px-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <ShoppingCart size={34} className="mx-auto mb-4 text-gray-300" />
            <h1 className="mb-2 font-display text-2xl font-900 text-navy-950">Your cart is empty</h1>
            <p className="mb-6 text-sm text-gray-500">Add stocked products from the inventory to begin a purchase request.</p>
            <Link href="/shop" className="btn-primary py-2 text-xs">Browse inventory</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-7">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-accent">Checkout preparation</p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl font-900">Your cart</h1>
              <p className="mt-1 text-sm text-gray-400">Review stocked items before entering delivery details. Prices exclude VAT until checkout summary.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 font-900">{summary.lines.length} line{summary.lines.length === 1 ? "" : "s"}</span>
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 font-900">{itemCount} item{itemCount === 1 ? "" : "s"}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 space-y-3">
          <AccountBenefitBanner />

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-3">
              <h2 className="font-display text-base font-900 text-navy-950">Cart items</h2>
              <p className="text-xs text-gray-500">Check quantities, availability and exact SKU before checkout.</p>
            </div>

            {summary.lines.map(({ product, variant, qty, lineTotal, availableQty, unitPrice }) => {
              const unavailable = availableQty <= 0 || product.priceOnRequest || qty > availableQty;
              const key = `${product.sku}-${variant?.id || variant?.sku || "base"}`;

              return (
                <article key={key} className="grid gap-3 border-b border-gray-100 px-3 py-3 last:border-b-0 md:grid-cols-[76px_minmax(0,1fr)_170px] md:items-center">
                  <Link href={`/shop/${product.slug}`} className="flex aspect-square h-20 w-20 items-center justify-center rounded-xl border border-gray-200 bg-surface md:h-[76px] md:w-[76px]">
                    {product.image ? <img src={product.image} alt={product.title} className="h-full w-full object-contain p-2" /> : <span className="text-3xl text-gray-300">📦</span>}
                  </Link>

                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[10.5px] text-gray-400">{product.sku}{variant?.sku ? ` / ${variant.sku}` : ""}</span>
                      {unavailable ? <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-900 text-red-700">Action needed</span> : <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-900 text-green-700">Available</span>}
                    </div>
                    <Link href={`/shop/${product.slug}`} className="block truncate font-display text-sm font-900 text-navy-950 transition-colors hover:text-accent">{product.title}</Link>
                    {variant ? <p className="mt-0.5 truncate text-[11px] font-800 text-navy-700">Variation: {variant.label}</p> : null}
                    <div className="mt-1.5 grid gap-x-4 gap-y-0.5 text-[11px] text-gray-500 sm:grid-cols-2">
                      <p className="truncate"><span className="text-gray-400">Brand:</span> {product.brand || product.manufacturer || "—"}</p>
                      <p className="truncate"><span className="text-gray-400">MPN:</span> {product.mpn || product.model || "—"}</p>
                      <p><span className="text-gray-400">Stock:</span> {availableQty}</p>
                      <p><span className="text-gray-400">Unit:</span> {product.priceOnRequest || product.price === null ? "POA" : formatCurrency(unitPrice)}</p>
                    </div>
                    {unavailable ? <p className="mt-2 text-xs text-red-600">This item needs stock/price confirmation. Request a quote before checkout.</p> : null}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 md:flex-col md:items-end">
                    <p className="font-display text-base font-900 text-navy-950">{product.priceOnRequest || product.price === null ? "POA" : formatCurrency(lineTotal)}</p>
                    <div className="inline-flex items-center overflow-hidden rounded-lg border border-gray-200 bg-white">
                      <button onClick={() => changeQty(product.sku, qty - 1, variant?.id, variant?.sku, availableQty)} className="p-2 hover:bg-gray-50" aria-label="Decrease quantity"><Minus size={13} /></button>
                      <span className="min-w-10 px-3 text-center text-sm font-display font-800">{qty}</span>
                      <button onClick={() => changeQty(product.sku, qty + 1, variant?.id, variant?.sku, availableQty)} disabled={qty >= availableQty} className="p-2 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Increase quantity"><Plus size={13} /></button>
                    </div>
                    <button onClick={() => remove(product.sku, variant?.id, variant?.sku)} className="inline-flex items-center gap-1 rounded-md border border-red-100 px-2 py-1 text-[11px] font-900 text-red-600 hover:bg-red-50">
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:sticky lg:top-24">
          <h2 className="mb-3 font-display text-lg font-900 text-navy-950">Order summary</h2>
          <div className="mb-4 space-y-2 text-sm">
            <SummaryRow label="Subtotal" value={formatCurrency(summary.subtotal)} />
            <SummaryRow label="Shipping" value={summary.shipping.manualQuoteRequired ? "Quote required" : formatCurrency(Number(summary.shipping.cost || 0))} />
            <SummaryRow label="VAT estimate" value={formatCurrency(summary.vat)} />
            <div className="flex justify-between border-t border-gray-200 pt-2 text-base">
              <span className="font-display font-900 text-navy-950">Total</span>
              <span className="font-display font-900 text-navy-950">{formatCurrency(summary.total)}</span>
            </div>
          </div>

          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-gray-600">
            <p className="font-display font-900 text-navy-950">{summary.shipping.label}</p>
            <p>Dispatch: {summary.shipping.dispatchLabel} · Estimated delivery: {summary.shipping.deliveryLabel}</p>
            <p className="mt-1 text-gray-500">Shipping uses the highest applicable item policy. Export or specialist orders may require manual confirmation.</p>
          </div>

          {summary.hasUnavailableItems ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">One or more items require stock, price or manual shipping quote confirmation before checkout.</div>
          ) : null}

          <Link href="/checkout" className={`btn-primary w-full py-2.5 text-sm ${summary.hasUnavailableItems ? "pointer-events-none opacity-50" : ""}`}>Proceed to checkout <ArrowRight size={14} /></Link>
          <Link href="/shop" className="btn-secondary mt-2 w-full py-2 text-xs">Continue shopping</Link>

          <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-gray-500">
            <span className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5">Secure card payment</span>
            <span className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5">Business invoice</span>
            <span className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5">Tracked dispatch</span>
            <span className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5">Support after sale</span>
          </div>
        </aside>
      </main>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-gray-500">{label}</span><span className="font-display font-800 text-navy-950">{value}</span></div>;
}
