# StoreOptimizer Studio (Shopify Embedded App)

StoreOptimizer Studio audits and improves SEO, conversion quality, and merchandising quality for Shopify stores, then turns findings into actionable fixes, content plans, and lightweight video ad projects.

> White-hat only. No fake traffic, bots, or black-hat SEO tactics.

## Features

- **Audit Dashboard**
  - Product SEO checks (title quality, alt text coverage)
  - Conversion checks (description clarity)
  - Findings table with severity + recommendations
  - CSV export-ready findings data from `/api/audit/results`
- **Fixes & Suggestions**
  - One-click product updates via GraphQL Admin API (`write_products` gated)
  - Action logging for all applied fixes
  - Theme App Extension block for JSON-LD and FAQ content (safe mode)
  - Advanced theme edits intentionally disabled by default (`write_themes` optional)
- **Traffic Helper**
  - 30-day content planner (AI provider optional, rule-based fallback)
  - Keyword/content support foundation via plan generation route
  - UTM and optional external integrations can be added in `src/routes/api.ts`
- **Video Ads Studio**
  - Ad project creation with templates
  - Async render queue interface
  - FFmpeg-compatible renderer interface (default placeholder)

## Tech stack

- Node + Express + TypeScript
- Shopify Admin GraphQL API
- Prisma ORM (SQLite dev, Postgres-ready with datasource switch)
- Pluggable AI provider (`OpenAiProvider` or rule-based fallback)
- Swappable render pipeline (`VideoRenderer` interface)

## Shopify API versioning

Set API version in one place:

- `src/config.ts` via `SHOPIFY_API_VERSION` env var.

Bump quarterly by updating `.env`/deploy environment only.

## Scopes policy

Default scopes (minimal):

- `read_products`
- `read_content`
- `read_themes` (diagnostics only)

Optional scopes (feature-gated):

- `write_products` for one-click fixes
- `write_themes` for advanced mode only (explicit merchant approval + warning)

## Local setup

1. Install dependencies

```bash
npm install
```

2. Copy env file

```bash
cp .env.example .env
```

3. Run Prisma migration + client generation

```bash
npm run prisma:migrate
npm run prisma:generate
```

4. Start local dev server

```bash
npm run dev
```

## Commands

- Install deps: `npm install`
- Run dev: `npm run dev`
- Run Prisma migrate: `npm run prisma:migrate`
- Run tests: `npm test`
- Build: `npm run build`
- Start prod: `npm run start`

## Deployment notes

- Use managed Postgres in production by switching Prisma datasource provider/url.
- Set strong `TOKEN_ENCRYPTION_SECRET`.
- Configure Shopify app URL and redirect URLs.
- Register webhooks:
  - `app/uninstalled`
  - `products/update`
  - `shop/redact`
  - `customers/redact`
  - `customers/data_request`
- Ensure HTTPS and secure secret storage.

## API routes

- `POST /api/shopify/graphql`
- `POST /api/audit/run`
- `GET /api/audit/results`
- `POST /api/fix/apply`
- `POST /api/content/generate`
- `POST /api/ads/create`
- `POST /api/ads/render`
- `GET /api/ads/status`
- `GET /api/ads/download`
- `POST /webhooks/*`

## Theme app extension

A starter block exists at:

- `extensions/theme-app-extension/blocks/storeoptimizer-structured-data.liquid`

It injects optional JSON-LD organization schema and FAQ content via merchant-configurable settings.

## Security

- Access tokens encrypted at rest (`src/utils/crypto.ts`)
- Minimal data model (shop + optimization data; no customer PII by default)
- Scope-gated mutation routes
- Webhook HMAC verification helper included

## How to extend

See `docs/EXTENDING.md` for adding:

- new audit rules
- new ad templates
- richer renderer scenes

