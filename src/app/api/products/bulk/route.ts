import { prisma } from "@/lib/db";
import { ensureOperationalTables } from "@/lib/operationalSchema";

type BulkAction = "archive" | "hard" | "restore";

type BulkResult = {
  success: true;
  deleted: number;
  archived: number;
  restored: number;
  skipped: number;
  failed: number;
  errors: Array<{ productId: string; sku?: string; reason: string }>;
};

function normaliseAction(value: unknown): BulkAction {
  if (value === "delete" || value === "hard") return "hard";
  if (value === "restore") return "restore";
  return "archive";
}

async function findProduct(productId: string) {
  return prisma.product.findFirst({
    where: { OR: [{ id: productId }, { sku: productId }, { slug: productId }] },
    select: {
      id: true,
      sku: true,
      slug: true,
      status: true,
      ebayListingId: true,
      ebayItemId: true,
      ebayOfferId: true,
    },
  });
}

async function archiveProduct(productId: string) {
  const product = await findProduct(productId);
  if (!product) return { ok: false as const, productId, reason: "Product not found." };

  await prisma.product.update({ where: { id: product.id }, data: { status: "ARCHIVED" } });
  return { ok: true as const, product, archived: true };
}

async function restoreProduct(productId: string) {
  const product = await findProduct(productId);
  if (!product) return { ok: false as const, productId, reason: "Product not found." };

  await prisma.product.update({
    where: { id: product.id },
    data: {
      status: "DRAFT",
      deletedAt: null,
      deleteRequestedAt: null,
      deletePurgeAfter: null,
      deleteStatus: null,
    } as any,
  });
  return { ok: true as const, product, restored: true };
}

async function hardDeleteOrArchiveProduct(productId: string) {
  const product = await findProduct(productId);
  if (!product) return { ok: false as const, productId, reason: "Product not found." };

  const [orderItems, invoiceLines, movements, ebayLogs] = await Promise.all([
    prisma.orderItem.count({ where: { OR: [{ productId: product.id }, { sku: product.sku }] } }).catch(() => 0),
    prisma.invoiceLine.count({ where: { sku: product.sku } }).catch(() => 0),
    prisma.inventoryMovement.count({ where: { OR: [{ productId: product.id }, { sku: product.sku }] } }).catch(() => 0),
    prisma.ebaySyncLog.count({
      where: {
        OR: [
          { productId: product.id },
          { sku: product.sku },
          { ebayListingId: product.ebayListingId || product.ebayItemId || "__none__" },
          { ebayOfferId: product.ebayOfferId || "__none__" },
        ],
      },
    }).catch(() => 0),
  ]);

  const hasMarketplaceHistory = Boolean(product.ebayListingId || product.ebayItemId || product.ebayOfferId || ebayLogs);
  const hasBusinessHistory = Boolean(orderItems || invoiceLines || movements || hasMarketplaceHistory);

  if (hasBusinessHistory) {
    await prisma.product.update({
      where: { id: product.id },
      data: {
        status: "ARCHIVED",
        deletedAt: new Date(),
        deleteRequestedAt: new Date(),
        deleteStatus: "DELETE_BLOCKED",
      } as any,
    });

    const blockers = [
      orderItems ? `${orderItems} order item(s)` : null,
      invoiceLines ? `${invoiceLines} invoice line(s)` : null,
      movements ? `${movements} stock movement(s)` : null,
      hasMarketplaceHistory ? "eBay/listing history" : null,
    ].filter(Boolean).join(", ");

    return {
      ok: true as const,
      product,
      archived: true,
      blocked: true,
      reason: blockers || "Product has protected business history.",
    };
  }

  await prisma.product.delete({ where: { id: product.id } });
  return { ok: true as const, product, deleted: true };
}

export async function POST(req: Request) {
  try {
    await ensureOperationalTables().catch((error) => {
      console.error("[products-bulk-schema-bootstrap-failed]", error);
    });

    const body = await req.json().catch(() => ({})) as any;
    const ids: string[] = Array.isArray(body?.ids)
      ? Array.from(new Set<string>(body.ids.map((id: unknown) => String(id || "").trim()).filter(Boolean))).slice(0, 200)
      : [];
    const action = normaliseAction(body?.action);

    if (!ids.length) {
      return Response.json({ ok: false, error: "No products selected." }, { status: 400 });
    }

    const result: BulkResult = {
      success: true,
      deleted: 0,
      archived: 0,
      restored: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    for (const productId of ids) {
      try {
        const outcome = action === "restore"
          ? await restoreProduct(productId)
          : action === "hard"
            ? await hardDeleteOrArchiveProduct(productId)
            : await archiveProduct(productId);

        if (!outcome.ok) {
          result.failed += 1;
          result.errors.push({ productId, reason: outcome.reason });
          continue;
        }

        if (action === "restore") {
          result.restored += 1;
        } else if (action === "hard" && "deleted" in outcome && outcome.deleted) {
          result.deleted += 1;
        } else if ("archived" in outcome && outcome.archived) {
          result.archived += 1;
        } else {
          result.skipped += 1;
        }

        if ("blocked" in outcome && outcome.blocked) {
          result.errors.push({ productId, sku: outcome.product.sku, reason: outcome.reason || "Product has protected history and was archived instead of permanently deleted." });
        }
      } catch (error) {
        result.failed += 1;
        result.errors.push({ productId, reason: error instanceof Error ? error.message : "Unknown product action error." });
      }
    }

    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("[products-bulk-route-failed]", error);
    return Response.json(
      { ok: false, error: "Bulk product action failed.", reason: error instanceof Error ? error.message : "Unknown error." },
      { status: 500 },
    );
  }
}
