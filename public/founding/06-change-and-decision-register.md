# Changes from Existing TENSOR and Review Decisions

Proposal revision 0.1.0, October 10, 2026. This register distinguishes accepted project direction from proposed technical decisions. It is informative and does not amend existing releases.

## Agreed founding direction

The project owner has established that TENSOR is a public standard for all cyber investigations, usable by humans and agents, with vendor and business layers above its shared investigative layer. AI security teams are the first adoption audience. Institutional recognition, partnerships and published references are the twelve-month ambition. The core purpose is retained while structure, terminology and the website may change.

No individual has been appointed to a new governance role through this document. No membership, license, patent covenant, affiliation or external endorsement is created by drafting the package.

## Proposed decisions in this package

| Review ID | Proposed decision | Reason and review focus |
| --- | --- | --- |
| D01 | Define both reusable investigation definitions and investigation records | The present graph does not carry a particular case's evidence or decision history |
| D02 | Add a distinct QuestionInstance | Repeated questions need explicit subject, time and parameter context |
| D03 | Keep yes, no and unknown outcomes; separate applicability and unknown reason | Absence of evidence and irrelevance must not become false negative findings |
| D04 | Preserve immutable entries and competing revisions | Human and agent disagreement must remain inspectable |
| D05 | Use detached exact-byte definition digests initially | Version names alone cannot identify the artifact used; canonical serialization remains a later decision |
| D06 | Permit cycles with explicit instances and recorded decisions | A general investigation may revisit a question; this does not promise termination |
| D07 | Scope initial capability claims to producers, readers, exchangers and transition interpreters | Tool execution and authorization require separate local controls |
| D08 | Keep public domain profiles within the TENSOR ecosystem | Common investigative knowledge should not require proprietary vendor packs |
| D09 | Require explicit policy, authority and extension dependency status | Vendor and business layers may affect outcomes but cannot silently redefine Core |
| D10 | Defer a normative wire binding until a reuse and mapping review | CASE/UCO and adjacent standards have substantive overlapping capabilities |

These decisions are specific enough to challenge and prototype. They are not consensus decisions. Candidate `0.1.0-draft.1` now implements a trial JSON binding for review; D10 remains unresolved for a stable release. See the [candidate design decision](https://github.com/TENSOR-Standards-Consortium/TENSOR-Framework/blob/codex/core-investigation-contract/docs/adr-001-candidate-json-binding.md).

## Compatibility and migration boundary

The audited public framework head was 221e7d0542df6d51f882f1ab26689084dd976ea9. The published release catalog identified graph/schema 0.20260206e, while the current draft graph used 0.20260212e. The proposal revision number 0.1.0 labels this founding package; it does not replace those release versions.

The existing graph's questions and explicit yes/no/unknown edges are useful inputs. The following proposed changes require migration work:

- Scope a legacy Q-number by its source definition version and artifact digest. Do not assume Q12 means the same thing in every historical graph or demonstration.
- Evaluate each question's proposition, criteria and evidence requirements. Generic text must not be upgraded into precise semantics automatically.
- Preserve original question IDs in a migration map. New global identifiers need an explicit, reviewable relationship to legacy identifiers.
- Record where existing DAG restrictions differ from the proposed cycle-permitting model.
- Move domain-specific enumerations into declared public profiles where appropriate.
- Declare legacy metadata and extensions; do not silently reinterpret punctuation or namespaces.
- Mark all data that cannot be reconstructed. A graph cannot supply historical actors, observations, policy versions, question instances or decisions.
- Create a new artifact and version for every migration, with source identity, mapping revision, losses and validation results.

The implementation work adds a legacy inventory tool that records source identity, version, digest, original items, and proposed scoped identifiers for human review. This is not an automatic migration and creates no investigation records. Existing releases remain authoritative for their existing contracts until an approved transition says otherwise. See the [migration boundary](https://github.com/TENSOR-Standards-Consortium/TENSOR-Framework/blob/codex/core-investigation-contract/docs/legacy-migration.md).

## Decisions required before a normative first release

1. Choose whether the record binding reuses CASE/UCO directly, profiles it, or uses a separately justified mapping. Publish concrete examples and information-loss analysis.
2. Specify a normative wire binding, reference syntax and equality rules for every Core entry, including optional unknown metadata.
3. Establish namespace ownership, collision handling and the publication location for definitions and profile registries.
4. Decide the minimum supported profile set and version negotiation behavior.
5. Specify partial exchange, redaction and dependency-review status encoding. Test an intentionally withheld entry without misleading the reader.
6. Adopt contribution, content, code, trademark and patent policies with the appropriate owners. Existing project licensing is evidence of current terms, not consent to new obligations.
7. Appoint a bootstrap editor and reviewers, then meet the independent-review gate before claiming a stable Core release.
8. Confirm maintainer capacity, evaluation partners and resources before committing to a calendar.

Each unresolved item has a concrete review artifact: mapping report, binding specification, registry policy, compatibility matrix, exchange fixtures, adopted governance policies, named role record, or resourced work plan.

## Evidence and review handoff

The baseline for this candidate work is framework commit `221e7d0542df6d51f882f1ab26689084dd976ea9`. Its stable manifest and versioned artifacts are retained in the repository. Local audit reports from the original drafting workspace are not dependencies of this portable package.

Reproduce candidate checks and legacy preservation checks using the repository README. Consult the [reviewer packet](https://github.com/TENSOR-Standards-Consortium/TENSOR-Framework/blob/codex/core-investigation-contract/docs/reviewer-packet.md) and [release evidence gates](https://github.com/TENSOR-Standards-Consortium/TENSOR-Framework/blob/codex/core-investigation-contract/docs/release-checklist.md). Source checks do not establish production deployment, independent implementation, or institutional adoption. Report each evidence layer separately.
