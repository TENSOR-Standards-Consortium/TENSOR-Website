# Illustrative Core records

These files are informative JSON renderings of the proposed logical model in [the Core contract](../01-core-contract.md), proposal 0.1.0. **They are not a normative JSON binding, a complete schema, an executable investigation, or a conformance engine.** Field spellings illustrate the model; adopting them as a wire format requires a separate decision and review.

All actors, organizations, policies, jobs, sessions, evidence statements, approvals, and results are synthetic. `urn:example:` identifiers are placeholders. Tool A and Tool B are illustrative roles; no independent exchange between those tools is established. A separate reference implementation candidate now exists; these original illustrative files retain their original identities and are not its wire-format bundles. A recorded action result is part of the example, not evidence that this package executed an action.

| Files | What to examine |
| --- | --- |
| [Case A definition](case-a.definition.json) and [record](case-a.record.json) | Human-led investigation of an agent job; unknown attachment content later assessed yes; policy and claimed authority kept separate from evidence; planned, attempted, and reported-completed action stages |
| [Case B definition](case-b.definition.json) and [record](case-b.record.json) | Agent preparation and human review of an identity session; unknown egress later assessed yes while token replay stays unknown; a verification action remains planned |
| [Manifest](manifest.json) | File identities and exact-byte SHA-256 digests for this illustrative package |

Each record has 20 entries and illustrates a compact subset of the corresponding narrative. The definitions contain reusable Questions and a Transition; the records contain bound QuestionInstances. Each transition Decision selects one exact Assessment and a `{transitionId, targetInstanceId}` pair. Response Decisions do not pretend to be graph transitions. Both records preserve a superseded Assessment and a later investigation-scope Decision marking the dependent historical Decision's review unresolved. No current-view reconciliation or universal agreement is implied.

The `full` declaration concerns included Core-entry and definition-reference closure. Original source-evidence bytes are absent. EvidenceReference availability and locator-absence reasons disclose this, and Case A additionally illustrates material withheld from the recipient. Synthetic source-inspection claims remain attributed; the package provides no independent evidence of their truth. Self-declared Actor identities and AuthorityAssertions confer no execution permission.

Definition digests cover the exact UTF-8 bytes of the separate definition files, including formatting and final newline. Do not regenerate a definition from parsed JSON and expect the digest to match. The manifest has no self-containing digest; it lists the four example artifacts. These hashes establish byte consistency, not source authenticity.

## Limited authoring check

Run from this directory:

```sh
python3 check_authoring.py
```

The standard-library checker covers JSON parsing, manifest and pinned-definition bytes, unique local identities, the enumerated internal reference fields used here, attribution references, required parameter presence, organization-scope binding, basic transition wiring, unknown reasons, and acyclic same-type revision links. It is deliberately specific to these four examples. It is not a general parser, schema, security validator, assessment evaluator, or implementation of every Core requirement. It does not inspect source evidence, execute actions, exercise import/export, or validate two independent tools.

The C01–C12 scenarios in [the reference-case plan](../04-reference-cases-and-conformance.md) remain specified and **notRun**. Passing this authoring check is only a local artifact-consistency result. Its result must not be reported as Core conformance or independent interoperability.
