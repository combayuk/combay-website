import { randomUUID } from "crypto";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf", "video/mp4", "video/webm", "video/quicktime"]);

function safeFolder(value: string) {
  return ["products", "docs", "avatars", "company-docs", "resources"].includes(value) ? value : "products";
}

export async function POST(req: Request) {
  const provider = process.env.UPLOAD_PROVIDER ?? "";
  const baseUrl = process.env.UPLOAD_BASE_URL ?? "";
  const receiverUrl = process.env.UPLOAD_RECEIVER_URL ?? "";
  const receiverSecret = process.env.UPLOAD_RECEIVER_SECRET ?? "";
  const maxMb = Number(process.env.UPLOAD_MAX_FILE_MB ?? 50);

  if (provider !== "vps") {
    return Response.json(
      { ok: false, error: "Upload provider is not configured. Set UPLOAD_PROVIDER=vps." },
      { status: 501 },
    );
  }

  if (!baseUrl) {
    return Response.json(
      { ok: false, error: "UPLOAD_BASE_URL is missing." },
      { status: 501 },
    );
  }

  if (!receiverUrl || !receiverSecret) {
    return Response.json(
      {
        ok: false,
        error:
          "VPS upload receiver is not configured. Add UPLOAD_RECEIVER_URL and UPLOAD_RECEIVER_SECRET in Vercel after installing the receiver on the VPS.",
      },
      { status: 501 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const folder = safeFolder(String(form.get("folder") || "products"));

  if (!(file instanceof File)) {
    return Response.json({ ok: false, error: "No file uploaded." }, { status: 400 });
  }

  if (!ALLOWED.has(file.type)) {
    return Response.json({ ok: false, error: "Unsupported file type. Use JPG, PNG, WebP, PDF, MP4, WebM or MOV." }, { status: 400 });
  }

  if (file.size > maxMb * 1024 * 1024) {
    return Response.json({ ok: false, error: `File exceeds ${maxMb}MB limit.` }, { status: 400 });
  }

  const forward = new FormData();
  forward.set("folder", folder);
  forward.set("requestId", randomUUID());
  forward.set("file", file, file.name);

  const uploadResponse = await fetch(receiverUrl, {
    method: "POST",
    headers: {
      "x-upload-secret": receiverSecret,
    },
    body: forward,
  });

  let payload: any = null;
  try {
    payload = await uploadResponse.json();
  } catch {
    payload = null;
  }

  if (!uploadResponse.ok || !payload?.ok) {
    return Response.json(
      {
        ok: false,
        error: payload?.error || `VPS upload receiver failed with status ${uploadResponse.status}`,
      },
      { status: uploadResponse.status || 502 },
    );
  }

  return Response.json({
    ok: true,
    url: payload.url,
    filename: payload.filename,
    folder: payload.folder,
    size: payload.size,
    type: payload.type,
  });
}
