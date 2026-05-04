#!/usr/bin/env node
/*
  Combay VPS upload receiver
  - No external npm dependencies
  - Listens locally on 127.0.0.1:8787
  - Nginx should proxy https://assets.combay.co.uk/_upload to this service
*/

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const HOST = process.env.UPLOAD_RECEIVER_HOST || "127.0.0.1";
const PORT = Number(process.env.UPLOAD_RECEIVER_PORT || 8787);
const SECRET = process.env.UPLOAD_RECEIVER_SECRET || "CHANGE_ME";
const BASE_URL = (process.env.UPLOAD_BASE_URL || "https://assets.combay.co.uk").replace(/\/$/, "");
const ROOT_DIR = process.env.UPLOAD_ROOT_DIR || "/var/www/combay-uploads";
const MAX_MB = Number(process.env.UPLOAD_MAX_FILE_MB || 50);
const MAX_BYTES = MAX_MB * 1024 * 1024;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const ALLOWED_FOLDERS = new Set(["products", "docs", "avatars", "company-docs"]);

function json(res, status, data) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(data));
}

function safeExt(filename, mime) {
  const ext = path.extname(filename || "").replace(".", "").toLowerCase();
  if (/^[a-z0-9]{2,8}$/.test(ext)) return ext;
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "application/pdf") return "pdf";
  return "bin";
}

function parseContentDisposition(value) {
  const out = {};
  for (const part of value.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (!rest.length) continue;
    out[k] = rest.join("=").replace(/^"|"$/g, "");
  }
  return out;
}

function parseMultipart(buffer, boundary) {
  const boundaryText = `--${boundary}`;
  const raw = buffer.toString("binary");
  const parts = raw.split(boundaryText).slice(1, -1);
  const fields = {};
  let file = null;

  for (const part of parts) {
    const cleaned = part.replace(/^\r\n/, "").replace(/\r\n$/, "");
    const splitIndex = cleaned.indexOf("\r\n\r\n");
    if (splitIndex === -1) continue;

    const rawHeaders = cleaned.slice(0, splitIndex);
    const bodyBinary = cleaned.slice(splitIndex + 4);
    const headers = {};

    for (const line of rawHeaders.split("\r\n")) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      headers[line.slice(0, idx).toLowerCase()] = line.slice(idx + 1).trim();
    }

    const disposition = parseContentDisposition(headers["content-disposition"] || "");
    const name = disposition.name;
    const filename = disposition.filename;
    const contentType = headers["content-type"] || "application/octet-stream";
    const body = Buffer.from(bodyBinary, "binary");

    if (filename) {
      file = { fieldName: name, filename, contentType, body };
    } else if (name) {
      fields[name] = body.toString("utf8");
    }
  }

  return { fields, file };
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    return json(res, 200, { ok: true, service: "combay-upload-receiver" });
  }

  if (req.method !== "POST" || req.url !== "/upload") {
    return json(res, 404, { ok: false, error: "Not found" });
  }

  if (req.headers["x-upload-secret"] !== SECRET || SECRET === "CHANGE_ME") {
    return json(res, 401, { ok: false, error: "Unauthorised upload request" });
  }

  const contentType = req.headers["content-type"] || "";
  const match = contentType.match(/boundary=(.+)$/);
  if (!match) {
    return json(res, 400, { ok: false, error: "Missing multipart boundary" });
  }

  let size = 0;
  const chunks = [];
  req.on("data", (chunk) => {
    size += chunk.length;
    if (size > MAX_BYTES) {
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });

  req.on("close", () => {
    if (size > MAX_BYTES && !res.headersSent) {
      json(res, 413, { ok: false, error: `File exceeds ${MAX_MB}MB limit` });
    }
  });

  req.on("end", () => {
    try {
      const { fields, file } = parseMultipart(Buffer.concat(chunks), match[1]);
      if (!file) return json(res, 400, { ok: false, error: "No file uploaded" });
      if (!ALLOWED_TYPES.has(file.contentType)) return json(res, 400, { ok: false, error: "Unsupported file type" });

      const folder = ALLOWED_FOLDERS.has(fields.folder) ? fields.folder : "products";
      const ext = safeExt(file.filename, file.contentType);
      const filename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const folderPath = path.join(ROOT_DIR, folder);
      fs.mkdirSync(folderPath, { recursive: true });
      fs.writeFileSync(path.join(folderPath, filename), file.body);

      return json(res, 200, {
        ok: true,
        url: `${BASE_URL}/${folder}/${filename}`,
        filename,
        folder,
        size: file.body.length,
        type: file.contentType,
      });
    } catch (error) {
      return json(res, 500, { ok: false, error: error.message || "Upload failed" });
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Combay upload receiver listening on http://${HOST}:${PORT}`);
});
