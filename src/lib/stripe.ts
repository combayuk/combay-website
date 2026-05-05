import crypto from "crypto";

export type StripeCheckoutLine = {
  name: string;
  unitAmountPence: number;
  quantity: number;
};

export type StripeCheckoutSession = {
  id: string;
  url: string | null;
  payment_status: string;
  status: string | null;
  amount_total: number | null;
  currency: string | null;
  customer_email: string | null;
  client_reference_id: string | null;
  metadata?: Record<string, string> | null;
  customer_details?: { email?: string | null } | null;
};

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith("sk_"));
}

function stripeAuthHeader() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");
  return `Bearer ${key}`;
}

export async function createStripeCheckoutSession(input: {
  customerEmail: string;
  orderNumber: string;
  orderId: string;
  successUrl: string;
  cancelUrl: string;
  lines: StripeCheckoutLine[];
}) {
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("customer_email", input.customerEmail);
  params.set("client_reference_id", input.orderNumber);
  params.set("success_url", input.successUrl);
  params.set("cancel_url", input.cancelUrl);
  params.set("metadata[orderId]", input.orderId);
  params.set("metadata[orderNumber]", input.orderNumber);
  params.set("payment_method_types[0]", "card");

  input.lines.forEach((line, index) => {
    params.set(`line_items[${index}][quantity]`, String(line.quantity));
    params.set(`line_items[${index}][price_data][currency]`, "gbp");
    params.set(`line_items[${index}][price_data][unit_amount]`, String(line.unitAmountPence));
    params.set(`line_items[${index}][price_data][product_data][name]`, line.name.slice(0, 250));
  });

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: stripeAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Stripe checkout session could not be created.");
  }
  return data as StripeCheckoutSession;
}

export async function retrieveStripeCheckoutSession(sessionId: string) {
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: stripeAuthHeader() },
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Stripe session could not be retrieved.");
  return data as StripeCheckoutSession;
}

export function verifyStripeWebhookSignature(payload: string, signatureHeader: string, secret: string) {
  const parts = Object.fromEntries(signatureHeader.split(",").map((part) => {
    const [key, value] = part.split("=");
    return [key, value];
  }));

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function createStripeCustomer(input: { email: string; name?: string | null; phone?: string | null }) {
  const params = new URLSearchParams();
  params.set("email", input.email);
  if (input.name) params.set("name", input.name);
  if (input.phone) params.set("phone", input.phone);

  const response = await fetch("https://api.stripe.com/v1/customers", {
    method: "POST",
    headers: { Authorization: stripeAuthHeader(), "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Stripe customer could not be created.");
  return data as { id: string; email?: string; name?: string };
}

export async function createStripeSetupSession(input: { customerId: string; successUrl: string; cancelUrl: string }) {
  const params = new URLSearchParams();
  params.set("mode", "setup");
  params.set("customer", input.customerId);
  params.set("success_url", input.successUrl);
  params.set("cancel_url", input.cancelUrl);
  params.set("payment_method_types[0]", "card");

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: stripeAuthHeader(), "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Stripe setup session could not be created.");
  return data as StripeCheckoutSession;
}

export async function listStripePaymentMethods(customerId: string) {
  const url = new URL("https://api.stripe.com/v1/payment_methods");
  url.searchParams.set("customer", customerId);
  url.searchParams.set("type", "card");
  const response = await fetch(url.toString(), { headers: { Authorization: stripeAuthHeader() }, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Stripe payment methods could not be loaded.");
  return data as { data: Array<{ id: string; card?: { brand?: string; last4?: string; exp_month?: number; exp_year?: number } }> };
}
