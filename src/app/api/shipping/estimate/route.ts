import { NextResponse } from "next/server";
import { calculateOrderShipping, daysLabel } from "@/lib/shipping";
import { countryNameFromCode, isValidCountryCode, normaliseCountryCode } from "@/lib/countries";

function money(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(value));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as any;
  const lines = Array.isArray(body?.lines) ? body.lines : [];
  if (!lines.length) return NextResponse.json({ ok: false, error: "No cart lines supplied." }, { status: 400 });

  const suppliedCode = normaliseCountryCode(body?.countryCode || body?.country);
  if (!suppliedCode || !isValidCountryCode(suppliedCode)) {
    return NextResponse.json({ ok: false, error: "Select a valid delivery country." }, { status: 400 });
  }
  const country = countryNameFromCode(suppliedCode, "United Kingdom");
  const estimate = await calculateOrderShipping(lines.map((line: any) => ({
    sku: String(line.sku || ""),
    quantity: Number(line.qty ?? line.quantity ?? 1),
  })).filter((line: any) => line.sku), country, suppliedCode);

  return NextResponse.json({
    ok: true,
    shipping: {
      cost: estimate.cost,
      formattedCost: money(estimate.cost),
      manualQuoteRequired: estimate.manualQuoteRequired,
      collectionOnly: estimate.collectionOnly,
      policyName: estimate.policyName,
      zoneName: estimate.zoneName,
      dispatchLabel: daysLabel(estimate.dispatchMinDays, estimate.dispatchMaxDays),
      deliveryLabel: daysLabel(estimate.deliveryMinDays, estimate.deliveryMaxDays),
      calculationMethod: estimate.calculationMethod,
      label: estimate.manualQuoteRequired || estimate.cost === null
        ? estimate.collectionOnly ? "Collection only / manual shipping confirmation" : "Shipping quote required"
        : `${estimate.policyName} · ${money(estimate.cost)}`,
      lines: estimate.lineSummaries,
    },
  });
}
