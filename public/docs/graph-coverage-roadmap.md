# Bringing the full investigation knowledge forward

Status: author review and draft reinclusion complete; independent semantic review pending. TENSOR remains a public standard for all cyber investigations, usable by humans and agents. Vendor and business policy layers sit above its technical contract.

## Current inventory

The preserved release `0.20260206e` contains 588 questions and 1,554 routes. Working draft `0.20261012a` now contains **all 588 original IDs plus 21 repair questions: 609 questions and 1,554 routes**, with unchanged schema `0.20260206e`.

The historical sequence is 588 → 219 → 184 → 103 → 609. The earlier reductions removed 369, 49 and 88 original IDs respectively. The 103-question revision repaired seven entry paths and their downstream evidence semantics. Those repairs are preserved. The 506 absent original IDs have returned after explicit source-family analysis and per-ID predicate, route, duplicate and scenario accounting. Original unsupported edges have not been reattached.

The [coverage inventory](../drafts/core/coverage-inventory.json) retains each original prompt, first removal stage, target reference, meaning-change rationale, issues and scenario references. The [restoration review](../drafts/core/reviews/2026-10-12-restoration/README.md) explains the decisions; its analysis records every original route and repaired target route. Reproduce using `python3 scripts/restore_original_questions.py --check` and `python3 scripts/audit_graph_coverage.py --check`.

**No original IDs remain absent. This does not establish semantic equivalence or complete investigative coverage.** The source has 479 distinct exact prompts and 107 repeated-prompt groups involving 216 IDs. No duplicate is automatically consolidated. The 82 prior repairs are broader parameterized questions; the 506 restored questions have explicitly revised technical predicates. Unsupported intent, policy, business-loss and closure assertions were removed or bounded, with changed meaning recorded. None of the 588 dispositions is independently approved.

## Next review sequence

1. **Independent domain review.** Review seven domain batches against the ledger, beginning with the original intent/confidence, baseline, independent-source, dependency, temporal and additional-impact questions. Challenge source/target meaning and evidence criteria. Record reviewer, date, disagreement and any capability that needs a public domain profile or a distinct question.
2. **Evidence-backed human and agent walkthroughs.** Exercise identity/cloud privilege activity, endpoint execution, network traffic, email compromise, application requests, file lineage and autonomous-agent/tool misuse with appropriately authorized evidence. Include ordinary activity, false hypotheses, missing logs, contradictions and uncertain sources. The 1,791 authored scenarios are regression evidence, not real-world validation.
3. **Independent implementation and exchange.** Have a separate implementation consume the pinned graph and criteria, preserve subject/time and no/unknown semantics, and exchange records against the separate Core candidate. Report unsupported profile behavior without claiming universal conformance.
4. **Resolve and publish review findings.** Correct demonstrated defects in a new draft, preserve this revision and historical artifacts, and update the per-ID ledger. Consolidation requires explicit many-to-one mappings and stated information loss. A repeated prompt or unchanged ID cannot establish equivalence.
5. **Consider promotion only after review.** Prepare a separately versioned release and new review snapshot through the existing checklist. Keep the frozen institutional package and every published schema/release intact. Adoption, institutional recognition and partnerships require external evidence beyond implementation checks.

## Acceptance for a disposition

Pin original identity, version, digest and routes; name the target definition; state retained and changed meaning and applicability limits; give explicit yes/no/unknown evidence and route rationale; attach scenario results; distinguish author analysis from independent sign-off; and retain disagreement or deferred scope as a public gap.
