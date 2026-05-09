#!/usr/bin/env python3
import io
import os
import sys
import time
import tempfile
import zipfile
from pathlib import Path

import requests
from PIL import Image, ImageOps
from rembg import remove, new_session

SITE_URL = os.environ.get("COMBAY_SITE_URL", "https://combay-website-lt8v.vercel.app").rstrip("/")
SECRET = os.environ.get("IMAGE_WORKER_SECRET", "")
UPLOAD_RECEIVER_URL = os.environ.get("UPLOAD_RECEIVER_URL", "")
UPLOAD_RECEIVER_SECRET = os.environ.get("UPLOAD_RECEIVER_SECRET", "")
BACKGROUND_URL = os.environ.get("PRODUCT_IMAGE_BACKGROUND_URL", f"{SITE_URL}/images/product-backgrounds/combay-background.jpg")
BATCH_SIZE = int(os.environ.get("IMAGE_WORKER_BATCH_SIZE", "5"))
MODEL = os.environ.get("IMAGE_WORKER_MODEL", "isnet-general-use")
POLL_SECONDS = int(os.environ.get("IMAGE_WORKER_POLL_SECONDS", "20"))
AUTO_APPROVE_MIN_SCORE = float(os.environ.get("IMAGE_WORKER_AUTO_APPROVE_MIN_SCORE", "85"))

if not SECRET:
    print("IMAGE_WORKER_SECRET is missing.", file=sys.stderr)
    sys.exit(1)

if not UPLOAD_RECEIVER_URL or not UPLOAD_RECEIVER_SECRET:
    print("UPLOAD_RECEIVER_URL and UPLOAD_RECEIVER_SECRET are required.", file=sys.stderr)
    sys.exit(1)

session = new_session(MODEL)


def api_post(path, payload):
    response = requests.post(
        f"{SITE_URL}{path}",
        json=payload,
        headers={"x-image-worker-secret": SECRET},
        timeout=90,
    )
    response.raise_for_status()
    return response.json()


def upload_file(file_bytes, filename, content_type="application/octet-stream"):
    files = {"file": (filename, file_bytes, content_type)}
    data = {"folder": "products", "requestId": f"image-worker-{int(time.time()*1000)}"}
    response = requests.post(
        UPLOAD_RECEIVER_URL,
        data=data,
        files=files,
        headers={"x-upload-secret": UPLOAD_RECEIVER_SECRET},
        timeout=120,
    )
    response.raise_for_status()
    payload = response.json()
    if not payload.get("ok") or not payload.get("url"):
        raise RuntimeError(payload.get("error") or "Upload receiver did not return a URL.")
    return payload["url"]


def upload_png(png_bytes, filename):
    return upload_file(png_bytes, filename, "image/png")


def download_image(url):
    response = requests.get(url, timeout=90, headers={"User-Agent": "CombayImageWorker/1.0"})
    response.raise_for_status()
    return response.content


def fit_foreground_on_background(fg_rgba, bg_rgb):
    bg = ImageOps.exif_transpose(bg_rgb).convert("RGB")
    fg = ImageOps.exif_transpose(fg_rgba).convert("RGBA")

    # Trim to alpha bounding box so products are not tiny in the frame.
    alpha = fg.getchannel("A")
    bbox = alpha.getbbox()
    if bbox:
        fg = fg.crop(bbox)

    target_w, target_h = bg.size
    max_w = int(target_w * 0.84)
    max_h = int(target_h * 0.78)
    fg.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)

    canvas = bg.convert("RGBA")
    x = (target_w - fg.width) // 2
    y = int((target_h - fg.height) * 0.48)
    canvas.alpha_composite(fg, (x, y))
    return canvas.convert("RGB")


def quality_score(cutout_rgba):
    alpha = cutout_rgba.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return 0, "No foreground detected."

    w, h = cutout_rgba.size
    box_w = bbox[2] - bbox[0]
    box_h = bbox[3] - bbox[1]
    area_ratio = (box_w * box_h) / max(1, w * h)

    notes = []
    score = 100
    if area_ratio < 0.08:
        score -= 45
        notes.append("Foreground appears very small.")
    if area_ratio > 0.92:
        score -= 35
        notes.append("Foreground appears too large/full-frame; background may not have been removed.")
    if box_w < 80 or box_h < 80:
        score -= 30
        notes.append("Foreground bounding box is very small.")
    return max(0, min(100, score)), " ".join(notes) or "Quality checks passed."


def process_job(job):
    source_url = job["sourceUrl"]
    title = job.get("productTitle") or job.get("sku") or "product"
    source_bytes = download_image(source_url)
    bg_bytes = download_image(job.get("backgroundUrl") or BACKGROUND_URL)

    original = Image.open(io.BytesIO(source_bytes)).convert("RGBA")
    cutout_bytes = remove(source_bytes, session=session)
    cutout = Image.open(io.BytesIO(cutout_bytes)).convert("RGBA")
    bg = Image.open(io.BytesIO(bg_bytes)).convert("RGB")

    score, notes = quality_score(cutout)
    final = fit_foreground_on_background(cutout, bg)
    output = io.BytesIO()
    final.save(output, format="PNG", optimize=True)

    safe_sku = "".join(c for c in str(job.get("sku") or "product") if c.isalnum() or c in "-_")[:60]
    filename = f"processed-combay-{safe_sku}-{job['id']}.png"
    result_url = upload_png(output.getvalue(), filename)

    status = "PROCESSED" if score >= AUTO_APPROVE_MIN_SCORE else "NEEDS_REVIEW"
    return {
        "workerId": os.environ.get("IMAGE_WORKER_ID", "combay-vps-worker"),
        "status": status,
        "resultUrl": result_url,
        "qualityScore": score,
        "qualityNotes": notes,
    }


def safe_zip_name(value):
    cleaned = "".join(c if c.isalnum() or c in "-_." else "-" for c in str(value or "image"))
    return cleaned.strip("-")[:120] or "image.png"


def process_backup_export(backup):
    token = backup["token"]
    images = backup.get("images", [])
    if not images:
        raise RuntimeError("No processed image URLs were supplied for this backup export.")

    with tempfile.TemporaryDirectory(prefix="combay-image-backup-") as tmp:
        zip_path = Path(tmp) / f"combay-image-backup-{token}.zip"
        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            manifest = ["Combay processed image backup", f"Token: {token}", f"Image count: {len(images)}", ""]
            for index, image in enumerate(images, start=1):
                url = image["url"]
                raw_name = image.get("fileName") or f"{image.get('sku') or 'product'}-{index}.png"
                name = safe_zip_name(raw_name)
                if not name.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                    name += ".png"
                data = download_image(url)
                zf.writestr(f"images/{index:05d}-{name}", data)
                manifest.append(f"{index:05d} | {image.get('sku','')} | {image.get('title','')} | {url}")
            zf.writestr("manifest.txt", "\n".join(manifest))

        zip_bytes = zip_path.read_bytes()
        download_url = upload_file(zip_bytes, zip_path.name, "application/zip")
        api_post(f"/api/image-worker/backups/{token}", {
            "downloadUrl": download_url,
            "fileName": zip_path.name,
            "fileSize": len(zip_bytes),
            "imageCount": len(images),
        })
        print(f"Backup export {token} ready with {len(images)} images.")


def claim_and_process_backups(worker_id):
    try:
        payload = api_post("/api/image-worker/backups", {"workerId": worker_id, "limit": 1, "maxImages": int(os.environ.get("IMAGE_BACKUP_MAX_IMAGES", "100000"))})
        backups = payload.get("backups", [])
        for backup in backups:
            process_backup_export(backup)
        return len(backups)
    except Exception as exc:
        print(f"Backup processing skipped/failed: {exc}", file=sys.stderr)
        return 0


def main():
    worker_id = os.environ.get("IMAGE_WORKER_ID", "combay-vps-worker")
    while True:
        try:
            payload = api_post("/api/image-worker/jobs", {"workerId": worker_id, "limit": BATCH_SIZE})
            jobs = payload.get("jobs", [])
            if not jobs:
                backups = claim_and_process_backups(worker_id)
                if backups:
                    continue
                print(f"No jobs. Sleeping {POLL_SECONDS}s.")
                time.sleep(POLL_SECONDS)
                continue

            print(f"Claimed {len(jobs)} job(s).")
            for job in jobs:
                try:
                    result = process_job(job)
                    api_post(f"/api/image-worker/jobs/{job['id']}", result)
                    print(f"Processed {job['id']} score={result['qualityScore']} status={result['status']}")
                except Exception as exc:
                    api_post(f"/api/image-worker/jobs/{job['id']}", {
                        "workerId": worker_id,
                        "status": "FAILED",
                        "error": str(exc),
                    })
                    print(f"Failed {job['id']}: {exc}", file=sys.stderr)
        except Exception as exc:
            print(f"Worker loop error: {exc}", file=sys.stderr)
            time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
