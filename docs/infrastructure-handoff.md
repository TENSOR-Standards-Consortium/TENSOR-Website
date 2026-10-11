# Dedicated TENSOR infrastructure handoff

Status: account access and destination project verified; production and domain cutover remain pending. The dedicated account is **TENSOR Standards Consortium**. Its Pages inventory was empty before creating `tensor-standards`, with production branch `main`. Candidate deployment uses `core-next-stage`; the interim provider origin is `https://tensor-standards.pages.dev`. The inherited host is retained only for historical references. Account recovery, billing contacts and domain ownership remain separate stewardship checks.

## Ownership and destination

Keep repositories and review in the independent [TENSOR GitHub organization](https://github.com/TENSOR-Standards-Consortium). Verify the existing dedicated TENSOR provider account and its TENSOR contact, billing and recovery arrangements. Name the bootstrap maintainer and the future stewardship transfer process; the founding governance proposal does not itself appoint administrators or establish a legal entity. Add a second accountable administrator when available so control does not depend on one person's access.

Confirm the exact account identifier and authorized access, then inventory its existing Pages projects, Workers, domains and deployment settings before creating anything. Do not create a duplicate account. Record the verified identifier and actual destination Pages project name in the protected GitHub environment, not in public source defaults. Provider project names may differ from the temporary project. Keep unrelated business credentials, billing contacts and branding out of the long-term setup. Document domain ownership and authorized DNS control separately from provider-account access.

After account ownership, access and inventory are verified, reuse a suitable existing destination project or create one if needed, then redeploy the reviewed static build there. This plan does not assume that an inherited Pages project can be transferred in place between accounts. Cloudflare documents project creation followed by Direct Upload; configure the selected project's production branch as `main`, matching this repository's workflow. [Cloudflare Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).

The dedicated Pages project was created after scoped account verification. No account, credential or DNS record was created. Local authenticated access may publish a reviewed preview into the explicitly selected account; it must not be copied into CI or replace a scoped production credential.

## Production environment

The GitHub environment `tensor-production` is created, with a custom deployment branch policy allowing only `main`. Its account/project variables point to the verified dedicated destination, and `TENSOR_SITE_URL` is `https://tensor-standards.pages.dev`, the interim address selected by the owner. Readback confirmed these values. No required-reviewer rule is configured. The scoped `TENSOR_CLOUDFLARE_API_TOKEN` secret is not configured; its owner must enter it directly in GitHub before automated production deployment. A workflow file does not configure environment protections automatically.

GitHub environment variables are referenced through the `vars` context, and secrets must be created explicitly for the environment. Configure and review them using [GitHub's environment management guidance](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).

| Setting | Required value |
| --- | --- |
| `vars.TENSOR_CLOUDFLARE_ACCOUNT_ID` | Identifier of the independently controlled TENSOR account |
| `vars.TENSOR_CLOUDFLARE_PROJECT_NAME` | Exact destination Pages project name; used only by Pages deployment |
| `vars.TENSOR_SITE_URL` | Verified canonical HTTPS origin with no path, credentials, port, query or fragment |
| `secrets.TENSOR_CLOUDFLARE_API_TOKEN` | Token scoped to deployment permissions in the intended account |

Configure only the permissions needed for the enabled workflows. The Worker is optional; do not grant Worker deployment scope or enable its route merely to publish the static website. If the optional Worker is adopted, review its name/routes in `worker.wrangler.toml` and keep it inside the same dedicated account boundary.

Both production workflows reject missing account, token or canonical origin. Pages also rejects a missing/invalid project name. They pass the canonical origin to the build as `SITE_URL` and provide the explicit account/token to Wrangler. There is no fallback to an inherited account, generic Cloudflare secret or ambient OAuth. Keep account access and project existence as verified operational records; passing a format check alone does not prove control.

## Canonical domain and identifier compatibility

1. Confirm ownership and intended spelling of the public TENSOR domain. Inspect its registrar, nameservers, DNS records and existing consumers before modifying them. Do not assume an unresolved name is available or owned.
2. Bind the chosen domain to the dedicated destination project and complete the provider's ownership/certificate checks. A working provider subdomain does not establish a working custom domain.
3. Set `TENSOR_SITE_URL` for production metadata, canonical links and sitemap generation. Check `robots.txt`, absolute documentation links and any API/CSP origins against the same decision; changing one environment variable does not necessarily update every static reference.
4. Treat Core/schema `$id` values and definition IDs as compatibility commitments, separate from website location. Inventory identifiers already distributed in previews or releases. Preserve historical artifact bytes and pinned SHA-256 values. Do not silently search-and-replace old identities merely because hosting moves.
5. If an identifier or artifact must change, publish an explicit versioned mapping or new candidate revision, update its references/fixtures/provenance, and test the migration. Redirect resolvable URLs where control permits, while retaining the old artifact identity and bytes. Explain any reference that cannot be maintained. A website redirect does not rewrite a record's pinned definition digest.

The standard's meaning and public availability must not depend on a temporary provider hostname. Changing hosts is an operational handoff, not automatic adoption of the candidate binding or a change to historical graph semantics.

For an apex domain, Cloudflare Pages requires the domain zone in the same Cloudflare account as the Pages project. A subdomain can use an external DNS provider through the documented CNAME procedure, but it must first be associated with the Pages project. Choose and verify the matching path before cutover; do not assume that moving a provider project also moves a domain or registrar relationship. [Cloudflare Pages custom-domain requirements](https://developers.cloudflare.com/pages/configuration/custom-domains/).

## Verify the exact destination build

1. Select the reviewed framework commit. Synchronize its artifacts into the website and require clean source provenance (`sourceDirty: false`, `foundingSource: "framework-repository"`). Preserve the manifest and exact Git commits.
2. On the reviewed website commit, run `npm ci`, `npm audit` and `npm run validate` with the intended production `SITE_URL`. Confirm the generated canonical URLs and sitemap rather than assuming the setting took effect.
3. Publish an explicitly named preview to the dedicated destination account/project using its scoped credential. Record the immutable deployment URL and deployment ID. Do not rely on ambient OAuth or an unspecified Wrangler project.
4. Download the deployed provenance manifest and verify every served downloadable artifact against its listed byte length and SHA-256. Match bundled runtime provenance to the reviewed website build. Verify the preserved legacy graph's known hash; do not regenerate old release artifacts.
5. Check the home page, 588 versioned question pages, candidate downloads, Lab import/validation/export and legacy Studio on desktop and mobile. Confirm browser console behavior, CSP hashes, response headers and that private-workspace data is not sent through telemetry. Local tests and a successful upload do not substitute for deployed browser checks.

## Cutover and rollback

Record the existing DNS state and identify a verified rollback deployment before changing traffic. Prefer a known-good deployment inside the dedicated account. Update only the intended domain binding/DNS records, then verify resolution, TLS, HTTP status, canonical metadata, artifact hashes and key browser flows from the public domain. Keep the immutable deployment URL as a separate receipt.

If acceptance fails, restore the last verified dedicated deployment and recheck served content. Reverse the recorded DNS changes only when needed. Any temporary return to inherited infrastructure must be explicit, bounded and documented; it must not silently reinstate long-term dependency. A Git revert is not a DNS rollback. Consider service-worker cache compatibility when restoring older assets.

## Retire temporary infrastructure deliberately

After the dedicated domain and deployment are verified, update public links and documentation, transfer any necessary operational receipts, and remove temporary credentials from active deployment paths. Decide how old preview references and pinned artifact URLs will remain available before removing their hosts. Preserve required release artifacts or publish an explicit compatibility note when an old provider URL cannot remain resolvable.

Inventory the temporary Pages project, Worker routes, credentials and any domain bindings. Decommission only TENSOR-specific resources after verification and an explicit cleanup decision; do not delete an inherited account or unrelated resources. Do not enable an automatic delete job. Record completion when public traffic, production CI, ownership and recoverability have all moved to TENSOR-controlled infrastructure.
