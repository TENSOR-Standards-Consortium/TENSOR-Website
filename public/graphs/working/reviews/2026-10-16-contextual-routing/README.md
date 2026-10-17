# Contextual routing review, 16 October 2026

This author repair reviews all **602 source/destination pairs previously shared by different answers**. The current public dataset retains **609 questions**, with **1,743 answer routes** and **412 independent discovery options**. It is the same dataset for exploration, implementation and review. No schema or published release is changed.

The [answer-by-answer ledger](review.json) preserves each original predicate, destination and outcome, its disposition and replacement routes. There are now **196 shared destinations**, with no destination shared by all three answers. Shared targets remain only where their investigative meaning permits convergence: independently originating searches, retention of a named gap or rejected prerequisite, an optional baseline comparison before a separate hypothesis test, and retention of an unchanged or changed measured result. The source answer and its evidence must remain distinct in each case. Counts are accounting, not a quality score or convergence quota.

## Investigative meaning

- A refuted technical hypothesis leads to retention of that exact refutation. An unknown hypothesis leads to gap retention. Neither changes the observed event or proves a competing hypothesis.
- A rejected relationship or technical source leads to retention of the bounded negative. It does not imply downstream attribution, measured effect, maliciousness, permission or closure.
- An unknown relationship, source or metric leads to retention of the unresolved assessment and its limitations. Established findings remain established.
- Positive cross-domain routes require a separately bound target proposition and discovery basis. Independent discoveries after **any** answer are published once as `tensor:discoveryOptions`, with `origin: newLead` and no answer guard. They are not three duplicate answer arrows. Discovery options require exact target identity/profile/version, full subjects and interval, and separately cited discovery evidence and rationale.
- A retention endpoint ends a definition path, not the investigation or its parallel leads. Previously orphaned retention questions are explicit resumption entries, requiring their own retained assessment record. No unrelated edge was added to satisfy a connectivity or fan-in target.

## Loops, parallel branches and revisions

A definition can recur in a loop. Every selected return opens a **fresh target QuestionInstance** with explicit origin. A changed subject, time interval, parameter or interpretation profile is a new context. A revision on the same instance retains its earlier assessment, evidence and selected decisions; it does not relabel historical unknown routes as positive. Parallel contexts keep separate answers and open-lead state. A joining assessment cites each participating assessment and declares its own proposition; equal question IDs or timestamps do not merge evidence.

The record binding already represents these distinctions. This repair adds authoring metadata and examples; it does not introduce a scheduler, evidence collector, tool execution engine, company policy or authorization model into the public graph. Vendor interpretation and company policy remain explicit layers above the public questions.

## Evidence and limits

The finite current evidence suite covers **1,791** base/restored cases. The public profile suite covers **16 profiles and 144 variants** across seven domains. The added `parallel-followup` case follows all seven domains and returns to the same identity definition for a different principal and later interval. Its separate cloud negative and file gap remain visible during the other branch. All four reference cases contain **33 timeline frames**.

`tests/legacy/test_contextual_routing.py` independently asserts target roles and allowed convergence families rather than copying expected routes from the builder. Core and website tests challenge fresh return contexts, parallel instances, revisions, historical selections and evidence/context substitution. These are authored fictional evidence and regression checks, not authenticated incident evidence or a claim of universal investigative effectiveness.

The **13 October independent AI review is historical**. Its exact inputs are retained in [baseline/](baseline/) and its receipts are unchanged. `verify_semantic_review.py` verifies those archived pins, not a claim that those reviewers approved this new routing repair. This repair has **external review pending**. It carries no institutional approval.

Reproduce with `python3 scripts/restore_original_questions.py --check`, `python3 scripts/build_event_profiles.py --check`, `python3 scripts/audit_graph_coverage.py --check`, `npm run check`, `python3 -m unittest discover -s tests/legacy -v`, and `python3 scripts/validate_release_contract.py`.
