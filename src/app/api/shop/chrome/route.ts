import { getPublicPromotions } from "@/lib/promotionDisplay";
import { getSiteContent } from "@/lib/siteContent";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  const [promotions, content] = await Promise.all([
    getPublicPromotions("shop", 2).catch(() => []),
    getSiteContent().catch(() => null),
  ]);

  return Response.json(
    {
      ok: true,
      promotions,
      content: content
        ? {
            visualWidgets: content.visualWidgets,
            footer: content.footer,
            contact: content.contact,
          }
        : { visualWidgets: {} },
      timingMs: Date.now() - startedAt,
    },
    {
      headers: {
        "Cache-Control": "private, no-store",
        "Server-Timing": `shopchrome;dur=${Date.now() - startedAt}`,
      },
    },
  );
}
