# TENSOR Core JSON binding 0.1.0-draft.1

**Candidate normative binding for founding proposal 0.1.0. Unratified.** Requirement identifiers refer to the founding Core contract. This document makes implementation choices for review; it does not assert that those choices have been adopted by a standards body or external community. Existing releases retain their existing contracts.

The JSON Schemas in `schemas/` define structural requirements. The following rules additionally define candidate semantics. The reference runtime checks the mechanically decidable subset; [coverage](coverage.md) lists the limits. Terms MUST, MUST NOT, SHOULD, and MAY carry the BCP 14 meanings used by the Core proposal. Schema `$id` values use the implementation's candidate hosting location, `https://tensor-website.pages.dev/core/0.1.0-draft.1/schemas/`. That location is not an adopted permanent identifier policy, institutional endorsement, or proof of a successful deployment. Validators use the supplied local schemas and never fetch those identifiers.

## 1 Transport and trust boundary

A bundle MUST have `format: "tensor-investigation-bundle"`, `bindingVersion: "0.1.0-draft.1"`, one `record`, and `definitions: [{path, content}]`. A definition's `content` is its exact published UTF-8 JSON text represented as a JSON string. Decoding the bundle's string escapes recovers that text. `path` is a relative artifact label; it MUST NOT contain empty, `.` or `..` segments, backslashes, an absolute path or URI scheme. Importers MUST NOT treat it as an instruction to write to disk.

Record and definition objects carry `contractRef: {proposal: "0.1.0", bindingVersion: "0.1.0-draft.1", status: "candidate; unratified"}`. Definition `publicationStatus` is a declared artifact state, not proof of ratification. Candidate examples declare `candidate`.

Input MUST be UTF-8 JSON with unique object member names, finite numbers, Unicode scalar strings, no executable values and no non-JSON object properties. Duplicate names after escape decoding are invalid. A byte reader MUST reject invalid UTF-8, not replace invalid bytes. Limits MUST be enforced before interpretation. Neither URI identifiers nor locators authorize retrieval or execution. This binding has no command language, fetch protocol, evidence store, model runtime, or authorization service.

## 2 Equality and identity

Identifiers MUST be absolute ASCII URIs using the generic syntax in [RFC 3986](https://www.rfc-editor.org/rfc/rfc3986.html) and are compared exactly: no case folding, percent-decoding, Unicode normalization, trailing-slash changes, or network resolution. Percent encodings require two hexadecimal digits. Illegal raw characters, malformed authority syntax and misplaced brackets are invalid; accepted generic syntax does not establish scheme-specific validity or reachability. `urn:example:` identifies synthetic fixture objects only. URI syntax is not ownership verification.

Parsed record value equality ignores object-member ordering and JSON formatting. It preserves array ordering, member names, string code points, types and values. Numbers use finite IEEE 754 binary64 values, with positive and negative zero equal. Decimal quantities needing lexical precision SHOULD use a declared string parameter or profile. This is a defined candidate equality rule, **not a claim to implement RFC 8785**.

Entries with the same ID MUST have equal complete content, including opaque metadata. A new immutable entry needs a new ID. Duplicate entry IDs within one snapshot are invalid even when the copies are equal. Across supplied snapshots, changed content under an existing ID is an identity conflict. Pure transport reformatting does not create a new parsed content value. Assembling a changed snapshot requires a new snapshot ID and declared `sourceSnapshotIds`; those IDs are provenance and do not require recursively embedding old snapshots. A snapshot MUST NOT name itself as a source.

A definition is pinned by `(id, version, sha256)`. The digest is lowercase hexadecimal SHA-256 of the exact UTF-8 bytes; it is detached from the artifact. References also name the supplied `artifact` label. Any changed definition bytes require a new version. Multiple supplied artifacts with the same ID and version and different digests are invalid. Supplied prior records are also checked for conflicting definition ID/version pins, even when none of their entry IDs remain in the new snapshot. A parser MUST NOT reserialize a definition to reconstruct those bytes. Whitespace changes are therefore meaningful to definition identity even though they are not meaningful to record equality.

Question and transition IDs MUST not be reused for changed meaning. The runtime compares supplied versions' propositions, criteria, parameters, evidence requirements and transition endpoints/guards. It cannot inspect unpublished or absent history.

## 3 Objects, metadata and extensions

Core objects are closed: unrecognized Core properties are invalid. Opaque optional content belongs in the optional `metadata` object. This is the only unstructured metadata container; an exchanger MUST preserve its complete JSON values, including unknown keys. Metadata MUST NOT alter Core interpretation.

An `extensions` member is an array of `{namespace, version, requiredForInterpretation, data}`. `namespace` MUST be an absolute URI controlled through an appropriate external ownership mechanism, such as an organization's HTTPS origin or a registered URN namespace. A URI that merely parses does not prove that control. Namespaces MUST be unique within an object's extension list; versions are exact strings. Extensions MUST NOT overwrite Core attributes. `data` remains opaque unless the receiver explicitly implements that extension.

`dependencies` declare `{id, version, kind, requiredForInterpretation}`, where kind is `profile` or `extension`. Duplicate dependency identities and versions are invalid. This baseline reference implementation implements no additional profiles or extensions. An unsupported required dependency or extension produces **indeterminate** meaning for its affected object and dependent interpretation. Optional unknown extensions are retained, never evaluated as false. A host cannot mark a required extension supported merely by recognizing its name.

Core alone remains publicly usable. Required semantics cannot depend on undeclared vendor code, a private prompt, a proprietary score or an implicit business rule. Future profile packages need independent contracts and tests. Adding an adapter does not entitle it to silently rewrite a pinned question.

## 4 Parameters and bounded instances

Definitions contain questions, transitions, designated entry questions and dependencies. Questions declare `URI`, `string`, `number`, `integer`, `boolean`, or `timeContext` parameters with an explicit `required` Boolean. Unknown parameter names are invalid.

An optional parameter declaration `bindsTo` makes contextual equality mechanically explicit: `subject:<bindingName>` refers to that key in `subjectBindings`; `timeContext` refers to the instance time context; `scopeOrganization` refers to the record's organization scope. The corresponding value MUST exist and be equal. An optional `referenceType` identifies a URI parameter that is a Core entry reference; its type MUST be `URI`, and the reference MUST resolve to the stated Core entry type. Other URI parameters name external subjects and do not automatically become Core entry references.

A required unresolved value MUST be encoded as `{status: "unresolved", reason: "..."}`. It blocks an applicable assessment. An unresolved applicability assessment may retain that instance with no outcome. No default is inferred from a parameter name or missing value.

Every question instance has a pinned definition, existing question ID, nonempty `subjectBindings`, explicit `timeContext`, parameter bindings and `origin`. An entry origin names a designated entry question. A `newLead` origin records a reason. A transition origin records `originDecisionId`; a `reassessmentContext` origin records `relatedInstanceId`. Context changes create a new instance; a derivation relationship can explain its connection to the old one.

Time contexts are bounded intervals, open intervals with exactly one known boundary and an `unknownBoundary` declaration, or unknown with a reason. An end cannot precede its start, including at submillisecond precision; ordering compares UTC-adjusted whole seconds and every supplied fractional digit without rounding to milliseconds. Event time adds `known` with `at`. Policy effective time permits `known` with start and optional end. Recording timestamps require a valid [RFC 3339](https://www.rfc-editor.org/rfc/rfc3339.html) calendar date and known offset. This candidate excludes leap-second timestamps and the unknown offset `-00:00`; it uses uppercase `T` and `Z`. A future time profile can extend this deliberately narrow representation without silently inventing precision.

## 5 Entries and typed references

The ten baseline entry types are Actor, QuestionInstance, EvidenceReference, Observation, Hypothesis, Assessment, Decision, ActionRecord, PolicyReference and AuthorityAssertion. Each has an immutable `id`, `recordedAt` and `attribution`. Attribution either names an Actor entry, including self-attribution, or explicitly declares `{status: "unknown", reason}`. Actor identity status is self-declared, asserted, verified or unknown. A verified identity assertion needs its claimed method and evidence references; the receiver still has not independently verified it.

Evidence availability is available, unavailable, withheld, redacted or unknown. Missing locators require `locatorAbsentReason`; absent, withheld, redacted or unknown material requires a material or locator absence explanation. Optional integrity metadata specifies algorithm, digest and covered material. Integrity values are represented but evidence bytes are not fetched or verified by the Core validator.

Observations require evidence references and a method. Hypotheses relate to an instance or this investigation and retain an attributed status. Assessment inputs use supports, contradicts or context roles; other entry relationships additionally support derivedFrom and selectedFor. A revision uses the separate `supersedes: {entryId, reason}` member. URI-valued Core references are resolved by their field definitions, not by guessing from strings in free text or metadata.

Only applicable assessments have outcomes, and those outcomes are yes, no or unknown. Unknown requires at least one typed reason with explanatory text. Zero assessment inputs require `zeroInputsReason`. Optional confidence includes scale, value, method and interpretation. No private chain-of-thought is required. A `policyBinding` names an exact PolicyReference entry plus explicit bound parameters when a conclusion depends on that policy.

## 6 Decisions and transitions

A Decision targets one instance or this investigation; it identifies selected assessment or input IDs, disposition, rationale, policy status and authority status. Status is referenced with correctly typed entries, notApplicable, or unknown with a reason. These are records of claimed context, never execution grants. An imported AuthorityAssertion MUST state `receiverLocalVerification: "notPerformed"`; a receiver performs any actual authorization in its own controls.

`disposition: "transition"` requires a selected applicable assessment targeting exactly the source instance and nonempty `selections: [{transitionId, targetInstanceId}]`. Each pair must resolve to a transition in the exact pinned source definition and to a target instance pinned to that same artifact. Endpoints, guard and recorded assessment outcome must match. The target's origin must name that decision, and every transition-origin instance must be selected by its origin decision. Other decisions cannot carry graph selections.

Multiple eligible transitions, cycles and reconvergence are permitted. A decision records the selected pairs; eligibility never selects a route automatically. Zero eligible transitions is a no-match result. A mismatched route or known-invalid prerequisite fails the individual transition report. Missing declared dependencies or unsupported required semantics make interpretation indeterminate. A guard match cannot override failed source-context or selected-assessment validation. These checks do not schedule or execute anything.

Action stages are planned, requested, attempted, completed, failed or unknown. A stage update is a new entry. Completed is an attributed report, not proof of intended effect. `close`, `suspend` and `reopen` are investigation-scope dispositions and include `limitations`, which may be an empty array if none are asserted.

## 7 Revisions and current views

Supersedes links MUST preserve entry type and logical target, include a reason, and form an acyclic graph. The candidate logical-target comparison is deliberately conservative:

| Entry type | Preserved target for supersession |
| --- | --- |
| QuestionInstance | Exact definition, question, subjects, time and parameter bindings |
| Assessment | Target instance |
| Decision | Target instance or investigation; a review also preserves its reviewed-entry list |
| Hypothesis | Related instance/investigation and explanatory statement |
| ActionRecord | Operation subject and operation description |
| PolicyReference | Policy identity |
| Actor | Kind and label |
| AuthorityAssertion | Issuer, grantee, operation and scope |
| Observation | Evidence inputs and event-time context |
| EvidenceReference | Source provenance object |

A change outside these comparisons can instead use a new identity and an explained derivedFrom relationship. These rules are a reviewable binding choice, not a universal truth about investigative identity.

A review is an investigation-scope Decision with `reviewedEntryIds`, optional `triggeringEntryIds`, rationale and disposition retained, revised, withdrawn or unresolved. Revised requires replacement entries. Review-only fields cannot appear without reviewed entries. Withdrawn records the reviewer's changed position and preserves the history.

Records default to historical presentation. `view: {mode: "historical"}` is explicit but optional. A historical record retains original input references and may contain unresolved downstream reviews while passing its representational checks. `view: {mode: "current", selectionDecisionIds: [...]}` makes a current-view claim. The interpreter follows supersession and review triggers through declared reasoning dependencies: assessment inputs/context, observation evidence, decision selections/policy/authority, explicit typed relationships and parameters, authority bases and action decisions. Supersession ancestry and derivation alone are lineage, not replacement evidence. A dependent conclusion without a supported, selected review remains indeterminate; competing and unresolved reviews remain visible. A superseded review remains in history but does not itself block its replacement review's disposition. Timestamps never choose a winner. `unresolvedReviews` in the validation report is a view derived from the supplied data, not a mutation of the record.

Revised, withdrawn and unresolved review dispositions all trigger review of dependent conclusions, whether or not the replacement entry carries a supersedes edge. A retained review has its own basis: selected inputs, policy/authority references, triggering entries and replacement entries remain dependencies. It must also account for changes affecting the conclusions it reviews, including a new concurrent correction of an original input that leaves the review's selected replacement unchanged. The binding carries change-event IDs through both sets of dependencies. A review's declared `triggeringEntryIds`, their supersession ancestors, and the review's own change event identify corrections it already accounts for; another uncovered correction makes it stale. A fresh attributed review can supersede the stale review while preserving both records. A timestamp alone cannot prove that a review accounted for a correction.

## 8 Partial exchange and losses

`completeness.exchangeScope` is full or partial. Full means included Core reference closure plus supplied pinned definition artifacts, not real-world investigative completeness. Evidence bytes can remain external if their references truthfully state availability. Snapshot provenance is not recursive entry closure.

A partial omission is `{id, expectedType, reason, effect}`. It must name an actually missing, referenced Core object; wrong types, unexplained dangling references, included entries listed as missing, and omissions in a full record are invalid. For this candidate, omitting a definition by its series ID means no artifact of that series is supplied. Finer version-specific omission needs a future binding revision. Declared partial exchange is structurally understandable but reports indeterminate interpretation.

Losses are `{affectedIds, mappingVersion, explanation}`. Disclosed semantic loss makes lossless exchange unestablished and the aggregate result indeterminate. If confidential identifiers cannot be disclosed, a producer must create new affected identities in a redacted derivative and disclose the transformation. This runtime does not perform redaction automatically.

## 9 Relationship to CASE/UCO and release gates

The binding is a small executable candidate that makes the founding contract testable now. It is not a replacement claim for CASE/UCO, STIX, CACAO, ATT&CK, D3FEND, ATLAS or OCSF. No adapter, equivalence mapping or institutional endorsement is implied. Selecting a canonical CASE/UCO mapping requires a separately reviewed property-level crosswalk, explicit omissions, round-trip examples and tests. A future decision to adopt that representation must version the binding and preserve existing identities or disclose losses.

Stable release still requires public review, agreed stewardship and rights, expert review of investigative semantics, profile rules where needed, and exchange with an independently implemented tool. Candidate results cannot be labeled ratification or certification.
