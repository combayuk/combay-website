export async function GET() {
  return Response.json({ ok: true, message: "Returns API skeleton. Phase 7 will connect portal/admin returns." });
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
    message: "Returns API skeleton. Phase 7 will connect portal/admin returns.",
    received: body,
  });
}
