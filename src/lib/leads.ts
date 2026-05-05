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

export async function captureLead(input: LeadInput) {
  const email = clean(input.email);
  if (!email || email === "not-provided") {
    return { ok: false, reason: "Lead email missing." };
  }

  return withDatabase(async () => prisma.lead.create({
    data: {
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
    },
  }));
}
