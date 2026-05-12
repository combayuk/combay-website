import { archiveProductInRepository, getProductByIdFromRepository, hardDeleteProductInRepository, saveProductToRepository } from "@/lib/productRepository";

function productErrorResponse(reason: string) {
  const lower = reason.toLowerCase();
  const isSchema = lower.includes("does not exist") || lower.includes("column") || lower.includes("schema") || lower.includes("database") || lower.includes("prisma");
  return Response.json({
    ok: false,
    error: isSchema
      ? "Product could not be loaded because the system database is out of sync. Please contact admin."
      : "Could not load product due to a system error.",
    technicalReason: reason,
  }, { status: 500 });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const result = await getProductByIdFromRepository(params.id);
  if (result.error && !result.product) return productErrorResponse(result.error);
  if (!result.product) {
    return Response.json({ ok: false, error: "Product not found." }, { status: 404 });
  }
  return Response.json({ ok: true, source: result.source, product: result.product });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({})) as any;
  const dbResult = await saveProductToRepository({ ...body, id: body.id ?? params.id });

  if (!dbResult.ok) {
    return Response.json({ ok: false, error: "Could not save product due to a system error.", reason: dbResult.reason }, { status: 500 });
  }
  return Response.json({ ok: true, source: "database", product: dbResult.data });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode");
  const dbResult = mode === "hard" ? await hardDeleteProductInRepository(params.id) : await archiveProductInRepository(params.id);

  if (!dbResult.ok) {
    return Response.json({ ok: false, error: "Product could not be deleted. See details below.", reason: dbResult.reason }, { status: 500 });
  }
  return Response.json({ ok: true, source: "database", archived: mode !== "hard", result: dbResult.data });
}
