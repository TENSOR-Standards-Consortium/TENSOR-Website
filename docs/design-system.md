# TENSOR website design system

This is the current implementation contract for the TENSOR website. The whole-site cleanup was requested by the project steward on October 12, 2026. The navy and graphite directions were rejected by the steward. The current investigation-observatory revision retains the shared foundation; bounded independent agent review is separate from user acceptance or institutional approval.

## One foundation, three compositions

TENSOR uses deep mineral surfaces, silver Manrope display headings, Inter body/controls, mint actions and monospaced contextual labels. Large headings use central tracking tokens with a looser mobile setting. Small corner radii, fine registration lines and generous reading space distinguish the publication; operational workspaces retain their denser controls. Semantic yes/no/unknown and labeled domain colors remain distinct. Reading pages, interactive workspaces and the homepage share this identity, rather than defining separate palettes.

| Owner | Responsibility |
| --- | --- |
| `src/styles/tokens.css` | Colors, typography, widths, spacing, radii, lighting, motion timing and compatibility aliases |
| `src/styles/components.css` | Buttons, focus, panels, badges, resource cards, grouped controls, document inputs and workspace headings |
| `src/styles/atmosphere.css` / `CircuitFrame.astro` | Sparse decorative perimeter traces, separate from investigation geometry |
| `src/styles/shell.css` | Header, footer, page introductions, responsive contextual navigation and document framing |
| `Brand.astro` | Original logo and TENSOR wordmark shared by the header and footer, with compact and signature sizing |
| `ReferenceTable.astro` | Labeled, keyboard-focusable reference tables with a shared scrolling layout on narrow screens |
| `src/lib/navigation.ts` | Primary/footer destinations and the single resource inventory used by the directory and document navigation |
| `BaseLayout.astro` | Document metadata, security/privacy settings, shared header/footer and global foundation |
| `DocumentLayout.astro` | Reading-page composition with PageIntro and SectionNavigation; metadata title stays separate from the visible title |
| `PageIntro.astro` / `WorkspaceHeading` in `WorkspaceUI.jsx` | Common heading hierarchy, with appropriate workspace density |
| `Surface.astro` / `ContentCard.astro` / React `Panel` | Shared panel surface; document bodies use the reading variant |
| `Button.astro` / `.btn` | Equivalent link and action appearance; React controls use the same classes |
| `ResourceCard.astro` | Linked resource-card appearance and states |
| `Badge` in `WorkspaceUI.jsx` | Labeled semantic status outcomes |
| `KnowledgeField.astro` | Homepage projection of the actual pinned working graph; declared routes and deterministic nebula positions, linked to operational exploration |

Task-specific CSS owns layout, density and scrolling: graph geometry and inspectors, Lab panes, catalog filters, coverage tables, historical metrics and Studio tools. It must consume central tokens. It must not change body backgrounds, shell geometry, or define a second palette. Scoped page layout is allowed; copying a new theme is not. Illuminated traces are confined to the shared perimeter frame; a repeating circuit wallpaper is not used. Unused earlier Lab styles have been removed.

Both Cytoscape and Three.js resolve their visual colors from the central CSS roles. Domain color is a labeled grouping aid, never evidence of severity, confidence, causality or equivalent meaning. Changes to display colors do not change graph definitions or records.

## Preserved journeys and data boundaries

The atlas exposes all 609 working questions and the separate preserved 588-question release. Explore and Follow an investigation retain source selection, search, outgoing routes, renderer switch, Fit all, focus, expansion, overview, whole-graph highlighting and path-plus-next-options. Published catalog links continue to pin version and question ID. Profile walkthroughs retain their explicit qualified definitions and evidence limits.

Three.js loads only on request. The nebula preserves deterministic domain/topic grouping, complete source nodes, bounded layout, orbit/reset controls and labeled routes. Rougher materials and finer arrowheads keep focused routes readable. Coordinates do not assert a finding. WebGL failure offers the atlas; complete server-rendered text stays available. Playback requires an explicit start, pauses on inspection/context changes or a hidden tab, and ends at the last step. On phones, guided investigations collapse source/renderer/search controls behind an accessible disclosure that retains the active source count and renderer. The current evidence and playback controls remain visible beside the graph; desktop and exploration keep the full toolbar.

Investigation Lab keeps private local imports, validation, record browsing, assessment history, recorded path, export and reimport. Only explicit Decision selections produce recorded-path edges. File order is presentation order. The 300-instance canvas limit retains a complete paginated text list. Private records and selections stay out of telemetry, storage and URLs; evidence is never retrieved and recorded actions are never executed.

Core, schemas, releases, frozen review artifacts and source digests are unchanged by this design system. No invitations are sent.

## Motion and access

Primary text and actions are fully opaque on first paint. The home knowledge field is visible from first paint. Highlights move along existing definition routes; they do not represent live investigations. Hover/focus increases route contrast and makes the entry affordance more prominent. Illuminated perimeter traces advance slowly over 24–32 seconds; the footer offers pause/resume. Reduced motion and hidden tabs stop ambient movement, and JavaScript-off pages retain static framing. Presentation state is local to the page and never stored or sent. Controls respond immediately and selected states carry the mint accent. Existing graph/timeline choreography remains. Reduced-motion preferences remove entry/camera transitions without disabling user-controlled replay. Every composition uses the same visible keyboard focus; Skip to content leads to the main landmark. Mobile documents expose a scrollable resource rail with a visible cue. Mobile exploration stacks the inspector below the map, leaving camera controls usable with a selected question. Full-screen tools retain their text and failure alternatives.

## Validation and maintenance

Run `npm run validate`. It includes `check:design`, which rejects independent page colors, root token overrides, body skins and shell restyling, and checks PWA theme consistency. The existing build gate checks identical primary/footer navigation, one header/main/footer/title, CSP, hosting headers and canonical URLs across all generated pages.

`check:links` audits every built page's local link targets and HTML fragments, and requires all content pages to be reachable from the homepage. The offline and error responses are explicit system destinations. The resource directory and document navigation derive from the same `resourceGroups` inventory.

The optional `scripts/check-resource-browser.mjs` gate exercises directory discovery, example-layer loading and independent toggles, layer and record round trips, unavailable-example handling, navigation breakpoints, and keyboard scrolling in reference tables. It uses `PLAYWRIGHT_MODULE` and `TENSOR_QA_BASE` like the design gate; `TENSOR_RESOURCE_OUTPUT` optionally retains screenshots and reports.

For visual changes, also inspect desktop and mobile Home, a reading page, the graph and Lab. Exercise search, source switching, 3D, playback, local bundle round trip and preserved deep links. Verify overflow, keyboard focus, reduced motion, empty/failure states and downloads. Automated checks do not establish aesthetic acceptance, evidence truth, full accessibility certification or institutional readiness.

The optional `scripts/check-design-browser.mjs` gate checks the 24 representative routes at desktop, tablet and both mobile widths against a running preview or deployed origin. It checks actual headline glyph bounds, mobile guided disclosure and graph visibility, settled historical report data, and exported chart colors. It uses an installed Playwright module (set `PLAYWRIGHT_MODULE` if it is outside normal Node resolution); `TENSOR_QA_BASE` selects the origin and `TENSOR_DESIGN_OUTPUT` optionally saves renders/results. The optional `scripts/check-graph-browser.mjs` gate opens every working question inspector and invokes every declared route control, deriving its inventory from the pinned graph. Both browser gates add no production dependency or network requirement to the offline gate.

Historical chart series use separate semantic tokens and line patterns. Numeric scores and release endpoints label the axes; releases are equally spaced in sequence, not positioned by elapsed time. Narrow charts scroll inside their panel. PNG exports carry the chart title, axis labels, matching series legend and historical-structure qualification so the image remains interpretable outside the site.

Ordinary reading text uses `--reading-width` (640 pixels at the default root size); diagrams, tables and tools retain their full layout width. Manrope display headings carry the publication identity while node identifiers, evidence and controls retain their operational typography. The public initializer URL includes a build-time digest so updates to motion controls cannot be hidden by stale script caches.

## Homepage composition

The opening combines a real graph field with a clear candidate identity and routes to exploration and the Core contract. An authored investigation example follows, then preserved reasoning principles, the Core/overlay architecture, practitioner/implementer/knowledge entry rows and the review invitation page link. Section scale and alternating compositions replace a stack of equivalent cards. Existing public destinations remain in the shared navigation and contextual content. No outbound invitations are sent.

The original hexagonal, three-node TENSOR mark and wordmark form the shared identity. `Brand.astro` owns the header and footer lockups; use its variants instead of inventing text-only signatures or replacing the mark with an arrow. The header uses the existing compact `/icons/icon-192.png`; the larger footer uses `/icons/icon-512.png`, loaded lazily. Both share one color treatment in `shell.css`. The browser-tab and installed-app icons use the same original geometry. Preserve the image bytes and geometry; logo shape changes require an explicit request. Original full-size assets remain available unchanged.

## Content language

Pages are reference resources. Lead with the definition, available artifacts, or tool behavior. Use descriptive headings and direct resource names. Reserve imperative wording for actual procedure steps and control labels. Avoid visitor-directed persuasion, project-work narration, rhetorical headings, and repeated qualification paragraphs.

Explain terms where they are introduced. Put status and interpretation limits where they affect use: candidate status on specification resources, format support in the layering guide, validation scope beside results, and historical context on archived material. Do not turn aspirations into shipped capability or add normative requirements through explanatory website prose.

Vendor and organization graphs are part of TENSOR's main resource structure. Their guide distinguishes public technical questions, product mappings and checks, local policy and workflow, and investigation records. It also distinguishes the published graph-layer format from the separate candidate Core extension contract. Example layers and authored investigations are identified as illustrative. Pinned definitions, schemas, releases, and review artifacts retain their original content and identity.
