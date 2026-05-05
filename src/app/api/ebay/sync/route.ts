import { runEbayInventorySync } from "@/lib/ebay";

export async function POST() {
  const result = await runEbayInventorySync();
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
