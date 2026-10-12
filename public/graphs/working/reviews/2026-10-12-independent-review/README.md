# Seven-domain challenge review

Working revision **0.20261012b**, schema **0.20260206e**: **609 questions, 1,554 routes and 359 explicit entries**. All 588 original IDs and 21 repair questions remain. The seven repaired base paths keep their exact outgoing edges. Published releases, schemas, the investigation-record Core candidate and frozen review package `review/2026-10-11.1` remain byte-for-byte unchanged.

## Review separation and evidence

Two separate AI reviewers challenged baseline commit `22a1be5d6f2b46b16ccc738efef04599c052c082`. The routing reviewer inspected all cards, source dispositions and edges without editing implementation. The evidence reviewer independently authored `tests/legacy/test_independent_investigations.py`, without importing the restoration generator or generated fixtures; that reviewer owned only that test file. The implementation author fixed shared code and artifacts. Both reviewers rechecked the repairs and found further counterexamples before final verification.

This is **independent agent challenge of the implementation**, not independent institutional approval. Supplied normalized observations, fact assessments and provenance assertions remain test inputs, not authenticated production logs. No external reviewer signed off, no interoperability exchange was established, and no invitations were sent. Zero original dispositions are recorded as externally approved.

The initial independently authored suite exposed **63 failing subcases**, while its 84 available domain/kind positive examples and 84 negative predicate examples passed. The final independent suite has **28 methods**, covering additional counterexamples found during repair. Six further route-policy tests check all edges, optional-answer continuation, unchanged base paths, adapter mutations and unreviewed hub capacity. The full legacy suite contains **105 tests**; the original **1,791 generated/base scenarios** remain separate regression evidence.

## Realistic investigation contexts

| Domain | Independently authored investigation | Counterexamples tested |
|---|---|---|
| Identity | Unexpected service-account token exchange | Comparator mismatch; singleton scope; refuted dependency; hypothesis substitution |
| Host | Build runner launches shell from package installer | Rejected provenance; independent witness order; conflicting entity dispositions |
| Network | Unexpected bounded TLS session | Full endpoint discrimination; clock ambiguity; unrelated relation identifiers |
| Cloud | Storage policy update enables anonymous reads | Same tenant with the wrong resource; reversed dependency direction; excluded target |
| Email | Delivered message contains a credential-collection link | Copied/rejected witnesses; competing accepted observations; unavailable evidence |
| Application | Export request returns records beyond requested page | Request/subject drift; missing own-subject metric baseline; retained hypothesis mismatch |
| File | Payroll export present in shared staging directory | Same file on another system; absent dependency-target inclusion; metadata masquerading as identity |

These are plausible authored investigations with fictitious identifiers. They are neither public-incident reproductions nor evidence of real harm, policy violation or actor intent. Positive, negative and unresolved assessments are tested separately. Complete routes run with preserved domain, full subject context, time bounds, source facet and hypothesis definition. Optional dependency no/unknown resumption is exercised in all seven domains.

## Findings and repairs

1. **Unrelated fixed-facet routes.** The baseline had 278 affirmative nonterminal transitions to different fixed facets. The current graph has zero. Same-facet continuations remain; gaps use explicit adapters to existing parameterized general next-stage questions. There are 566 adapter edges across all decisions. Adapters preserve complete context and recheck prerequisites, rather than inheriting a predecessor answer.
2. **Premature optional stops.** Comparator mismatch, unavailable corroboration, no additional entities and no evidenced dependency no longer terminate otherwise supportable work. Their answers remain separate while the next proposition rechecks event validation, hypothesis and scope. Rejected provenance cannot itself test a comparator. Mandatory event/provenance/hypothesis/scope failures still retain unresolved/refuted endings.
3. **Unsupported dependency claims.** Self-identities are insufficient. The evaluator now requires all declared endpoint fields, an assessed shared dependency relation ID, assessed direction on both records and an included target context. A Cloud tenant alone cannot substitute another resource. Excluded targets contradict the proposed bounded inclusion; missing evidence remains unknown.
4. **Composite identity loss.** The same file on another system can be an additional effect subject, with its own baseline and validated link. Scope distinguishes complete contexts, detects overlapping partial-identity conflicts, and ignores undeclared metadata when determining identity. A display label cannot manufacture an extra subject.
5. **Clock and witness handling.** Source clock intervals must lie wholly inside investigation bounds before evaluating temporal coincidence. Rejected exports cannot hide a valid later independent witness; conflicting accepted witnesses remain unknown in either order.
6. **Retention and hypothesis drift.** Every retained row preserves subjects, interval and hypothesis. Unrelated ledgers cannot refute this investigation. Paths reject changes to the complete hypothesis definition, even under the same ID. General handoffs require separate retained hypothesis, mandatory scope, relation, technical-source and effect assessments. A behavior-pattern assessment cannot substitute for technical-source attribution; retain a separate source unknown when its evidence is unavailable. Explicit prerequisite records remain separate from actual visited answers; Q288 no does not become an invalid-scope claim. An unresolved terminal requires an actual retained unresolved or prerequisite-rejection basis.

General evidence questions are deliberate hubs. Thirty-five named nodes have exact reviewed capacities of 9–30, enforced by identity and annotation. Default nonterminal 8, existing named 12 and terminal 24 limits remain for other nodes. This narrowly replaces unrelated-topic load balancing; it does not change historical score formulas. No/unknown semantics, DAG checks, stage progression, deterministic branches and reachability remain blocking.

## Coverage still requiring public event profiles

**All original IDs are present; universal investigative coverage is not established.** The source itself lacks a complete eight-stage chain for every domain/facet pair. General-question adapters repair route continuity for supported event contexts; they do not expand an event's meaning automatically.

Current bounds remain principal/action, host/process, endpoint communication, cloud resource/operation with a control-plane base proposition, message/mailbox delivery, application/request, and file/system presence. Additional public event profiles are still needed for process-free host state, network configuration, cloud data-plane activity, mailbox rules/access without a message, background application state, and file deletion/historical-lineage propositions. These gaps are recorded in every affected source ledger row and the machine-readable review. Do not populate absent subject fields with invented identifiers to claim coverage.

Intent, authorization, business consequence and case closure remain separately accountable interpretations above the technical standard. They are not silently reintroduced as technical yes/no answers. External domain review, authorized-evidence walkthroughs and independent record exchange remain requirements before promotion.

## Reproduce

```sh
python3 scripts/restore_original_questions.py --check
python3 scripts/audit_graph_coverage.py --check
python3 scripts/evaluate_entry_scenarios.py
python3 -m unittest discover -s tests/legacy -v
python3 scripts/lint_core_graph_quality.py --graph-path drafts/core/tensor.core.graph.json --entry-path drafts/core/source/entry_nodes.json --output-dir /tmp/tensor-independent-review
python3 scripts/validate_release_contract.py
python3 review/2026-10-11.1/verify-snapshot.py
python3 scripts/verify_review_bundle.py
```

[review.json](review.json) pins exact graph/evidence/implementation/test inputs, replaced affirmative routes, reviewed hub capacities and event-profile limitations. The prior draft and its inputs remain recoverable at the baseline commit. Current working content is not substituted into the frozen institutional package. Historical topology diagnostics remain visible and are not evidence of investigation effectiveness.
