import { NextResponse } from "next/server";
import { prisma, withDatabase } from "@/lib/db";
import { preparePromotionInput, publicPromotion, replacePromotionTargets } from "@/lib/promotions";

export const dynamic = "force-dynamic";

export async function GET() {
  const dbResult = await withDatabase(async () => {
    const promotions = await prisma.promotion.findMany({ include: { productTargets: true }, orderBy: [{ isActive: "desc" }, { createdAt: "desc" }] });
    return promotions.map(publicPromotion);
  });

  if (!dbResult.ok) return NextResponse.json({ ok: false, promotions: [], error: dbResult.reason }, { status: 500 });
  return NextResponse.json({ ok: true, promotions: dbResult.data });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "Invalid promotion data." }, { status: 400 });

  try {
    const data = preparePromotionInput(body);
    const dbResult = await withDatabase(async () => {
      const promotion = await prisma.promotion.create({ data });
      await replacePromotionTargets(promotion.id, Array.isArray(body.includeProductIds) ? body.includeProductIds : [], Array.isArray(body.excludeProductIds) ? body.excludeProductIds : []);
      const reloaded = await prisma.promotion.findUnique({ where: { id: promotion.id }, include: { productTargets: true } });
      return publicPromotion(reloaded || promotion);
    });
    if (!dbResult.ok) return NextResponse.json({ ok: false, error: dbResult.reason }, { status: 500 });
    return NextResponse.json({ ok: true, promotion: dbResult.data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not create promotion." }, { status: 400 });
  }
}
