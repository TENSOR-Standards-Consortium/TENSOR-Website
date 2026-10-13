# Working graph routing repair

The draft `0.20261013a` retains all 609 questions and their evidence predicates. It contains 1,953 routes: 1,554 retained continuations and 399 added investigative options, including 378 cross-domain routes. Several eligible routes can be selected for the same answer. This is an author-side implementation and challenge suite, not external institutional approval.

The previous graph prohibited a second route for any outcome, removed all cross-domain routes, and used answer-independent continuations at 286 questions. The new authoring rules allow explicit multiple selections, domain pivots and revisits. Node identifiers and stage labels do not determine chronology. Optional baseline, scope, relationship, source and effect questions may still converge on a relevant follow-up while retaining their distinct answers; convergence is no longer the only permitted shape.

## Evidence and selection

- A supported source answer can open several separate investigative questions. It supplies no target answer.
- A negative search in one source may lead to an independent search as well as a bounded exclusion review. An unknown may retain an unresolved handoff while other leads remain open.
- Cross-domain options at relationship questions require independent discovery evidence, target-specific subjects, an explicit interval and discovery rationale. A `no` or `unknown` about the source relationship does not invent those inputs.
- Public question predicates remain separate from vendor collection methods and company policy. Each target keeps its own definition, context, author and evidence basis.
- `tensor:investigativeLead` is optional authoring metadata. The unchanged Core interpreter evaluates outcome guards and explicit selections; it does not authenticate discovery evidence or implement this additional profile. The offline profile evaluator demonstrates readiness checks.
- Cycles describe reusable knowledge. A new instance records a revisit. Playback follows retained selections and never recursively executes all available routes.

Seven independently specified SOC chains exercise source domains Identity, Email, File, Host, Application, Cloud and Network, each with positive, negative and unknown source outcomes and two independently bound target domains. Missing target subjects, time bounds, discovery references or rationale leave a route unready. Additional mutation tests reject unreviewed endpoint/guard/context changes, duplicate identities, dangling references, missing outcome coverage and outgoing terminal routes. The existing predicate, event-profile and continuation scenarios remain in use, explicitly scoped to their retained paths.

The three interactive examples now use authored route lists and explicit recorded selections. They demonstrate parallel yes, no and unknown routes, independent evidence, policy decisions, unselected alternatives, and a handoff that retains earlier assessments. Timeline order creates no transition. The attachment case keeps the two routes selected under its original unknown assessment after later evidence revises content to yes; the old decision is historical, not silently reinterpreted as a current decision.

## Preservation and provenance

`prior-draft.graph.json` captures the exact previous graph. The prior criteria, scenario suite and implementation remain available at commit `986841b8d977a80a532a297f36b2aad49afe2cba`, verified against the historical review input pins; the large scenario archive is not duplicated. Historical reviews retain their original digests and scope. `review.json` pins the active draft. All schema files, the candidate Core binding/runtime, published releases, released reports and the frozen institutional review package remain byte-for-byte unchanged.

This changes working-draft behavior. A consumer that assumes one target per answer, increasing question IDs or a DAG must adapt. No new release or latest pointer is published. The old institutional package is still a historical snapshot; reviewers of this repair must use the current artifacts and this routing note together. No invitations are sent.

Regenerate with `python3 scripts/restore_original_questions.py`, `python3 scripts/audit_graph_coverage.py`, and `python3 scripts/build_event_profiles.py`. Add `--check` to verify deterministic artifacts. Run the Core and legacy test suites and the draft graph linter. Numeric topology proxies remain diagnostics; they do not prove investigative effectiveness.
