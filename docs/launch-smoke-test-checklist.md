# Combay launch smoke-test checklist

Use this after each production deploy. It is deliberately a QA checklist, not a feature specification.

## Public website
- Home page loads on desktop and mobile.
- Mega menu opens without covering the full first viewport.
- Master category links visually select the correct shop filter.
- Subcategory links visually select the nested filter.
- Search works by SKU, MPN, model, brand and product title.
- Product detail gallery shows original images without broken URLs.

## Commerce flow
- Simple product can be added to cart.
- Variation product forces option selection before cart/checkout/RFQ.
- Quantity cannot exceed available stock.
- Checkout pre-fills logged-in customer details where present.
- Stripe-paid order moves into the correct order/paid-invoice flow.
- Paid invoice shows paid state and shipping where relevant.

## Admin operations
- Admin login and customer login remain separate.
- Admin users page lists email and phone and can create/delete secondary admins.
- sales@combay.co.uk primary admin cannot be deleted.
- Suspended customer cannot sign in or re-register with the same email/phone.
- Invoices, quotes, packing lists and commercial invoices can be created and viewed.
- Visual CMS opens with live-page parity and no cropped edit panel.

## Email and automation
- Resend sender/domain configuration is valid.
- Registration verification email arrives.
- Forgot-password reset email arrives and redirects to the correct login page after reset.
- Marketing automation preview matches sent layout.
- Unsubscribe link and List-Unsubscribe behaviour are present.
- No unwanted CTA buttons are present in customer emails while this is parked.

## eBay and integrations
- eBay account deletion endpoint challenge and POST notification return 200.
- eBay Developer Portal test notification succeeds.
- Sync first 10, first 50 and resumable sync-all behaviour work.
- Remap categories only keeps public shop filters clean.
- Background-removal worker remains parked for V2 and no bad processed images are live.
- No generated image-worker files remain on the VPS from the failed test batch.

## Launch environment
- Production Vercel env vars are present and not duplicated incorrectly.
- NEXTAUTH_SECRET is set in production.
- DATABASE_URL points to the intended Neon/Postgres database.
- Stripe webhook secret is set for production if Stripe is live.
- Resend API key is set and current.
- eBay callback/RuName and marketplace endpoint match the Developer Portal.
