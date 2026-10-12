# Shared website design

Every route uses `BaseLayout.astro`, which owns the document, privacy setting, header, footer, global styles, and `PageIntro.astro` title. The home page has a dedicated hero; interactive workspace introductions use PageIntro's workspace composition.

`styles/tokens.css` owns the TENSOR palette, typography, semantic outcome colors, radii, and panel shadow. `styles/components.css` owns buttons, keyboard focus, badges, and panel surfaces. Document pages use `ContentCard.astro`; React workspaces use `WorkspaceUI.jsx` for Panel and Badge. Investigation Lab and graph workspaces use the same button classes and panel surface. Workspace CSS owns density, layout, scrolling, and domain-specific interaction rather than a second theme.

The working graph at `/graphs/` uses a complete deterministic domain/stage atlas by default and a complete text alternative. The 103-question draft and 588-question published catalog remain distinct identities. Legacy Studio remains at `/studio/`; published question links pin both graph version and node ID.

Investigation Lab's Recorded path uses the same `GraphCanvas.jsx`. Nodes represent individual QuestionInstance entries. Only explicit Decision.selections produce edges; each edge labels its selected assessment outcome. Missing or ambiguous endpoints are disclosed rather than invented. Repeated question definitions remain separate instances. The replay exposes prefixes in original file order, which does not assert causal or event-time ordering. Earlier assessments remain inspectable after a revision. The complete import and export are unchanged by visualization.

Canvas rendering is limited to 300 question instances per view; the paginated text list remains complete. Private bundles, selections, and replay positions are neither uploaded nor written to URLs, storage, or telemetry. The public working definition selection may appear in a shareable URL. Heavy Cytoscape code loads dynamically and is destroyed on unmount; renderer failure retains the text controls.

Verify all changes with `npm run validate`, then exercise desktop and mobile graph selection, replay, local imports, legacy deep links, keyboard controls, and empty/failure states in a browser. Build checks enforce identical primary navigation and footer links, one header/main/footer/title, CSP, hosting headers, and canonical URLs across every generated page.

## Investigation atlas

The public graph workspace uses the shared shell, buttons, badges, focus treatment and typography. Canvas surface tokens (`--bg-canvas`, `--bg-canvas-panel`, `--line-canvas`, `--text-canvas-muted`) live in the central token file. Domain encodings are labeled directly; selection is amber and outcomes retain the shared semantic colors and names.

`GraphAtlasCanvas` owns the public definition camera and renders all source nodes. `graphAtlas.mjs` owns deterministic domain/stage placement and shareable state. Wide and portrait layouts organize the same definitions; coordinates never assert causality or a recorded investigation path. The existing `GraphCanvas` continues to render actual Investigation Lab instances/selections. Source switching, question search, route inspector, zoom, Fit all, Expand and optional overview preserve the complete graph. All source questions and routes also have server-rendered text alternatives.

## Guided investigations and optional 3D

The atlas is the main public graph interface. Explore and Follow an investigation share the source selector, question inspector, renderer controls and outcome encodings. Historical Studio import and overlay tools remain under Reference tools; published catalog links and released artifacts are unchanged.

`guidedInvestigations.mjs` contains authored illustrative scenarios pinned to the exact working graph and evidence-criteria digests. Each step retains its evidence basis, assessment, limitations and outcome. Timeline order is presentation order. These guides are neither real incident evidence nor Core exchange bundles. Only declared, outcome-matching routes connect completed steps; available next options are not findings. Whole graph highlights the visited path; Path + next options reveals the prefix and every outgoing target of the active question. The existing Lab still handles portable records and private imports.

Three.js is loaded only when 3D is requested. One scene uses instanced nodes and arrows, batched route segments, and DOM labels/controls. X follows stage/slot, Y organizes positions within domain lanes, and Z separates ordered domain tiers; depth has no physical, causal, confidence or severity meaning. No force simulation or automatic rotation changes definitions. Drag or keyboard arrows orbit; zoom, Reset view, Focus path, question search and the inspector provide alternatives. Rendering happens only when the scene changes, DPR is capped at 1.5, and scene resources are disposed on source/renderer changes. WebGL failure retains the timeline and offers the 2D atlas; full server-rendered graph text remains below.

Playback starts only on request, advances at the chosen reading interval, pauses on inspection, source/mode changes and hidden tabs, and ends at the final step. Reduced motion removes camera animation and entry transitions. Public renderer, guide, bounded step and context may be shared in URLs; private Lab contents remain excluded. Mobile keeps a compact current-evidence and playback bar with the graph, with the full timeline below.
