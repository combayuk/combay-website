import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { escapeHtml, htmlShell, sendEmail, siteUrl } from "@/lib/mailer";

const ACTIVE_STATUSES = ["QUEUED", "CLAIMED", "PROCESSING"];

function token(bytes = 32) {
  return randomBytes(bytes).toString("hex");
}

function workerSecretConfigured() {
  return Boolean(process.env.IMAGE_WORKER_SECRET);
}

export function assertWorkerSecret(value?: string | null) {
  const expected = process.env.IMAGE_WORKER_SECRET;
  if (!expected) throw new Error("IMAGE_WORKER_SECRET is not configured.");
  if (!value || value !== expected) throw new Error("Invalid image worker secret.");
}

function sourceUrlForImage(image: { url: string; originalUrl?: string | null }) {
  return String(image.originalUrl || image.url || "").trim();
}

export async function getImageProcessingStats() {
  const [jobs, images, backups] = await Promise.all([
    prisma.productImageProcessingJob.groupBy({
      by: ["status"],
      _count: { _all: true },
    }).catch(() => []),
    prisma.productImage.groupBy({
      by: ["backgroundProcessingStatus"],
      _count: { _all: true },
    }).catch(() => []),
    prisma.productImageBackupExport.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }).catch(() => []),
  ]);

  return {
    workerConfigured: workerSecretConfigured(),
    jobs: Object.fromEntries(jobs.map((row) => [row.status || "UNKNOWN", row._count._all])),
    images: Object.fromEntries(images.map((row) => [row.backgroundProcessingStatus || "untracked", row._count._all])),
    backups,
  };
}

export async function queueProductImages(args: { source?: "ebay" | "all"; limit?: number; includeGallery?: boolean; force?: boolean } = {}) {
  const limit = Math.max(1, Math.min(Number(args.limit || 500), 5000));
  const includeGallery = args.includeGallery !== false;
  const where: any = {};
  if (args.source === "ebay") where.product = { source: "ebay" };

  const images = await prisma.productImage.findMany({
    where,
    include: { product: true },
    orderBy: [{ productId: "asc" }, { sortOrder: "asc" }],
    take: limit,
  });

  let scanned = 0;
  let queued = 0;
  let skipped = 0;

  for (const image of images) {
    scanned++;
    if (!includeGallery && !image.isPrimary) { skipped++; continue; }
    const sourceUrl = sourceUrlForImage(image);
    if (!sourceUrl) { skipped++; continue; }
    if (!args.force && image.backgroundProcessingStatus === "processed") { skipped++; continue; }

    const activeExisting = await prisma.productImageProcessingJob.findFirst({
      where: {
        productImageId: image.id,
        status: { in: ACTIVE_STATUSES },
      },
      select: { id: true },
    });
    if (activeExisting) { skipped++; continue; }

    await prisma.productImageProcessingJob.create({
      data: {
        productId: image.productId,
        productImageId: image.id,
        sourceUrl,
        status: "QUEUED",
        provider: "local-rembg",
        model: process.env.IMAGE_WORKER_DEFAULT_MODEL || "isnet-general-use",
        priority: image.isPrimary ? 10 : 0,
      },
    });
    await prisma.productImage.update({
      where: { id: image.id },
      data: {
        originalUrl: sourceUrl,
        backgroundProcessingStatus: "queued",
        backgroundProcessingError: null,
      },
    }).catch(() => undefined);
    queued++;
  }

  return { scanned, queued, skipped };
}

export async function claimImageJobs(args: { workerId: string; limit?: number }) {
  const limit = Math.max(1, Math.min(Number(args.limit || 10), 50));
  const workerId = args.workerId.trim() || `worker-${Date.now()}`;

  const jobs = await prisma.productImageProcessingJob.findMany({
    where: { status: "QUEUED" },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: limit,
    include: {
      product: { select: { id: true, sku: true, title: true } },
      productImage: { select: { id: true, url: true, originalUrl: true, isPrimary: true, sortOrder: true } },
    },
  });

  const claimed = [];
  for (const job of jobs) {
    const updated = await prisma.productImageProcessingJob.update({
      where: { id: job.id },
      data: {
        status: "CLAIMED",
        workerId,
        attempts: { increment: 1 },
        claimedAt: new Date(),
        error: null,
      },
      include: {
        product: { select: { id: true, sku: true, title: true } },
        productImage: { select: { id: true, url: true, originalUrl: true, isPrimary: true, sortOrder: true } },
      },
    }).catch(() => null);
    if (updated) claimed.push(updated);
  }

  return claimed.map((job) => ({
    id: job.id,
    productId: job.productId,
    productImageId: job.productImageId,
    sourceUrl: job.sourceUrl,
    productTitle: job.product.title,
    sku: job.product.sku,
    isPrimary: job.productImage.isPrimary,
    sortOrder: job.productImage.sortOrder,
    model: job.model || process.env.IMAGE_WORKER_DEFAULT_MODEL || "isnet-general-use",
    backgroundUrl: process.env.PRODUCT_IMAGE_BACKGROUND_URL || `${siteUrl().replace(/\/$/, "")}/images/product-backgrounds/combay-background.jpg`,
  }));
}

export async function completeImageJob(args: {
  jobId: string;
  workerId?: string | null;
  status: "PROCESSED" | "NEEDS_REVIEW" | "FAILED" | "SKIPPED";
  resultUrl?: string | null;
  previewUrl?: string | null;
  qualityScore?: number | null;
  qualityNotes?: string | null;
  error?: string | null;
}) {
  const job = await prisma.productImageProcessingJob.findUnique({ where: { id: args.jobId }, include: { productImage: true } });
  if (!job) throw new Error("Image processing job not found.");
  if (job.workerId && args.workerId && job.workerId !== args.workerId) throw new Error("This job is claimed by another worker.");

  const status = args.status;
  const resultUrl = String(args.resultUrl || "").trim();
  const isAutoUsable = status === "PROCESSED" && resultUrl && Number(args.qualityScore ?? 100) >= Number(process.env.IMAGE_WORKER_AUTO_APPROVE_MIN_SCORE || 85);

  await prisma.productImageProcessingJob.update({
    where: { id: job.id },
    data: {
      status: isAutoUsable ? "PROCESSED" : status,
      resultUrl: resultUrl || null,
      previewUrl: String(args.previewUrl || "").trim() || null,
      qualityScore: args.qualityScore ?? null,
      qualityNotes: args.qualityNotes || null,
      error: args.error || null,
      processedAt: new Date(),
    },
  });

  if (isAutoUsable) {
    await prisma.productImage.update({
      where: { id: job.productImageId },
      data: {
        url: resultUrl,
        originalUrl: job.sourceUrl,
        backgroundProcessedAt: new Date(),
        backgroundProcessingStatus: "processed",
        backgroundProcessingError: null,
      },
    });
  } else if (status === "NEEDS_REVIEW") {
    await prisma.productImage.update({
      where: { id: job.productImageId },
      data: {
        originalUrl: job.sourceUrl,
        backgroundProcessingStatus: "needs_review",
        backgroundProcessingError: args.qualityNotes || null,
      },
    });
  } else if (status === "FAILED") {
    await prisma.productImage.update({
      where: { id: job.productImageId },
      data: {
        originalUrl: job.sourceUrl,
        backgroundProcessingStatus: "failed",
        backgroundProcessingError: args.error || args.qualityNotes || "Image processing failed.",
      },
    });
  }

  return { ok: true, autoApplied: isAutoUsable };
}

export async function approveProcessedImageJob(jobId: string) {
  const job = await prisma.productImageProcessingJob.findUnique({ where: { id: jobId } });
  if (!job?.resultUrl) throw new Error("No processed image is available for this job.");
  await prisma.productImage.update({
    where: { id: job.productImageId },
    data: {
      url: job.resultUrl,
      originalUrl: job.sourceUrl,
      backgroundProcessedAt: new Date(),
      backgroundProcessingStatus: "approved",
      backgroundProcessingError: null,
    },
  });
  return prisma.productImageProcessingJob.update({
    where: { id: jobId },
    data: { status: "APPROVED", approvedAt: new Date(), error: null },
  });
}

export async function rejectProcessedImageJob(jobId: string, reason?: string) {
  const job = await prisma.productImageProcessingJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("Image processing job not found.");
  await prisma.productImage.update({
    where: { id: job.productImageId },
    data: {
      originalUrl: job.sourceUrl,
      backgroundProcessingStatus: "rejected",
      backgroundProcessingError: reason || "Rejected by admin.",
    },
  });
  return prisma.productImageProcessingJob.update({
    where: { id: jobId },
    data: { status: "REJECTED", rejectedAt: new Date(), error: reason || "Rejected by admin." },
  });
}



export async function deleteParkedImageProcessingRecords() {
  const removableStatuses = ["REJECTED", "NEEDS_REVIEW", "FAILED"];
  const jobs = await prisma.productImageProcessingJob.findMany({
    where: { status: { in: removableStatuses } },
    select: { id: true, status: true, resultUrl: true, previewUrl: true, productImageId: true },
    take: 10000,
  });

  const resultUrls = Array.from(new Set(jobs.flatMap((job) => [job.resultUrl, job.previewUrl]).filter(Boolean).map(String)));
  const imageIds = Array.from(new Set(jobs.map((job) => job.productImageId).filter(Boolean).map(String)));

  if (jobs.length) {
    await prisma.productImageProcessingJob.deleteMany({
      where: { id: { in: jobs.map((job) => job.id) } },
    });
  }

  if (imageIds.length) {
    await prisma.productImage.updateMany({
      where: {
        id: { in: imageIds },
        backgroundProcessingStatus: { in: ["parked_v2", "needs_review", "failed", "rejected"] },
      },
      data: {
        backgroundProcessedAt: null,
        backgroundProcessingStatus: null,
        backgroundProcessingError: null,
      },
    }).catch(() => undefined);
  }

  return {
    ok: true,
    deletedJobs: jobs.length,
    imageStatusReset: imageIds.length,
    resultUrls,
    note: "Database cleanup complete. Delete resultUrls from VPS storage using the supplied cleanup script.",
  };
}

export async function parkImageProcessingForV2() {
  const now = new Date();

  const jobs = await prisma.productImageProcessingJob.updateMany({
    where: {
      status: { in: ["QUEUED", "CLAIMED", "PROCESSING", "NEEDS_REVIEW", "FAILED"] },
    },
    data: {
      status: "REJECTED",
      rejectedAt: now,
      error: "Background removal parked for V2 after quality review. Original product image retained.",
    },
  });

  const images = await prisma.productImage.updateMany({
    where: {
      backgroundProcessingStatus: { in: ["queued", "claimed", "processing", "needs_review", "failed"] },
    },
    data: {
      backgroundProcessingStatus: "parked_v2",
      backgroundProcessingError: "Background removal parked for V2. Original image retained.",
    },
  });

  return {
    ok: true,
    jobsUpdated: jobs.count,
    imagesUpdated: images.count,
  };
}

export async function createBackupExportRequest(args: { email?: string | null; requestedBy?: string | null }) {
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const exportRow = await prisma.productImageBackupExport.create({
    data: {
      token: token(24),
      status: "QUEUED",
      email: args.email || process.env.ADMIN_EMAIL || "sales@combay.co.uk",
      requestedBy: args.requestedBy || null,
      expiresAt,
    },
  });
  return exportRow;
}

export async function completeBackupExport(args: { token: string; downloadUrl: string; fileName?: string; fileSize?: number; imageCount?: number }) {
  const exportRow = await prisma.productImageBackupExport.update({
    where: { token: args.token },
    data: {
      status: "READY",
      downloadUrl: args.downloadUrl,
      fileName: args.fileName || null,
      fileSize: args.fileSize || null,
      imageCount: args.imageCount || 0,
    },
  });
  if (exportRow.email) {
    const html = htmlShell(
      "Combay image backup is ready",
      `<p>Your Combay processed image backup is ready.</p><p><a href="${escapeHtml(exportRow.downloadUrl || args.downloadUrl)}" style="font-weight:800;color:#0f172a;text-decoration:underline;">Download image backup</a></p><p>This link expires on ${escapeHtml(exportRow.expiresAt.toLocaleString("en-GB"))}. After expiry, the temporary backup file should be deleted from the worker/VPS storage.</p>`,
      "Your Combay image backup is ready"
    );
    const email = await sendEmail({ to: exportRow.email, subject: "Combay image backup is ready", html, headers: { "X-Combay-Email-Type": "image-backup-ready" } });
    await prisma.productImageBackupExport.update({ where: { id: exportRow.id }, data: { emailedAt: email.sent ? new Date() : null } }).catch(() => undefined);
  }
  return exportRow;
}

export async function markExpiredBackupExports() {
  return prisma.productImageBackupExport.updateMany({
    where: { expiresAt: { lt: new Date() }, status: { in: ["QUEUED", "READY"] } },
    data: { status: "EXPIRED" },
  });
}
