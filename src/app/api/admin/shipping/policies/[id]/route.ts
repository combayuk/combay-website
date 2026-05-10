import { NextResponse } from "next/server";
import { prisma, withDatabase } from "@/lib/db";
import { requireAdminApiSession } from "@/lib/apiAccess";

function toNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function ratePayload(rate: any) {
  return {
    shippingZoneId: String(rate.shippingZoneId || rate.zoneId || rate.zone?.id || ""),
    cost: rate.manualQuoteRequired ? null : toNumber(rate.cost),
    currency: rate.currency || "GBP",
    dispatchMinDays: Number(rate.dispatchMinDays || 2),
    dispatchMaxDays: Number(rate.dispatchMaxDays || rate.dispatchMinDays || 2),
    deliveryMinDays: rate.manualQuoteRequired ? null : toNumber(rate.deliveryMinDays),
    deliveryMaxDays: rate.manualQuoteRequired ? null : toNumber(rate.deliveryMaxDays),
    manualQuoteRequired: Boolean(rate.manualQuoteRequired),
    isActive: rate.isActive !== false,
  };
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const access = await requireAdminApiSession();
  if (!access.ok) return access.response;
  const body = await request.json().catch(() => null) as any;
  if (!body?.name?.trim()) return NextResponse.json({ ok: false, error: "Policy name is required." }, { status: 400 });

  const result = await withDatabase(async () => {
    const rates = Array.isArray(body.rates) ? body.rates.map(ratePayload).filter((rate: any) => rate.shippingZoneId) : [];
    if (!rates.length) throw new Error("At least one destination/rate row is required.");
    if (rates.some((rate: any) => !rate.manualQuoteRequired && rate.cost === null)) throw new Error("Shipping cost must be numeric unless manual quote is enabled.");
    if (body.isDefault) await prisma.shippingPolicy.updateMany({ where: { id: { not: params.id } }, data: { isDefault: false } });

    await prisma.shippingPolicyRate.deleteMany({ where: { shippingPolicyId: params.id } });
    const policy = await prisma.shippingPolicy.update({
      where: { id: params.id },
      data: {
        name: String(body.name).trim(),
        description: body.description ? String(body.description) : null,
        internalNote: body.internalNote ? String(body.internalNote) : null,
        maxWeightKg: toNumber(body.maxWeightKg),
        maxLengthCm: toNumber(body.maxLengthCm),
        maxWidthCm: toNumber(body.maxWidthCm),
        maxHeightCm: toNumber(body.maxHeightCm),
        packagingType: body.packagingType ? String(body.packagingType) : null,
        manualQuoteRequired: Boolean(body.manualQuoteRequired),
        collectionOnly: Boolean(body.collectionOnly),
        internationalAllowed: body.internationalAllowed !== false,
        isDefault: Boolean(body.isDefault),
        isActive: body.isActive !== false,
        adminOnlyNotes: body.adminOnlyNotes ? String(body.adminOnlyNotes) : null,
        ebayFulfillmentPolicyId: body.ebayFulfillmentPolicyId ? String(body.ebayFulfillmentPolicyId) : null,
        ebayMarketplaceId: body.ebayMarketplaceId ? String(body.ebayMarketplaceId) : "EBAY_GB",
        ebayDomesticShippingServiceCode: body.ebayDomesticShippingServiceCode ? String(body.ebayDomesticShippingServiceCode) : null,
        ebayInternationalShippingServiceCode: body.ebayInternationalShippingServiceCode ? String(body.ebayInternationalShippingServiceCode) : null,
        ebayExcludedLocationsJson: body.ebayExcludedLocationsJson || null,
        ebayHandlingTimeDays: body.ebayHandlingTimeDays ? Number(body.ebayHandlingTimeDays) : null,
        ebayCollectionOnly: Boolean(body.ebayCollectionOnly),
        ebayFreightRequired: Boolean(body.ebayFreightRequired),
        ebayMappingStatus: body.ebayMappingStatus || "UNMAPPED",
        rates: { create: rates },
      },
      include: { rates: { include: { zone: true } } },
    });
    return policy;
  });

  if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
  return NextResponse.json({ ok: true, policy: result.data });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const access = await requireAdminApiSession();
  if (!access.ok) return access.response;
  const result = await withDatabase(async () => {
    const attachedProducts = await prisma.product.count({ where: { shippingPolicyId: params.id } });
    if (attachedProducts > 0) throw new Error("This policy is assigned to products. Reassign those products before deleting it.");
    await prisma.shippingPolicy.delete({ where: { id: params.id } });
    return true;
  });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
  return NextResponse.json({ ok: true });
}
