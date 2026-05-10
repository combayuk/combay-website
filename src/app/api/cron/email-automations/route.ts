import { NextResponse } from "next/server";
import { runScheduledEmailAutomations } from "@/lib/emailAutomations";

export const dynamic = "force-dynamic";

function authorised(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") || "";
  const vercelCron = request.headers.get("x-vercel-cron") === "1";

  if (!secret) {
    // Never fail open in production. A missing CRON_SECRET should stop scheduled sends, not expose them publicly.
    return process.env.NODE_ENV !== "production" && vercelCron;
  }

  return auth === `Bearer ${secret}` || vercelCron;
}

export async function GET(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorised cron request." }, { status: 401 });
  }

  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");
  const today = dateParam ? new Date(`${dateParam}T09:00:00`) : new Date();

  if (Number.isNaN(today.getTime())) {
    return NextResponse.json({ ok: false, error: "Invalid date. Use YYYY-MM-DD." }, { status: 400 });
  }

  const result = await runScheduledEmailAutomations(today);
  return NextResponse.json({ ok: true, ...result, date: today.toISOString().slice(0, 10) });
}
