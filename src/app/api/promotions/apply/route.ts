import { NextResponse } from "next/server";
import { withDatabase } from "@/lib/db";
import { calculatePromotionTotals, checkPromotionProductTargets, findPromotionByCode } from "@/lib/promotions";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const code = String(body?.code || "").trim();
  const subtotal = Number(body?.subtotal ?? 0);
  const shipping = Number(body?.shipping ?? 0);
  const productIds = Array.isArray(body?.productIds) ? body.productIds.map(String).filter(Boolean) : [];

  if (!code) return NextResponse.json({ ok: false, error: "Enter a promotion code." }, { status: 400 });
  if (!Number.isFinite(subtotal) || subtotal <= 0) return NextResponse.json({ ok: false, error: "Cart subtotal is required." }, { status: 400 });

  const dbResult = await withDatabase(async () => {
    const promotion = await findPromotionByCode(code);
    if (!promotion) return { ok: false, error: "Promotion code was not recognised." };
    const targetCheck = checkPromotionProductTargets(promotion, productIds);
    if (!targetCheck.ok) return { ok: false, error: targetCheck.error, discount: 0, shippingDiscount: 0, subtotalAfterDiscount: subtotal, vat: Number((subtotal * 0.2).toFixed(2)), shipping, total: Number((subtotal * 1.2 + shipping).toFixed(2)) };
    return calculatePromotionTotals(promotion, subtotal, shipping);
  });

  if (!dbResult.ok) return NextResponse.json({ ok: false, error: dbResult.reason }, { status: 500 });
  const result = dbResult.data;
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
