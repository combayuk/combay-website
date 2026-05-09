import { NextRequest, NextResponse } from "next/server";
import { assertWorkerSecret, claimImageJobs } from "@/lib/productImageQueue";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-image-worker-secret");
    assertWorkerSecret(secret);
    const body = await req.json().catch(() => ({}));
    const workerId = String(body.workerId || "combay-image-worker");
    const limit = Math.max(1, Math.min(Number(body.limit || 10), 50));
    const jobs = await claimImageJobs({ workerId, limit });
    return NextResponse.json({ ok: true, jobs });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not claim jobs." }, { status: 401 });
  }
}
