export async function GET() {
  return Response.json({ ok: true, message: "Quote API skeleton. Phase 6 will connect quote persistence/email." });
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
    message: "Quote API skeleton. Phase 6 will connect quote persistence/email.",
    received: body,
  });
}
