export async function GET() {
  return Response.json({ ok: true, message: "eBay sync API skeleton. Phase 8 will connect official eBay APIs." });
}

export async function POST(req: Request) {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  return Response.json({
    ok: true,
    message: "eBay sync API skeleton. Phase 8 will connect official eBay APIs.",
    received: body,
  });
}
