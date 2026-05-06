import { generateProductContent, type ProductContentInput, type ProductContentSuggestion } from "@/lib/productContentAssistant";

export type GeminiContentScope = "overview" | "seo" | "all" | "ebay";

export type GeminiProductContentResult = ProductContentSuggestion & {
  provider: "gemini" | "local";
  model: string;
  note?: string;
};

const DEFAULT_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

function compact(value?: string | null) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function specsForPrompt(specs: ProductContentInput["specs"] = []) {
  return specs
    .filter((spec) => compact(spec.label) && compact(spec.value))
    .slice(0, 18)
    .map((spec) => `${compact(spec.label)}: ${compact(spec.value)}`)
    .join("\n");
}

function tagsForPrompt(tags: string[] = []) {
  return tags.map(compact).filter(Boolean).slice(0, 20).join(", ");
}

function buildPrompt(input: ProductContentInput, scope: GeminiContentScope) {
  const title = compact(input.title) || "Industrial product";
  const description = compact(input.description || input.productOverview);
  const specs = specsForPrompt(input.specs);
  const existingTags = tagsForPrompt(input.tags);

  return `You are writing product content for Combay Limited, a UK industrial B2B ecommerce/reseller website.

Write precise, useful procurement-focused content. Do not use sales fluff, exaggerated claims, generic filler, emojis, markdown, or made-up specifications. Only use the facts supplied. If a fact is missing, do not invent it.

Product data:
Title: ${title}
SKU: ${compact(input.sku) || "Not provided"}
Brand: ${compact(input.brand) || "Not provided"}
Manufacturer: ${compact(input.manufacturer) || "Not provided"}
Model: ${compact(input.model) || "Not provided"}
MPN / part number: ${compact(input.mpn) || "Not provided"}
Category: ${compact(input.category) || "Not provided"}
Condition: ${compact(String(input.condition ?? "")) || "Used"}
Item location: ${compact(input.itemLocation) || "United Kingdom"}
Existing description: ${description || "Not provided"}
Existing tags: ${existingTags || "Not provided"}
Specifications:
${specs || "Not provided"}

Return ONLY valid JSON with exactly these keys:
{
  "description": "Short product description, 1-2 concise sentences, max 520 characters.",
  "productOverview": "Useful overview for the Overview tab, 2-4 short paragraphs separated by blank lines. Mention identifiers and relevant specs. No filler.",
  "seoTitle": "SEO title, max 68 characters.",
  "seoDescription": "Meta description, 140-155 characters where possible.",
  "tags": ["8 to 16 short product/search tags"]
}

Scope requested: ${scope}.`;
}

function extractText(response: any) {
  const parts = response?.candidates?.[0]?.content?.parts ?? [];
  return parts.map((part: any) => part?.text).filter(Boolean).join("\n").trim();
}

function stripJsonFence(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function parseSuggestion(text: string): ProductContentSuggestion {
  const cleaned = stripJsonFence(text);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Gemini did not return JSON.");
  const parsed = JSON.parse(cleaned.slice(start, end + 1));

  const tags = Array.isArray(parsed.tags)
    ? parsed.tags.map((tag: unknown) => compact(String(tag))).filter(Boolean).slice(0, 20)
    : [];

  return {
    description: compact(parsed.description).slice(0, 700),
    productOverview: String(parsed.productOverview ?? "").trim(),
    seoTitle: compact(parsed.seoTitle).slice(0, 90),
    seoDescription: compact(parsed.seoDescription).slice(0, 180),
    tags,
  };
}

export async function generateGeminiProductContent(input: ProductContentInput, scope: GeminiContentScope = "all"): Promise<GeminiProductContentResult> {
  const local = generateProductContent(input);
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || process.env.AI_MODEL || DEFAULT_MODEL;

  if (!apiKey) {
    return { ...local, provider: "local", model: "local-rule-based", note: "GEMINI_API_KEY is not configured, so local content assistant was used." };
  }

  const prompt = buildPrompt(input, scope);
  const url = `${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.35,
        topP: 0.85,
        maxOutputTokens: 1100,
        responseMimeType: "application/json",
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || `Gemini request failed with HTTP ${response.status}`;
    throw new Error(message);
  }

  const text = extractText(payload);
  if (!text) throw new Error("Gemini returned an empty response.");

  const gemini = parseSuggestion(text);

  return {
    description: gemini.description || local.description,
    productOverview: gemini.productOverview || local.productOverview,
    seoTitle: gemini.seoTitle || local.seoTitle,
    seoDescription: gemini.seoDescription || local.seoDescription,
    tags: gemini.tags.length ? gemini.tags : local.tags,
    provider: "gemini",
    model,
  };
}
