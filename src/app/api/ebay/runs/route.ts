export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";

export async function GET() {
  const runs = await prisma.ebaySyncRun.findMany({ orderBy: { startedAt: "desc" }, take: 20 });
  return Response.json({ ok: true, runs });
}
