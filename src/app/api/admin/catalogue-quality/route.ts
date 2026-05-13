export const dynamic = "force-dynamic";

import { requireAdminApiSession } from "@/lib/apiAccess";
import { loadCatalogueQualityReport } from "@/lib/catalogueQuality";

export async function GET(req: Request) {
  const access = await requireAdminApiSession();
  if (!access.ok) return access.response;
  const { searchParams } = new URL(req.url);
  const result = await loadCatalogueQualityReport({
    q: searchParams.get("q") || "",
    status: searchParams.get("status") || "all",
    issue: searchParams.get("issue") || "all",
    category: searchParams.get("category") || "all",
    page: Number(searchParams.get("page") || 1),
    pageSize: Number(searchParams.get("pageSize") || 40),
  });
  if (!result.ok) return Response.json({ ok: false, error: result.reason }, { status: 500 });
  return Response.json({ ok: true, data: result.data });
}
