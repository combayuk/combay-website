import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getEbayFulfillmentAccessToken } from "@/lib/ebay";
import { createAdminActivityNotification, decrementStockForPaidOrder } from "@/lib/operations";
import { ensureOperationalTables } from "@/lib/operationalSchema";

type EbayOrderSyncResult = {
  ok: boolean;
  imported: number;
  updated: number;
  skipped: number;
  decremented: number;
  errors: string[];
  message: string;
  since?: string;
  processedOrderIds?: string[];
};

const DEFAULT_MARKETPLACE = "EBAY_GB";

function id(prefix = "ebay") {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function apiRoot(environment?: string | null) {
  return environment === "sandbox" ? "https://api.sandbox.ebay.com" : "https://api.ebay.com";
}

function asNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function normaliseSku(value: unknown) {
  return text(value).toUpperCase();
}

function parseDate(value: unknown) {
  const date = value ? new Date(String(value)) : null;
  return date && Number.isFinite(date.getTime()) ? date : new Date();
}

function orderTotal(order: any) {
  return asNumber(order?.pricingSummary?.total?.value ?? order?.pricingSummary?.priceSubtotal?.value ?? order?.total?.value);
}

function orderCurrency(order: any) {
  return text(order?.pricingSummary?.total?.currency || order?.lineItems?.[0]?.lineItemCost?.currency || "GBP") || "GBP";
}

function lineCost(line: any) {
  return asNumber(line?.lineItemCost?.value ?? line?.total?.value ?? line?.netPrice?.value ?? 0);
}

function lineUnitPrice(line: any) {
  const qty = Math.max(1, Number(line?.quantity || 1));
  const total = lineCost(line);
  return total ? total / qty : asNumber(line?.lineItemCost?.value);
}

function variationLabel(line: any) {
  const aspects = Array.isArray(line?.variationAspects) ? line.variationAspects : [];
  if (!aspects.length) return null;
  return aspects.map((aspect: any) => `${aspect.name || aspect.localizedName || "Option"}: ${aspect.value || aspect.localizedValue || ""}`).join(" / ");
}

function shippingAddress(order: any) {
  const shipTo = order?.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo || order?.fulfillmentStartInstructions?.[0]?.shipTo || {};
  const address = shipTo.contactAddress || shipTo.address || {};
  return {
    name: shipTo.fullName || shipTo.name || order?.buyer?.username || "eBay buyer",
    email: shipTo.email || order?.buyer?.email || null,
    phone: shipTo.primaryPhone?.phoneNumber || shipTo.phoneNumber || null,
    addressLine1: address.addressLine1 || null,
    addressLine2: address.addressLine2 || null,
    city: address.city || null,
    county: address.stateOrProvince || address.county || null,
    postcode: address.postalCode || null,
    country: address.countryCode || address.country || null,
  };
}

function customerEmail(order: any) {
  const shipTo = order?.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo || {};
  const realEmail = text(shipTo.email || order?.buyer?.email);
  if (realEmail && realEmail.includes("@")) return realEmail.toLowerCase();
  const username = text(order?.buyer?.username || "ebay-buyer").replace(/[^a-z0-9._-]/gi, "").toLowerCase() || "ebay-buyer";
  return `${username}@ebay.invalid`;
}

function customerName(order: any) {
  const shipTo = order?.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo || {};
  return text(shipTo.fullName || shipTo.name || order?.buyer?.username || "eBay buyer") || "eBay buyer";
}

function isCancelled(order: any) {
  const cancelState = text(order?.cancelStatus?.cancelState).toUpperCase();
  const fulfillment = text(order?.orderFulfillmentStatus).toUpperCase();
  const payment = text(order?.orderPaymentStatus).toUpperCase();
  return cancelState && cancelState !== "NONE_REQUESTED" || fulfillment.includes("CANCEL") || payment.includes("REFUND");
}

function orderStatus(order: any) {
  if (isCancelled(order)) return "CANCELLED";
  const fulfillment = text(order?.orderFulfillmentStatus).toUpperCase();
  if (fulfillment.includes("FULFILLED")) return "DISPATCHED";
  return "PROCESSING";
}

function paymentStatus(order: any) {
  if (isCancelled(order)) return "REFUNDED";
  const status = text(order?.orderPaymentStatus).toUpperCase();
  if (status.includes("PAID") || status.includes("FULLY_PAID")) return "PAID";
  return "UNPAID";
}

async function uniqueOrderNumber(orderId: string) {
  const base = `EBAY-${orderId}`.replace(/[^A-Z0-9\-]/gi, "").slice(0, 48);
  const existing = await prisma.order.findUnique({ where: { orderNumber: base } }).catch(() => null);
  if (!existing) return base;
  return `${base}-${Date.now().toString(36).toUpperCase()}`.slice(0, 64);
}

function variationSpecificsFromVariant(variant: any) {
  const raw = variant?.ebayVariationData;
  const specifics = Array.isArray(raw?.specifics) ? raw.specifics : [];
  return specifics.map((specific: any) => ({ name: text(specific.name), value: text(specific.value) })).filter((item: any) => item.name && item.value);
}

function aspectsMatchVariant(variant: any, line: any) {
  const aspects = Array.isArray(line?.variationAspects) ? line.variationAspects : [];
  if (!aspects.length) return false;
  const variantPairs = [
    { name: variant.optionName, value: variant.optionValue },
    ...variationSpecificsFromVariant(variant),
  ].map((item: any) => ({ name: text(item.name).toLowerCase(), value: text(item.value).toLowerCase() })).filter((item: any) => item.name && item.value);
  if (!variantPairs.length) return false;
  return aspects.every((aspect: any) => {
    const name = text(aspect.name || aspect.localizedName).toLowerCase();
    const value = text(aspect.value || aspect.localizedValue).toLowerCase();
    return variantPairs.some((pair) => pair.name === name && pair.value === value);
  });
}

async function findProductAndVariantForLine(line: any) {
  const sku = normaliseSku(line?.sku);
  const legacyItemId = text(line?.legacyItemId || line?.itemId || line?.legacyListingId);

  if (sku) {
    const variant = await prisma.productVariant.findFirst({
      where: { OR: [{ sku }, { ebaySku: sku }, { ebayVariationSku: sku }] },
      include: { product: true },
    }).catch(() => null);
    if (variant?.product) return { product: variant.product, variant };

    const productBySku = await prisma.product.findFirst({
      where: { OR: [{ sku }, { ebayInventoryItemSku: sku }] },
      include: { variants: true },
    }).catch(() => null);
    if (productBySku) return { product: productBySku, variant: null };
  }

  if (legacyItemId) {
    const productByListing = await prisma.product.findFirst({
      where: { OR: [{ ebayItemId: legacyItemId }, { ebayListingId: legacyItemId }] },
      include: { variants: true },
    }).catch(() => null);
    if (productByListing) {
      const variant = (productByListing.variants || []).find((candidate: any) => aspectsMatchVariant(candidate, line)) || null;
      return { product: productByListing, variant };
    }
  }

  return { product: null, variant: null };
}

async function createOrderItemsForEbayOrder(orderId: string, ebayOrder: any) {
  const created: any[] = [];
  for (const line of ebayOrder.lineItems || []) {
    const { product, variant } = await findProductAndVariantForLine(line);
    const qty = Math.max(1, Number(line?.quantity || 1));
    const sku = product?.sku || text(line?.sku || line?.legacyItemId || "EBAY-SKU-MISSING");
    const variationSku = variant?.sku || variant?.ebaySku || variant?.ebayVariationSku || text(line?.sku) || null;
    const label = variationLabel(line) || variant?.label || null;
    const unitPrice = lineUnitPrice(line);
    const total = lineCost(line) || unitPrice * qty;
    const item = await prisma.orderItem.create({
      data: {
        orderId,
        productId: product?.id ?? null,
        title: text(line?.title || product?.title || "eBay item"),
        sku,
        variationSku,
        variationLabel: label,
        quantity: qty,
        unitPrice,
        lineTotal: total,
      },
    });
    created.push(item);
  }
  return created;
}

async function restockCancelledEbayOrder(order: any) {
  const existingRestock = await prisma.inventoryMovement.findFirst({ where: { source: "EBAY_CANCEL_RESTOCK", sourceId: order.id } }).catch(() => null);
  if (existingRestock) return { restocked: 0, skipped: true };
  let restocked = 0;
  const items = await prisma.orderItem.findMany({ where: { orderId: order.id } });
  for (const item of items as any[]) {
    const qty = Math.max(1, Number(item.quantity || 1));
    const product = item.productId ? await prisma.product.findUnique({ where: { id: item.productId } }).catch(() => null) : await prisma.product.findFirst({ where: { sku: item.sku } }).catch(() => null);
    if (!product) continue;
    await prisma.product.update({ where: { id: product.id }, data: { stockQty: Number(product.stockQty || 0) + qty } });
    const variant = item.variationSku ? await prisma.productVariant.findFirst({ where: { productId: product.id, OR: [{ sku: item.variationSku }, { ebaySku: item.variationSku }, { ebayVariationSku: item.variationSku }] } }).catch(() => null) : null;
    if (variant) await prisma.productVariant.update({ where: { id: variant.id }, data: { stockQty: Number(variant.stockQty || 0) + qty } }).catch(() => null);
    await prisma.inventoryMovement.create({
      data: {
        id: id("mov"),
        productId: product.id,
        variantId: variant?.id ?? null,
        sku: product.sku,
        variationSku: item.variationSku ?? null,
        type: "EBAY_CANCEL_RESTOCK",
        quantityChange: qty,
        source: "EBAY_CANCEL_RESTOCK",
        sourceId: order.id,
        externalReference: `EBAY_CANCEL_RESTOCK:${order.id}:${item.id}`,
        notes: `Stock restored after eBay order cancellation/refund ${order.orderNumber}.`,
        createdBy: "ebay-order-sync",
      },
    }).catch(() => null);
    restocked += 1;
  }
  return { restocked, skipped: false };
}

async function importOneEbayOrder(ebayOrder: any) {
  const ebayOrderId = text(ebayOrder.orderId || ebayOrder.legacyOrderId);
  if (!ebayOrderId) return { status: "skipped", reason: "missing-order-id", decremented: 0 };
  const existing = await prisma.order.findFirst({ where: { externalOrderId: ebayOrderId, salesChannel: "EBAY" }, include: { items: true } }).catch(() => null);
  const cancelled = isCancelled(ebayOrder);
  const total = orderTotal(ebayOrder);
  const ship = shippingAddress(ebayOrder);
  const commonData: any = {
    customerName: customerName(ebayOrder),
    customerEmail: customerEmail(ebayOrder),
    customerPhone: ship.phone,
    status: orderStatus(ebayOrder),
    paymentStatus: paymentStatus(ebayOrder),
    subtotal: total,
    shipping: asNumber(ebayOrder?.pricingSummary?.deliveryCost?.value ?? ebayOrder?.pricingSummary?.shipping?.value ?? 0),
    tax: asNumber(ebayOrder?.pricingSummary?.tax?.value ?? 0),
    total,
    currency: orderCurrency(ebayOrder),
    shippingAddress: ship,
    salesChannel: "EBAY",
    externalOrderId: ebayOrderId,
    externalMarketplace: "EBAY_GB",
    paidAt: paymentStatus(ebayOrder) === "PAID" ? parseDate(ebayOrder?.creationDate) : null,
    notes: `Imported from eBay order ${ebayOrderId}.`,
  };

  let order: any = existing;
  let imported = false;
  if (!order) {
    order = await prisma.order.create({
      data: {
        id: id("ord"),
        orderNumber: await uniqueOrderNumber(ebayOrderId),
        ...commonData,
        createdAt: parseDate(ebayOrder?.creationDate),
      },
    });
    await createOrderItemsForEbayOrder(order.id, ebayOrder);
    imported = true;
  } else {
    order = await prisma.order.update({ where: { id: order.id }, data: commonData });
    if (!existing.items?.length) await createOrderItemsForEbayOrder(order.id, ebayOrder);
  }

  const withItems = await prisma.order.findUnique({ where: { id: order.id }, include: { items: true } });
  let decrementResult: any = { decremented: 0 };
  if (cancelled) {
    await restockCancelledEbayOrder(withItems);
  } else if (paymentStatus(ebayOrder) === "PAID") {
    decrementResult = await decrementStockForPaidOrder(order.id, "SALE_EBAY", "ebay-order-sync");
  }

  await createAdminActivityNotification({
    type: cancelled ? "EBAY_ORDER_CANCELLED" : "EBAY_ORDER_IMPORTED",
    title: cancelled ? `eBay order cancelled/refunded: ${order.orderNumber}` : `eBay sale imported: ${order.orderNumber}`,
    message: cancelled ? `eBay order ${ebayOrderId} was marked cancelled/refunded.` : `Imported eBay order ${ebayOrderId}; stock decrement ${decrementResult.decremented || 0}.`,
    sourceModel: "Order",
    sourceId: order.id,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    amount: total,
  }).catch(() => null);

  return { status: imported ? "imported" : "updated", orderId: order.id, orderNumber: order.orderNumber, decremented: Number(decrementResult.decremented || 0) };
}

async function fetchEbayOrders(days = 7, limit = 50) {
  const { token, config } = await getEbayFulfillmentAccessToken();
  const marketplaceId = config.marketplaceId || DEFAULT_MARKETPLACE;
  const since = new Date(Date.now() - Math.max(1, Math.min(90, days)) * 24 * 60 * 60 * 1000);
  const allOrders: any[] = [];
  let offset = 0;
  let total = 0;
  do {
    const params = new URLSearchParams();
    params.set("filter", `creationdate:[${since.toISOString()}..]`);
    params.set("limit", String(Math.min(100, Math.max(10, limit))));
    params.set("offset", String(offset));
    const response = await fetch(`${apiRoot(config.environment)}/sell/fulfillment/v1/order?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-EBAY-C-MARKETPLACE-ID": marketplaceId,
      },
      cache: "no-store",
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = body?.errors?.[0]?.longMessage || body?.errors?.[0]?.message || body?.message || `eBay Fulfillment API returned ${response.status}`;
      throw new Error(message);
    }
    const orders = Array.isArray(body.orders) ? body.orders : [];
    allOrders.push(...orders);
    total = Number(body.total || allOrders.length);
    offset += orders.length || limit;
    if (!orders.length) break;
  } while (allOrders.length < total && allOrders.length < 500);
  return { orders: allOrders, since: since.toISOString(), total };
}

export async function syncRecentEbayOrders(options: { days?: number; limit?: number; triggeredBy?: string } = {}): Promise<EbayOrderSyncResult> {
  await ensureOperationalTables();
  const errors: string[] = [];
  const processedOrderIds: string[] = [];
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let decremented = 0;
  const startedAt = new Date();
  const log = await prisma.ebaySyncLog.create({
    data: {
      id: id("elog"),
      actionType: "EBAY_ORDER_SYNC_STARTED",
      status: "RUNNING",
      message: `Starting eBay order sync for last ${options.days || 14} day(s).`,
      triggeredBy: options.triggeredBy || "admin",
      startedAt,
    },
  }).catch(() => null);
  try {
    const fetched = await fetchEbayOrders(options.days ?? 14, options.limit ?? 50);
    for (const order of fetched.orders) {
      try {
        const result = await importOneEbayOrder(order);
        if (result.status === "imported") imported += 1;
        else if (result.status === "updated") updated += 1;
        else skipped += 1;
        decremented += Number((result as any).decremented || 0);
        if ((result as any).orderNumber) processedOrderIds.push((result as any).orderNumber);
      } catch (error: any) {
        skipped += 1;
        errors.push(`${order?.orderId || "unknown order"}: ${error?.message || "Could not import eBay order."}`);
      }
    }
    const message = `eBay order sync complete: ${imported} imported, ${updated} updated, ${skipped} skipped, ${decremented} stock movement group(s).`;
    if (log) await prisma.ebaySyncLog.update({ where: { id: log.id }, data: { actionType: "EBAY_ORDER_SYNC", status: errors.length ? "PARTIAL" : "SUCCESS", message, errorMessage: errors.join(" | ") || null, rawPayload: { since: fetched.since, total: fetched.total, processedOrderIds }, finishedAt: new Date() } }).catch(() => null);
    return { ok: true, imported, updated, skipped, decremented, errors, message, since: fetched.since, processedOrderIds };
  } catch (error: any) {
    const message = error?.message || "eBay order sync failed.";
    if (log) await prisma.ebaySyncLog.update({ where: { id: log.id }, data: { actionType: "EBAY_ORDER_SYNC", status: "FAILED", message: "eBay order sync failed.", errorMessage: message, finishedAt: new Date() } }).catch(() => null);
    return { ok: false, imported, updated, skipped, decremented, errors: [message], message };
  }
}

export async function getEbayOrderSyncStatus() {
  await ensureOperationalTables();
  const latest = await prisma.ebaySyncLog.findFirst({ where: { actionType: "EBAY_ORDER_SYNC" }, orderBy: { startedAt: "desc" } }).catch(() => null);
  const recentEbayOrders = await prisma.order.findMany({ where: { salesChannel: "EBAY" }, orderBy: { createdAt: "desc" }, take: 8, include: { items: true } }).catch(() => []);
  const pendingStockJobs = await prisma.inventorySyncJob.count({ where: { status: "QUEUED" } }).catch(() => 0);
  return { latest, recentEbayOrders, pendingStockJobs };
}
