import type { ConditionCode } from "@/lib/catalog";

export type ContentSpec = { label: string; value: string };

export type ProductContentInput = {
  title?: string | null;
  sku?: string | null;
  brand?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  mpn?: string | null;
  category?: string | null;
  condition?: ConditionCode | string | null;
  description?: string | null;
  productOverview?: string | null;
  itemLocation?: string | null;
  specs?: ContentSpec[];
  tags?: string[];
};

export type ProductContentSuggestion = {
  description: string;
  productOverview: string;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
};

const FALLBACK_PHRASES = [
  "imported from active ebay listing",
  "imported from ebay listing",
  "imported from active listing",
];

function compact(value?: string | null) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function isUseful(value?: string | null) {
  const text = compact(value);
  if (text.length < 12) return false;
  return !FALLBACK_PHRASES.some((phrase) => text.toLowerCase().includes(phrase));
}

function limit(value: string, max: number) {
  const text = compact(value);
  if (text.length <= max) return text;
  const sliced = text.slice(0, max + 1);
  const lastSpace = sliced.lastIndexOf(" ");
  return `${sliced.slice(0, lastSpace > 40 ? lastSpace : max).replace(/[,.\s]+$/g, "")}…`;
}

function sentenceFromDescription(description?: string | null) {
  const text = compact(description);
  if (!isUseful(text)) return "";
  const sentence = text.split(/(?<=[.!?])\s+/).find((part) => compact(part).length > 35);
  return limit(sentence || text, 180);
}

function conditionLabel(condition?: string | null) {
  const value = String(condition ?? "USED").toUpperCase();
  if (value.includes("NEW_OPEN")) return "new open-box";
  if (value === "NEW") return "new";
  if (value.includes("PART")) return "for parts or repair";
  return "used";
}

function keyIdentifiers(input: ProductContentInput) {
  return [input.brand || input.manufacturer, input.model, input.mpn, input.sku].map(compact).filter(Boolean);
}

function topSpecs(specs: ContentSpec[] = []) {
  const blocked = new Set(["condition", "brand", "manufacturer", "model", "mpn", "sku"]);
  return specs
    .filter((spec) => compact(spec.label) && compact(spec.value))
    .filter((spec) => !blocked.has(compact(spec.label).toLowerCase()))
    .slice(0, 5)
    .map((spec) => `${compact(spec.label)}: ${compact(spec.value)}`);
}

function unique(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values.map(compact).filter(Boolean)) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

export function generateProductContent(input: ProductContentInput): ProductContentSuggestion {
  const title = compact(input.title) || "Industrial product";
  const sku = compact(input.sku);
  const category = compact(input.category) || "industrial equipment";
  const brand = compact(input.brand || input.manufacturer);
  const model = compact(input.model);
  const mpn = compact(input.mpn);
  const location = compact(input.itemLocation) || "United Kingdom";
  const identifiers = keyIdentifiers(input);
  const identifierText = identifiers.length ? identifiers.join(" · ") : title;
  const sourceSentence = sentenceFromDescription(input.description);
  const specs = topSpecs(input.specs);
  const condition = conditionLabel(String(input.condition ?? "USED"));

  const descriptionParts = [
    `${title}${sku ? ` (${sku})` : ""} is a ${condition} ${category.toLowerCase()} item supplied from ${location}.`,
    sourceSentence,
    identifiers.length ? `Key identifiers: ${identifierText}.` : "",
  ].filter(Boolean);

  const overviewParts = [
    `${title} is listed for industrial procurement, maintenance replacement or spare-stock use${brand ? ` where ${brand} compatibility is required` : ""}.`,
    identifiers.length ? `Confirm the required reference before purchase: ${identifierText}.` : "",
    specs.length ? `Relevant details include ${specs.join("; ")}.` : "",
    `Condition is recorded as ${condition}; buyers should review the images, description and specifications before ordering or requesting a quote.`,
  ].filter(Boolean);

  const seoBase = unique([brand, model, mpn, sku, title]).join(" ");
  const seoTitle = limit(unique([brand, model, mpn, title]).join(" ") || title, 68);
  const seoDescription = limit(`${title}${sku ? `, SKU ${sku}` : ""}. ${brand || model || mpn ? `Includes ${[brand, model, mpn].filter(Boolean).join(", ")}. ` : ""}Available from Combay for UK and international industrial buyers.`, 155);
  const tags = unique([
    ...(input.tags ?? []),
    brand,
    input.manufacturer || "",
    model,
    mpn,
    sku,
    category,
    ...specs.flatMap((spec) => spec.split(":").map(compact)),
    ...seoBase.split(/\s+/).filter((word) => word.length > 3),
  ]).slice(0, 18);

  return {
    description: limit(descriptionParts.join(" "), 520),
    productOverview: overviewParts.join("\n\n"),
    seoTitle,
    seoDescription,
    tags,
  };
}
