# Whole-site design review, October 12, 2026

## Brief and authority

The steward rejected separate colors/templates and requested one central set of components and a common design language. Preserve the complete graph, optional cinematic 3D nebula, investigation timelines, private Lab workflows and all published artifacts. No invitations. Baseline website main: `35f2a7b03ef187b98c5a2dd8c4c171a82981f0ea`; baseline validation passed 76 tests and the 626-page build gate. Work used a clean managed checkout; unrelated changes in the original checkout were preserved.

The previous `docs/design-system.md` described a shared foundation, but graph CSS overrode the body/header and included its own colors; documents inherited a separate gray circuit-background presentation. Those were current implementation choices, not binding approved brand rules. The new system follows the user's explicit cleanup authorization.

## Reference and production

Inspected the installed Art Director 0.6.0 original `assets/quality-reference.png`, plus actual before-Home/Core/Graph/Lab renders. Transfer integrated subject graphics, typography, atmosphere and section rhythm; do not copy the reference's marketing imagery or another project's palette. Original TENSOR graph grouping and workflows are retained utility references.

Direction: a public investigation observatory. Midnight surfaces and fine rules frame precise content; amber marks actions and selection; labeled semantic/domain hues remain for investigative meaning. The homepage uses a handcrafted inline SVG relationship map integrated with live typography and the existing case timeline. It is a conceptual illustration, with no invented incident evidence or decorative fake graph nodes. No raster asset was required for this scope. Documents are deliberately quieter than the graph.

Shared tokens feed document chrome, controls, Lab, Atlas, Three.js and historical tools. All document routes use DocumentLayout, shared resource navigation and reading components. No dependency, schema or release change was needed.

## Checkpoint and refinement

An independent artifact-first critic inspected the original target, before-Core/Graph and the first representative Core render. Verdict: accept the shared foundation, with whole-site quality unverified. Biggest weakness: excessive masthead/first-section spacing. Correction: tightened the masthead and metadata-to-heading rhythm, then reopened the corrected Core state alongside the expanded design.

Completion critique inspected Home, Core, Docs, profiles, Lab and a 3D path view at desktop/mobile sizes. Verdict: accept inspected cleanup, no blocking visual or architectural issue. Refinement: the mobile resource rail needed a scroll cue. Added an explicit cue and rechecked the same state. The full 609-node nebula was also reopened in its whole-graph composition. Agent judgments are not user approval. Still-image critique cannot establish temporal pacing or universal cinematic quality.

## Evidence and limits

Local browser evidence: 48 views across 24 routes at 1440 and 390 pixels; common body/header and landmarks, no horizontal overflow or page errors. All 144 profile walkthroughs and 768 steps passed, retaining qualified definitions, 609 nodes, path views, URL restoration, 588-node source, 3D playback, mobile inspector, JavaScript-off routes and WebGL fallback. The base graph suite exercised all four guides, 3D picking/orbit/reset, actual play/pause and complete text alternatives. Review downloads matched their pinned digest; both Lab examples, assessment/history, export and private local reimport worked. These checks establish their executed scope, not independent semantic approval or accessibility certification.

Additional browser checks verified homepage entry/final state, reduced motion, keyboard Skip to content, catalog/coverage filters, the mobile resource cue, complete 3D composition and metrics PNG download. Inspection exposed a pre-existing export defect: standalone SVG lost its page stylesheet, producing black filled shapes. The export now freezes computed paint on a clone; original DOM and metric data remain unchanged. The corrected PNG was reopened visually. Homepage entry animations and reduced-motion behavior are implementation-level checks; aesthetic motion pacing remains outside the still-image critic's evidence. Deployment and final exact-head validation are recorded in the pull request and CI rather than assumed from this note.
