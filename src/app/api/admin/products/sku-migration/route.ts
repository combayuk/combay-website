import { migrateExistingProductsToSequentialSkus } from "@/lib/productRepository";
import { ensureOperationalTables } from "@/lib/operationalSchema";

export async function POST() {
  await ensureOperationalTables();
  const result = await migrateExistingProductsToSequentialSkus();
  if (!result.ok) return Response.json({ ok: false, error: result.reason || "SKU migration failed." }, { status: 202 });
  return Response.json({ ok: true, ...result.data });
}
