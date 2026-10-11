# Candidate check coverage and limits

This implementation checks the JSON binding's mechanically decidable rules. `pass` applies to reported checks, not to every statement in the founding contract. Findings remain separated as pass, fail, indeterminate or notRun. The aggregate is fail if any check fails, otherwise indeterminate if any check is indeterminate, otherwise pass. A notRun check stays visible and is not converted to pass.

| Requirements | Automated boundary | Additional evidence still needed |
| --- | --- | --- |
| TC-01–03 | Actor-neutral structure; closed Core fields; declared dependency support | Universal usefulness, public stewardship and absence of undisclosed producer assumptions |
| TC-04 | Distinct entry schemas and typed references | Truthfulness of the producer's classification |
| TC-05–08 | Exact IDs, supplied-version conflicts, exact-byte pins, immutable supplied-history comparison, timestamps and intervals | Unseen history, provenance authenticity and synchronized clocks |
| TC-09–12 | Required definition content, parameter types, evidence-empty rationale, explicit guards/endpoints, valid entry questions; cycles allowed | Natural-language criterion exclusivity, evidence adequacy and domain completeness |
| TC-13–14 | Exact instance/question binding, explicit material parameter binding, attribution closure, unknown and claimed-verification forms | Actor identity verification and real-world subject attribution |
| TC-15–17 | Availability/absence reasons, observation evidence references, typed relationships and retained alternatives | Evidence-byte integrity, truth, collection quality and independent verification |
| TC-18–21 | Applicability/outcome separation, input roles, unknown reasons, zero-input explanations and confidence metadata | Rationale quality, negative-coverage sufficiency and confidence calibration |
| TC-22–26 | Explicit paired transitions, exact selected inputs/guards/pins, policy/authority representation, stage enums and case-disposition shape | Receiver-local authorization, actual action execution, effectiveness and legal authority |
| TC-27–28 | Same-target acyclic supersession; original references retained; review representation and conservative current-view dependency checks | Whether all external reasons for re-review were disclosed; organizational acceptance of reconciliation |
| TC-29–32 | Required unsupported profiles/extensions produce indeterminate; optional unknown metadata retained | Profile implementation, namespace ownership and hidden dependencies |
| TC-33–35 | Typed reference closure, partial omissions, loss declarations, bounded JSON, duplicate member rejection, no runtime fetching or execution | Export completeness against undisclosed source systems; external access controls and privacy decisions |
| TC-36–38 | Named proposal/binding/runtime scope, bounded outcomes, exclusions, fixtures and artifact hashes | Independent implementation pair, ratification, certification and institutional endorsement |

The fixture suite intentionally includes legitimate uncertainty, disagreement, cyclic definitions, opaque extensions and partial records. Adversarial tests exercise identity conflicts, substituted bytes, malformed time, missing and incorrectly typed references, context changes, applicability errors, invalid guards, revision cycles, hidden properties and input budgets. These tests make reproducible claims about this implementation only.

The public JSON schemas and runtime use one schema source. A separate Draft 2020-12 development validator checks structural parity. Semantic constraints such as references, digests, guards and revisions are outside JSON Schema alone. Published JSON schema validation without those checks is not full candidate interpretation.
