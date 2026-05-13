import { COMBAY_BUILD_ARCHIVE, COMBAY_BUILD_LABEL, COMBAY_BUILD_PHASE } from "@/lib/buildInfo";
import { PUBLIC_CATEGORY_GROUPS, canonicalCategoryForText, getCanonicalBySlug } from "@/lib/categoryTaxonomy";
import { prisma, withDatabase } from "@/lib/db";
import { getEbayConfig } from "@/lib/ebay";
import { ensureOperationalTables } from "@/lib/operationalSchema";
import { ensureResourceTables } from "@/lib/resources";

function toNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function iso(value: unknown) {
  const date = value instanceof Date ? value : value ? new Date(String(value)) : null;
  return date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function linkedToEbay(product: any) {
  return Boolean(product?.ebayOfferId || product?.ebayListingId || product?.ebayItemId || product?.ebayInventoryItemSku);
}

function statusTone(status: string) {
  const s = status.toLowerCase();
  if (["ok", "healthy", "matched", "ready", "sent", "success"].some((word) => s.includes(word))) return "ok";
  if (["warn", "partial", "missing", "queued", "review"].some((word) => s.includes(word))) return "warn";
  if (["fail", "error", "blocked", "unmatched", "not configured"].some((word) => s.includes(word))) return "bad";
  return "neutral";
}

export type HealthCheck = {
  label: string;
  status: string;
  tone: "ok" | "warn" | "bad" | "neutral";
  detail: string;
};

export async function loadSystemHealthChecks(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [
    {
      label: "Deployed phase",
      status: COMBAY_BUILD_PHASE,
      tone: "ok",
      detail: `${COMBAY_BUILD_LABEL} · ${COMBAY_BUILD_ARCHIVE}`,
    },
  ];

  const dbStarted = Date.now();
  const db = await withDatabase(async () => {
    await prisma.$queryRawUnsafe(`SELECT 1`);
    return true;
  });
  checks.push({
    label: "Database",
    status: db.ok ? "Connected" : "Not configured / failed",
    tone: db.ok ? "ok" : "bad",
    detail: db.ok ? `Ping completed in ${Date.now() - dbStarted}ms.` : db.reason,
  });

  const schemaStarted = Date.now();
  const schema = await withDatabase(async () => {
    await ensureOperationalTables();
    await ensureResourceTables();
    return true;
  });
  checks.push({
    label: "Runtime schema",
    status: schema.ok ? "Aligned" : "Needs review",
    tone: schema.ok ? "ok" : "bad",
    detail: schema.ok ? `Operational and resource tables checked in ${Date.now() - schemaStarted}ms.` : schema.reason,
  });

  const catalogueStarted = Date.now();
  const catalogue = await withDatabase(async () => {
    const [published, categories, resources] = await Promise.all([
      prisma.product.count({ where: { status: "PUBLISHED" as any, deletedAt: null } }).catch(() => 0),
      prisma.category.count().catch(() => 0),
      prisma.resourceArticle.count().catch(() => 0),
    ]);
    return { published, categories, resources };
  });
  checks.push({
    label: "Catalogue data",
    status: catalogue.ok ? "Readable" : "Failed",
    tone: catalogue.ok ? "ok" : "bad",
    detail: catalogue.ok
      ? `${catalogue.data.published} published products, ${catalogue.data.categories} DB categories, ${catalogue.data.resources} resources. Read in ${Date.now() - catalogueStarted}ms.`
      : catalogue.reason,
  });

  const ebay = await withDatabase(async () => {
    const config = await getEbayConfig();
    const latestOrderSync = await prisma.ebaySyncLog.findFirst({ where: { actionType: "EBAY_ORDER_SYNC" }, orderBy: { startedAt: "desc" } }).catch(() => null);
    return { config, latestOrderSync };
  });
  if (ebay.ok) {
    checks.push({
      label: "eBay connection",
      status: ebay.data.config.refreshToken ? "Connected token saved" : "Reconnect required",
      tone: ebay.data.config.refreshToken ? "ok" : "warn",
      detail: `${ebay.data.config.marketplaceId || "EBAY_GB"} · ${ebay.data.config.environment || "production"}. Last order sync: ${iso(ebay.data.latestOrderSync?.finishedAt || ebay.data.latestOrderSync?.startedAt) || "not yet recorded"}.`,
    });
  } else {
    checks.push({ label: "eBay connection", status: "Could not inspect", tone: "bad", detail: ebay.reason });
  }

  checks.push({
    label: "Email provider",
    status: process.env.RESEND_API_KEY ? "Configured" : "Not configured",
    tone: process.env.RESEND_API_KEY ? "ok" : "warn",
    detail: process.env.RESEND_API_KEY ? "RESEND_API_KEY is present in the runtime environment." : "Customer emails will not send until RESEND_API_KEY is set in Vercel.",
  });

  return checks.map((check) => ({ ...check, tone: check.tone || statusTone(check.status) }));
}

export async function loadEbayOrderReconciliation(options: { days?: number; take?: number } = {}) {
  const days = Math.max(1, Math.min(90, Number(options.days || 30)));
  const take = Math.max(5, Math.min(100, Number(options.take || 40)));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await withDatabase(async () => {
    await ensureOperationalTables();
    const [latestSync, orders] = await Promise.all([
      prisma.ebaySyncLog.findFirst({ where: { actionType: "EBAY_ORDER_SYNC" }, orderBy: { startedAt: "desc" } }).catch(() => null),
      prisma.order.findMany({
        where: { salesChannel: "EBAY", createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take,
        include: { items: true },
      }).catch(() => []),
    ]);
    const movements = await prisma.inventoryMovement.findMany({
      where: { source: { in: ["SALE_EBAY", "EBAY_CANCEL_RESTOCK"] }, sourceId: { in: orders.map((order: any) => order.id) } },
      orderBy: { createdAt: "desc" },
    }).catch(() => []);
    const movementsByOrder = new Map<string, any[]>();
    for (const movement of movements as any[]) {
      const list = movementsByOrder.get(movement.sourceId) || [];
      list.push(movement);
      movementsByOrder.set(movement.sourceId, list);
    }
    const rows = (orders as any[]).map((order) => {
      const orderMovements = movementsByOrder.get(order.id) || [];
      const itemCount = order.items?.length || 0;
      const unmatchedItems = (order.items || []).filter((item: any) => !item.productId).length;
      const matchedItems = Math.max(0, itemCount - unmatchedItems);
      const stockMovements = orderMovements.filter((movement) => movement.source === "SALE_EBAY").length;
      const restockMovements = orderMovements.filter((movement) => movement.source === "EBAY_CANCEL_RESTOCK").length;
      const payment = text(order.paymentStatus);
      const cancelled = ["CANCELLED", "REFUNDED"].includes(text(order.status)) || payment === "REFUNDED";
      let state = "Matched";
      if (!itemCount) state = "No order items";
      else if (unmatchedItems) state = "Unmatched line(s)";
      else if (!cancelled && payment === "PAID" && !stockMovements) state = "No stock movement";
      else if (cancelled && !restockMovements) state = "Cancelled/no restock log";
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        externalOrderId: order.externalOrderId,
        customerName: order.customerName,
        status: text(order.status),
        paymentStatus: payment,
        total: toNumber(order.total),
        createdAt: iso(order.createdAt),
        itemCount,
        matchedItems,
        unmatchedItems,
        stockMovements,
        restockMovements,
        state,
        tone: statusTone(state),
        items: (order.items || []).map((item: any) => ({
          id: item.id,
          title: item.title,
          sku: item.sku,
          variationSku: item.variationSku,
          variationLabel: item.variationLabel,
          quantity: item.quantity,
          productId: item.productId,
          matched: Boolean(item.productId),
        })),
      };
    });
    return { latestSync, rows, days };
  });
  if (!result.ok) return { ok: false, reason: result.reason, latestSync: null, rows: [], days };
  return { ok: true, ...result.data };
}

export async function loadInventoryMismatchAudit() {
  const result = await withDatabase(async () => {
    await ensureOperationalTables();
    const [products, variants, jobs] = await Promise.all([
      prisma.product.findMany({
        where: {
          deletedAt: null,
          OR: [
            { ebayOfferId: { not: null } },
            { ebayListingId: { not: null } },
            { ebayItemId: { not: null } },
            { ebayInventoryItemSku: { not: null } },
          ],
        },
        select: {
          id: true,
          sku: true,
          title: true,
          slug: true,
          stockQty: true,
          status: true,
          ebayPublishStatus: true,
          ebayOfferId: true,
          ebayListingId: true,
          ebayItemId: true,
          ebayInventoryItemSku: true,
          ebayLastError: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 250,
      }).catch(() => []),
      prisma.productVariant.findMany({
        where: { OR: [{ ebayQuantity: { not: null } }, { ebaySku: { not: null } }, { ebayVariationSku: { not: null } }, { ebayOfferId: { not: null } }] },
        select: { id: true, productId: true, sku: true, label: true, stockQty: true, ebayQuantity: true, ebaySku: true, ebayVariationSku: true, ebayOfferId: true },
        take: 500,
      }).catch(() => []),
      prisma.inventorySyncJob.findMany({ where: { target: "EBAY", status: { in: ["QUEUED", "FAILED"] } }, orderBy: { createdAt: "desc" }, take: 40 }).catch(() => []),
    ]);
    const productById = new Map((products as any[]).map((product) => [product.id, product]));
    const issues: any[] = [];
    for (const product of products as any[]) {
      const status = text(product.ebayPublishStatus || "").toUpperCase();
      if (toNumber(product.stockQty) <= 0 && !["ENDED", "NOT_LISTED", "UNPUBLISHED", "WITHDRAWN"].includes(status)) {
        issues.push({
          key: `local-zero-${product.id}`,
          severity: "high",
          type: "Local out of stock but eBay may still be active",
          productId: product.id,
          sku: product.sku,
          title: product.title,
          slug: product.slug,
          detail: `Combay stock is ${product.stockQty}, eBay status is ${product.ebayPublishStatus || "unknown"}. Review to avoid overselling.`,
        });
      }
      if (toNumber(product.stockQty) > 0 && ["ENDED", "WITHDRAWN"].includes(status)) {
        issues.push({
          key: `ended-with-stock-${product.id}`,
          severity: "medium",
          type: "Combay in stock but eBay ended",
          productId: product.id,
          sku: product.sku,
          title: product.title,
          slug: product.slug,
          detail: `Combay has ${product.stockQty} in stock but eBay status is ${product.ebayPublishStatus}. Relist if appropriate.`,
        });
      }
      if (product.ebayLastError) {
        issues.push({
          key: `last-error-${product.id}`,
          severity: "medium",
          type: "eBay listing error recorded",
          productId: product.id,
          sku: product.sku,
          title: product.title,
          slug: product.slug,
          detail: String(product.ebayLastError).slice(0, 240),
        });
      }
    }
    for (const variant of variants as any[]) {
      if (variant.ebayQuantity !== null && variant.ebayQuantity !== undefined && Number(variant.ebayQuantity) !== Number(variant.stockQty || 0)) {
        const product = productById.get(variant.productId) as any;
        issues.push({
          key: `variant-${variant.id}`,
          severity: "high",
          type: "Variant stock mismatch",
          productId: variant.productId,
          sku: product?.sku || variant.sku || variant.ebaySku || variant.ebayVariationSku,
          title: product ? `${product.title} — ${variant.label}` : variant.label,
          slug: product?.slug || null,
          detail: `Combay variation stock ${variant.stockQty}; last imported eBay quantity ${variant.ebayQuantity}.`,
        });
      }
    }
    for (const job of jobs as any[]) {
      issues.push({
        key: `job-${job.id}`,
        severity: job.status === "FAILED" ? "high" : "medium",
        type: job.status === "FAILED" ? "Failed eBay stock update job" : "Queued eBay stock update job",
        productId: job.productId,
        sku: job.sku,
        title: job.action,
        slug: null,
        detail: job.error || `Created ${iso(job.createdAt) || "recently"}; attempts ${job.attempts || 0}.`,
      });
    }
    return { issues: issues.slice(0, 80), totalIssues: issues.length, linkedProducts: products.length, pendingJobs: jobs.filter((job: any) => job.status === "QUEUED").length, failedJobs: jobs.filter((job: any) => job.status === "FAILED").length };
  });
  if (!result.ok) return { ok: false, reason: result.reason, issues: [], totalIssues: 0, linkedProducts: 0, pendingJobs: 0, failedJobs: 0 };
  return { ok: true, ...result.data };
}

export async function loadCategoryClassificationAudit(options: { take?: number } = {}) {
  const take = Math.max(20, Math.min(250, Number(options.take || 120)));
  const result = await withDatabase(async () => {
    const products = await prisma.product.findMany({
      where: { deletedAt: null, status: { in: ["PUBLISHED", "DRAFT"] as any } },
      select: {
        id: true,
        sku: true,
        title: true,
        slug: true,
        brand: true,
        manufacturer: true,
        model: true,
        mpn: true,
        categoryId: true,
        category: { select: { id: true, name: true, slug: true } },
        specs: { select: { label: true, value: true }, take: 8 },
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 600,
    }).catch(() => []);
    const rows: any[] = [];
    for (const product of products as any[]) {
      const actual = getCanonicalBySlug(product.category?.slug || null);
      // Do not pass the current category slug into the suggestion engine here.
      // The audit is specifically trying to detect products already saved under the wrong category,
      // so title/brand/model/specs should drive the recommendation rather than the existing assignment.
      const suggested = canonicalCategoryForText({
        title: product.title,
        brand: product.brand,
        manufacturer: product.manufacturer,
        model: product.model,
        mpn: product.mpn,
        specsText: (product.specs || []).map((spec: any) => `${spec.label} ${spec.value}`).join(" "),
      });
      const actualGroup = actual?.groupSlug || product.category?.slug || "uncategorised";
      const actualLabel = actual?.subcategoryLabel || actual?.groupLabel || product.category?.name || "Uncategorised";
      const suggestedSlug = suggested.subcategorySlug || suggested.groupSlug;
      const suggestedLabel = suggested.subcategoryLabel || suggested.groupLabel;
      const mismatch = !actual || (suggested.groupSlug && actual.groupSlug !== suggested.groupSlug) || (suggested.subcategorySlug && actual.subcategorySlug && actual.subcategorySlug !== suggested.subcategorySlug);
      const obviousMilitary = /\b(raf|royal air force|army|military|surplus|uniform|skirt|no\.?\s*2 dress)\b/i.test(`${product.title} ${product.brand || ""} ${product.manufacturer || ""}`);
      if (mismatch || obviousMilitary) {
        rows.push({
          productId: product.id,
          sku: product.sku,
          title: product.title,
          slug: product.slug,
          currentCategoryId: product.categoryId,
          currentCategory: actualLabel,
          currentCategorySlug: actualGroup,
          suggestedCategory: suggestedLabel,
          suggestedCategorySlug: suggestedSlug,
          reason: obviousMilitary ? "Military/surplus wording detected" : "Taxonomy engine suggests a different public category",
        });
      }
      if (rows.length >= take) break;
    }
    return { rows, scanned: products.length, taxonomyGroups: PUBLIC_CATEGORY_GROUPS.length };
  });
  if (!result.ok) return { ok: false, reason: result.reason, rows: [], scanned: 0, taxonomyGroups: PUBLIC_CATEGORY_GROUPS.length };
  return { ok: true, ...result.data };
}

async function ensureCategoryForSlug(slug: string) {
  const canonical = getCanonicalBySlug(slug);
  if (!canonical) throw new Error("Unknown Combay category slug.");
  const group = PUBLIC_CATEGORY_GROUPS.find((item) => item.slug === canonical.groupSlug);
  if (!group) throw new Error("Unknown Combay parent category.");
  const parent = await prisma.category.upsert({
    where: { slug: group.slug },
    update: { name: group.label, icon: group.image },
    create: { name: group.label, slug: group.slug, icon: group.image, description: "Combay public taxonomy category." },
  });
  if (!canonical.subcategorySlug) return parent;
  const sub = group.subcategories.find((item) => item.slug === canonical.subcategorySlug);
  if (!sub) return parent;
  return prisma.category.upsert({
    where: { slug: sub.slug },
    update: { name: sub.label, parentId: parent.id },
    create: { name: sub.label, slug: sub.slug, parentId: parent.id, description: `Combay public taxonomy subcategory under ${group.label}.` },
  });
}

export async function applyProductCategorySuggestion(input: { productId: string; targetSlug: string }) {
  const productId = text(input.productId);
  const targetSlug = text(input.targetSlug).toLowerCase();
  if (!productId || !targetSlug) throw new Error("Product and target category are required.");
  return withDatabase(async () => {
    const category = await ensureCategoryForSlug(targetSlug);
    const product = await prisma.product.update({ where: { id: productId }, data: { categoryId: category.id } });
    return { productId: product.id, sku: product.sku, categoryId: category.id, categoryName: category.name, categorySlug: category.slug };
  });
}

export async function loadOperationsReliabilityDashboard() {
  const [health, ebayOrders, inventory, categories] = await Promise.all([
    loadSystemHealthChecks(),
    loadEbayOrderReconciliation({ days: 30, take: 40 }),
    loadInventoryMismatchAudit(),
    loadCategoryClassificationAudit({ take: 80 }),
  ]);
  return { health, ebayOrders, inventory, categories, generatedAt: new Date().toISOString() };
}
