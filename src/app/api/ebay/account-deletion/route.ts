export const dynamic = "force-dynamic";

import { createHash } from "crypto";
import { prisma } from "@/lib/db";

function endpointUrl(req: Request) {
  const configured = process.env.EBAY_ACCOUNT_DELETION_ENDPOINT_URL?.trim();
  if (configured) return configured;
  const url = new URL(req.url);
  return `${url.origin}${url.pathname}`;
}

function verificationToken() {
  return process.env.EBAY_ACCOUNT_DELETION_VERIFICATION_TOKEN?.trim() || "";
}

function jsonHeaders(status = 200) {
  return {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const challengeCode = url.searchParams.get("challenge_code") || url.searchParams.get("challengeCode");

  if (!challengeCode) {
    return Response.json(
      {
        ok: true,
        endpoint: endpointUrl(req),
        configured: Boolean(verificationToken()),
        message: "eBay account deletion endpoint is available. Use this URL in eBay Developer notifications.",
      },
      jsonHeaders(200),
    );
  }

  const token = verificationToken();
  if (!token) {
    return Response.json({ error: "Missing EBAY_ACCOUNT_DELETION_VERIFICATION_TOKEN." }, jsonHeaders(500));
  }

  const endpoint = endpointUrl(req);
  const hash = createHash("sha256");
  hash.update(challengeCode);
  hash.update(token);
  hash.update(endpoint);

  return Response.json({ challengeResponse: hash.digest("hex") }, jsonHeaders(200));
}

export async function POST(req: Request) {
  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const notification = payload?.notification || {};
  const data = notification?.data || {};
  const metadata = payload?.metadata || {};
  const headers = Object.fromEntries(req.headers.entries());
  const notificationId = notification?.notificationId ? String(notification.notificationId) : null;

  await prisma.ebayAccountDeletionNotification.upsert({
    where: { notificationId: notificationId || `missing-${Date.now()}-${Math.random().toString(36).slice(2)}` },
    create: {
      notificationId,
      topic: metadata?.topic ? String(metadata.topic) : "MARKETPLACE_ACCOUNT_DELETION",
      username: data?.username ? String(data.username) : null,
      ebayUserId: data?.userId ? String(data.userId) : null,
      eventDate: notification?.eventDate ? new Date(notification.eventDate) : null,
      publishDate: notification?.publishDate ? new Date(notification.publishDate) : null,
      payload,
      headers,
      status: "RECEIVED",
      notes: "Notification acknowledged. Manual review/anonymisation can be performed if relevant eBay user data is stored.",
    },
    update: {
      payload,
      headers,
      status: "RECEIVED",
      receivedAt: new Date(),
    },
  }).catch(async () => {
    await prisma.ebayAccountDeletionNotification.create({
      data: {
        notificationId,
        topic: metadata?.topic ? String(metadata.topic) : "MARKETPLACE_ACCOUNT_DELETION",
        username: data?.username ? String(data.username) : null,
        ebayUserId: data?.userId ? String(data.userId) : null,
        eventDate: notification?.eventDate ? new Date(notification.eventDate) : null,
        publishDate: notification?.publishDate ? new Date(notification.publishDate) : null,
        payload,
        headers,
        status: "RECEIVED",
        notes: "Notification acknowledged. Duplicate fallback create used.",
      },
    });
  });

  return Response.json({ ok: true, acknowledged: true }, jsonHeaders(200));
}
