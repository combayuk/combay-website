#!/usr/bin/env python3
"""
Combay V2 image-worker storage cleanup.

Purpose:
- Deletes processed background-removal files from Hostinger/VPS storage after the feature was parked for V2.
- Does NOT delete original eBay/source images.
- Only targets generated files that look like image-worker outputs:
  processed-combay-*.png
  image-worker-*.png
  backup ZIPs older than expiry can also be deleted if desired.

Usage on VPS:
  cd /opt/combay-image-worker
  python3 cleanup_parked_processed_images.py --dry-run
  python3 cleanup_parked_processed_images.py --delete

Optional env:
  COMBAY_UPLOAD_ROOT=/var/www/assets.combay.co.uk/uploads
"""

import argparse
import os
from pathlib import Path

DEFAULT_CANDIDATE_ROOTS = [
    "/var/www/assets.combay.co.uk/uploads",
    "/var/www/assets/uploads",
    "/var/www/combay-assets/uploads",
    "/var/www/html/uploads",
    "/opt/combay-uploads",
]

PATTERNS = [
    "processed-combay-*.png",
    "processed-combay-*.jpg",
    "processed-combay-*.jpeg",
    "image-worker-*.png",
    "image-worker-*.jpg",
    "image-worker-*.jpeg",
]


def candidate_roots():
    env_root = os.environ.get("COMBAY_UPLOAD_ROOT", "").strip()
    roots = [env_root] if env_root else []
    roots.extend(DEFAULT_CANDIDATE_ROOTS)
    seen = set()
    for item in roots:
        if not item:
            continue
        path = Path(item)
        if path in seen:
            continue
        seen.add(path)
        if path.exists() and path.is_dir():
            yield path


def find_files(root: Path):
    for pattern in PATTERNS:
        yield from root.rglob(pattern)


def fmt_bytes(size):
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if size < 1024 or unit == "TB":
            return f"{size:.1f} {unit}"
        size /= 1024


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--delete", action="store_true", help="Actually delete matched processed image files.")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be deleted without deleting.")
    args = parser.parse_args()

    if not args.delete and not args.dry_run:
        parser.error("Use --dry-run first, then --delete when satisfied.")

    roots = list(candidate_roots())
    if not roots:
        print("No upload root found. Set COMBAY_UPLOAD_ROOT=/path/to/uploads and rerun.")
        return 2

    total_files = 0
    total_bytes = 0
    for root in roots:
        files = sorted(set(find_files(root)))
        if not files:
            print(f"No processed image-worker files found under {root}")
            continue

        print(f"Root: {root}")
        for file in files:
            try:
                size = file.stat().st_size
            except FileNotFoundError:
                continue
            total_files += 1
            total_bytes += size
            print(f"{'DELETE' if args.delete else 'DRY'} {file} ({fmt_bytes(size)})")
            if args.delete:
                try:
                    file.unlink()
                except Exception as exc:
                    print(f"  ERROR deleting {file}: {exc}")

    print(f"Matched files: {total_files}")
    print(f"Matched size: {fmt_bytes(total_bytes)}")
    if args.dry_run:
        print("Dry run only. Rerun with --delete to remove these files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
