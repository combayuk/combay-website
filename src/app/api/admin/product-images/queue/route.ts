import { NextRequest, NextResponse } from "next/server";
import {
  approveProcessedImageJob,
  createBackupExportRequest,
  getImageProcessingStats,
  queueProductImages,
  rejectProcessedImageJob,
  markExpiredBackupExports,
  parkImageProcessingForV2,
} from "@/lib/productImageQueue";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function n(value: unknown, fallback: number, min: number, max: number) {
  const num = Number(value);
  return Number.isFinite(num) ? Math.max(min, Math.min(max, Math.floor(num))) : fallback;
}

export async function GET() {
  await markExpiredBackupExports().catch(() => undefined);
  const stats = await getImageProcessingStats();
  const reviewJobs = await prisma.productImageProcessingJob.findMany({
    where: { status: { in: ["NEEDS_REVIEW", "FAILED"] } },
    orderBy: { updatedAt: "desc" },
    take: 30,
    include: {
      product: { select: { sku: true, title: true } },
      productImage: { select: { url: true, originalUrl: true, isPrimary: true, sortOrder: true } },
    },
  }).catch(() => []);
  return NextResponse.json({ ok: true, stats, reviewJobs });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "queue");
  try {
    if (action === "queue") {
      const result = await queueProductImages({
        source: body.source === "all" ? "all" : "ebay",
        limit: n(body.limit, 1000, 1, 5000),
        includeGallery: body.includeGallery !== false,
        force: Boolean(body.force),
      });
      return NextResponse.json({ ok: true, ...result, message: `Queued ${result.queued} image(s). Scanned ${result.scanned}; skipped ${result.skipped}.` });
    }

    if (action === "approve") {
      const job = await approveProcessedImageJob(String(body.jobId || ""));
      return NextResponse.json({ ok: true, job, message: "Processed image approved and applied." });
    }

    if (action === "reject") {
      const job = await rejectProcessedImageJob(String(body.jobId || ""), String(body.reason || ""));
      return NextResponse.json({ ok: true, job, message: "Processed image rejected. Product image was not replaced." });
    }

    if (action === "backup") {
      const exportRow = await createBackupExportRequest({
        email: String(body.email || process.env.ADMIN_EMAIL || "sales@combay.co.uk"),
        requestedBy: String(body.requestedBy || "admin"),
      });
      return NextResponse.json({ ok: true, export: exportRow, message: "Image backup export queued. The worker will create a secure downloadable ZIP and email the admin when ready." });
    }

    if (action === "park-v2-cleanup") {
      const result = await parkImageProcessingForV2();
      return NextResponse.json({
        ...result,
        message: `Image processing parked for V2. Rejected ${result.jobsUpdated} old queued/review/failed job(s) and marked ${result.imagesUpdated} image status record(s) as parked.`,
      });
    }

    return NextResponse.json({ ok: false, error: "Unsupported image queue action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Image queue action failed." }, { status: 500 });
  }
}
