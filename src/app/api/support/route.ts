import { DEMO_REQUESTS, generateReference, getEmailStatus, readJsonBody, todayLabel } from "@/lib/requests";

export async function GET() {
  return Response.json({
    ok: true,
    mode: "preview",
    data: DEMO_REQUESTS.filter((request) => request.type === "support"),
  });
}

export async function POST(req: Request) {
  const body = await readJsonBody(req);
  const reference = typeof body.reference === "string" ? body.reference : generateReference("SUP");
  const product = typeof body.product === "object" && body.product !== null ? (body.product as any) : {};

  if (!body.email && !body.subject && !product.sku) {
    return Response.json({ ok: false, error: "Support request requires an email, subject or product context." }, { status: 400 });
  }

  const record = {
    id: reference,
    type: "support" as const,
    date: todayLabel(),
    name: String(body.name || "Website user"),
    email: String(body.email || "not-provided"),
    phone: body.phone ? String(body.phone) : undefined,
    company: body.company ? String(body.company) : undefined,
    subject: String(body.subject || (product.sku ? `Question about ${product.sku}` : "Support request")),
    message: String(body.message || body.description || "Support request submitted."),
    productSku: product.sku ? String(product.sku) : undefined,
    productTitle: product.title ? String(product.title) : undefined,
    status: "NEW" as const,
    source: String(body.source || "website"),
  };

  console.info("[support-request]", record);

  return Response.json({
    ok: true,
    reference,
    message: "Support request received.",
    email: getEmailStatus(),
    request: record,
  });
}
