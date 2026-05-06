import { generateGeminiProductContent, type GeminiContentScope } from "@/lib/geminiProductWriter";

export const dynamic = "force-dynamic";

function normaliseScope(value: unknown): GeminiContentScope {
  if (value === "overview" || value === "seo" || value === "all" || value === "ebay") return value;
  return "all";
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as any;
  const product = body?.product;

  if (!product || typeof product !== "object") {
    return Response.json({ ok: false, error: "Product data is required." }, { status: 400 });
  }

  try {
    const suggestion = await generateGeminiProductContent({
      title: product.title,
      sku: product.sku,
      brand: product.brand,
      manufacturer: product.manufacturer,
      model: product.model,
      mpn: product.mpn,
      category: product.category,
      condition: product.condition,
      description: product.description,
      productOverview: product.productOverview,
      itemLocation: product.itemLocation,
      specs: Array.isArray(product.specs) ? product.specs : [],
      tags: Array.isArray(product.tags) ? product.tags : [],
    }, normaliseScope(body?.scope));

    return Response.json({ ok: true, suggestion });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI content generation failed.";
    return Response.json({ ok: false, error: message }, { status: 502 });
  }
}
