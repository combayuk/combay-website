import { DEMO_REQUESTS, generateReference, getEmailStatus, readJsonBody, todayLabel } from "@/lib/requests";

export async function GET() {
  return Response.json({
    ok: true,
    mode: "preview",
    data: DEMO_REQUESTS.filter((request) => request.type === "quote"),
  });
}

export async function POST(req: Request) {
  const body = await readJsonBody(req);
  const reference = typeof body.reference === "string" ? body.reference : generateReference("QT");
  const product = typeof body.product === "object" && body.product !== null ? (body.product as any) : {};

  if (!body.email && !body.name && !product.sku) {
    return Response.json({ ok: false, error: "Quote request requires customer or product context." }, { status: 400 });
  }

  const record = {
    id: reference,
    type: "quote" as const,
    date: todayLabel(),
    name: String(body.name || "Website enquiry"),
    email: String(body.email || "not-provided"),
    phone: body.phone ? String(body.phone) : undefined,
    company: body.company ? String(body.company) : undefined,
    message: String(body.message || body.description || "Quote requested from product page."),
    productSku: product.sku ? String(product.sku) : undefined,
    productTitle: product.title ? String(product.title) : undefined,
    status: "NEW" as const,
    source: String(body.source || "website"),
  };

  console.info("[quote-request]", record);

  return Response.json({
    ok: true,
    reference,
    message: "Quote request received.",
    email: getEmailStatus(),
    request: record,
  });
}
