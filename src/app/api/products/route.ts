export async function GET() {
  return Response.json({ ok: true, message: "Product API skeleton. Phase 2 will connect Prisma CRUD." });
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
    message: "Product API skeleton. Phase 2 will connect Prisma CRUD.",
    received: body,
  });
}
