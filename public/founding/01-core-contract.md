# TENSOR Core Contract
## Draft status and reading guide

Proposal revision 0.1.0, dated October 10, 2026. This is a proposed contract for review, not a ratified standard or a replacement for an existing TENSOR release. The identifiers and requirements below are candidates for implementation trials. Existing graph versions retain their existing identities.

This contract defines a common investigative layer for all cyber investigations, whether conducted by humans, agents, or mixed teams. It covers reusable investigation definitions and portable investigation records. Vendor integrations and organizational policies compose above that layer.

Sections 1 through 12 are proposed normative text, except passages labeled Example or Rationale. The JSON examples elsewhere in this package are informative renderings of the logical model. They are not an approved wire format. No implementation can claim ratified TENSOR conformance from this draft.

Capitalized requirement words use the BCP 14 meanings specified by RFC 2119 and RFC 8174. Requirement identifiers are stable review handles within this proposal; changing a requirement requires a recorded revision.

## 1 Scope and limits

TENSOR standardizes how investigative meaning is represented and preserved: scope, questions, evidence, observations, hypotheses, assessments, decisions, actions and revisions. A compatible tool can interpret a recorded investigation without using the originating vendor's user interface or executing its tools.

**TC-01 Universal scope.** Core concepts MUST be applicable independently of the investigation domain, product, investigator type and business organization. Domain profiles MAY add vocabulary and constraints. Vendor or business overlays MUST NOT redefine Core fields, remove required meaning, or silently replace canonical questions.

**TC-02 Bounded claims.** An implementation MUST distinguish representational validity from truth, investigative completeness, lawful authority, safe execution and effectiveness. A valid record does not establish any of those properties. The Core does not specify an agent runtime, universal risk score, evidence repository, general-purpose command language or mandatory sequence for every investigation.

**TC-03 Public dependency.** A claimed Core capability MUST NOT depend on an undisclosed proprietary definition. Additional required profiles or extensions MUST be declared and precisely identified. The base model MUST remain usable without a particular vendor or paid service.

Rationale: a broadly useful standard can have a small shared kernel and rich public profiles. Universal scope does not require every investigation to collect every optional field or execute every published question.

## 2 Terms and model

A definition is a reusable, versioned set of questions and allowed transitions. A question describes one proposition to assess. A question instance applies that question to identified subjects, a time context and explicit parameter bindings. The same question can therefore have many instances.

Evidence is retained material or a reference to it. An observation reports what a source or method found. A hypothesis is a candidate explanation. An assessment interprets specified inputs to answer a question instance. A decision records a chosen next step or disposition. An action record describes an attempted or observed operational act. These types carry different meanings even when their text is similar.

An actor is a person, agent or other system to which an entry is attributed. A policy reference identifies organizational rules relevant to an assessment or decision. An authority assertion records claimed permission or delegation. Neither an actor label nor an imported assertion grants permission.

A record is a snapshot of an investigation's entries. A profile supplies public domain-specific definitions or constraints. An overlay binds vendor capabilities or organizational rules to the shared model.

**TC-04 Type separation.** Producers and readers MUST preserve distinctions among evidence, observations, hypotheses, assessments, decisions and actions. They MUST NOT convert a recommendation into an executed action, a hypothesis into an observation, or a policy preference into an observed fact.

Example: “a log contains an outbound request” is an observation. “the request disclosed sensitive data” is an assessment requiring additional evidence. “revoke the session” is a decision or recommendation. “session revocation returned success” is an action result, not proof that every existing session became unusable.

## 3 Identity versioning and time

**TC-05 Identity.** Every definition, reusable question, transition, investigation, snapshot and record entry MUST have an unambiguous identifier. Identifiers MUST be compared exactly and MUST NOT be repurposed. Globally unique opaque URIs are the proposed identifier form. A URI identifies an object; it is not permission to retrieve it.

A definition ID names a logical series. Its exact artifact identity is the tuple of definition ID, version and digest. Any changed artifact bytes require a new version; different digests under the same definition ID and version are an identity conflict. Question and transition IDs name stable concepts: changing a proposition, assessment criterion, guard or source/target meaning requires a new concept ID. Display-only corrections may retain the concept ID in a new definition version.

**TC-06 Definition pinning.** A definition reference MUST identify the definition ID, its exact version and a SHA-256 digest of its published UTF-8 artifact bytes. The digest is detached: it is not calculated over a self-containing digest field. Consumers MUST verify it before claiming that a supplied artifact satisfies that reference. A changed byte representation has a different digest even when its parsed meaning is equivalent. Reserialization is not a valid way to reconstruct a pinned artifact.

Definitions referenced from a case remain separate artifacts. The exchange manifest identifies their bytes and digests. A future canonical serialization may replace this byte rule only through an explicit contract revision. A digest proves byte consistency, not authorship or truth.

**TC-07 Immutable entries.** An entry ID MUST denote one immutable content value. Correction creates a new entry ID with revision lineage. Investigation IDs remain stable across snapshots. A newly assembled snapshot MUST have a new snapshot ID and identify its source snapshot when derived from one. A byte-for-byte retransmission retains the existing snapshot ID. Recipients encountering different content under the same entry ID MUST report an identity conflict rather than overwrite either value.

**TC-08 Time.** Each record entry MUST include recordedAt, expressed as an RFC 3339 timestamp with a known UTC offset. Event time, observation time and recording time MUST be distinguished when provided. Unknown or approximate event time MUST NOT be replaced by recording time. Timestamp order alone MUST NOT determine causality, authority or a winning assessment.

An instance's time context MUST be explicit: a bounded interval, an open interval with the unknown boundary identified, or unknown with a reason. Dates known only approximately require a declared precision or interval. A bounded interval MUST NOT end before it starts.

## 4 Investigation definitions

A definition has an ID, version, publication status, title, Core contract reference, question collection, transition collection, designated entry questions and declared profile or extension dependencies. Empty transitions are permitted. At least one question and one valid entry question are required.

A question has an ID, human-readable prompt, explicit proposition, parameter declarations, applicability criteria, yes/no/unknown assessment criteria, and evidence requirements. Evidence requirements MAY be empty for questions that genuinely require no evidence; the definition MUST explain that choice. Domain labels and external mappings are optional profile content.

**TC-09 Assessable propositions.** A question MUST distinguish the proposition being assessed from the evidence needed to assess it. Yes and no criteria MUST be mutually exclusive for the same stated context. Unknown criteria MUST identify insufficient, conflicting or otherwise unresolved inputs. A question MUST NOT combine several alternative conclusions into a yes answer that cannot identify which conclusion was reached.

**TC-10 Explicit context.** Parameters that materially affect meaning, including subject, time, policy or threshold, MUST be declared with a type and whether they are required. A required unresolved binding blocks assessment until resolved or produces an explicitly unresolved applicability result; it MUST NOT be filled with an undocumented default. A profile MAY define public, versioned defaults.

**TC-11 Transition definitions.** A Core transition MUST identify its source question, target question and one guard outcome: yes, no or unknown. Source and target MUST exist in the same definition in this draft. The guard means that the explicitly selected assessment of the source instance has that outcome and applicable status. Guards MUST NOT contain executable code.

Multiple transitions may share a guard; the record must state which were selected. A missing matching transition does not create an implicit branch. Cross-definition transitions and richer guard languages require a separately specified profile and are outside baseline transition interpretation.

**TC-12 Graph freedom.** Definitions MAY contain cycles and reconverging paths. A revisited question MUST create a new question instance or explicitly reassess the existing instance without changing its context. A definition's entry questions do not prevent a case from recording a new independent lead; the reason and origin of each instance MUST be recorded. The Core guarantees neither termination nor completeness.

This differs from existing DAG-oriented TENSOR releases. Existing artifacts are not silently reclassified under this proposal.

## 5 Record envelope and question instances

The record envelope contains a snapshot ID, investigation ID, Core contract reference, producer identity, recordedAt, scope, definition references, declared dependencies, entries, completeness declaration, and omissions or losses if any. Scope contains a purpose and an explicit subject boundary; unknown subjects may use stable local descriptors rather than invented real-world identifiers.

**TC-13 Instance binding.** A question instance MUST identify the pinned definition, question ID, subject bindings, time context, parameter bindings and origin. Origin is entry, new lead, transition or reassessment context, with a recorded rationale and related IDs where applicable. Changed subject, time or material parameter bindings require a new instance ID. A question ID alone MUST NOT serve as the assessment target.

The question MUST exist in the pinned definition. Supplied bindings MUST satisfy its declared types. Each required binding MUST be supplied or explicitly marked unresolved with a reason; an instance with unresolved required bindings cannot receive an applicable assessment.

**TC-14 Entry attribution.** Every entry MUST carry an entry ID, type, recordedAt and attribution. Attribution MUST resolve to an actor or explicitly state that the source actor is unknown with a reason. Actor descriptors themselves MAY use an identity source or self-declared label; the record MUST distinguish that from verified identity.

Attribution does not require personal names. Pseudonymous IDs are permitted. Agent model, tool, configuration and execution identifiers SHOULD be recorded when needed to interpret a result, without including secrets or assuming exact replayability.

An actor descriptor is attributed to whoever asserted that descriptor. Self-attribution is permitted and does not verify the asserted identity.

The logical entry types and their conditional content are:

| Entry type | Required type-specific content |
| --- | --- |
| Actor | Actor kind human, agent, system or unknown; label; identity status |
| QuestionInstance | Pinned definition and question; subject, time and parameter bindings; origin |
| EvidenceReference | Description; source; availability state; locator or reason absent; optional integrity metadata |
| Observation | Statement; supporting evidence references; method; event-time status |
| Hypothesis | Candidate explanatory statement; related instance or scope; status proposed, retained, rejected or unresolved |
| Assessment | Target instance; applicability; outcome when applicable; rationale; typed input relationships; method |
| Decision | Target instance or investigation; selected inputs; disposition; rationale; policy and authority status |
| ActionRecord | Operation description; stage; actor/attribution; related decision when known; event-time status; result if available |
| PolicyReference | Policy identity and version; effective-time status; applicable scope; locator or absence reason |
| AuthorityAssertion | Claimed issuer and grantee; permitted operation and scope; validity status; basis references |

The generic ID/time/attribution fields apply to these types. A decision at investigation scope may express closure or reopening without inventing a question instance. Policy and authority entries are only required when relevant; their status still must be explicit on the decision as specified below.

## 6 Evidence observations and hypotheses

**TC-15 Evidence availability.** Evidence references MUST distinguish available, unavailable, withheld, redacted and unknown states. They MUST identify source provenance at the granularity actually known. If material or its locator is omitted, the reason MUST be stated. A reference MAY be preserved even when its material is inaccessible to the recipient.

Integrity metadata identifies the algorithm, digest and exact material covered. A redacted copy has its own identity and integrity metadata, with derivation from the original recorded only where disclosure is authorized.

**TC-16 Observation basis.** An observation MUST identify its evidence inputs and collection or interpretation method. If no retained evidence is available, the record MUST include an EvidenceReference explaining that limitation, including direct testimony or transient observations. An observation MUST NOT imply independent verification merely because it was produced by a tool or copied from another case.

**TC-17 Relationships and disagreement.** Relationships among entries MUST state their purpose, including supports, contradicts, derivedFrom, selectedFor or supersedes where applicable. A reader MUST preserve conflicting observations and competing hypotheses. Entry order, confidence magnitude or actor kind MUST NOT silently resolve disagreement.

Hypothesis status is an attributed assessment of that explanation, not a deletion of its history. Changing a hypothesis's status produces a new entry under the revision rules.

## 7 Assessments applicability and uncertainty

**TC-18 Applicability.** An assessment MUST declare applicability as applicable, notApplicable or unresolved, with rationale. Only applicable assessments have an outcome, which MUST be yes, no or unknown. notApplicable and unresolved applicability MUST NOT be serialized as no, and do not satisfy Core transition guards. A definition may provide a separate question about applicability if routing on it is needed.

**TC-19 Assessment basis.** An assessment MUST reference a question instance, provide a concise rationale, identify its method and list relevant inputs with support, contradiction or context roles. Zero inputs require an explicit explanation. Decisions derived from a policy threshold MUST identify the exact policy version and binding used.

**TC-20 Unknown handling.** An unknown outcome MUST contain at least one reason: notCollected, unavailable, withheld, conflicting, insufficient, unsupported, or other with explanatory text. Missing telemetry MUST NOT be treated as evidence of absence unless the question's negative criterion explicitly requires and records sufficient observation coverage. An unknown outcome is a valid assessment, not a parser error.

**TC-21 Confidence and reasoning.** Confidence is optional. When provided, its scale, value, method and interpretation MUST accompany it. Readers MUST NOT treat values from different methods as comparable without an explicit conversion. The Core MUST NOT require private model chain-of-thought. Evidence-linked rationale and disclosed decision rules are the portable record.

Rationale: TENSOR can preserve several different conclusions about the same instance. It standardizes their meaning and provenance, not a claim that every person or model will reach an identical judgment.

## 8 Decisions transitions and actions

**TC-22 Explicit selection.** A decision MUST state its target, selected assessment or other input IDs, disposition and rationale. Selecting an assessment for one decision MUST NOT delete or invalidate alternatives. A revision does not automatically cancel downstream decisions; their status requires a new decision or review record.

For a transition decision, the record MUST include one selected applicable assessment and at least one explicit selection pair containing a transition ID and a target instance ID. The assessment MUST target exactly the decision's source instance. Each target instance identifies its originating decision. A decision can select several matching transitions to represent branching work.

**TC-23 Guard interpretation.** A transition interpreter MUST resolve the exact definition, question instance, selected assessment and selected transitions before reporting a transition as valid. Each selected transition's source, guard outcome and target MUST match those inputs and target instances. A mismatch is invalid; a missing or unsupported dependency is indeterminate. Zero eligible transitions is a no-match result, not permission to select a default.

Source and target instances MUST pin the same definition artifact for a baseline transition. The transition source and target IDs MUST equal their respective question IDs. Each selection pair MUST point to a target whose transition-origin decision is this decision; parallel unpaired arrays are insufficient to express that relationship.

Determinism applies to checking the same recorded inputs against the same guard. It does not apply to evidence collection, human judgment, model outputs, scheduling or real-world outcomes.

**TC-24 Policy and authority.** A decision MUST declare each of policy status and authority status as referenced, notApplicable or unknown. Referenced status requires the relevant entries; unknown requires a reason. Authority assertions MUST distinguish claimed permission from receiver-local verification. Actor type, confidence, imported policy or conformance status MUST NOT grant execution permission.

An implementation carrying out an external action MUST obtain authorization under its local controls independently of the imported record. This requirement establishes a boundary; this draft does not define an authorization protocol.

**TC-25 Action stages.** An action record MUST distinguish planned, requested, attempted, completed, failed and unknown stages. Completed means the stated action/result was reported complete by the attributed source; it is not proof of its intended security effect. A stage update creates a new entry. A decision alone MUST NOT be rendered as an action completed.

**TC-26 Case disposition.** Closing, suspending or reopening a case MUST be an attributed investigation-scope decision with rationale, policy/authority status and known limitations. Closure MAY coexist with unresolved questions. The record MUST NOT equate closure with proof that all hypotheses were resolved.

## 9 Revision and dependent conclusions

**TC-27 Revision lineage.** A supersedes relationship MUST connect entries of the same type about the same logical target or subject, and MUST explain the correction. The supersedes relationship graph MUST be acyclic. The superseded entry remains identifiable in a full record. A changed question-instance context is linked as a new instance rather than overwriting the old one.

Self-supersession is invalid. A missing ancestor is invalid unless declared as an omission in a partial snapshot. Question instances with different subject, time or material parameter bindings MUST NOT supersede one another; they may carry a derivedFrom relationship and a context-change reason.

Concurrent revisions remain branches. There is no last-timestamp-wins rule. A producer or reader claiming a current selected view MUST identify the selection or reconciliation decision and preserve alternatives in the underlying record.

**TC-28 Dependency review.** When an input is superseded, retracted or reported unreliable, an implementation presenting dependent assessments or decisions as current MUST either record their review or mark their review status unresolved. It MUST preserve the inputs originally used. Historical reconstruction MUST use the original selected inputs, not silently substitute newer evidence.

Retraction or an unreliability report is expressed by a new investigation-scope review Decision, naming the reviewed entry IDs, the triggering entry IDs when present, a reason and a disposition of retained, revised, withdrawn or unresolved. A revised disposition MUST identify replacement entries. Withdrawn signals that the attributed reviewer no longer endorses the named entries; it does not delete them or compel other actors to agree. A reader's current view MUST disclose this decision and any competing review. The same review form records the disposition of dependent conclusions after an input changes.

Logical lineage is required; tamper-evident storage, digital signatures and an append-only database are deployment choices or future profiles. This draft does not require a specific ledger.

## 10 Profiles overlays and extensions

**TC-29 Public profiles.** Each profile MUST declare its identity, version, compatible Core contract, required vocabulary and constraints, and normative dependencies. Profiles MAY restrict or enrich Core behavior but MUST NOT contradict it. Definitions and records MUST declare every profile whose semantics are required for interpretation.

**TC-30 Overlay boundaries.** Vendor mappings and business rules MUST remain identifiable, versioned layers. If they change a question, evidence requirement, threshold or decision rule, they MUST bind an explicit parameter or create a new definition/profile identity with lineage. An overlay MUST NOT rewrite the pinned artifact or reuse its identity for changed meaning.

**TC-31 Extension declaration.** An extension MUST use a collision-resistant namespace, declare its definition/version, and state whether it is required for interpretation of the affected object. Unsupported required semantics block interpretation of that object and dependent conclusions. They MUST be reported as unsupported rather than accepted or assumed false.

Optional unknown metadata MAY remain opaque. A lossless exchanger MUST retain it without reinterpretation. Extensions MUST NOT override required Core attributes. The future binding must specify concrete namespace syntax and collision handling; dotted or colon strings alone are not proof of namespace ownership.

**TC-32 No hidden dependency.** A claimed baseline result MUST NOT depend on an undeclared profile, proprietary score, private prompt, implicit policy or unavailable translation. If such a dependency is needed, the capability claim MUST name it and its limits.

## 11 Exchange completeness and safe interpretation

**TC-33 Completeness declaration.** Every snapshot MUST declare full or partial exchange scope. Full means reference closure for included Core entries and pinned definitions, not that all real-world evidence or every historical event is known. Full snapshots include all referenced Core entries and revision ancestors, including references originating in another investigation, and ship the referenced definition artifacts. External evidence bytes may remain external. Source-snapshot lineage is envelope provenance and does not require including every ancestor snapshot's full contents.

Partial snapshots MUST list intentionally omitted referenced IDs, expected type, reason and effect on interpretation. An unexplained dangling reference is invalid. A declared omission may make the package structurally understandable while leaving affected semantics indeterminate. Recipients MUST report that distinction.

An included EvidenceReference with a truthful redacted/withheld availability state can appear in a full snapshot; withholding the referenced Core entry itself makes the snapshot partial. If even an omitted identifier cannot be disclosed, the exporter MUST produce a redacted derivative with new affected identities and a loss disclosure rather than claim lossless exchange.

**TC-34 Loss disclosure.** Exporters MUST disclose dropped or transformed semantics with affected IDs, mapping version and explanation. An exporter MUST NOT claim lossless exchange when it discards required content, lineage or unknown optional metadata. Transport encoding and serialization whitespace are not semantic loss for record entries, but pinned definition bytes MUST remain unchanged.

**TC-35 Safe handling.** Imported text, evidence, locators, profiles and metadata MUST be treated as data. Parsing or preview MUST NOT execute instructions, follow external locators automatically, or grant access. Implementations MUST validate size/structure and enforce receiver-local access controls before fetching or executing anything.

A conformant record may contain sensitive information. Core conformance does not authorize its disclosure. Redaction should preserve truthful omission and derivation information where disclosure of that metadata is permitted.

## 12 Draft capability claims and conformance

**TC-36 Scoped claims.** A trial implementation MUST name the proposal revision, binding/version, supported profiles, capability roles and known exclusions. It MUST publish results with fixture versions and artifact digests. It MUST NOT describe those results as ratification, certification, endorsement, safety validation or evidence of superior investigation outcomes.

The proposed roles are:

| Role | Required demonstration |
| --- | --- |
| Definition producer | Emits valid, pinned definitions with coherent question/transition references and declared dependencies |
| Record producer | Emits attributed, correctly typed records with explicit context, completeness and revision lineage |
| Reader | Distinguishes invalid, indeterminate and supported meaning; preserves disagreement and reports unsupported dependencies |
| Lossless exchanger | Meets reader requirements and preserves included supported meaning, opaque optional metadata, identities and lineage through exchange |
| Transition interpreter | Meets reader requirements and evaluates TC-23 guards from exact selected inputs without invoking operational tools |

**TC-37 Validation outcomes.** Validators MUST distinguish pass, fail, indeterminate and notRun for each named requirement or test. Pass means that the reported check succeeded on the identified input. Indeterminate means required information or semantics were unavailable. Unknown investigation outcomes are not validation failures. Syntax validation alone MUST NOT be labeled complete Core conformance.

A failed check invalidates only the claims it contradicts. Unrelated supported parts may still be inspected if failures and dependency effects remain visible. A partial record can pass structural checks while its transition interpretation remains indeterminate.

**TC-38 Independent exchange.** Any claim of interoperability between implementations MUST identify both implementations and versions, the exact artifacts exchanged, required extensions, detected losses and results. Reimporting a tool's own export is useful testing but MUST NOT be presented as independent interoperability.

The acceptance scenarios in the reference-case document are a proposed test specification. No executable suite, independent implementation pair or formal certification is included in this founding package.

## Review questions and publication gates

The logical requirements above are concrete review candidates. Before a first normative release, the editors must settle the wire binding; define exact equality for records across serializations; choose namespace registration/discovery rules; specify profile negotiation; and agree how supported partial exchange and review-status reporting are encoded.

The working preference is to keep operational execution outside initial conformance and to evaluate reuse of CASE/UCO for the record binding. Any independently developed binding must document its mapping, omissions and rationale.

Compatibility with legacy graph releases requires an explicit migration document. That migration cannot invent evidence, actors, parameter bindings or investigation records that the old graph does not contain.

## References

- RFC 2119, requirement terminology: https://www.rfc-editor.org/rfc/rfc2119
- RFC 8174, capitalized requirement words: https://www.rfc-editor.org/rfc/rfc8174
- RFC 3339, timestamp representation: https://www.rfc-editor.org/rfc/rfc3339
- RFC 8785, JSON canonicalization, informative candidate for a future binding: https://www.rfc-editor.org/rfc/rfc8785
- JSON Schema Draft 2020-12, informative candidate for a future syntax validator: https://json-schema.org/draft/2020-12/json-schema-core

The first three references support this proposal's requirement language and time representation. The final two are informative; this draft does not claim to implement them.

