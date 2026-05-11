# Combay Platform Audit — Phase 26.2Y Initial CTO/CEO Review

This is an implementation audit baseline for the next production-readiness phases. It is intentionally structured so issues can be grouped into controlled development phases rather than changed randomly.

## P0 — Critical

### Page/Area: Paid invoices and proforma-to-paid flow
Issue: Paid invoice generation can lose line-item context when a paid proforma is converted into an order and the order has no OrderItem rows.
Severity: P0
Business impact: Accounting documents may not accurately reflect sold goods/services, creating customer trust and record-keeping risk.
Recommended fix: Always snapshot invoice/order line items into the paid invoice. If an order has no OrderItem rows, derive paid invoice lines from the source proforma linked to that order.
Implementation notes: Phase 26.2Y adds an invoice creation fallback that copies source invoice lines where order items are missing.
Acceptance criteria: Paid invoices show SKU, description, quantity, unit price, line total, shipping, total paid and zero balance.

### Page/Area: eBay publish status
Issue: Historic failed eBay API logs can remain visually dominant after a later successful publish.
Severity: P0
Business impact: Admin cannot trust the current product status and may repeat publish actions unnecessarily.
Recommended fix: Separate current state from historical logs. Show current status from Product.eBay fields and keep old errors only in logs.
Implementation notes: Phase 26.2Y changes the eBay tab to show only the latest publish-state failure as current; older failures stay in collapsed logs.
Acceptance criteria: Successful publish shows Published/Live, with old failures visible only in logs.

## P1 — High

### Page/Area: Product editor
Issue: Core website/eBay actions are split across the page and eBay tab.
Severity: P1
Business impact: Slower listing workflow and more operator errors.
Recommended fix: Add sticky top-level actions for save draft, publish product, preview, validate eBay and publish/update eBay.
Implementation notes: Phase 26.2Y adds a compact sticky action/status bar and top-level eBay action triggers.
Acceptance criteria: Admin can see website status, eBay status and SKU at the top of the product editor and trigger key actions without hunting through the form.

### Page/Area: eBay listing tab
Issue: The tab is functional but too much like a form and logs are visually dominant.
Severity: P1
Business impact: Admin cannot quickly tell what is missing before publishing.
Recommended fix: Add readiness checklist and collapse logs by default.
Implementation notes: Phase 26.2Y adds readiness summary and collapses eBay API logs.
Acceptance criteria: Missing category/aspects/images/policies are obvious; logs remain available but not dominant.

### Page/Area: eBay HTML description
Issue: The description template needs stronger Combay branding and trust structure.
Severity: P1
Business impact: Listing conversion and buyer trust are reduced.
Recommended fix: Redesign eBay-safe HTML with logo, slogan, brand colours, overview, specs, condition, shipping and Combay footer.
Implementation notes: Phase 26.2Y updates the system default eBay template and refreshes the default system template at runtime.
Acceptance criteria: Regenerated descriptions use the improved Combay layout.

### Page/Area: Admin performance
Issue: Heavy logs/history and large payloads slow admin pages.
Severity: P1
Business impact: Product creation and listing workflow becomes slow.
Recommended fix: Reduce default log loading, collapse logs, add pagination/lazy loading in subsequent phases.
Implementation notes: Phase 26.2Y reduces eBay log/job fetch counts and collapses the log panel. A deeper pagination phase remains recommended.
Acceptance criteria: eBay tab no longer visually or operationally prioritises historic logs.

## P2 — Medium

### Page/Area: SKU sequencing
Issue: New SKU generation used the highest SKU plus one; this does not reuse safe unused gaps for deleted/unpublished drafts.
Severity: P2
Business impact: Inventory numbering can drift unnecessarily.
Recommended fix: Generate the lowest unused CBUK number for new local products. Later add a full SkuSequence table for reserved/active/retired/external states.
Implementation notes: Phase 26.2Y changes new product/duplicate SKU generation to the lowest unused CBUK number. Full eBay-safe SKU migration remains a separate controlled phase.
Acceptance criteria: New manual product SKUs use the lowest available unused CBUK number.

## Recommended next implementation groups

1. SKU reservation table and safe existing-inventory migration.
2. Product list/server pagination and lighter admin API payloads.
3. eBay category/aspect confidence scoring and reusable mapping rules.
4. Paid invoice/proforma source-reference field and full payment-method snapshot.
5. Full public/mobile/customer-portal audit using live browser walkthrough.
