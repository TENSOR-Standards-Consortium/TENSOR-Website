# Technical review intake and disposition

Status: bootstrap handling procedure, October 11, 2026. This does not ratify the proposed standards governance. No invitations have been sent through this package and no public review window is claimed to have opened.

The accepted [bootstrap steward](stewardship.md) coordinates intake. Reviewers may select one bounded task: challenge requirements, inspect graph evidence routes, implement exchange, or evaluate a handoff. Review is participation, not endorsement.

1. Submit a nonsensitive Implementation report with review ID, source commit, artifact paths or TC requirement IDs, environment, reproduction, observed and expected behavior, affiliations/conflicts, and exclusions. Synthetic reproductions are preferred. Sensitive reports use SECURITY.md.
2. Assign a public finding ID using the GitHub issue number. Classify it as semantic ambiguity, evidence/route defect, exchange loss, implementation defect, governance concern, or usability issue. Identify the affected review snapshot.
3. Record the proposed disposition: accepted, needs evidence, disputed, deferred, or rejected with rationale. Link any correction, counterexample, independent review and remaining objection. A closed issue alone is not evidence that a concern was resolved.
4. Invite the reporting reviewer to check the response. Preserve their disagreement and distinguish maintainer disposition from reviewer concurrence. Do not label an author-controlled process independent.
5. Preserve the frozen snapshot. Changes to investigative meaning require a distinguishable candidate or review snapshot and a compatibility/loss note. Publish a new validation receipt for changed implementation code.
6. Before declaring a formal review window, record accepted owners, exact artifacts, start/end dates, scope, and applicable process. The governance proposal suggests 14 days for technical review and 30 days for breaking/governance changes; these are proposed until adopted, not a window started by publishing this package.

Public issues are the finding register. The initial register below records preparation, not external review:

| Record | State | Evidence / next step |
| --- | --- | --- |
| Evidence-route and assurance-policy repairs | Merged PR #9 | [PR #9](https://github.com/TENSOR-Standards-Consortium/TENSOR-Framework/pull/9); source snapshot `c82cd1c540b2ca6fbf5ba7ee3e38edcd2e1e6f8f` |
| Independent technical reviews | Not received through this package | At least two substantive reviews independent of the principal authors and each other are proposed before stable release |
| Independent exchange and CASE/UCO mapping | Unproven | Bidirectional independent implementation evidence and explicit loss report required |
| Bootstrap disclosure and infrastructure confirmations | Partially complete | Accepted founder roles; remaining items in stewardship record |

Escalate disagreement through a linked Core RFC. Until another reviewer accepts an independent role, an appeal to the same founder is not independent oversight. Do not use organization names, logos or favorable review excerpts as partner endorsements without their consent.
