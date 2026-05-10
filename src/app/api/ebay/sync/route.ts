export const dynamic = "force-dynamic";

import { getEbaySyncProgress, pauseEbaySyncProgress, resetEbaySyncProgress, resetStuckEbaySyncRuns, runEbayInventorySync, type EbaySyncMode } from "@/lib/ebay";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const mode = ["test10", "first50", "all"].includes(body?.mode) ? (body.mode as EbaySyncMode) : "test10";
  const result = await runEbayInventorySync({
    mode,
    startPage: Number(body?.startPage || 1),
    maxListings: body?.maxListings === undefined ? undefined : Number(body.maxListings),
    maxPages: body?.maxPages === undefined ? undefined : Number(body.maxPages),
    entriesPerPage: body?.entriesPerPage === undefined ? undefined : Number(body.entriesPerPage),
    fast: body?.fast !== false,
  });
  return Response.json(result, { status: result.ok ? 200 : 400 });
}

export async function GET() {
  const result = await getEbaySyncProgress();
  return Response.json(result);
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || "");
  if (action === "reset-progress") {
    const result = await resetEbaySyncProgress();
    return Response.json(result);
  }
  if (action === "pause") {
    const result = await pauseEbaySyncProgress(true);
    return Response.json(result);
  }
  if (action === "resume") {
    const result = await pauseEbaySyncProgress(false);
    return Response.json(result);
  }
  return Response.json({ ok: false, error: "Unsupported sync action." }, { status: 400 });
}

export async function DELETE() {
  const stuck = await resetStuckEbaySyncRuns();
  const progress = await resetEbaySyncProgress();
  return Response.json({ ok: true, resetCount: stuck.resetCount + progress.resetCount, message: "Reset stuck runs and full-sync progress." });
}
