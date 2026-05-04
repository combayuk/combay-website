export async function GET() {
  return Response.json({ ok: true, message: "Order API skeleton. Phase 5 will connect checkout/orders." });
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
    message: "Order API skeleton. Phase 5 will connect checkout/orders.",
    received: body,
  });
}
