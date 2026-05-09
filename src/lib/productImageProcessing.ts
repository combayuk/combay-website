import { randomUUID } from "crypto";

export type ProcessedImageInput = {
  url: string;
  alt?: string | null;
  isPrimary?: boolean;
  sortOrder?: number;
};

export type ProcessedImagePayload = {
  url: string;
  originalUrl?: string | null;
  alt?: string | null;
  isPrimary?: boolean;
  sortOrder?: number;
  backgroundProcessedAt?: Date | null;
  backgroundProcessingStatus?: string | null;
  backgroundProcessingError?: string | null;
};

function envFlag(value?: string | null) {
  return ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());
}

export function productBackgroundProcessingEnabled() {
  return envFlag(process.env.EBAY_IMAGE_BACKGROUND_PROCESSING_ENABLED || process.env.PRODUCT_IMAGE_BACKGROUND_PROCESSING);
}

export function productBackgroundProcessingConfigured() {
  return Boolean(
    productBackgroundProcessingEnabled() &&
    process.env.REMOVE_BG_API_KEY &&
    process.env.UPLOAD_PROVIDER === "vps" &&
    process.env.UPLOAD_RECEIVER_URL &&
    process.env.UPLOAD_RECEIVER_SECRET
  );
}

export function productBackgroundPublicUrl() {
  const explicit = process.env.PRODUCT_IMAGE_BACKGROUND_URL;
  if (explicit) return explicit;
  const site = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  return site ? `${site.replace(/\/$/, "")}/images/product-backgrounds/combay-background.jpg` : "";
}

export function looksLikeCombayBrandedProductImage(url?: string | null) {
  const value = String(url || "").toLowerCase();
  return value.includes("combay-background") || value.includes("combay-product-bg") || value.includes("processed-combay");
}

function safeFileStem(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 70) || "product";
}

async function uploadProcessedImage(buffer: Buffer, filename: string) {
  const receiverUrl = process.env.UPLOAD_RECEIVER_URL || "";
  const receiverSecret = process.env.UPLOAD_RECEIVER_SECRET || "";
  if (process.env.UPLOAD_PROVIDER !== "vps" || !receiverUrl || !receiverSecret) {
    throw new Error("Upload receiver is not configured. Set UPLOAD_PROVIDER=vps, UPLOAD_RECEIVER_URL and UPLOAD_RECEIVER_SECRET.");
  }

  const form = new FormData();
  form.set("folder", "products");
  form.set("requestId", randomUUID());
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  form.set("file", new Blob([arrayBuffer], { type: "image/png" }), filename);

  const response = await fetch(receiverUrl, {
    method: "POST",
    headers: { "x-upload-secret": receiverSecret },
    body: form,
  });

  const payload: any = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok || !payload?.url) {
    throw new Error(payload?.error || `Upload receiver failed with status ${response.status}`);
  }
  return String(payload.url);
}

export async function removeBackgroundAndApplyCombayBg(args: { imageUrl: string; title?: string; index?: number }) {
  if (!productBackgroundProcessingEnabled()) {
    return { ok: false as const, skipped: true as const, reason: "Background processing is disabled." };
  }
  if (looksLikeCombayBrandedProductImage(args.imageUrl)) {
    return { ok: true as const, url: args.imageUrl, alreadyBranded: true as const };
  }

  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    return { ok: false as const, skipped: true as const, reason: "REMOVE_BG_API_KEY is not configured." };
  }

  const bgUrl = productBackgroundPublicUrl();
  if (!bgUrl) {
    return { ok: false as const, skipped: true as const, reason: "Product background URL is not available. Set NEXTAUTH_URL or PRODUCT_IMAGE_BACKGROUND_URL." };
  }

  const form = new FormData();
  form.set("image_url", args.imageUrl);
  form.set("size", "auto");
  form.set("format", "png");
  form.set("bg_image_url", bgUrl);

  const response = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: { "X-Api-Key": apiKey },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`remove.bg failed (${response.status}): ${text.slice(0, 240)}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const filename = `processed-combay-${safeFileStem(args.title || "product")}-${args.index ?? 0}-${Date.now()}.png`;
  const uploadedUrl = await uploadProcessedImage(buffer, filename);

  return { ok: true as const, url: uploadedUrl, alreadyBranded: false as const };
}

export async function prepareImportedProductImages(images: ProcessedImageInput[], title: string) {
  const maxPerProduct = Math.max(0, Math.min(15, Number(process.env.EBAY_IMAGE_BACKGROUND_MAX_PER_PRODUCT || 1)));
  const shouldProcess = productBackgroundProcessingEnabled();
  const output: ProcessedImagePayload[] = [];

  for (const [index, image] of images.entries()) {
    const originalUrl = String(image.url || "").trim();
    if (!originalUrl) continue;

    if (!shouldProcess || index >= maxPerProduct || looksLikeCombayBrandedProductImage(originalUrl)) {
      output.push({
        ...image,
        url: originalUrl,
        originalUrl,
        backgroundProcessingStatus: looksLikeCombayBrandedProductImage(originalUrl) ? "already-branded" : "not-processed",
        backgroundProcessingError: shouldProcess ? null : "Background processing disabled.",
      });
      continue;
    }

    try {
      const processed = await removeBackgroundAndApplyCombayBg({ imageUrl: originalUrl, title, index });
      if (processed.ok) {
        output.push({
          ...image,
          url: processed.url,
          originalUrl,
          backgroundProcessedAt: processed.alreadyBranded ? null : new Date(),
          backgroundProcessingStatus: processed.alreadyBranded ? "already-branded" : "processed",
          backgroundProcessingError: null,
        });
      } else {
        output.push({
          ...image,
          url: originalUrl,
          originalUrl,
          backgroundProcessingStatus: "skipped",
          backgroundProcessingError: processed.reason,
        });
      }
    } catch (error) {
      output.push({
        ...image,
        url: originalUrl,
        originalUrl,
        backgroundProcessingStatus: "failed",
        backgroundProcessingError: error instanceof Error ? error.message : "Image processing failed.",
      });
    }
  }

  return output;
}
