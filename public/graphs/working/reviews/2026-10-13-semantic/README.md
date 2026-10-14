# Working graph semantic review · 2026-10-13

Working graph **0.20261013b**: **609 questions, 2,131 routes, 16 public event profiles and 567 qualified definitions**. Schema 0.20260206e, published releases, the Core binding/runtime and frozen review package are preserved.

This package records a separate AI review of every item, independently authored fictional investigations, author repairs and repeated review of the exact repaired candidate. **It is not institutional approval, authenticated incident evidence, a second implementation or a proof of universal coverage.** No invitations were sent.

## Review method

Seven reviewers separately examined their complete domain slice: each question's proposition, full identities and time bounds, evidence/negative/unknown criteria, every outgoing route, each applicable qualified definition and its public-versus-overlay boundary. A separate routing reviewer challenged every added lead and shared context handling. Implementation writers were separate from those reviewers. Baseline findings remained recorded while repaired snapshots were rechecked; acceptance of an earlier snapshot never counted as acceptance of later bytes.

The baseline is Framework commit `e6ced17aeaa1cf1d8be31ba1fbd24bf96d0890e0`. Baseline item reports are in `baseline/`; final individual verdicts are in `items/`; independently specified expected/observed results are in `challenges/`. The final [receipt](review.json) pins current source artifacts, evaluators, tests, each ledger and preserved historical bytes. [The verifier](../../../../scripts/verify_semantic_review.py) checks exact coverage and fails if current definitions or reviewed inputs drift. Item identifiers are technical references, not intended interface labels.

## Repaired meaning

- Known events survive rejected or undecidable later hypotheses and scope. Independent factual questions use their own accepted bounded evidence; they do not require an unrelated hypothesis to be true.
- Selection identifies exactly one record; source list order cannot choose it. Primary and independent classifier variants keep their actual witness kind. An independent witness needs distinct origins and identities compared with every primary observation.
- Every record uses its complete composite identity and whole clock uncertainty bound. Missing identity, uncertain overlap or unavailable searches cannot produce bounded absence.
- Corroboration names its discriminator and namespace or mapping, rather than assuming local event IDs have shared meaning. Fixed evidence facets cannot be silently substituted.
- Scope retains full identities and evidence-backed inclusions, exclusions and unknowns. Dependencies name the exact relation and direction. Target relationships retain their own time bounds; comparable metric baselines may precede the observed event in a separately declared interval.
- Profile draft.2 separates rule/deletion operations by operationId, declares required fact types and metadata/content dependencies, and keeps state observations distinct from historical changes or performed actions. Criteria may require a specific evidence dependency; reported metadata cannot establish a content-basis claim.
- Terminals retain actual answers, exact supplied hypothesis meaning and actual evidence focuses, including open questions. A historical target facet cannot relabel an incoming investigation. Every assessed focus needs its own applicable retained assessment; a route endpoint never closes the investigation.
- Multiple routes per outcome remain legal. Early evidence can motivate cross-domain discovery before a hypothesis verdict. Every target declares its exact question/profile/version, complete subjects, interval and cited discovery basis. The source answer and context remain separate, including precisely enumerated missing context on an unknown handoff. Readiness never supplies a target answer or authorization.

## Public foundation and overlays

Public predicates assess investigative observations, bounded hypotheses, scope, relationships, technical sources, measured technical effects and retention. Observed agent/tool/API activity may be evidence; the public graph does not select products, issue commands, fetch logs, execute response actions, grant permissions, interpret company approval rules or determine business loss. Those functions belong in independently identified vendor and organization layers above the public foundation. Existing composed examples demonstrate those layers separately and retain their exact Core artifacts.

## Evidence and limitations

The authored regression package includes 1,791 base/restored scenarios and 144 profile scenarios. Separate reviewers additionally authored domain and routing counterexamples with explicit expectations. Tests use supplied normalized facts and assessments: passing does not establish honest provenance, real event truth or forensic tool correctness. Explicit fixture assumptions (for example, a zero-second clock bound in an authored example) are test inputs; import paths never invent those assumptions for real evidence.

All 588 original IDs and 21 repair questions remain. Repeated prompts and semantic aliases remain visible maintenance constraints; 609 identifiers are not 609 proven distinct capabilities. No many-to-one consolidation or equivalence claim is approved. Individual ledger verdicts mean accepted within the documented draft evidence contract, not unconditional truth or independent institutional sign-off.

Method references: [NIST SP 800-86](https://csrc.nist.gov/pubs/sp/800/86/final) for collection/examination/analysis/reporting distinctions; [NIST SP 800-61r3](https://csrc.nist.gov/pubs/sp/800/61/r3/final) for organizational incident-response context; [CASE design](https://caseontology.org/resources/case_design_document.html) for structured investigative objects and provenance. These references do not certify or endorse TENSOR.

## Reproduce

Use Node24 and Python3.11 or later in a full Framework checkout:

```sh
npm ci
npm run check
python3 -m unittest discover -s tests/legacy -v
python3 scripts/verify_semantic_review.py
python3 scripts/restore_original_questions.py --check
python3 scripts/build_event_profiles.py --check
python3 scripts/audit_graph_coverage.py --check
python3 scripts/evaluate_entry_scenarios.py
python3 scripts/lint_core_graph_quality.py --graph-path drafts/core/tensor.core.graph.json --entry-path drafts/core/source/entry_nodes.json --output-dir /tmp/tensor-semantic-quality
python3 scripts/validate_release_contract.py
python3 review/2026-10-11.1/verify-snapshot.py
python3 scripts/verify_review_bundle.py
```

CI repeats preservation, source reproduction, graph/evidence checks and item-ledger verification. Future changes need a new review of affected meanings and routes; updating a digest alone is not semantic review. External domain reviewers, authorized field walkthroughs, loss-aware independent exchange and institutional governance remain subsequent evaluation work.
