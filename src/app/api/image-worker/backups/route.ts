import { NextRequest, NextResponse } from "next/server";
import { assertWorkerSecret } from "@/lib/productImageQueue";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    assertWorkerSecret(req.headers.get("x-image-worker-secret"));
    const body = await req.json().catch(() => ({}));
    const limit = Math.max(1, Math.min(Number(body.limit || 1), 3));

    const exports = await prisma.productImageBackupExport.findMany({
      where: { status: "QUEUED", expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    const imageRows = await prisma.productImage.findMany({
      where: {
        url: { not: "" },
        OR: [
          { backgroundProcessingStatus: "processed" },
          { backgroundProcessingStatus: "approved" },
        ],
      },
      include: { product: { select: { sku: true, title: true } } },
      orderBy: [{ productId: "asc" }, { sortOrder: "asc" }],
      take: Math.max(1000, Math.min(Number(body.maxImages || 100000), 100000)),
    });

    const claimed = [];
    for (const exportRow of exports) {
      const updated = await prisma.productImageBackupExport.update({
        where: { id: exportRow.id },
        data: { status: "PROCESSING", imageCount: imageRows.length },
      });
      claimed.push({
        token: updated.token,
        expiresAt: updated.expiresAt,
        email: updated.email,
        imageCount: imageRows.length,
        images: imageRows.map((image) => ({
          url: image.url,
          fileName: `${image.product?.sku || "product"}-${image.sortOrder || 0}.png`,
          sku: image.product?.sku || "",
          title: image.product?.title || image.alt || "",
        })),
      });
    }

    return NextResponse.json({ ok: true, backups: claimed });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not claim backup exports." }, { status: 401 });
  }
}
