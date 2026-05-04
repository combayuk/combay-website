import { archiveProductInRepository, getProductByIdFromRepository, saveProductToRepository } from "@/lib/productRepository";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const result = await getProductByIdFromRepository(params.id);
  if (!result.product) {
    return Response.json({ ok: false, error: "Product not found." }, { status: 404 });
  }
  return Response.json({ ok: true, source: result.source, product: result.product });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({})) as any;
  const dbResult = await saveProductToRepository({ ...body, id: body.id ?? params.id });

  if (!dbResult.ok) return Response.json({ ok: false, mode: "preview", reason: dbResult.reason }, { status: 202 });
  return Response.json({ ok: true, source: "database", product: dbResult.data });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const dbResult = await archiveProductInRepository(params.id);

  if (!dbResult.ok) return Response.json({ ok: false, mode: "preview", reason: dbResult.reason }, { status: 202 });
  return Response.json({ ok: true, source: "database", archived: true });
}
