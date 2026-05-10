export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  };
}

function emptyOk() {
  return new Response(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

function parseEbayDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

async function readPayloadSafely(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  const raw = await req.text().catch(() => "");
  if (!raw) return { payload: {}, raw };
  if (contentType.toLowerCase().includes("application/json")) {
    try {
      return { payload: JSON.parse(raw), raw };
    } catch {
      return { payload: { rawBody: raw }, raw };
    }
  }
  try {
    return { payload: JSON.parse(raw), raw };
  } catch {
    return { payload: { rawBody: raw }, raw };
  }
}

async function recordNotification(payload: any, raw: string, req: Request) {
  const notification = payload?.notification || payload?.event || payload || {};
  const data = notification?.data || payload?.data || {};
  const metadata = payload?.metadata || {};
  const headers = Object.fromEntries(req.headers.entries());
  const notificationId =
    notification?.notificationId ||
    payload?.notificationId ||
    payload?.notification?.metadata?.notificationId ||
    req.headers.get("x-ebay-notification-id") ||
    null;

  const row = {
    notificationId: notificationId ? String(notificationId) : null,
    topic: metadata?.topic || payload?.topic || "MARKETPLACE_ACCOUNT_DELETION",
    username: data?.username || payload?.username || null,
    ebayUserId: data?.userId || data?.userID || data?.ebayUserId || payload?.userId || null,
    eventDate: parseEbayDate(notification?.eventDate || payload?.eventDate),
    publishDate: parseEbayDate(notification?.publishDate || payload?.publishDate),
    payload: raw ? { ...payload, _rawBodyLength: raw.length } : payload,
    headers,
    status: "RECEIVED",
    notes: "Notification acknowledged to eBay. Database logging is best-effort and must never block the HTTP 200 acknowledgement.",
  };

  if (row.notificationId) {
    await prisma.ebayAccountDeletionNotification.upsert({
      where: { notificationId: row.notificationId },
      create: row,
      update: {
        topic: row.topic ? String(row.topic) : "MARKETPLACE_ACCOUNT_DELETION",
        username: row.username ? String(row.username) : null,
        ebayUserId: row.ebayUserId ? String(row.ebayUserId) : null,
        eventDate: row.eventDate,
        publishDate: row.publishDate,
        payload: row.payload,
        headers: row.headers,
        status: "RECEIVED",
        receivedAt: new Date(),
        notes: row.notes,
      },
    });
  } else {
    await prisma.ebayAccountDeletionNotification.create({
      data: row,
    });
  }
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
        message: "eBay account deletion endpoint is available. Use this exact URL in eBay Developer notifications.",
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
  const { payload, raw } = await readPayloadSafely(req);

  try {
    await recordNotification(payload, raw, req);
  } catch (error) {
    console.error("eBay account deletion notification logging failed, but acknowledgement was returned.", error);
  }

  // eBay compliance depends on this endpoint acknowledging the notification successfully.
  // Database logging is intentionally best-effort and must not cause a non-200 response.
  return Response.json({ ok: true, acknowledged: true }, jsonHeaders(200));
}

export async function HEAD() {
  return emptyOk();
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Allow": "GET,POST,HEAD,OPTIONS",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
