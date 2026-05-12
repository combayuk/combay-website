export const dynamic = "force-dynamic";

import { getPublicCategoryGroupsFromRepository } from "@/lib/productRepository";

export async function GET() {
  const categories = await getPublicCategoryGroupsFromRepository();
  return Response.json({ ok: true, categories });
}
