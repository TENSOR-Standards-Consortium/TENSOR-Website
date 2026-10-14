# Bringing the full investigation knowledge forward

Status: source reinclusion, sixteen public event profiles and separate item-level AI challenge review; institutional review, field validation and independent exchange remain open. TENSOR remains a public standard for all cyber investigations, usable by humans and agents. Vendor and business policy layers sit above its technical contract.

## Current inventory

The preserved release `0.20260206e` contains 588 questions and 1,554 routes. Working draft `0.20261013b` now contains **all 588 original IDs plus 21 repair questions: 609 questions and 2,131 routes**, with unchanged schema `0.20260206e`.

The historical sequence is 588 → 219 → 184 → 103 → 609. The earlier reductions removed 369, 49 and 88 original IDs respectively. The 103-question revision repaired seven entry paths and their downstream evidence semantics. Their history is preserved; current predicates incorporate the later semantic review. The 506 absent original IDs have returned after explicit source-family analysis and per-ID predicate, route, duplicate and scenario accounting. Original unsupported edges have not been reattached.

The [coverage inventory](../drafts/core/coverage-inventory.json) retains each original prompt, first removal stage, target reference, meaning-change rationale, issues and scenario references. The [restoration review](../drafts/core/reviews/2026-10-12-restoration/README.md) explains the decisions; its analysis records every original route and repaired target route. Reproduce using `python3 scripts/restore_original_questions.py --check` and `python3 scripts/audit_graph_coverage.py --check`.

**No original IDs remain absent. This does not establish semantic equivalence or complete investigative coverage.** The source has 479 distinct exact prompts and 107 repeated-prompt groups involving 216 IDs. No duplicate is automatically consolidated. The 82 prior repairs are broader parameterized questions; the 506 restored questions have explicitly revised technical predicates. Unsupported intent, policy, business-loss and closure assertions were removed or bounded, with changed meaning recorded. Institutional approval remains open. The current [separate AI semantic review](../drafts/core/reviews/2026-10-13-semantic/README.md) records a verdict for every working node, edge and qualified profile definition, without retroactively changing the earlier author ledger.

## Challenge review and remaining coverage

A separate routing reviewer audited all 609 cards and 1,554 routes. A separate evidence reviewer authored realistic normalized investigations in all seven domains without using generated fixtures. The [review findings and receipts](../drafts/core/reviews/2026-10-12-independent-review/README.md) distinguish these agent checks from external approval. Fixed-facet topic jumps have been replaced by explicit context-preserving adapters to general questions; optional negatives remain separate, full dependency identities/directions are tested, and evidence conflicts, clocks and retained contexts fail closed.

The returned IDs do not provide every cyber event profile. The current domain bindings remain specific: principal/action, host/process, endpoint communication, cloud resource/operation (base control plane), message/mailbox, application/request, and file/system presence. The sixteen separately versioned profiles now supply state-only host, network configuration, cloud data-plane access, message-free mailbox rule, background application and file deletion/lineage contexts. These additional definitions do not prove every cyber event is covered; each applicability limitation remains explicit. Do not fill absent subject fields with invented identifiers to make an unsupported event pass.

## Next review sequence

1. **Independent domain review.** Review seven domain batches against the ledger, beginning with the original intent/confidence, baseline, independent-source, dependency, temporal and additional-impact questions. Challenge source/target meaning and evidence criteria. Record reviewer, date, disagreement and any capability that needs a public domain profile or a distinct question.
2. **Evidence-backed human and agent walkthroughs.** Exercise identity/cloud privilege activity, endpoint execution, network traffic, email compromise, application requests, file lineage and autonomous-agent/tool misuse with appropriately authorized evidence. Include ordinary activity, false hypotheses, missing logs, contradictions and uncertain sources. The 1,791 authored scenarios are regression evidence, not real-world validation.
3. **Independent implementation and exchange.** Have a separate implementation consume the pinned graph and criteria, preserve subject/time and no/unknown semantics, and exchange records against the separate Core candidate. Report unsupported profile behavior without claiming universal conformance.
4. **Resolve and publish review findings.** Correct demonstrated defects in a new draft, preserve this revision and historical artifacts, and update the per-ID ledger. Consolidation requires explicit many-to-one mappings and stated information loss. A repeated prompt or unchanged ID cannot establish equivalence.
5. **Consider promotion only after review.** Prepare a separately versioned release and new review snapshot through the existing checklist. Keep the frozen institutional package and every published schema/release intact. Adoption, institutional recognition and partnerships require external evidence beyond implementation checks.

## Acceptance for a disposition

Pin original identity, version, digest and routes; name the target definition; state retained and changed meaning and applicability limits; give explicit yes/no/unknown evidence and route rationale; attach scenario results; distinguish author analysis from independent sign-off; and retain disagreement or deferred scope as a public gap.

## Event-profile coverage added after the seven-domain challenge

Sixteen [public event profiles](../drafts/core/event-profiles/README.md), version `0.1.0-draft.2`, now provide explicit subject bindings and profile-qualified definitions for the event contexts previously recorded as gaps. All seven domains are represented, with 144 declared route scenarios and counterexample tests. The working graph and evidence criteria now include the subsequent semantic repairs; the dated per-ID ledger is still the unprofiled baseline. The profiles are additive interpretation dependencies, not a retroactive equivalence claim or Core schema change.

Next review focuses on those profile propositions, their real-evidence applicability and faithful independently implemented exchange. New event families, universal coverage, institutional approval and authorization remain unproved. No invitations have been sent.
