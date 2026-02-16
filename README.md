# StoreOptimizer Link Mode

StoreOptimizer Link Mode is a TypeScript web app for Shopify-focused audits and improvement workflows.

- **Public mode (`Scan Store`)** analyzes only public storefront data (HTML, `robots.txt`, `sitemap.xml`) and **cannot modify a store**.
- **Connected mode (`Connect Shopify`)** enables one-click apply actions through Shopify OAuth with minimal scopes.

## Compliance guarantees

- No black-hat SEO, no bot/fake traffic, no fake engagement.
- Public scan uses only publicly accessible storefront pages.
- Public scan is rate-limited and capped by page limits.
- Crawler honors `robots.txt` disallow entries and crawl delay where available.
- Store mutations are only available after explicit Shopify OAuth connection.

## Features

### Module A — Public Scan (no auth)

- URL normalization and SSRF guard (blocks localhost/internal IP ranges).
- Shopify detection using multiple signals:
  - `cdn.shopify.com` assets
  - meta generator mention
  - common `/products` or `/collections` routes
  - JSON-LD product schema hints
- Sitemap-driven crawl with fallback homepage scan.
- SEO checks: title, meta description, H1, canonical/OG hints, image alt coverage, structured data presence, broken links.
- Conversion checks: product CTA/price/variants hints, policy-link discoverability.
- Lightweight performance snapshot (timing-based, Lighthouse-like overview).
- Findings include severity, area, why it matters, suggested fix, and how to apply.
- Overall + sub-score scoring (SEO / Conversion / Performance) with top 10 fixes prioritization.

### Module B — Improvement Pack (public)

- Download findings as CSV or JSON.
- Copy pack generation:
  - product title patterns
  - meta description templates
  - FAQ templates
  - 30-day content calendar
- Niche inference from scanned page text.
- UTM builder endpoint for tracked links.

### Module C — Optional Shopify connect for applying fixes

- Connect flow page documents required OAuth behavior/scopes.
- Scope policy:
  - default: `read_products`, `read_content`
  - optional one-click apply: `write_products`
  - advanced theme edits: `write_themes` (off by default)
- Token storage encrypted at rest.
- Action logging model included for before/after mutation traceability.

### Module D — Video Ads Studio

- Public mode ad creation from product reference.
- Templates implemented:
  1. `problem-solution-cta`
  2. `3-benefits`
  3. `minimal-premium`
- Format options: `9:16`, `1:1`, `16:9`.
- Async render queue with persisted status and output path.

## Routes / pages

- `/` — landing page URL input + scan flow
- `/scan/:id` — scan dashboard and export links
- `/connect` — OAuth/scopes guidance
- `/ads` — ad project list
- `/ads/new` — ad project creation
- `/settings` — AI key + voiceover notes

## API routes

- `POST /api/scan`
- `GET /api/scan/:id`
- `GET /api/scan/:id/export.json`
- `GET /api/scan/:id/export.csv`
- `POST /api/improvement-pack`
- `GET /api/utm`
- `POST /api/ads/create`
- `POST /api/ads/render`
- `GET /api/ads`

## Data model (Prisma)

- `Scan`
- `PageResult`
- `Finding`
- `Shop`
- `ActionLog`
- `AdProject`

See `prisma/schema.prisma` for full fields.

## Setup

1. Install dependencies

```bash
npm install
```

2. Create env file

```bash
cp .env.example .env
```

3. Set required variables

```env
DATABASE_URL="file:./dev.db"
PORT=3000
APP_URL="http://localhost:3000"
TOKEN_ENCRYPTION_SECRET="replace-with-long-random-secret"
SHOPIFY_API_VERSION="2025-01"
SHOPIFY_SCOPES="read_products,read_content"
OPENAI_API_KEY=""
ENABLE_WRITE_PRODUCTS="false"
ENABLE_ADVANCED_THEME_EDITS="false"
```

4. Generate Prisma client + apply migration

```bash
npm run prisma:generate
npm run prisma:migrate
```

5. Run app

```bash
npm run dev
```

## Testing

```bash
npm test
npm run build
```

## How public scan works

1. Validate and normalize URL.
2. Fetch `robots.txt` and `sitemap.xml`.
3. Build capped URL list (default max 50).
4. Audit pages with polite delays.
5. Save `Scan`, `PageResult`, and `Finding` records.
6. Compute SEO/Conversion/Performance and overall scores.

## Why connection is required to apply fixes

Public storefront URLs expose read-only HTML and metadata. Shopify admin mutations require OAuth-granted access tokens and proper scopes. Without OAuth, one-click product updates are impossible by design.

## Shopify OAuth setup notes

- Create Shopify app in Partner dashboard.
- Set app URL and redirect URL to your deployment.
- Request minimal scopes first (`read_products`, `read_content`).
- Request write scopes only when merchant enables one-click apply.

## Extending audit rules

- Add checks in `src/audit/publicScan.ts` inside `buildFindings`.
- Add score logic in `scoreFromFindings`.
- Persist extra per-page fields through `PageResult` model.

## Extending ad templates

- Add template key handling in `src/routes/api.ts` (`/api/ads/create` schema).
- Update AI/rule-based generation in `src/ai/*`.
- Update renderer scene behavior in `src/video/*`.
