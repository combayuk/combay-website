import { getProductByIdFromRepository } from "@/lib/productRepository";
import { prisma, withDatabase } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const result = await getProductByIdFromRepository(params.id);
  if (!result.product) {
    return Response.json({ ok: false, error: "Product not found." }, { status: 404 });
  }
  return Response.json({ ok: true, source: result.source, product: result.product });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({})) as any;
  const dbResult = await withDatabase(async () => {
    const existing = await prisma.product.findFirst({ where: { OR: [{ id: params.id }, { sku: params.id }, { slug: params.id }] } });
    if (!existing) throw new Error("Product not found.");
    return prisma.product.update({
      where: { id: existing.id },
      data: {
        title: body.title,
        brand: body.brand,
        manufacturer: body.manufacturer,
        model: body.model,
        mpn: body.mpn,
        status: body.status,
        condition: body.condition,
        price: body.price === undefined ? undefined : body.price === null || body.price === "" ? null : Number(body.price),
        priceOnRequest: body.priceOnRequest,
        stockQty: body.stockQty === undefined ? undefined : Number(body.stockQty),
        description: body.description,
        productOverview: body.productOverview,
        dispatchNote: body.dispatchNote,
        leadTime: body.leadTime,
        warranty: body.warranty,
        locationBin: body.locationBin,
        hsCode: body.hsCode,
        syncExcluded: body.syncExcluded,
      },
    });
  });

  if (!dbResult.ok) return Response.json({ ok: false, mode: "preview", reason: dbResult.reason }, { status: 202 });
  return Response.json({ ok: true, source: "database", product: dbResult.data });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const dbResult = await withDatabase(async () => {
    const existing = await prisma.product.findFirst({ where: { OR: [{ id: params.id }, { sku: params.id }, { slug: params.id }] } });
    if (!existing) throw new Error("Product not found.");
    return prisma.product.update({ where: { id: existing.id }, data: { status: "ARCHIVED" } });
  });

  if (!dbResult.ok) return Response.json({ ok: false, mode: "preview", reason: dbResult.reason }, { status: 202 });
  return Response.json({ ok: true, source: "database", archived: true });
}
