export async function GET() {
  return Response.json({ ok: true, message: "Support API skeleton. Phase 7 will connect tickets/email." });
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
    message: "Support API skeleton. Phase 7 will connect tickets/email.",
    received: body,
  });
}
