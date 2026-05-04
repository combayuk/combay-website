import { prisma } from "@/lib/prisma";

export function isDatabaseConfigured() {
  const url = process.env.DATABASE_URL;
  return Boolean(url && !url.includes("YOUR_") && !url.includes("placeholder") && !url.includes("example"));
}

export async function withDatabase<T>(operation: () => Promise<T>): Promise<{ ok: true; data: T } | { ok: false; reason: string }> {
  if (!isDatabaseConfigured()) {
    return { ok: false, reason: "DATABASE_URL is not configured. Using preview/catalog fallback." };
  }

  try {
    const data = await operation();
    return { ok: true, data };
  } catch (error) {
    console.error("[database-operation-failed]", error);
    return { ok: false, reason: error instanceof Error ? error.message : "Database operation failed." };
  }
}

export { prisma };
