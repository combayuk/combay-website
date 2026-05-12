export const dynamic = "force-dynamic";

import { listResources, saveResource } from "@/lib/resources";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const result = await listResources({
    publicOnly: searchParams.get("public") === "1",
    query: searchParams.get("q") || "",
    type: searchParams.get("type") || "all",
    status: searchParams.get("status") || "all",
    page: Number(searchParams.get("page") || 1),
    pageSize: Number(searchParams.get("pageSize") || 24),
  });
  if (!result.ok) return Response.json({ ok: false, error: result.reason }, { status: 202 });
  return Response.json({ ok: true, ...result.data });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const result = await saveResource(body || {});
  if (!result.ok) return Response.json({ ok: false, error: result.reason }, { status: 400 });
  return Response.json({ ok: true, resource: result.data });
}
