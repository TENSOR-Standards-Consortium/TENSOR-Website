# Reference investigations and conformance plan

Draft 0.1.0 · October 10, 2026 · Proposed for review

These synthetic cases test one model across AI-system and conventional investigations. The C01–C12 independent-exchange acceptance trials are **specified, not executed**. A separate reference implementation candidate now has local automated checks; those do not establish independent exchange. See [validation boundaries](VALIDATION.md).

Each fixture must pin an immutable investigation Definition by identifier, version, and exact-byte SHA-256 digest. Reusable Questions and Transitions belong to that Definition. A QuestionInstance binds a Question to a subject, interval, and parameters; an Assessment answers that instance. The supplied [JSON examples](examples/README.md) illustrate these relationships and byte pinning. Normative test fixtures and their binding remain to be defined and frozen.

## Case A: Human-led investigation of an agent's data transfer

**Situation.** A support assistant was permitted to send ticket summaries to a processing service. Monitoring reports an outbound request. Human investigator Maya opens a record in Tool A for that job and execution identity, within a bounded interval. Separate questions ask whether data left the environment, whether it included a restricted attachment, and whether the action satisfied the applicable export policy.

**Evidence and competing explanations.** Source artifacts include the assistant's tool-result log, an egress gateway record, the job's granted permissions, and the policy revision effective during execution. Evidence references retain source identity, collection attribution, timestamps, integrity information, and access restrictions. An Observation says the tool log *reports* a successful request; another says the gateway recorded outbound bytes. Neither establishes the transmitted content or intent by itself.

Maya records two hypotheses: the job transmitted a restricted attachment, or it sent only permitted summary metadata. An execution-identity mismatch remains an alternative explanation until job-to-request attribution is corroborated. She assesses the bounded outbound-transfer question as **yes**, citing corroborating records. The attachment-content question is **unknown** because the payload and destination receipt are unavailable. Unknown is not converted into “no attachment” or “authorized.”

**Decision and authority.** Organizational policy allows a designated incident lead to pause a connector while investigating suspected restricted-data exposure. Maya records a Decision selecting the exact unknown Assessment for further evidence collection. A containment Decision cites that Assessment, policy revision, and incident lead's approval. Neither is required to be a graph transition; a transition Decision would also select defined Transitions and target instances. Policy justifies the response; it does not prove exposure. Neither actor's kind supplies authority.

An optional ActionRecord distinguishes a proposed pause, attempted command, and confirmed completion. A queued command is insufficient completion proof; a connector-state receipt supports completion here. Effectiveness and operational consequences remain separate. This example does not prescribe connector suspension for every investigation.

**Revision and handoff.** Later, an authenticated destination receipt and preserved transmitted-body evidence establish that this job sent bytes matching a restricted attachment. Maya adds Observations and a new **yes** Assessment for the same attachment QuestionInstance. It supersedes the earlier unknown Assessment without changing or removing it. Whether the agent acted maliciously remains unknown; content transfer does not establish intent.

Tool A exports the record to independently developed Tool B, preserving Definition references, investigative relationships, authority context, action status, and revision lineage. Restricted payload bytes remain in controlled storage; their exclusion and retrieval conditions are explicit. Tool B preserves Maya's conclusion and provenance while showing that its reviewer cannot inspect those bytes. That reviewer may create a separately attributed dissenting or unknown Assessment, rather than rewriting Maya's conclusion or implying independent verification.

## Case B: Agent-assisted investigation of an identity session

**Situation.** An identity provider flags unfamiliar geography and elevated risk. Agent Cedar prepares an investigation in Tool B for human reviewer Leon. The subject is one session, with a specified account, interval, and tenant. This tests an agent as investigator rather than incident subject.

**Evidence and competing explanations.** Evidence includes the provider's sign-in record, available session telemetry, and an incomplete corporate egress inventory. Cedar records the provider's risk classification as an Observation about that source's output, not proof of compromise. It presents token misuse, legitimate VPN egress, and authorized travel as hypotheses. A missing device record prevents a confident attribution to the account holder.

Cedar assesses “Did the session originate through organization-managed egress?” as **unknown**, identifying incomplete inventory coverage. “Was the session token replayed?” is also **unknown**, with missing issuer and device telemetry recorded separately. The record distinguishes evidence that was never collected from evidence withheld from this reviewer.

**Human review and response.** Cedar proposes a Transition for additional inquiry. Leon reviews the evidence and records the Decision selecting the exact Assessment and Transition. A separately identified organizational policy permits a designated operator to require additional verification under specified risk conditions. Any response Decision must identify the applicable policy and authorization; an agent recommendation alone cannot authorize execution. In this fixture, a verification request is recorded as planned. No attempt or successful verification is asserted.

**Correction without erasure.** Recovered VPN and maintenance records corroborate organization-managed egress during the interval. Cedar adds a **yes** Assessment of the egress QuestionInstance, preserving source artifacts and revision lineage. Leon reviews the changed basis. The initial unknown remains accessible, and token replay remains unknown. Explaining geography does not establish session legitimacy.

Tool B hands the investigation to Tool A. Leon's response Decision retains the Assessment used when it was made; the revision does not silently retarget it. Dependent Decisions require recorded review or an unresolved review status. The receiver preserves competing hypotheses and distinguishes Cedar's assessment from Leon's review and authorization. Neither tool needs the other's interface, private model reasoning, or commercial workflow.

## Proposed acceptance matrix

Run both cases through A→B→A and B→A→B where applicable. Preserve source and exchanged artifacts, receiving-tool interpretation, and comparison reports. Tool independence requires separate implementations; two interfaces over one implementation are insufficient.

| Test | Positive acceptance condition | Adversarial condition and required outcome |
| --- | --- | --- |
| C01 — Definition identity; TC-05–07 | Both tools resolve the same identifier, version, and exact-byte digest. | Changed bytes under the same identity are detected; the receiver must not silently treat them as identical. |
| C02 — Question context; TC-08–13 | Assessments retain the correct QuestionInstance, subject, interval, and parameters. | Two sessions sharing a reusable Question must not collapse into one assessed instance. |
| C03 — Unknown meaning; TC-15,18–20 | Unknown Assessments retain reasons; unresolved applicability has no outcome. | Missing or redacted evidence must not become a negative answer; unresolved applicability must not satisfy a guard. |
| C04 — Evidence and interpretation; TC-04,16,19 | Sources, Observations, hypotheses, and Assessments remain distinguishable. | A risk flag or tool success message must not become established compromise or content-transfer proof. |
| C05 — Attribution; TC-14,24 | Human and agent contributions retain authorship and review attribution. | Agent output must not acquire human authorship; actor kind must not confer authority. |
| C06 — Policy basis; TC-19,24,30 | Response Decisions retain applicable policy revision and approval references. | A policy-based response must not be imported as evidence that the suspected event occurred. |
| C07 — Decision selection; TC-22–23,37 | Transition Decisions identify exact Assessments, defined Transitions, and target instances. | Mismatches are invalid; missing dependencies are indeterminate; no matching guard permits no default route. |
| C08 — Revision history; TC-07,27–28 | New Assessments preserve predecessors, historical targets, and dependency-review status. | Overwriting predecessors or retargeting old Decisions is detected as loss of meaning. |
| C09 — Restricted exchange; TC-15,33–35 | Withheld artifacts retain references, restrictions, and verification limits; partial omissions are explicit. | Unexplained dangling references are invalid. Import must not imply inspection or grant access. |
| C10 — Competing accounts; TC-17,21,27 | Alternative hypotheses and separately attributed dissent survive exchange. | Majority opinion or a later Assessment must not erase disagreement or imply consensus. |
| C11 — Action status; TC-24–25,35 | Planned, attempted, and completed states retain supporting records. | A plan, queue acknowledgment, or imported ActionRecord must neither become completion proof nor trigger execution. |
| C12 — Extension handling; TC-29–34 | Supported extensions preserve Core meaning; unsupported semantics and losses are reported. | Required unsupported semantics block interpretation of affected objects; opaque retention alone proves no comprehension. |

## Evidence required before a conformance claim

Freeze fixtures and expected outcomes, then verify these TC mappings against the final contract. Report each test as pass, fail, indeterminate, or notRun; all are currently notRun. Publish capability scope, implementation versions, artifacts, and discrepancies under TC-36–38. These tests sample the contract; they are not comprehensive. Passing establishes bounded interoperability evidence, not investigative correctness, secure deployment, legal admissibility, or endorsement.
