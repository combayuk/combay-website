export const dynamic = "force-dynamic";

import { getPublicCategoryGroupsFromRepository } from "@/lib/productRepository";

export async function GET() {
  const startedAt = Date.now();
  const categories = await getPublicCategoryGroupsFromRepository();
  const duration = Date.now() - startedAt;
  return Response.json(
    { ok: true, categories, timingMs: duration },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800",
        "Server-Timing": `categories;dur=${duration}`,
      },
    },
  );
}
