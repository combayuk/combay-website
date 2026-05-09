import { NextRequest, NextResponse } from "next/server";
import { assertWorkerSecret, completeImageJob } from "@/lib/productImageQueue";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const secret = req.headers.get("x-image-worker-secret");
    assertWorkerSecret(secret);
    const body = await req.json().catch(() => ({}));
    const result = await completeImageJob({
      jobId: params.id,
      workerId: body.workerId,
      status: String(body.status || "FAILED").toUpperCase() as any,
      resultUrl: body.resultUrl,
      previewUrl: body.previewUrl,
      qualityScore: body.qualityScore === undefined ? null : Number(body.qualityScore),
      qualityNotes: body.qualityNotes,
      error: body.error,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not complete job." }, { status: 400 });
  }
}
