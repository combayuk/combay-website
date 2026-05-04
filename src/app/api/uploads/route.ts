import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

function safeExtension(file: File) {
  const original = file.name.split(".").pop()?.toLowerCase();
  if (original && /^[a-z0-9]+$/.test(original)) return original;
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "application/pdf") return "pdf";
  return "bin";
}

export async function POST(req: Request) {
  const provider = process.env.UPLOAD_PROVIDER ?? "";
  const baseUrl = process.env.UPLOAD_BASE_URL ?? "";
  const localDir = process.env.UPLOAD_LOCAL_DIR ?? "";
  const maxMb = Number(process.env.UPLOAD_MAX_FILE_MB ?? 50);

  if (provider !== "vps" || !baseUrl) {
    return Response.json({ ok: false, error: "Upload provider is not configured. Add UPLOAD_PROVIDER=vps and UPLOAD_BASE_URL." }, { status: 501 });
  }

  if (!localDir) {
    return Response.json({
      ok: false,
      error: "VPS static hosting is configured, but this Vercel app cannot write to the VPS folder directly. Use image/document URL fields for now, or deploy an upload receiver on the VPS with UPLOAD_LOCAL_DIR=/var/www/combay-uploads.",
    }, { status: 501 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const folderRaw = String(form.get("folder") || "products");
  const folder = ["products", "docs", "avatars", "company-docs"].includes(folderRaw) ? folderRaw : "products";

  if (!(file instanceof File)) {
    return Response.json({ ok: false, error: "No file uploaded." }, { status: 400 });
  }

  if (!ALLOWED.has(file.type)) {
    return Response.json({ ok: false, error: "Unsupported file type." }, { status: 400 });
  }

  if (file.size > maxMb * 1024 * 1024) {
    return Response.json({ ok: false, error: `File exceeds ${maxMb}MB limit.` }, { status: 400 });
  }

  const ext = safeExtension(file);
  const filename = `${Date.now()}-${randomUUID()}.${ext}`;
  const dir = path.join(localDir, folder);
  await mkdir(dir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), bytes);

  const url = `${baseUrl.replace(/\/$/, "")}/${folder}/${filename}`;
  return Response.json({ ok: true, url, filename, folder, size: file.size, type: file.type });
}
