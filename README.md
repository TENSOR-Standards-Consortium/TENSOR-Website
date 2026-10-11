# TENSOR website

The public website and browser tools for TENSOR: a shared investigative Core for all cyber investigations, usable by humans and agents, with vendor and business layers above it.

**Current Core implementation: `0.1.0-draft.1`, a candidate binding for founding proposal `0.1.0`. It is not a ratified standard or a certification.** Existing dated graph releases retain their original meaning and version history.

## What lives here

| Surface | Purpose |
| --- | --- |
| `/standards/`, `/docs/`, `/governance/`, `/implement/` | Explain the proposal, implementation boundary and participation process |
| `/investigation-lab/` | Import, inspect, validate and export candidate investigation bundles; load two synthetic worked cases |
| `/questions/` | Browse 588 preserved legacy questions with version-specific citation pages |
| `/studio/`, `/graphs/`, `/schemas/` | Preserve the legacy graph ecosystem and its authoring/exploration tools |
| `/metrics/` | Inspect historical graph quality reports; these are not evidence of investigative effectiveness |

The [framework repository](https://github.com/TENSOR-Standards-Consortium/TENSOR-Framework) owns the specifications, runtime, schemas, examples and releases. This repository owns their presentation and browser interfaces. Astro builds static HTML, React supplies interactive islands, and Cytoscape renders legacy graphs.

The Core runtime validates representations and declared dependencies. It does not establish evidence truth, grant authority, execute actions or contact agents. Imported Lab bundles stay in browser memory and can be downloaded again; the Lab and Studio disable client telemetry. Validation reports retain `fail`, `indeterminate` and `notRun` distinctions. Using one implementation is not independent interoperability proof.

## Local setup and checks

Use **Node 24 LTS (the exact version is pinned in `.node-version`)**. The committed artifacts allow a normal build without a framework checkout or build-time network fetches.

```sh
npm ci
npm run dev
```

Open `http://localhost:4321/`. To check and build the production output:

```sh
npm audit
npm run validate
npm run preview
```

`validate` checks artifact provenance, enforces the existing release URL policy, checks types, runs tests, builds `dist/`, and inspects every generated page's CSP hashes and JSON-LD. The full dependency audit remains a separate required CI step. Development mode does not apply Astro's production CSP; use the built preview for browser validation.

Tests cover the browser integration and hosting behavior. The framework repository owns its larger Core conformance test suite. Passing these checks does not ratify the candidate or establish every founding-contract requirement.

## Updating Core artifacts

Edit the framework source first, then synchronize from its local checkout:

```sh
npm run sync:core -- --framework /absolute/path/to/TENSOR-Framework-checkout
npm run check:core
npm run check:core -- --framework /absolute/path/to/TENSOR-Framework-checkout
```

The offline check compares every generated file with its recorded SHA-256 and rejects missing or unrecorded files. The optional source check also compares the supplied framework checkout. Nothing is fetched or executed from that checkout.

| Generated path | Contents |
| --- | --- |
| `src/vendor/tensor-core/` | Four browser-safe reference-runtime modules |
| `public/core/0.1.0-draft.1/` | Candidate binding, coverage notes, schemas, example bundles and provenance |
| `public/founding/` | Founding charter, Core contract, governance, crosswalk and review proposal |
| `public/legacy/0.20260206e/` | Exact published legacy graph used by the question catalog |

`public/core/0.1.0-draft.1/provenance.json` records the full source commit, dirty status, source/destination paths, sizes and hashes. Local integration can record uncommitted or bootstrap sources explicitly; release preparation must resynchronize from the clean committed framework source with `sourceDirty: false` and `foundingSource: "framework-repository"`. A provenance inventory is not a signature or external endorsement. See [the sync contract](docs/core-sync.md) for details. Do not hand-edit generated copies.

## Hosting and deployment

**Production belongs in a dedicated TENSOR-controlled Cloudflare account.** Keep Cloudflare Pages for the static website and the independent [TENSOR GitHub organization](https://github.com/TENSOR-Standards-Consortium) for source, review and versioned artifacts. Provider hosting does not determine the standard's semantics or governance.

Account access is verified for **TENSOR Standards Consortium**. Its dedicated Pages project is `tensor-standards`, with `main` reserved for production and `core-next-stage` for candidate previews. The interim provider origin is `https://tensor-standards.pages.dev`; production publication and a custom-domain cutover are separate steps. As observed on 2026-10-10, `tensor-standards-consortium.org` did not resolve. The inherited host is retained only for historical preview references; new deployments target the dedicated account.

The workflows use the **`tensor-production` GitHub environment** and fail before deployment when its required configuration is missing. Configure these values only for the dedicated TENSOR destination:

| Environment setting | Type | Purpose |
| --- | --- | --- |
| `TENSOR_CLOUDFLARE_ACCOUNT_ID` | Variable | Dedicated TENSOR account identifier |
| `TENSOR_CLOUDFLARE_PROJECT_NAME` | Variable | Actual Pages project name in that account; required for Pages deployment |
| `TENSOR_SITE_URL` | Variable | Verified HTTPS canonical origin; supplied to the build as `SITE_URL` |
| `TENSOR_CLOUDFLARE_API_TOKEN` | Secret | Account-owned Pages Write token restricted to the dedicated TENSOR account |
| `TENSOR_CLOUDFLARE_WORKER_API_TOKEN` | Optional secret | Separate Worker credential; unprovisioned unless the optional Worker is adopted |

There is no inherited account ID, project-name fallback, generic deployment secret, or local OAuth fallback in the production workflows. `wrangler.toml` contains the dedicated project name required by Wrangler and the static build output; the workflow still requires an explicit account/project/token. No token belongs in source control.

- `ci.yml`: audits and validates pull requests, `main`, and `codex/*` branches; no deployment.
- `cloudflare-pages.yml`: repeats all checks and deploys `main` to the configured dedicated Pages project. Manual dispatch is restricted to `main`.
- `cloudflare-worker.yml`: optionally repeats all checks and manually deploys the Worker from `main` into the same dedicated account boundary using its separate credential. It remains unprovisioned; the Pages token cannot deploy Workers.

Production and automatic GitHub deployment are verified at [tensor-standards.pages.dev](https://tensor-standards.pages.dev). Follow [the infrastructure handoff](docs/infrastructure-handoff.md) to rotate the temporary token before October 18, maintain recovery arrangements, and plan any later custom-domain cutover. Missing configuration intentionally blocks publication. Local Wrangler authentication must not be substituted for production configuration.

For a local provider-style preview, without publishing:

```sh
npx --yes wrangler@4.149.0 pages dev dist --port 8788
```

The HTML contains Astro-generated script/style hashes. `_headers` adds frame-embedding and transport controls without a second script policy that would block hydration. Inline style attributes support React/Cytoscape dimensions; inline JavaScript and `unsafe-eval` remain disallowed. The service worker never caches API requests, revalidates standards assets and provides an offline fallback; cached content is not proof of the latest release.

See [the hosting decision](docs/hosting-decision.md) for the platform rationale and security contract. A successful build or preview does not establish production deployment, independent ownership, or custom-domain readiness.

## Optional legacy Worker API

`worker/index.mjs` can serve the static assets plus these existing endpoints:

- `/api/health`, `/api/version`, `/api/releases`
- `/api/graph`, `/api/schema`, `/api/diff`
- `/api/metrics/latest`, `/api/metrics/history`, `/api/metrics/report`
- `/api/telemetry` (POST; separate from the Core data contract)

Pages deployment does not deploy this Worker. The candidate Lab does not require it. Legacy release/metrics readers can use their existing public-repository fallbacks when an API is unavailable.

For an explicitly configured API, build with `PUBLIC_TENSOR_API_ORIGIN` or `PUBLIC_TENSOR_USE_SAME_ORIGIN_API=true`. Any additional origin also needs a reviewed CSP `connect-src` entry. `TELEMETRY_ALLOWED_ORIGINS` controls the Worker POST origin allowlist (default same-origin); `RELEASE_ALLOWED_HOSTS` and `PUBLIC_RELEASE_ALLOWED_HOSTS` configure release host allowlists. Host allowlisting does not remove existing HTTPS, path-prefix, traversal or size checks. Do not enable the telemetry endpoint for imported investigation contents.

The optional Worker deployment configuration is `worker.wrangler.toml`. Its existence and historical deployment do not prove that its current public route works; verify the intended account, route and environment before using the manual workflow.
