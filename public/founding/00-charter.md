# TENSOR founding charter

Draft 0.1.0 · October 10, 2026 · Proposed for review

This charter expresses the agreed public-good direction and proposes the operating commitments needed to support it. It is not a ratified standard, a legal instrument, an institutional endorsement, or a claim that the existing software implements this package. The package number identifies this proposal; it does not replace existing Core release identifiers.

## Mission

**TENSOR provides one public investigative layer for humans and agents across cyber investigations.** It gives questions, evidence, uncertainty, assessments, decisions, and revisions shared meaning that can survive a change of person, organization, or tool. Vendor and business layers build on that meaning without silently changing it.

TENSOR exists as a public good. Its intended reach includes incident response, threat hunting, digital forensics, identity, cloud, network, endpoint, application, and AI-system investigations. No industry, product, investigator type, or deployment model defines the boundary of the standard. This is a scope commitment, not a claim that every domain already has sufficient content or validation.

AI security teams governing agents and autonomous systems are the first adoption community. That first audience should test the general model through both an AI-system incident and a conventional cyber incident involving an agent investigator. Expansion should follow demonstrated needs and reviewed public contributions.

## What TENSOR standardizes

TENSOR separates two connected artifacts:

- **Investigation definition:** the versioned meaning of questions, their context, evidence expectations, assessment rules, and possible transitions. A definition can guide a repeatable procedure while allowing unresolved findings and further inquiry.
- **Investigation record:** what happened in a particular investigation, including the definition versions used, evidence references, observations, assessments, participants, policy context, decisions, and subsequent revisions.

Together these support review, handoff, comparison, and continued investigation. A recipient must be able to distinguish what was observed from what was inferred, what was decided from what was executed, and what is unknown from what was disproved. Contradiction and dissent are legitimate investigative states, not serialization errors.

TENSOR does not promise identical conclusions. Different evidence, policies, expertise, or judgments may produce different assessments. Its purpose is to make those differences explicit and inspectable. Replaying a recorded decision does not reproduce an experiment, rerun a tool, or establish that a conclusion was correct.

## Architecture and boundaries

| Layer | Responsibility |
| --- | --- |
| Public TENSOR Core | Shared semantics, identity, attribution, provenance, uncertainty, decisions, revision lineage, and interoperability rules |
| Public domain profiles and knowledge | Reviewed investigative questions, specialized vocabulary, evidence requirements, procedures, examples, and mappings that preserve Core meaning |
| Vendor and technical layers | Interfaces, connectors, queries, storage, analytics, execution systems, and deployment choices |
| Business and organizational layers | Policy, authority, risk thresholds, escalation, retention, and organization-specific context |

Public profiles are part of the common layer. Essential investigative knowledge should not require purchase of a vendor pack. Implementations may specialize capabilities, but must state what they support and expose losses or unsupported required semantics during exchange. Organizational policy may influence a decision; it may not retroactively turn a policy judgment into an observation.

Humans, agents, and mixed teams use the same model. An actor's type grants neither authority nor credibility. Attribution, delegation, and applicable authority must be representable without requiring disclosure of private model reasoning. Evidence references may point to access-controlled repositories; interoperability does not imply permission to retrieve or redistribute evidence.

## Non-goals

TENSOR does not prescribe a single product, user interface, execution engine, data lake, or investigative sequence. It does not replace every evidence format, threat vocabulary, defensive knowledge base, or workflow standard. It should reuse and map existing work where meaning can be preserved, and describe limitations where it cannot.

Conformance does not certify an investigator, authorize an action, establish legal admissibility, guarantee a secure implementation, or prove that an investigation was complete. A portable action record is not permission to run the action. These boundaries apply equally to human and automated systems.

## Proposed public commitments

Upon adoption, stewardship should keep the specification, normative schemas, essential profiles, basic conformance materials, and decisions publicly accessible under explicitly selected reuse terms. Reading, implementing, reviewing, or contributing must not depend on buying a product or sponsorship.

Changes should have public rationale, review, disposition of substantive objections, and compatibility guidance. Sponsorship should confer neither semantic control nor special conformance status. Contributions should be judged by evidence and technical merit, with disclosed conflicts and an appeal path.

Success means independently usable investigations and credible external stewardship: separate implementations exchanging meaning, practitioners improving reviewed cases, and institutions publishing substantive evaluations or references. Membership counts, logos, self-authored citations, and claims of universality are insufficient evidence.

The accompanying governance proposal and review plan specify how these commitments could become accountable practice. Named stewards, available capacity, licensing decisions, and external participation remain to be established before this charter can be represented as operational governance.
