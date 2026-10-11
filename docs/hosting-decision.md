# Website hosting decision

Decision date: 2026-10-10; operational status refreshed 2026-10-11. This records the implementation choice and observed provider state, not ratification of the standard.

## Dedicated TENSOR production, Cloudflare Pages platform

The long-term production website must be operated from a **dedicated TENSOR-controlled account**, independent of unrelated businesses. The inherited hosting account is temporary preview infrastructure only. Its credentials, account identifier and provider project name are not production defaults.

Keep the static Cloudflare Pages architecture for this stage. Keep specifications, source, issues, pull requests and versioned artifacts in the independent [TENSOR GitHub organization](https://github.com/TENSOR-Standards-Consortium). Hosting is an operational choice; it confers no ownership of TENSOR's semantics, governance or conformance decisions on a provider or temporary operator.

The Astro build remains static. The Core validator and examples run locally in the visitor's browser without a hosted investigation service, account or vendor API. The optional Worker remains a separate manual deployment for the existing release API and telemetry route. The candidate Lab does not require it; deploying Pages does not deploy a Worker.

Cloudflare Pages supports the existing response-header controls and immutable previews. GitHub Pages can serve the static website too, but adopting it would require deliberate canonical URL, header and service-worker decisions. Cloudflare recommends Workers for new applications; this implementation already uses Pages and does not require a new server runtime. A dedicated destination Pages project can reuse the tested static build without making the old account permanent.

Sources: [Cloudflare platform guidance](https://developers.cloudflare.com/pages/), [Cloudflare Pages headers](https://developers.cloudflare.com/pages/configuration/headers/), [GitHub Pages capabilities](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [Cloudflare Pages-to-Workers migration](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/).

## Current publication boundary

Production is live in the **TENSOR Standards Consortium** account, in the dedicated `tensor-standards` project with production branch `main`. The owner selected `https://tensor-standards.pages.dev` as the interim public origin. The dedicated GitHub environment, account/project/origin variables and account-owned Pages Write token are configured, with a `main`-only environment branch rule. [Automatic publication succeeded on October 11](https://github.com/TENSOR-Standards-Consortium/TENSOR-Website/actions/runs/38115200898/attempts/2); all 33 public downloads matched their pinned provenance afterward. The temporary proof token expires October 18, 2026 at 23:59:59 UTC and must be rotated before then. Publication does not ratify the standard. Earlier previews on inherited infrastructure remain historical references only.

As observed on 2026-10-10, `tensor-standards-consortium.org` did not resolve. The dedicated account and Pages project are verified; domain ownership, DNS control and the eventual custom canonical domain still require verification. Do not infer domain ownership or repaired DNS from a working provider preview.

Production workflows require the `tensor-production` GitHub environment, with `TENSOR_CLOUDFLARE_ACCOUNT_ID`, `TENSOR_CLOUDFLARE_PROJECT_NAME` (Pages), `TENSOR_SITE_URL` variables and the scoped `TENSOR_CLOUDFLARE_API_TOKEN` secret. Missing or malformed configuration fails before publication. The build receives the mandatory canonical origin as `SITE_URL`. No workflow falls back to inherited account identifiers, generic Cloudflare secrets or local OAuth.

The Pages configuration includes `name = "tensor-standards"` because Wrangler requires it even with an explicit `--project-name`. It does not embed an account or credential. Production still requires its configured account and project. The selected account/project, control of DNS and maintainer access must be recorded and verified during [the infrastructure handoff](infrastructure-handoff.md).

## Build and security contract

Use Node 24 LTS (the exact version is pinned in `.node-version`). All workflows read that file and use Ubuntu 24.04; action revisions are pinned to full commits using the Node 24 action runtime. These are separate from the project's Node version. Dependabot proposes weekly action and dependency updates; it does not merge or deploy them automatically. `npm ci` installs the lockfile. `npm audit` checks the full dependency tree, including development dependencies. `npm run validate` enforces the existing release URL policy, checks types, runs tests, builds the site, and inspects the generated HTML.

Wrangler is an exact development dependency in the same lockfile. The deployment action detects that installed version rather than installing an unreviewed tool or rewriting dependency files after validation. Its pre-deployment check rejects changed or untracked source. npm install-script approvals are restricted to the reviewed versions of esbuild and workerd; the optional macOS fsevents watcher script is denied. A dependency update must review any changed install-script approval rather than granting blanket execution. GitHub-managed Dependabot jobs use GitHub's own runner selection and may display provider migration notices independently of the pinned project workflows.

The dependency refresh uses Astro 7.3.8 and its React integration 7.0.1 while preserving React 18. Astro 7 requires Node 24 LTS (the exact version is pinned in `.node-version`) and changes compiler/build internals, so production output and browser behavior must be checked after upgrades. [Astro 7 upgrade guide](https://docs.astro.build/en/guides/upgrade-to/v7/).

Astro emits a page-specific Content Security Policy with exact hashes for its inline hydration scripts and styles. The generated-output check recalculates those hashes, rejects unsafe script sources and inline event handlers, and parses JSON-LD. The HTTP header supplies `frame-ancestors`, which a CSP meta element cannot enforce. It deliberately does not add a second `script-src` policy that would intersect with and block the page hashes. Inline style attributes remain allowed for data-driven React/Cytoscape dimensions; inline JavaScript and `unsafe-eval` remain disallowed. [Astro CSP configuration](https://docs.astro.build/en/reference/configuration-reference/#securitycsp).

Cytoscape 3.33.3 dynamically inserts one fixed renderer stylesheet, `.__________cytoscape_container { position: relative; }`. The configuration permits only its exact SHA-256 hash, `pgvDUBa4IjFA2yuSJ2cqcyxmNYJMborsd0ORcRv9vw8=`. A regression test reconstructs that CSS from the pinned installed package and verifies the policy. A Cytoscape upgrade must recheck this behavior; it must not be repaired by allowing all inline style elements.

`astro preview` exercises the built HTML CSP but does not emulate Cloudflare's response headers. Check the actual headers with a local Wrangler Pages server or a deployed preview before declaring hosting behavior verified. `_headers` applies to static assets; a future Worker route must supply its own response headers where appropriate. [Cloudflare header behavior](https://developers.cloudflare.com/pages/configuration/headers/).

The service worker uses a new cache generation, revalidates standards assets over the network before falling back to cache, and never caches API requests, including API navigations. Cached data does not imply that it is the latest standard or constitute conformance evidence.

## Publication and recovery

Follow [the infrastructure handoff](infrastructure-handoff.md) for credential rotation, recovery and any later custom-domain cutover. It separates ownership, canonical identifiers, artifact verification, destination preview, DNS cutover and temporary-host decommissioning.

The Pages workflow publishes only `main`, after its protected environment preflight, full audit and validation. Worker deployment remains manual and uses the same dedicated account boundary. Pull-request CI never publishes. Environment protection and authorized maintainers must be configured in GitHub; a workflow file alone does not establish those controls.

Retain a verified deployment within the dedicated account for rollback. A code revert does not reverse DNS, and rollback must not silently make the inherited account permanent again. The temporary host must remain only as long as the documented transition and reference-preservation plan requires. No automatic account, project or deployment deletion is configured.

GitHub Pages remains a possible future mirror for immutable releases. Decide its canonical relationship and adapt root-relative links, service-worker scope, CSP/header delivery and duplicate-content metadata before enabling it. Do not maintain two independently updated canonical websites.
