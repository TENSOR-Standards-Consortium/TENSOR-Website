# Public event profiles · 0.1.0-draft.1

Sixteen explicitly versioned profiles extend the event contexts usable with the 609-question working graph, across all seven domains. The base graph `0.20261012b`, its evidence criteria, schema `0.20260206e`, published releases, separate investigation-record Core candidate and frozen institutional review package remain unchanged. These are **author-tested public drafts**, not institutionally approved profiles or a universal coverage claim. No invitations have been sent.

## Contract

A profile is a required interpretation dependency above the graph. Its public definition specifies the domain, event kind, exact subject fields, proposition, allowed evidence facets, required assessed facts, evidence requirements and limits. The graph supplies route topology; the profile supplies explicitly scoped question meanings. A question such as `urn:tensor:event-profile:email-mailbox-rule:0.1.0-draft.1:Q5` is a **distinct definition** referencing graph location Q5. It does not redefine the base Q5 message-delivery question or imply equivalent meaning. IDs, profile/version and source pins must survive a handoff. Unsupported profiles remain unresolved; do not flatten them into base questions.

`catalog.json` pins the unchanged graph, criteria and authoring/evaluation inputs. `definitions.json` publishes every applicable profile-qualified question, including its predicate, bindings and required interpretation dependency. Generic domain questions receive explicit scoped predicates; restored nonterminal questions retain their fixed facet and are available only for compatible declared facets. Profile-qualified retention endpoints explicitly retain the source evidence focus and open questions even when the underlying graph endpoint had another historical facet. No schema or graph file is rewritten. The existing base evaluator retains its original contract; `scripts/event_profiles.py` is the separate profile evaluator. This is not a new Core JSON binding or a claim of Core conformance.

A case explicitly selects `eventProfile` and `profileVersion`. Records declare the same identity/version, complete subjects, event time, assessed `event.kind`, cited provenance/interpretation and the profile's required facts. Assessed facts need a method and evidence references. Missing profile, unknown version, incompatible event kind or incomplete subject context cannot produce a supported downstream answer. Multiple matching observations require an explicit `selectedRecordId`; list order is not an assessment. Independently originating material retains its own origin and event discriminator.

Every hypothesis, scope, relation, technical-source/effect assessment and retained row keeps exact profile/version, subjects, interval and hypothesis. Relation targets declare their **own** domain/profile/version and full subjects, including when two different profiles belong to one domain. Scope identity includes the declared profile and every subject field; arbitrary display labels cannot replace identity. Separate source answers, prerequisites, unknowns, evidence references and limitations survive generic continuations and qualified endings. A terminal ends a route, not an investigation. Profile fixtures are supplied assessed claims, not log parsers or evidence-authentication tools.

## New supported contexts

| Domain | Profiles | Distinction retained |
|---|---|---|
| Identity | Credential state; workload identity binding | State/binding is separate from action, credential ownership, authorization and human intent. |
| Host | Host state | No fabricated process ID. A snapshot establishes observed state, not a historical change. |
| Network | Network configuration; sensor collection state | No fabricated communication ID. Configuration is not packet traversal; sensor health is not comprehensive logging. |
| Cloud | Data-plane access; resource state | Data-plane outcome is distinct from control-plane permission; a state snapshot needs no operation ID. |
| Email | Mailbox rule operation; mailbox access; collaboration artifact | No fabricated message ID. Rule creation, sharing and access do not prove message delivery or recipient reading. |
| Application | Background state; session state; autonomous agent action | No fabricated request ID. A queued/requested action is separate from completed execution and authority. |
| File | Deletion; historical lineage; metadata with unavailable content | A missing listing is not deletion; unlink is not secure erasure; lineage is not byte equality. Unavailable content cannot support payload/content facts. |

## Evidence outcomes and limitations

- **Yes** supports only the declared technical proposition in its exact context. A matching event remains separate from its provenance, classification and effects.
- **No** contradicts that proposition or records a completed search with no matching record in examined material. A failed operation refutes a success hypothesis while retaining the attempt. Optional comparator/additional-entity/dependency negatives do not terminate other supported assessments.
- **Unknown** retains missing/unavailable/unassessed evidence, unsupported profiles, contradictory witnesses, unresolved context, incomparable metrics or clock uncertainty. Unavailable file content remains unknown for content-derived hypotheses even if a supplied record claims an assessed hash or payload fact.

State observations and manifests do not automatically establish historical transition or absence. Exclusion requires a separate profile/event-kind-specific full-interval logging, collection, retention, clock, search and integrity assessment with cited basis. A source clock bound crossing the interval keeps event membership unknown, including timestamps just outside the window whose uncertainty overlaps it; temporal relations also retain both endpoint clock bounds. Correlation is not causation; technical-source attribution is not human identity. Metric changes require the named comparable metric, units, own-subject baseline and ordered observation times; possible access is not realized harm.

All profile names and subject identifiers are examples; no vendor-specific log format or service is required. Profiles do not grant permission, define business policy or assess malicious intent. Further event families can be proposed with explicit definitions and counterexamples. Institutional domain review, authorized real-evidence walkthroughs, independently implemented profile handling and loss-aware exchange remain open. The dated restoration ledger/review describes the narrower unprofiled graph; these profiles add distinct definitions rather than retroactively changing that history.

## Scenario and counterexample evidence

`scenarios.source.json` contains 16 plausible investigations with fictitious identifiers. Each has a specific technical discriminator and metric. `scenarios.json` contains **144 declared route scenarios**: supported, refuted, unresolved hypothesis, unavailable evidence, bounded absence, coverage gap, independent fallback, unchanged metric and incomparable metric for every profile. Expected outcomes are declared separately from evaluator results. The scenario artifact shares full evidence fixtures and explicit bounded edits instead of duplicating records; `expand_scenarios` reconstructs each case exactly, including its independently declared trace and retained assessments. `validation.json` records observed traces, exact artifact pins and preserved-artifact digests.

The additional unittest suite challenges subject/time/version drift, wrong event kinds, rejected provenance, copied/conflicting witnesses, missing required facts, attempted versus successful operations, unsupported historical inference, unavailable content, scope conflicts, same-domain cross-profile relations, clock bounds, directional dependency evidence and qualified retention. These tests are authored implementation checks, not a second institutional review.

```sh
python3 scripts/build_event_profiles.py --check
python3 scripts/evaluate_event_profiles.py --output /tmp/tensor-event-profile-evaluation.json
python3 -m unittest discover -s tests/legacy -v
python3 scripts/restore_original_questions.py --check
python3 scripts/audit_graph_coverage.py --check
python3 scripts/validate_release_contract.py
python3 review/2026-10-11.1/verify-snapshot.py
python3 scripts/verify_review_bundle.py
```

Machine-readable artifacts: [catalog](catalog.json), [definitions](definitions.json), [scenario evidence](scenarios.json), [validation receipt](validation.json). The website reuses the graph atlas, 3D nebula, timeline, evidence inspector and shared design components to follow these scoped investigations; the complete base and published graphs remain separately accessible.
