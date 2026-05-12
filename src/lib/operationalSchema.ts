import { prisma } from "@/lib/db";

let bootstrapPromise: Promise<void> | null = null;

export function ensureOperationalTables() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "trackingEmailSentAt" TIMESTAMP(3)`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "trackingEmailLastHash" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "trackingEmailAttemptedAt" TIMESTAMP(3)`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "trackingEmailStatus" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "trackingEmailProviderId" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "trackingEmailRecipient" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "trackingEmailLastError" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "salesChannel" TEXT NOT NULL DEFAULT 'WEBSITE'`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "externalOrderId" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "externalMarketplace" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3)`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "OrderItem" ALTER COLUMN "productId" DROP NOT NULL`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Order_salesChannel_idx" ON "Order"("salesChannel")`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Order_paymentStatus_idx" ON "Order"("paymentStatus")`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status")`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt")`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Order_externalOrderId_idx" ON "Order"("externalOrderId")`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Product_sku_idx" ON "Product"("sku")`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Product_status_idx" ON "Product"("status")`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Product_updatedAt_idx" ON "Product"("updatedAt")`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Product_ebayListingId_idx" ON "Product"("ebayListingId")`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Product_ebayOfferId_idx" ON "Product"("ebayOfferId")`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3)`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "deleteRequestedAt" TIMESTAMP(3)`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "deletePurgeAfter" TIMESTAMP(3)`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "deleteStatus" TEXT`);
        // Keep production DB aligned with Prisma Product scalar fields before any Prisma Product query runs.
        // Prisma selects all scalar fields on findFirst/findUnique unless a narrow select is used, so one missing
        // optional column can make product open/delete routes fail with misleading "Product not found" UI states.
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "rawEbayDescription" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "titleLocked" BOOLEAN NOT NULL DEFAULT false`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "priceLocked" BOOLEAN NOT NULL DEFAULT false`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "imagesLocked" BOOLEAN NOT NULL DEFAULT false`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "specsLocked" BOOLEAN NOT NULL DEFAULT false`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "descriptionLocked" BOOLEAN NOT NULL DEFAULT false`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "manufacturerUrl" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "videoUrl" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "seoTitle" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "seoDescription" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "seoKeywords" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ebayListingId" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ebayOfferId" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ebayInventoryItemSku" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ebayMarketplaceId" TEXT DEFAULT 'EBAY_GB'`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ebayCategoryId" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ebayCategoryName" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ebayPublishStatus" TEXT DEFAULT 'NOT_LISTED'`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ebayLastPushedAt" TIMESTAMP(3)`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ebayLastPulledAt" TIMESTAMP(3)`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ebayLastError" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ebayExcludedFromSync" BOOLEAN NOT NULL DEFAULT false`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ebaySourceOfTruth" TEXT DEFAULT 'COMBAY'`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ebayConditionId" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ebayConditionEnum" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ebayFulfillmentPolicyId" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ebayPaymentPolicyId" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ebayReturnPolicyId" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ebayInventoryLocationKey" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ebayDescriptionHtml" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ebayDescriptionTemplateId" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ebaySpecificsJson" JSONB`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ebayValidationErrorsJson" JSONB`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ebaySkuLocked" BOOLEAN NOT NULL DEFAULT false`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ebayShowOnUsCanada" BOOLEAN NOT NULL DEFAULT false`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ebayBestOfferEnabled" BOOLEAN NOT NULL DEFAULT false`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "addonSupport" BOOLEAN NOT NULL DEFAULT false`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "addonWarranty" BOOLEAN NOT NULL DEFAULT false`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "addonInstall" BOOLEAN NOT NULL DEFAULT false`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Product_deletedAt_idx" ON "Product"("deletedAt")`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Product_deleteStatus_idx" ON "Product"("deleteStatus")`);
        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "InventoryMovement" (
          "id" TEXT PRIMARY KEY,
          "productId" TEXT,
          "variantId" TEXT,
          "sku" TEXT NOT NULL,
          "variationSku" TEXT,
          "type" TEXT NOT NULL,
          "quantityChange" INTEGER NOT NULL,
          "source" TEXT NOT NULL,
          "sourceId" TEXT NOT NULL,
          "externalReference" TEXT NOT NULL UNIQUE,
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdBy" TEXT
        )`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "InventoryMovement_sku_idx" ON "InventoryMovement"("sku")`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "InventoryMovement_productId_idx" ON "InventoryMovement"("productId")`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "InventoryMovement_source_sourceId_idx" ON "InventoryMovement"("source", "sourceId")`);
        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "InventorySyncJob" (
          "id" TEXT PRIMARY KEY,
          "productId" TEXT,
          "variantId" TEXT,
          "sku" TEXT NOT NULL,
          "target" TEXT NOT NULL,
          "action" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'QUEUED',
          "attempts" INTEGER NOT NULL DEFAULT 0,
          "payload" JSONB,
          "error" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "processedAt" TIMESTAMP(3)
        )`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "InventorySyncJob_target_status_idx" ON "InventorySyncJob"("target", "status")`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "InventorySyncJob_sku_idx" ON "InventorySyncJob"("sku")`);
        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "AdminNotification" (
          "id" TEXT PRIMARY KEY,
          "type" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "message" TEXT,
          "sourceModel" TEXT,
          "sourceId" TEXT,
          "customerName" TEXT,
          "customerEmail" TEXT,
          "amount" DECIMAL(10,2),
          "isRead" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "readAt" TIMESTAMP(3)
        )`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AdminNotification_isRead_createdAt_idx" ON "AdminNotification"("isRead", "createdAt")`);
        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "SkuAuditLog" (
          "id" TEXT PRIMARY KEY,
          "productId" TEXT,
          "oldSku" TEXT,
          "newSku" TEXT NOT NULL,
          "reason" TEXT NOT NULL,
          "changedBy" TEXT,
          "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "ebayUpdateStatus" TEXT,
          "ebayUpdateError" TEXT
        )`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SkuAuditLog_newSku_idx" ON "SkuAuditLog"("newSku")`);
      } catch (error) {
        console.error("[operational-schema-bootstrap-failed]", error);
      }
    })();
  }
  return bootstrapPromise;
}
