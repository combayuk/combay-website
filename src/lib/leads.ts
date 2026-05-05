import { prisma, withDatabase } from "@/lib/db";

export type LeadInput = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  company?: string | null;
  source: string;
  sourceRef?: string | null;
  productSku?: string | null;
  productTitle?: string | null;
  orderId?: string | null;
  invoiceId?: string | null;
  notes?: string | null;
};

function clean(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function mergeText(existing?: string | null, incoming?: string | null) {
  const a = clean(existing);
  const b = clean(incoming);
  if (!a) return b;
  if (!b || a.toLowerCase() === b.toLowerCase()) return a;
  return `${a}\n\n${b}`;
}

export async function captureLead(input: LeadInput) {
  const email = clean(input.email)?.toLowerCase();
  if (!email || email === "not-provided") {
    return { ok: false, reason: "Lead email missing." };
  }

  const payload = {
    name: clean(input.name),
    email,
    phone: clean(input.phone),
    country: clean(input.country),
    company: clean(input.company),
    source: input.source,
    sourceRef: clean(input.sourceRef),
    productSku: clean(input.productSku),
    productTitle: clean(input.productTitle),
    orderId: clean(input.orderId),
    invoiceId: clean(input.invoiceId),
    notes: clean(input.notes),
  };

  return withDatabase(async () => {
    const existing = await prisma.lead.findFirst({
      where: { email },
      orderBy: { createdAt: "asc" },
    });

    if (!existing) {
      return prisma.lead.create({
        data: {
          ...payload,
          contactCount: 1,
          lastContactAt: new Date(),
          interactions: {
            create: {
              source: payload.source,
              sourceRef: payload.sourceRef,
              productSku: payload.productSku,
              productTitle: payload.productTitle,
              orderId: payload.orderId,
              invoiceId: payload.invoiceId,
              notes: payload.notes,
            },
          },
        },
        include: { interactions: true },
      });
    }

    return prisma.lead.update({
      where: { id: existing.id },
      data: {
        name: payload.name ?? existing.name,
        phone: payload.phone ?? existing.phone,
        country: payload.country ?? existing.country,
        company: payload.company ?? existing.company,
        source: payload.source || existing.source,
        sourceRef: payload.sourceRef ?? existing.sourceRef,
        productSku: payload.productSku ?? existing.productSku,
        productTitle: payload.productTitle ?? existing.productTitle,
        orderId: payload.orderId ?? existing.orderId,
        invoiceId: payload.invoiceId ?? existing.invoiceId,
        notes: mergeText(existing.notes, payload.notes),
        contactCount: { increment: 1 },
        lastContactAt: new Date(),
        interactions: {
          create: {
            source: payload.source,
            sourceRef: payload.sourceRef,
            productSku: payload.productSku,
            productTitle: payload.productTitle,
            orderId: payload.orderId,
            invoiceId: payload.invoiceId,
            notes: payload.notes,
          },
        },
      },
      include: { interactions: { orderBy: { createdAt: "desc" } } },
    });
  });
}
