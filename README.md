# TENSOR Framework Site

Astro + React-islands frontend for the TENSOR Framework website, designed for Cloudflare Pages and Cloudflare Workers.

## Stack

- Astro (static-first)
- React islands for interactive UI
- Cytoscape for graph rendering
- Progressive Web App (offline-capable docs + Graph Studio)
- Cloudflare Pages for static hosting
- Optional Cloudflare Worker for `/api/*` edge endpoints

## Graph Studio Capabilities

- Version-aware graph and schema loading (`/api/releases`, `/api/graph?version=`, `/api/schema?version=`)
- Timeline diffs across releases (`/api/diff?from=&to=`)
- Version-scoped quality report loading (`/api/metrics/report?version=&type=math-assurance|graph-quality|coverage-matrix`)
- Per-version release quality panel in the Studio sidebar (overall/coverage/routing/robustness + publish gate checks)
- Import/export for:
  - Core graph JSON
  - Schema JSON
- Overlay layers (`tensor-layer-pack.v1`)
- Layered merge model: core investigation semantics remain stable while organization/vendor logic is carried in custom layers
- Runtime polling of framework releases from the TENSOR Framework repo (Worker remote manifest + local fallback)
- Home page release telemetry panel auto-refreshes from framework math-assurance feeds (latest + history trend).

## Metrics Dashboard

- Route: `/metrics/`
- Deep trend and comparison view for release assurance artifacts:
  - publish-gate timeline across releases
  - selected-release gate check details
  - domain x archetype coverage matrix
  - version picker tied to framework release channel
  - export actions for review packs: history CSV, gates CSV, coverage matrix CSV, trend PNG

## Compact Metrics Widgets

- Graphs and Schemas pages include compact live metrics snapshots linked to `/metrics/` for deeper analysis.

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run dev server:
   ```bash
   npm run dev
   ```
3. Open:
   - Home: `http://localhost:4321/`
   - Graph Studio: `http://localhost:4321/studio/`

## Build

```bash
npm run build
```

Output directory: `dist/`.

## PWA / Offline Behavior

- Service worker: `public/sw.js`
- Manifest: `public/manifest.webmanifest`
- Offline fallback page: `src/pages/offline/index.astro`
- Precached core routes include docs, schema/graph assets, and Graph Studio shell.

## Cloudflare Authentication

Before deploy commands:

```bash
npx wrangler whoami
```

If not authenticated:

```bash
npx wrangler login
```

If you have multiple Cloudflare accounts, set the one you want:

```bash
export CLOUDFLARE_ACCOUNT_ID="<your_account_id>"
```

## Deploy Option 1: Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy dist --project-name tensor-website
```

Pages builds automatically fall back to the Worker API origin for live release/metrics data when `/api/*`
is not available on the Pages host.

## Deploy Option 2: Cloudflare Worker + Static Assets

This serves static assets from `dist/` and enables edge endpoints:

- `/api/health`
- `/api/version`
- `/api/releases`
- `/api/graph`
- `/api/schema`
- `/api/diff`
- `/api/metrics/latest`
- `/api/metrics/history`
- `/api/metrics/report`
- `/api/telemetry`

```bash
npm run build
npx wrangler deploy --config worker.wrangler.toml
```

## CI/CD Workflows

- `.github/workflows/cloudflare-pages.yml`: deploys Pages on `main` push
- `.github/workflows/cloudflare-worker.yml`: manual Worker deploy

Required repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Key Paths

- Astro pages: `src/pages/`
- Shared layout: `src/layouts/BaseLayout.astro`
- React graph island: `src/components/GraphExplorer.jsx`
- Live version badge island: `src/components/LiveVersionBadge.jsx`
- Live metrics island: `src/components/MetricsPanel.jsx`
- Full metrics dashboard island: `src/components/MetricsDashboard.jsx`
- Standards page: `src/pages/standards/index.astro`
- Graph data: `public/assets/data/tensor-core.json`
- Schema: `public/assets/data/core.schema.json`
- Release manifest: `public/assets/releases/manifest.json`
- Standards package: `public/standards/tensor-core-v1.0.0.json`
- Conformance fixtures: `public/standards/conformance/fixtures/`
- Worker API: `worker/index.mjs`
- Pages config: `wrangler.toml`
- Worker config: `worker.wrangler.toml`
