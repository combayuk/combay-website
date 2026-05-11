import { prisma } from "@/lib/db";

let bootstrapPromise: Promise<void> | null = null;

export function ensureOperationalTables() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "trackingEmailSentAt" TIMESTAMP(3)`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "trackingEmailLastHash" TEXT`);
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
