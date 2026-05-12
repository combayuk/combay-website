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

async function updateTrackingEmailState(orderId: string, data: Record<string, any>) {
  return prisma.order.update({ where: { id: orderId }, data }).catch((error: unknown) => {
    console.error("[tracking-email-state-update-failed]", error);
    return null;
  });
}

function trackingEmailReason(result: any) {
  if (result?.sent) return "sent";
  if (!result?.configured) return "not-configured";
  return result?.reason || result?.error || result?.message || "not-sent";
}

function trackingEmailSubject(order: any) {
  return `Your Combay order has been dispatched — ${order.orderNumber}`;
}

const TRACKING_EMAIL_TYPE = "TRACKING_DISPATCH";

export async function sendTrackingEmailIfNeeded(order: any, options: { force?: boolean; reason?: string } = {}) {
  await ensureOperationalTables();
  const attemptedAt = new Date();
  const recipient = String(order?.customerEmail ?? "").trim().toLowerCase();
  const trackingNumber = String(order?.trackingNumber ?? "").trim();

  if (!order?.id) return { configured: false, sent: false, provider: "not-configured", message: "Order is missing.", reason: "missing-order" };

  if (!recipient || !trackingNumber) {
    const reason = !recipient ? "missing-recipient" : "missing-tracking-number";
    await updateTrackingEmailState(order.id, {
      trackingEmailAttemptedAt: attemptedAt,
      trackingEmailStatus: "SKIPPED",
      trackingEmailRecipient: recipient || null,
      trackingEmailType: TRACKING_EMAIL_TYPE,
      trackingEmailSubject: order?.orderNumber ? trackingEmailSubject(order) : "Your Combay order has been dispatched",
      trackingEmailTrigger: options.reason || "tracking-update",
      trackingEmailLastError: reason,
    });
    return { configured: true, sent: false, provider: "resend", message: `Tracking email skipped: ${reason}.`, reason };
  }

  const nextHash = hashTracking(order);
  if (!options.force && order.trackingEmailLastHash === nextHash && order.trackingEmailSentAt) {
    await updateTrackingEmailState(order.id, {
      trackingEmailStatus: "SENT",
      trackingEmailRecipient: recipient,
      trackingEmailType: TRACKING_EMAIL_TYPE,
      trackingEmailSubject: trackingEmailSubject(order),
      trackingEmailTrigger: options.reason || "tracking-update",
      trackingEmailLastError: null,
    });
    return { configured: true, sent: false, provider: "resend", message: "Tracking email was already sent for these exact tracking details.", reason: "unchanged-tracking" };
  }

  await updateTrackingEmailState(order.id, {
    trackingEmailAttemptedAt: attemptedAt,
    trackingEmailStatus: "ATTEMPTED",
    trackingEmailRecipient: recipient,
    trackingEmailType: TRACKING_EMAIL_TYPE,
    trackingEmailSubject: trackingEmailSubject(order),
    trackingEmailTrigger: options.reason || "tracking-update",
    trackingEmailLastError: null,
  });

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
    to: recipient,
    subject: trackingEmailSubject(order),
    html,
    headers: { "X-Combay-Email-Type": "tracking-update", "X-Combay-Order": String(order.orderNumber) },
  });

  if (result.sent) {
    await updateTrackingEmailState(order.id, {
      trackingEmailSentAt: new Date(),
      trackingEmailLastHash: nextHash,
      trackingEmailAttemptedAt: attemptedAt,
      trackingEmailStatus: "SENT",
      trackingEmailProviderId: result.id ?? null,
      trackingEmailRecipient: recipient,
      trackingEmailType: TRACKING_EMAIL_TYPE,
      trackingEmailSubject: trackingEmailSubject(order),
      trackingEmailTrigger: options.reason || "tracking-update",
      trackingEmailLastError: null,
    });
  } else {
    await updateTrackingEmailState(order.id, {
      trackingEmailAttemptedAt: attemptedAt,
      trackingEmailStatus: result.configured ? "FAILED" : "NOT_CONFIGURED",
      trackingEmailProviderId: result.id ?? null,
      trackingEmailRecipient: recipient,
      trackingEmailType: TRACKING_EMAIL_TYPE,
      trackingEmailSubject: trackingEmailSubject(order),
      trackingEmailTrigger: options.reason || "tracking-update",
      trackingEmailLastError: trackingEmailReason(result),
    });
  }
  return { ...result, recipient, reason: result.sent ? "sent" : trackingEmailReason(result), force: Boolean(options.force), trigger: options.reason || "tracking-update" };
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
