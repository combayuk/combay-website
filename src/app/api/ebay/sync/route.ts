export const dynamic = "force-dynamic";

import { resetStuckEbaySyncRuns, runEbayInventorySync, type EbaySyncMode } from "@/lib/ebay";

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

export async function DELETE() {
  const result = await resetStuckEbaySyncRuns();
  return Response.json(result);
}
