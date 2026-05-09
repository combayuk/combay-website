# Combay image background worker

This worker is designed for a VPS/local machine, not Vercel.

It:
1. Claims queued image jobs from Combay.
2. Downloads the original eBay image temporarily.
3. Removes the background locally using rembg.
4. Composites the product onto the Combay branded background.
5. Uploads the final processed image to the existing Combay upload receiver.
6. Reports the processed URL back to Combay.
7. Deletes temporary files from the worker machine.

Original eBay image files are not stored permanently. Only the processed image is stored.

## Environment variables

```bash
COMBAY_SITE_URL=https://combay-website-lt8v.vercel.app
IMAGE_WORKER_SECRET=the-same-secret-set-in-vercel
UPLOAD_RECEIVER_URL=https://your-upload-receiver.example/upload
UPLOAD_RECEIVER_SECRET=your-upload-secret
PRODUCT_IMAGE_BACKGROUND_URL=https://combay-website-lt8v.vercel.app/images/product-backgrounds/combay-background.jpg
IMAGE_WORKER_BATCH_SIZE=5
IMAGE_WORKER_MODEL=isnet-general-use
IMAGE_WORKER_AUTO_APPROVE_MIN_SCORE=85
```

## Install

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python combay_image_worker.py
```

Run it under systemd/pm2/supervisor for production.
