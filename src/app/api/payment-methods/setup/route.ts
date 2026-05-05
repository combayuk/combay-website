import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db";
import { createStripeCustomer, createStripeSetupSession, isStripeConfigured } from "@/lib/stripe";

function originFromRequest(req: Request) {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || new URL(req.url).origin;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "Please sign in first." }, { status: 401 });
  if (!isDatabaseConfigured()) return NextResponse.json({ ok: false, error: "Saved cards require database mode." }, { status: 503 });
  if (!isStripeConfigured()) return NextResponse.json({ ok: false, error: "Stripe is not configured." }, { status: 503 });

  let user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    user = await prisma.user.create({ data: { email: session.user.email, name: session.user.name || "Customer", role: "CUSTOMER" } });
  }

  let stripeCustomerId = user.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await createStripeCustomer({ email: user.email, name: user.name, phone: user.phone });
    stripeCustomerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId } });
  }

  const origin = originFromRequest(req);
  const setup = await createStripeSetupSession({
    customerId: stripeCustomerId,
    successUrl: `${origin}/portal?section=payments&payment_method=success`,
    cancelUrl: `${origin}/portal?section=payments&payment_method=cancelled`,
  });

  return NextResponse.json({ ok: true, url: setup.url, sessionId: setup.id });
}
