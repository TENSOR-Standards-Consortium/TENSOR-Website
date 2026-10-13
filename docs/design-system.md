# TENSOR website design system

This is the current implementation contract for the TENSOR website. The whole-site cleanup was requested by the project steward on October 12, 2026. The visual direction received bounded independent agent review; that is separate from user acceptance or institutional approval.

## One foundation, three compositions

TENSOR uses midnight-blue surfaces, warm amber actions and selection, cool links, Inter typography and monospaced contextual labels. Semantic yes/no/unknown and labeled domain colors remain distinct. Reading pages, interactive workspaces and the homepage share this identity, rather than defining separate palettes.

| Owner | Responsibility |
| --- | --- |
| `src/styles/tokens.css` | Colors, typography, widths, spacing, radii, lighting, motion timing and compatibility aliases |
| `src/styles/components.css` | Buttons, focus, panels, badges, resource cards, grouped controls, document inputs and workspace headings |
| `src/styles/shell.css` | Header, footer, page introductions, responsive contextual navigation and document framing |
| `BaseLayout.astro` | Document metadata, security/privacy settings, shared header/footer and global foundation |
| `DocumentLayout.astro` | Reading-page composition with PageIntro and SectionNavigation; metadata title stays separate from the visible title |
| `PageIntro.astro` / `WorkspaceHeading` in `WorkspaceUI.jsx` | Common heading hierarchy, with appropriate workspace density |
| `Surface.astro` / `ContentCard.astro` / React `Panel` | Shared panel surface; document bodies use the reading variant |
| `Button.astro` / `.btn` | Equivalent link and action appearance; React controls use the same classes |
| `ResourceCard.astro` | Linked resource-card appearance and states |
| `Badge` in `WorkspaceUI.jsx` | Labeled semantic status outcomes |
| `EvidenceMap.astro` | Homepage relationship illustration; conceptual, not a real investigation or a graph of released definitions |

Task-specific CSS owns layout, density and scrolling: graph geometry and inspectors, Lab panes, catalog filters, coverage tables, historical metrics and Studio tools. It must consume central tokens. It must not change body backgrounds, shell geometry, or define a second palette. Scoped page layout is allowed; copying a new theme is not. The old page-wide circuit background and unused earlier Lab styles have been removed.

Both Cytoscape and Three.js resolve their visual colors from the central CSS roles. Domain color is a labeled grouping aid, never evidence of severity, confidence, causality or equivalent meaning. Changes to display colors do not change graph definitions or records.

## Preserved journeys and data boundaries

The atlas exposes all 609 working questions and the separate preserved 588-question release. Explore and Follow an investigation retain source selection, search, outgoing routes, renderer switch, Fit all, focus, expansion, overview, whole-graph highlighting and path-plus-next-options. Published catalog links continue to pin version and question ID. Profile walkthroughs retain their explicit qualified definitions and evidence limits.

Three.js loads only on request. The nebula preserves deterministic domain/topic grouping, complete source nodes, bounded layout, orbit/reset controls and labeled routes. Coordinates do not assert a finding. WebGL failure offers the atlas; complete server-rendered text stays available. Playback requires an explicit start, pauses on inspection/context changes or a hidden tab, and ends at the last step.

Investigation Lab keeps private local imports, validation, record browsing, assessment history, recorded path, export and reimport. Only explicit Decision selections produce recorded-path edges. File order is presentation order. The 300-instance canvas limit retains a complete paginated text list. Private records and selections stay out of telemetry, storage and URLs; evidence is never retrieved and recorded actions are never executed.

Core, schemas, releases, frozen review artifacts and source digests are unchanged by this design system. No invitations are sent.

## Motion and access

Entry reveals establish homepage hierarchy (320/540 ms); controls respond immediately and selected states carry the amber accent. Existing graph/timeline choreography remains. Reduced-motion preferences remove entry/camera transitions without disabling user-controlled replay. Every composition uses the same visible keyboard focus; Skip to content leads to the main landmark. Mobile documents expose a scrollable resource rail with a visible cue, while full-screen tools retain their text and failure alternatives.

## Validation and maintenance

Run `npm run validate`. It includes `check:design`, which rejects independent page colors, root token overrides, body skins and shell restyling, and checks PWA theme consistency. The existing build gate checks identical primary/footer navigation, one header/main/footer/title, CSP, hosting headers and canonical URLs across all generated pages.

For visual changes, also inspect desktop and mobile Home, a reading page, the graph and Lab. Exercise search, source switching, 3D, playback, local bundle round trip and preserved deep links. Verify overflow, keyboard focus, reduced motion, empty/failure states and downloads. Automated checks do not establish aesthetic acceptance, evidence truth, full accessibility certification or institutional readiness.

The optional `scripts/check-design-browser.mjs` gate checks the 24 representative routes at desktop/mobile sizes against a running preview or deployed origin. It uses an installed Playwright module (set `PLAYWRIGHT_MODULE` if it is outside normal Node resolution); `TENSOR_QA_BASE` selects the origin and `TENSOR_DESIGN_OUTPUT` optionally saves renders/results. It adds no production dependency or network requirement to the offline gate.
