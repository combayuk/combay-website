import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/db";
import {
  productBackgroundProcessingConfigured,
  productBackgroundProcessingEnabled,
  removeBackgroundAndApplyCombayBg,
  looksLikeCombayBrandedProductImage,
} from "@/lib/productImageProcessing";

export const dynamic = "force-dynamic";

function intParam(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) return NextResponse.json({ ok: false, error: "Database is not configured." }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const limit = intParam(body.limit, 25, 1, 100);
  const perProduct = intParam(body.perProduct ?? process.env.EBAY_IMAGE_BACKGROUND_MAX_PER_PRODUCT, 1, 1, 15);
  const productId = String(body.productId || "").trim();
  const force = Boolean(body.force);

  if (!productBackgroundProcessingEnabled()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      reason: "Background processing is disabled. Set EBAY_IMAGE_BACKGROUND_PROCESSING_ENABLED=true.",
    }, { status: 400 });
  }

  if (!productBackgroundProcessingConfigured()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      reason: "Background processing needs REMOVE_BG_API_KEY plus VPS upload env vars: UPLOAD_PROVIDER=vps, UPLOAD_RECEIVER_URL and UPLOAD_RECEIVER_SECRET.",
    }, { status: 400 });
  }

  const products = await prisma.product.findMany({
    where: productId ? { id: productId } : { source: "ebay" },
    include: { images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] } },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  let scanned = 0;
  let processed = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const product of products) {
    scanned++;
    const images = product.images.slice(0, perProduct);
    for (const image of images) {
      const originalUrl = image.originalUrl || image.url;
      if (!originalUrl) { skipped++; continue; }
      if (!force && image.backgroundProcessingStatus === "processed") { skipped++; continue; }
      if (!force && looksLikeCombayBrandedProductImage(image.url)) {
        await prisma.productImage.update({
          where: { id: image.id },
          data: { originalUrl, backgroundProcessingStatus: "already-branded", backgroundProcessingError: null },
        }).catch(() => undefined);
        skipped++;
        continue;
      }

      try {
        const result = await removeBackgroundAndApplyCombayBg({ imageUrl: originalUrl, title: product.title, index: image.sortOrder });
        if (!result.ok) {
          await prisma.productImage.update({
            where: { id: image.id },
            data: { originalUrl, backgroundProcessingStatus: "skipped", backgroundProcessingError: result.reason },
          });
          skipped++;
          continue;
        }
        await prisma.productImage.update({
          where: { id: image.id },
          data: {
            url: result.url,
            originalUrl,
            backgroundProcessedAt: result.alreadyBranded ? image.backgroundProcessedAt : new Date(),
            backgroundProcessingStatus: result.alreadyBranded ? "already-branded" : "processed",
            backgroundProcessingError: null,
          },
        });
        processed++;
      } catch (error) {
        failed++;
        const message = error instanceof Error ? error.message : "Image processing failed.";
        errors.push(`${product.sku || product.title}: ${message}`);
        await prisma.productImage.update({
          where: { id: image.id },
          data: { originalUrl, backgroundProcessingStatus: "failed", backgroundProcessingError: message },
        }).catch(() => undefined);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    scanned,
    processed,
    skipped,
    failed,
    errors: errors.slice(0, 10),
    message: `Image background processing complete. Scanned ${scanned} products; processed ${processed}; skipped ${skipped}; failed ${failed}.`,
  });
}
