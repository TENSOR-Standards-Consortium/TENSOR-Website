# Proposed TENSOR governance

Draft 0.1.0 · October 10, 2026 · Not yet adopted

This proposal does not appoint people, incorporate a consortium, transfer intellectual property, or create contractual duties. Repository access does not establish independent oversight. Record adoption and a roster publicly before describing this process as operational.

## Bootstrap stewardship

Start with a published stewardship roster. The project initiator should invite participants and record each appointment's acceptance, responsibilities, affiliation, and conflicts. No appointments are supplied here.

| Role | Initial responsibility | Current appointment status |
| --- | --- | --- |
| Convenor | Schedule reviews, maintain decisions and appeals, explain scope | Unassigned in this package |
| Core editor | Maintain consistent semantics and specification text | Unassigned in this package |
| Conformance maintainer | Maintain fixtures, validation scope, and implementation evidence | Unassigned in this package |
| Profile editors | Review domain content and source quality | Unassigned in this package |
| Independent reviewers | Challenge proposals from practitioner, research, or implementation perspectives | Open participation; none appointed here |

One person may fill multiple roles; disclose this concentration. An editor cannot call their own approval independent review. Before a first stable Core release, at least two reviewers independent of its principal authors and each other should publish substantive assessments. Record failed or partial evaluations too.

## Change and decision procedure

1. **Propose:** Open a numbered proposal identifying the problem, scope, affected concepts, examples, alternatives, security/privacy effects, compatibility impact, and proposed acceptance evidence. Identify authors and relevant affiliations. Editorial corrections may use a smaller change record.
2. **Review:** Editors publish a candidate and a review window: at least 14 calendar days for technical changes, 30 for breaking changes, charter amendments, or governance changes. Notify known affected implementers through agreed channels. A material change restarts the relevant review period.
3. **Resolve:** Record each substantive objection, response, and outcome. Seek reasoned agreement rather than counting reactions. An author may withdraw a proposal or publish a revised draft at any time.
4. **Decide:** During bootstrap, the named stewards publish an accept, revise, defer, or reject decision with rationale, reviewers, unresolved objections, and implementation evidence. Breaking normative changes require agreement of all non-conflicted stewards and the independent reviews above. If eligible stewards are fewer than two, the change remains a draft.
5. **Release:** Archive the approved text, schema, fixtures, change log, compatibility declaration, and decision together. Technical approval does not by itself prove implementation or authorize publication of confidential contributions.

Pure corrections must not change valid data or meaning. Emergency fixes may be published as marked advisories or provisional drafts, then follow normal review; urgency must not silently alter a released contract.

## Compatibility and conformance

Stable identifiers must not acquire incompatible meanings under an unchanged version. Proposals must identify affected producers, consumers, profiles, and stored investigations, including migration losses and behavior for unknown semantics. Retired concepts retain retrievable definitions. Released artifacts remain immutable; corrections receive new identifiers or versions under the adopted compatibility policy.

This package preserves the existing release-number convention. The candidate Core contract's transition from existing graphs requires review and a migration decision.

Publish conformance claims with the precise specification, role, profile, suite version, result, and test date. Distinguish author assertions, independent tests, interoperability demonstrations, and formal certification. This proposal creates no certification program or exclusive testing authority.

## Independent stewardship and appeals

After two independent implementations and sustained external participation, propose a five-person council with staggered two-year terms and no more than one voting member from an organization or common controlling entity. Seek practitioner, implementation, research, and standards experience. Publish nominations, eligibility, selection method, and transition approval before appointing it; the bootstrap group must not present unfilled seats as representation.

The proposed council uses a quorum of four eligible members and approval by at least three. A conflicted member discloses the conflict, does not vote, and does not count toward quorum for that decision. If this prevents quorum, recruit temporary independent reviewers through a public appointment decision or defer. Funding and contributor volume confer no extra votes.

Anyone may appeal a decision within 30 days on technical, procedural, or conflict grounds. Log the appeal publicly with appropriate redaction. During bootstrap, recruit two reviewers uninvolved in the disputed decision; later, the council appoints an uninvolved appeal panel. Publish its recommendation and the resulting disposition. Until independent review is available, record the dispute as unresolved; do not claim consensus.

## Participation, rights, and privacy

Publish sponsor amounts or meaningful funding bands, conditions, and governance conflicts. No sponsor may buy a normative requirement, suppress a negative test, or receive privileged conformance status. Record meeting decisions for contributors unable to attend. Select a conduct policy and reporting contact before convening community activities.

Recommended legal work: inventory ownership and current licenses; select explicit reusable terms for specification text, schemas, code, and knowledge content; then adopt contribution and patent policies appropriate to the chosen stewardship venue. These are recommendations, not grants made by this document. Existing license labels must not be interpreted as creating new contributor patent commitments or a certification trademark policy.

Use synthetic or authorized de-identified examples by default. Contributors must have permission to submit material; provide a private reporting route for accidental disclosure and security reports once a responsible contact exists. Minimize personal information in public review records, support pseudonymous participation where feasible, and record redactions without republishing sensitive evidence.
