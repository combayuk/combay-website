import crypto from "crypto";
import { prisma } from "@/lib/db";
import { ensureOperationalTables } from "@/lib/operationalSchema";
import { escapeHtml, htmlShell, sendEmail } from "@/lib/mailer";

function id(prefix = "op") {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function money(value: unknown) {
  return Number(value ?? 0);
}

function hashTracking(order: any) {
  return crypto
    .createHash("sha256")
    .update([order.trackingCarrier, order.trackingNumber, order.trackingUrl].map((part) => String(part ?? "").trim()).join("|"))
    .digest("hex");
}

export async function createAdminActivityNotification(input: {
  type: string;
  title: string;
  message?: string | null;
  sourceModel?: string | null;
  sourceId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  amount?: number | null;
}) {
  await ensureOperationalTables();
  return prisma.adminNotification.create({
    data: {
      id: id("notif"),
      type: input.type,
      title: input.title,
      message: input.message ?? null,
      sourceModel: input.sourceModel ?? null,
      sourceId: input.sourceId ?? null,
      customerName: input.customerName ?? null,
      customerEmail: input.customerEmail ?? null,
      amount: input.amount ?? null,
    },
  }).catch((error: unknown) => {
    console.error("[admin-notification-create-failed]", error);
    return null;
  });
}

export async function sendTrackingEmailIfNeeded(order: any) {
  await ensureOperationalTables();
  if (!order?.customerEmail || !order?.trackingNumber) return { sent: false, reason: "missing-recipient-or-tracking" };
  const nextHash = hashTracking(order);
  if (order.trackingEmailLastHash === nextHash && order.trackingEmailSentAt) {
    return { sent: false, reason: "unchanged-tracking" };
  }

  const trackingLink = order.trackingUrl
    ? `<p style="margin:10px 0;"><strong>Tracking link:</strong> <a href="${escapeHtml(order.trackingUrl)}" style="color:#2D4F7A;">${escapeHtml(order.trackingUrl)}</a></p>`
    : "";
  const html = htmlShell(
    `Your Combay order has been dispatched`,
    `<p>Dear ${escapeHtml(order.customerName || "Customer")},</p>
    <p>Your order <strong>${escapeHtml(order.orderNumber)}</strong> has been dispatched.</p>
    <table style="border-collapse:collapse;width:100%;border:1px solid #e5e7eb;margin:16px 0;">
      <tr><td style="padding:9px 10px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-weight:700;width:170px;">Courier</td><td style="padding:9px 10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(order.trackingCarrier || "Courier")}</td></tr>
      <tr><td style="padding:9px 10px;color:#6b7280;font-weight:700;">Tracking number</td><td style="padding:9px 10px;">${escapeHtml(order.trackingNumber)}</td></tr>
    </table>
    ${trackingLink}
    <p>If you have any questions, reply to this email or contact sales@combay.co.uk.</p>
    <p style="margin-bottom:0;">Kind regards,<br/><strong>Combay Limited</strong></p>`,
    `Tracking update for ${order.orderNumber}`,
  );

  const result = await sendEmail({
    to: order.customerEmail,
    subject: `Your Combay order has been dispatched — ${order.orderNumber}`,
    html,
    headers: { "X-Combay-Email-Type": "tracking-update", "X-Combay-Order": String(order.orderNumber) },
  });

  if (result.sent) {
    await prisma.order.update({ where: { id: order.id }, data: { trackingEmailSentAt: new Date(), trackingEmailLastHash: nextHash } }).catch((error: unknown) => console.error("[tracking-email-state-update-failed]", error));
  }
  return result;
}

async function findVariantForItem(item: any) {
  const variationSku = String(item.variationSku || "").trim();
  if (!variationSku) return null;
  return prisma.productVariant.findFirst({ where: { productId: item.productId || undefined, sku: variationSku } }).catch(() => null);
}

export async function queueEbayStockUpdate(product: any, quantity: number, source: string, sourceId: string) {
  await ensureOperationalTables();
  if (!product?.id || !(product.ebayOfferId || product.ebayListingId || product.ebayInventoryItemSku || product.ebayItemId)) return null;
  return prisma.inventorySyncJob.create({
    data: {
      id: id("sync"),
      productId: product.id,
      sku: product.sku,
      target: "EBAY",
      action: "UPDATE_QUANTITY",
      status: "QUEUED",
      payload: {
        sku: product.ebayInventoryItemSku || product.sku,
        productSku: product.sku,
        availableQuantity: Math.max(0, quantity),
        ebayOfferId: product.ebayOfferId,
        ebayListingId: product.ebayListingId,
        source,
        sourceId,
      },
    },
  }).catch((error: unknown) => {
    console.error("[inventory-sync-job-create-failed]", error);
    return null;
  });
}

export async function decrementStockForPaidOrder(orderId: string, source: "SALE_WEBSITE" | "SALE_INVOICE" | "SALE_EBAY" = "SALE_WEBSITE", createdBy = "system") {
  await ensureOperationalTables();
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return { ok: false, reason: "order-not-found", decremented: 0 };
  if (!order.items.length) return { ok: false, reason: "order-has-no-items", decremented: 0 };

  let decremented = 0;
  const warnings: string[] = [];
  for (const item of order.items as any[]) {
    const qty = Math.max(1, Number(item.quantity || 1));
    const externalReference = `${source}:${order.id}:${item.id}:${item.sku}:${item.variationSku || "_"}`;
    const existing = await prisma.inventoryMovement.findUnique({ where: { externalReference } }).catch(() => null);
    if (existing) continue;

    const product = item.productId
      ? await prisma.product.findUnique({ where: { id: item.productId } }).catch(() => null)
      : await prisma.product.findUnique({ where: { sku: item.sku } }).catch(() => null);
    if (!product) {
      warnings.push(`Could not match SKU ${item.sku} to a product.`);
      continue;
    }

    const variant = await findVariantForItem({ ...item, productId: product.id });
    const nextProductQty = Math.max(0, Number(product.stockQty || 0) - qty);
    await prisma.product.update({ where: { id: product.id }, data: { stockQty: nextProductQty } });
    if (variant) {
      await prisma.productVariant.update({ where: { id: variant.id }, data: { stockQty: Math.max(0, Number(variant.stockQty || 0) - qty) } }).catch(() => null);
    }

    await prisma.inventoryMovement.create({
      data: {
        id: id("mov"),
        productId: product.id,
        variantId: variant?.id ?? null,
        sku: product.sku,
        variationSku: item.variationSku ?? null,
        type: source,
        quantityChange: -qty,
        source,
        sourceId: order.id,
        externalReference,
        notes: `Stock reduced after paid order ${order.orderNumber}.`,
        createdBy,
      },
    });
    await queueEbayStockUpdate({ ...product, stockQty: nextProductQty }, nextProductQty, source, order.id);
    decremented += 1;
  }

  if (decremented > 0 || warnings.length) {
    await createAdminActivityNotification({
      type: source,
      title: source === "SALE_INVOICE" ? `Paid invoice stock processed for ${order.orderNumber}` : `Paid order stock processed for ${order.orderNumber}`,
      message: warnings.length ? warnings.join(" ") : `${decremented} stock movement${decremented === 1 ? "" : "s"} recorded and eBay stock updates queued where applicable.`,
      sourceModel: "Order",
      sourceId: order.id,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      amount: money(order.total),
    });
  }

  return { ok: true, orderNumber: order.orderNumber, decremented, warnings };
}
