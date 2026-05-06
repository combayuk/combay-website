import { NextResponse } from "next/server";
import { prisma, withDatabase } from "@/lib/db";
import { preparePromotionInput, publicPromotion } from "@/lib/promotions";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "Invalid promotion data." }, { status: 400 });

  try {
    const data = preparePromotionInput(body);
    const dbResult = await withDatabase(async () => {
      const promotion = await prisma.promotion.update({ where: { id: params.id }, data });
      return publicPromotion(promotion);
    });
    if (!dbResult.ok) return NextResponse.json({ ok: false, error: dbResult.reason }, { status: 500 });
    return NextResponse.json({ ok: true, promotion: dbResult.data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not update promotion." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const dbResult = await withDatabase(async () => {
    await prisma.promotion.delete({ where: { id: params.id } });
    return true;
  });
  if (!dbResult.ok) return NextResponse.json({ ok: false, error: dbResult.reason }, { status: 500 });
  return NextResponse.json({ ok: true });
}
