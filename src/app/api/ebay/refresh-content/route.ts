export const dynamic = "force-dynamic";

import { refreshEbayCategoriesAndOverviews } from "@/lib/ebay";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const limit = body?.limit === undefined ? 100 : Number(body.limit);
  const result = await refreshEbayCategoriesAndOverviews(limit);
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
