import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db";
import { isStripeConfigured, listStripePaymentMethods } from "@/lib/stripe";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "Please sign in first." }, { status: 401 });
  if (!isDatabaseConfigured() || !isStripeConfigured()) return NextResponse.json({ ok: true, methods: [], mode: "not-configured" });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user?.stripeCustomerId) return NextResponse.json({ ok: true, methods: [] });

  const methods = await listStripePaymentMethods(user.stripeCustomerId);
  return NextResponse.json({
    ok: true,
    methods: methods.data.map((method) => ({
      id: method.id,
      brand: method.card?.brand || "card",
      last4: method.card?.last4 || "••••",
      expMonth: method.card?.exp_month,
      expYear: method.card?.exp_year,
    })),
  });
}
