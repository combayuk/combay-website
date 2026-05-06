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
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function limitForPrompt(value: string, max = 3600) {
  const text = compact(value);
  if (text.length <= max) return text;
  const sliced = text.slice(0, max + 1);
  const lastSpace = sliced.lastIndexOf(" ");
  return `${sliced.slice(0, lastSpace > 100 ? lastSpace : max)}…`;
}

function specsForPrompt(specs: ProductContentInput["specs"] = []) {
  return specs
    .filter((spec) => compact(spec.label) && compact(spec.value))
    .slice(0, 20)
    .map((spec) => `${limitForPrompt(compact(spec.label), 60)}: ${limitForPrompt(compact(spec.value), 180)}`)
    .join("\n");
}

function tagsForPrompt(tags: string[] = []) {
  return tags.map(compact).filter(Boolean).slice(0, 20).join(", ");
}

function buildPrompt(input: ProductContentInput, scope: GeminiContentScope) {
  const title = compact(input.title) || "Industrial product";
  const description = limitForPrompt(input.description || input.productOverview || "", 3600);
  const specs = specsForPrompt(input.specs);
  const existingTags = tagsForPrompt(input.tags);

  return `You are writing product content for Combay Limited, a UK industrial B2B ecommerce/reseller website.

Strict rules:
- Return JSON only. Do not write markdown, explanations, comments, code fences, headings, or surrounding prose.
- Use only the supplied product facts. Do not invent compatibility, certifications, condition details, dimensions, warranty, test status, or availability.
- Keep the tone precise, procurement-focused, and useful. Avoid generic sales filler.
- If information is missing, omit it rather than guessing.

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

Scope requested: ${scope}.

Return exactly this JSON object shape:
{"description":"1-2 concise factual sentences, max 520 characters","productOverview":"2-4 short factual paragraphs separated by blank lines","seoTitle":"max 68 characters","seoDescription":"140-155 characters where possible","tags":["8 to 16 short product/search tags"]}`;
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

function findJsonObject(text: string) {
  const cleaned = stripJsonFence(text);
  try {
    const direct = JSON.parse(cleaned);
    if (direct && typeof direct === "object" && !Array.isArray(direct)) return direct;
  } catch {
    // fall through to extraction below
  }

  const start = cleaned.indexOf("{");
  if (start >= 0) {
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < cleaned.length; i += 1) {
      const ch = cleaned[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === "{") depth += 1;
      if (ch === "}") depth -= 1;
      if (depth === 0) {
        return JSON.parse(cleaned.slice(start, i + 1));
      }
    }
  }

  throw new Error("Gemini did not return JSON.");
}

function normaliseSuggestion(parsed: any): ProductContentSuggestion {
  const tags = Array.isArray(parsed?.tags)
    ? parsed.tags.map((tag: unknown) => compact(String(tag))).filter(Boolean).slice(0, 20)
    : [];

  return {
    description: compact(parsed?.description).slice(0, 700),
    productOverview: String(parsed?.productOverview ?? "").trim(),
    seoTitle: compact(parsed?.seoTitle).slice(0, 90),
    seoDescription: compact(parsed?.seoDescription).slice(0, 180),
    tags,
  };
}

function parseSuggestion(text: string): ProductContentSuggestion {
  return normaliseSuggestion(findJsonObject(text));
}

function responseSchema() {
  return {
    type: "OBJECT",
    properties: {
      description: { type: "STRING" },
      productOverview: { type: "STRING" },
      seoTitle: { type: "STRING" },
      seoDescription: { type: "STRING" },
      tags: {
        type: "ARRAY",
        items: { type: "STRING" },
      },
    },
    required: ["description", "productOverview", "seoTitle", "seoDescription", "tags"],
    propertyOrdering: ["description", "productOverview", "seoTitle", "seoDescription", "tags"],
  };
}

async function requestGeminiJson(apiKey: string, model: string, prompt: string, temperature = 0.2) {
  const url = `${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        topP: 0.8,
        candidateCount: 1,
        maxOutputTokens: 1300,
        responseMimeType: "application/json",
        responseSchema: responseSchema(),
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
  return text;
}

async function requestGeminiRepair(apiKey: string, model: string, prompt: string, previousText: string) {
  const repairPrompt = `Convert the following answer into STRICT valid JSON only. Do not add prose or markdown.

Required JSON keys: description, productOverview, seoTitle, seoDescription, tags.
The tags value must be an array of strings.

Original product prompt:
${prompt}

Previous non-JSON answer:
${previousText}`;

  return requestGeminiJson(apiKey, model, repairPrompt, 0.05);
}

export async function generateGeminiProductContent(input: ProductContentInput, scope: GeminiContentScope = "all"): Promise<GeminiProductContentResult> {
  const local = generateProductContent(input);

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || process.env.AI_MODEL || DEFAULT_MODEL;

    if (!apiKey) {
      return { ...local, provider: "local", model: "local-rule-based", note: "GEMINI_API_KEY is not configured, so local content assistant was used." };
    }

    const prompt = buildPrompt(input, scope);

    let gemini: ProductContentSuggestion;
    let firstText = "";
    try {
      firstText = await requestGeminiJson(apiKey, model, prompt);
      gemini = parseSuggestion(firstText);
    } catch (firstError) {
      // Some Gemini responses can still come back as prose despite JSON mode, especially with long eBay descriptions.
      // Make one repair attempt using the raw first answer before falling back to the local assistant.
      try {
        const repairedText = await requestGeminiRepair(apiKey, model, prompt, firstText || String(firstError));
        gemini = parseSuggestion(repairedText);
      } catch {
        return {
          ...local,
          provider: "local",
          model: "local-rule-based",
          note: `${firstError instanceof Error ? firstError.message : "Gemini did not return usable JSON."} Local fallback was used after Gemini JSON repair failed.`,
        };
      }
    }

    return {
      description: gemini.description || local.description,
      productOverview: gemini.productOverview || local.productOverview,
      seoTitle: gemini.seoTitle || local.seoTitle,
      seoDescription: gemini.seoDescription || local.seoDescription,
      tags: gemini.tags.length ? gemini.tags : local.tags,
      provider: "gemini",
      model,
    };
  } catch (error) {
    return {
      ...local,
      provider: "local",
      model: "local-rule-based",
      note: `${error instanceof Error ? error.message : "Gemini generation failed."} Local fallback was used.`,
    };
  }
}
