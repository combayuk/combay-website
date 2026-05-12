import { bulkDeleteOrArchiveProductsInRepository } from "@/lib/productRepository";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as any;
  const ids = Array.isArray(body?.ids) ? body.ids.map(String) : [];
  const action = body?.action === "delete" ? "hard" : body?.action === "restore" ? "restore" : "archive";

  if (!ids.length) {
    return Response.json({ ok: false, error: "No products selected." }, { status: 400 });
  }

  const result = await bulkDeleteOrArchiveProductsInRepository(ids, action);
  if (!result.ok) {
    return Response.json({ ok: false, error: "Bulk product action failed.", reason: result.reason }, { status: 500 });
  }
  return Response.json({ ok: true, ...result.data });
}
