export const dynamic = "force-dynamic";

import { deleteResource, getResourceById, saveResource } from "@/lib/resources";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const result = await getResourceById(params.id);
  if (!result.ok) return Response.json({ ok: false, error: result.reason }, { status: 202 });
  if (!result.data) return Response.json({ ok: false, error: "Resource not found." }, { status: 404 });
  return Response.json({ ok: true, resource: result.data });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const result = await saveResource({ ...body, id: params.id });
  if (!result.ok) return Response.json({ ok: false, error: result.reason }, { status: 400 });
  return Response.json({ ok: true, resource: result.data });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const result = await deleteResource(params.id);
  if (!result.ok) return Response.json({ ok: false, error: result.reason }, { status: 400 });
  return Response.json({ ok: true });
}
