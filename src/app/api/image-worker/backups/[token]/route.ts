import { NextRequest, NextResponse } from "next/server";
import { assertWorkerSecret, completeBackupExport } from "@/lib/productImageQueue";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    assertWorkerSecret(req.headers.get("x-image-worker-secret"));
    const body = await req.json().catch(() => ({}));
    if (!body.downloadUrl) return NextResponse.json({ ok: false, error: "downloadUrl is required." }, { status: 400 });
    const exportRow = await completeBackupExport({
      token: params.token,
      downloadUrl: String(body.downloadUrl),
      fileName: body.fileName ? String(body.fileName) : undefined,
      fileSize: body.fileSize ? Number(body.fileSize) : undefined,
      imageCount: body.imageCount ? Number(body.imageCount) : undefined,
    });
    return NextResponse.json({ ok: true, export: exportRow });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not complete backup export." }, { status: 400 });
  }
}
