import { prisma, withDatabase } from "@/lib/db";

export type ResourceStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type ResourceArticleInput = {
  id?: string | null;
  title: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  type?: string;
  status?: ResourceStatus;
  coverImageUrl?: string;
  gallery?: string[];
  videoUrl?: string;
  tags?: string[];
  relatedProductIds?: string[];
  seoTitle?: string;
  seoDescription?: string;
  isFeatured?: boolean;
  publishedAt?: string | null;
};

export function resourceSlugify(value: string, fallback = "resource") {
  const slug = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || fallback;
}

let schemaPromise: Promise<void> | null = null;
export function ensureResourceTables() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "ResourceArticle" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "slug" TEXT NOT NULL UNIQUE,
        "excerpt" TEXT,
        "content" TEXT,
        "type" TEXT NOT NULL DEFAULT 'technical-article',
        "status" TEXT NOT NULL DEFAULT 'DRAFT',
        "coverImageUrl" TEXT,
        "galleryJson" JSONB,
        "videoUrl" TEXT,
        "tagsJson" JSONB,
        "relatedProductsJson" JSONB,
        "seoTitle" TEXT,
        "seoDescription" TEXT,
        "isFeatured" BOOLEAN NOT NULL DEFAULT false,
        "publishedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ResourceArticle_status_publishedAt_idx" ON "ResourceArticle"("status", "publishedAt")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ResourceArticle_type_idx" ON "ResourceArticle"("type")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ResourceArticle_isFeatured_idx" ON "ResourceArticle"("isFeatured")`);
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

function normaliseArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function mapResource(row: any) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt || "",
    content: row.content || "",
    type: row.type || "technical-article",
    status: row.status || "DRAFT",
    coverImageUrl: row.coverImageUrl || "",
    gallery: Array.isArray(row.galleryJson) ? row.galleryJson : [],
    videoUrl: row.videoUrl || "",
    tags: Array.isArray(row.tagsJson) ? row.tagsJson : [],
    relatedProductIds: Array.isArray(row.relatedProductsJson) ? row.relatedProductsJson : [],
    seoTitle: row.seoTitle || "",
    seoDescription: row.seoDescription || "",
    isFeatured: Boolean(row.isFeatured),
    publishedAt: row.publishedAt?.toISOString?.() || null,
    createdAt: row.createdAt?.toISOString?.() || "",
    updatedAt: row.updatedAt?.toISOString?.() || "",
  };
}

export async function listResources(options: { publicOnly?: boolean; query?: string; type?: string; status?: string; page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, Number(options.page || 1));
  const pageSize = Math.min(60, Math.max(6, Number(options.pageSize || 24)));
  return withDatabase(async () => {
    await ensureResourceTables();
    const where: any = {};
    if (options.publicOnly) where.status = "PUBLISHED";
    else if (options.status && options.status !== "all") where.status = options.status;
    if (options.type && options.type !== "all") where.type = options.type;
    const query = String(options.query || "").trim();
    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { excerpt: { contains: query, mode: "insensitive" } },
        { content: { contains: query, mode: "insensitive" } },
        { type: { contains: query, mode: "insensitive" } },
      ];
    }
    const [total, resources] = await Promise.all([
      prisma.resourceArticle.count({ where }),
      prisma.resourceArticle.findMany({
        where,
        orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }, { updatedAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { resources: resources.map(mapResource), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  });
}

export async function getResourceBySlug(slug: string, publicOnly = true) {
  return withDatabase(async () => {
    await ensureResourceTables();
    const resource = await prisma.resourceArticle.findFirst({ where: { slug, ...(publicOnly ? { status: "PUBLISHED" } : {}) } });
    return resource ? mapResource(resource) : null;
  });
}

export async function getResourceById(id: string) {
  return withDatabase(async () => {
    await ensureResourceTables();
    const resource = await prisma.resourceArticle.findUnique({ where: { id } });
    return resource ? mapResource(resource) : null;
  });
}

async function uniqueResourceSlug(base: string, id?: string | null) {
  let slug = resourceSlugify(base);
  let suffix = 2;
  while (true) {
    const existing = await prisma.resourceArticle.findUnique({ where: { slug } }).catch(() => null);
    if (!existing || existing.id === id) return slug;
    slug = `${resourceSlugify(base)}-${suffix++}`;
  }
}

export async function saveResource(input: ResourceArticleInput) {
  return withDatabase(async () => {
    await ensureResourceTables();
    const title = String(input.title || "").trim();
    if (!title) throw new Error("Resource title is required.");
    const existing = input.id ? await prisma.resourceArticle.findUnique({ where: { id: input.id } }).catch(() => null) : null;
    const status = ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(String(input.status || "")) ? String(input.status) : "DRAFT";
    const slug = await uniqueResourceSlug(input.slug || title, existing?.id || null);
    const publishedAt = status === "PUBLISHED" ? (input.publishedAt ? new Date(input.publishedAt) : existing?.publishedAt || new Date()) : null;
    const data = {
      title,
      slug,
      excerpt: String(input.excerpt || "").trim() || null,
      content: String(input.content || "").trim() || null,
      type: String(input.type || "technical-article").trim() || "technical-article",
      status,
      coverImageUrl: String(input.coverImageUrl || "").trim() || null,
      galleryJson: normaliseArray(input.gallery) as any,
      videoUrl: String(input.videoUrl || "").trim() || null,
      tagsJson: normaliseArray(input.tags) as any,
      relatedProductsJson: normaliseArray(input.relatedProductIds) as any,
      seoTitle: String(input.seoTitle || "").trim() || null,
      seoDescription: String(input.seoDescription || "").trim() || null,
      isFeatured: Boolean(input.isFeatured),
      publishedAt,
    };
    const saved = existing
      ? await prisma.resourceArticle.update({ where: { id: existing.id }, data })
      : await prisma.resourceArticle.create({ data });
    return mapResource(saved);
  });
}

export async function deleteResource(id: string) {
  return withDatabase(async () => {
    await ensureResourceTables();
    await prisma.resourceArticle.delete({ where: { id } });
    return { ok: true };
  });
}
