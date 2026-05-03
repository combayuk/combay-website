# Combay Website

Production-ready B2B industrial commerce platform built with Next.js 14, TypeScript, Tailwind CSS, Prisma, and PostgreSQL.

## Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM, PostgreSQL
- **Auth**: NextAuth.js (credentials + extensible)
- **Deployment**: Vercel (preview) + Docker + VPS (production)

## Quick Start (Local)

```bash
cp .env.example .env
# Edit .env with your DATABASE_URL and secrets

npm install
npx prisma generate
npx prisma db push
npx ts-node prisma/seed.ts

npm run dev
```

## Deploy to Vercel (Preview)

```bash
git push origin main
# Connect repo at vercel.com/new
# Add all env vars from .env.example
```

## Deploy to VPS (Production)

```bash
# On your VPS (srv1289759.hstgr.cloud)
git clone https://github.com/combayuk/combay-website.git
cd combay-website
cp .env.example .env
# Edit .env with production values

docker compose up -d
# First run: migrations run automatically
```

## Admin Access

After seeding, log in at `/auth/login` with:
- Email: `admin@combay.co.uk` (or ADMIN_EMAIL from .env)
- Password: as set in ADMIN_PASSWORD

Admin panel is at `/admin`.

## Pages Built
- Home (hero carousel, industry strip, service tabs, trust section, FAQ preview, CTA)
- Shop (search, filter, sort, product cards)
- Product detail (4-tab: Description / Product Overview / FAQ / Documents)
- Repair Services (full page + request form)
- Asset Recovery (full page + request form)
- Manufacturers
- About
- Contact
- FAQ (3-tab accordion)
- Customer Portal (orders, returns, tracking, support, account, marketing prefs)
- Auth (login, register)
- Admin Dashboard (products, orders, requests, content manager)
- All 7 policy pages (Terms, Privacy, Returns, Warranty, Payment, Shipping, Condition Codes)
