const DEFAULT_PAYMENT_SUCCESS_URL = "https://combay.co.uk/payment-received-0920";
const DEFAULT_PAYMENT_CANCEL_URL = "https://combay.co.uk";

function withOptionalParams(baseUrl: string, params: Record<string, string | null | undefined>) {
  try {
    const url = new URL(baseUrl);
    for (const [key, value] of Object.entries(params)) {
      if (value) url.searchParams.set(key, value);
    }
    return url.toString();
  } catch {
    return baseUrl;
  }
}

export function customerPaymentSuccessUrl(reference?: string | null, type?: string | null) {
  const base =
    process.env.STRIPE_PAYMENT_SUCCESS_URL ||
    process.env.NEXT_PUBLIC_PAYMENT_SUCCESS_URL ||
    DEFAULT_PAYMENT_SUCCESS_URL;

  return withOptionalParams(base, {
    ref: reference || undefined,
    type: type || undefined,
  });
}

export function customerPaymentCancelUrl(reference?: string | null, type?: string | null) {
  const base =
    process.env.STRIPE_PAYMENT_CANCEL_URL ||
    process.env.NEXT_PUBLIC_PAYMENT_CANCEL_URL ||
    DEFAULT_PAYMENT_CANCEL_URL;

  return withOptionalParams(base, {
    ref: reference || undefined,
    type: type || undefined,
    status: "cancelled",
  });
}
