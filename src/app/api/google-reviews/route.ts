export const dynamic = "force-dynamic";

const FALLBACK = { ok: true, live: false, name: "Combay", rating: 5, total: 0 };

export async function GET() {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;
  if (!key || !placeId) return Response.json(FALLBACK);

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("fields", "name,rating,user_ratings_total,url");
    url.searchParams.set("key", key);
    const res = await fetch(url, { next: { revalidate: 3600 } });
    const json = await res.json();
    if (json?.status !== "OK" || !json?.result) return Response.json(FALLBACK);
    return Response.json({
      ok: true,
      live: true,
      name: json.result.name || "Combay",
      rating: Number(json.result.rating || 5),
      total: Number(json.result.user_ratings_total || 0),
      googleUrl: json.result.url || null,
    });
  } catch {
    return Response.json(FALLBACK);
  }
}
