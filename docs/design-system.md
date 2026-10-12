# Shared website design

Every route uses `BaseLayout.astro`, which owns the document, privacy setting, header, footer, global styles, and `PageIntro.astro` title. The home page has a dedicated hero; interactive workspace introductions use PageIntro's workspace composition.

`styles/tokens.css` owns the TENSOR palette, typography, semantic outcome colors, radii, and panel shadow. `styles/components.css` owns buttons, keyboard focus, badges, and panel surfaces. Document pages use `ContentCard.astro`; React workspaces use `WorkspaceUI.jsx` for Panel and Badge. Investigation Lab and both graph workspaces use the same button classes and panel surface. Workspace CSS owns density, layout, scrolling, and domain-specific interaction rather than a second theme.

The working graph at `/graphs/` uses a deterministic directed layout with a focused neighborhood by default and a complete text alternative. The 103-question draft and 588-question published catalog remain distinct identities. Legacy Studio remains at `/studio/`; published question links pin both graph version and node ID.

Investigation Lab's Recorded path uses the same `GraphCanvas.jsx`. Nodes represent individual QuestionInstance entries. Only explicit Decision.selections produce edges; each edge labels its selected assessment outcome. Missing or ambiguous endpoints are disclosed rather than invented. Repeated question definitions remain separate instances. The replay exposes prefixes in original file order, which does not assert causal or event-time ordering. Earlier assessments remain inspectable after a revision. The complete import and export are unchanged by visualization.

Canvas rendering is limited to 300 question instances per view; the paginated text list remains complete. Private bundles, selections, and replay positions are neither uploaded nor written to URLs, storage, or telemetry. The public working definition selection may appear in a shareable URL. Heavy Cytoscape code loads dynamically and is destroyed on unmount; renderer failure retains the text controls.

Verify all changes with `npm run validate`, then exercise desktop and mobile graph selection, replay, local imports, legacy deep links, keyboard controls, and empty/failure states in a browser. Build checks enforce identical primary navigation and footer links, one header/main/footer/title, CSP, hosting headers, and canonical URLs across every generated page.

## Investigation atlas

The public graph workspace uses the shared shell, buttons, badges, focus treatment and typography. Canvas surface tokens (`--bg-canvas`, `--bg-canvas-panel`, `--line-canvas`, `--text-canvas-muted`) live in the central token file. Domain encodings are labeled directly; selection is amber and outcomes retain the shared semantic colors and names.

`GraphAtlasCanvas` owns the public definition camera and renders all source nodes. `graphAtlas.mjs` owns deterministic domain/stage placement and shareable state. Wide and portrait layouts organize the same definitions; coordinates never assert causality or a recorded investigation path. The existing `GraphCanvas` continues to render actual Investigation Lab instances/selections. Source switching, question search, route inspector, zoom, Fit all, Expand and optional overview preserve the complete graph. All source questions and routes also have server-rendered text alternatives.
