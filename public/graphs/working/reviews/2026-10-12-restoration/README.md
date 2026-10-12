# Original question analysis and draft restoration

Working content revision **0.20261012a**, unchanged schema **0.20260206e**. The active draft contains all **588 original IDs** and the **21 repair questions**: **609 questions and 1,554 routes**. The published graphs, schemas, investigation-record Core candidate and frozen institutional package `review/2026-10-11.1` are unchanged.

## Analysis and editorial decisions

[analysis.json](analysis.json) records every original prompt, domain, stage, evidence facet, assessment family, repeated-prompt peers, source routes, identified defects, revised predicate, target routes and scenario references. The source is pinned to SHA-256 `dfc3f1a965c01b6f7ade253e426e69abcbad688fab20d9d00065d71c777c010c`. The three `prior-*` files preserve the exact previous graph, criteria and cases; their digests are checked by the restoration builder.

The source contains **479 distinct exact prompt strings** and **107 repeated-prompt groups involving 216 IDs**. Repeated wording is recorded, not accepted as equivalent or automatically consolidated. All IDs remain available. The 82 previously retained original IDs keep their evidence repairs; their broader parameterized meanings and source facets are recorded explicitly. The other 506 return with revised evidence predicates. All 21 repair questions remain intact.

The review uses the source's explicit prompt families, then accounts for each ID's distinct domain, facet, stage, original transitions and target definition. It does not infer meaning from a numeric ID or a topology score. Repairs replace undefined confidence, automatic adversarial intent, broad business-risk verdicts and implied investigation closure with bounded technical propositions. These are **author editorial dispositions**, not independent sign-off or proof of 588 distinct or equivalent capabilities. Some original business/intent claims deliberately remain outside the technical assessment; policy and business layers must supply their own accountable interpretation.

## Routes and evidence

The seven repaired entry paths retain their predicates and transitions. Supplementary paths advance one stage within their domain. A target question is assessed independently using its own explicit facet and evidence; a positive predecessor never supplies a target answer. Negative/unknown detection, validation, hypothesis or scope stops at qualified retention. Relation, technical-source and effect assessments preserve all three answers through the same continuation. A terminal retains assessed and open questions, not a closure decision.

There are **104 explicit entry IDs**: the original seven and 97 supplementary resumption roots. Some roots begin after detection. The evaluator rechecks matching records, event validation, supported hypothesis and bounded scope as applicable; listing a root never waives those prerequisites. Additional nodes can be selected directly for analysis, with the same prerequisites. A missing prerequisite produces unknown.

Evidence criteria distinguish an available-material search from event exclusion; a named operational baseline from trust labels; independent origins from copied telemetry; bounded clock coincidence from shared identifiers or causation; technical source from human identity/intent; technical behavior patterns from adversary objectives; and comparable metric changes from realized loss. Additional effects require a separately validated linked subject and that subject's own bound baseline/observations. Scope never asserts complete affected-population discovery.

Each restored question has positive, negative and unknown evidence cases. Seven domains each have supported, negative and uncertain supplementary route walkthroughs with explicit expected traces and retention records. The original 252 scenarios remain. The combined suite contains **1,791 author-side scenarios**: 252 existing, 1,518 restored-question cases, and 21 supplementary paths. Focus, context, provenance, independent origins, comparators, clock ambiguity, dependency endpoints, alternatives, metrics and dropped terminal answers also have behavioral mutation regressions.

## Reproduce and review

```sh
python3 scripts/restore_original_questions.py --check
python3 scripts/audit_graph_coverage.py --check
python3 scripts/evaluate_entry_scenarios.py
python3 -m unittest discover -s tests/legacy -v
python3 scripts/lint_core_graph_quality.py --graph-path drafts/core/tensor.core.graph.json --entry-path drafts/core/source/entry_nodes.json --output-dir /tmp/tensor-restoration-review
```

The composite assurance profile checks the unchanged seven-path projection and the supplementary profile separately, then pins the complete graph/evidence package. Its projected digest identifies only the in-memory base projection; the public digest identifies all 609 questions. Reports include the analysis and evaluator implementation digests. Structural gates still enforce branch totality, reachability, DAG structure, positive-stage coherence and fan-in limits. Historical numeric diagnostics remain visible under their existing formulas.

## Institutional review boundary

Normalized fixtures contain authored observations and supplied provenance/fact assessments. They are not newly obtained incident evidence, independent interoperability proof, calibrated efficacy or a claim of exhaustive investigation coverage. Published-report-only cases still leave missing victim evidence unresolved. An independent domain review should challenge each proposition, source/target meaning change and route, assess human and agent walkthroughs against actual evidence under appropriate authority, and record disagreement before promotion. The frozen review package remains a separate dated artifact; this new draft is not silently substituted into it. No invitations are sent by this work.
