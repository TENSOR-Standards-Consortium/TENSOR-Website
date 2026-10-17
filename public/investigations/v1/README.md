# Cross-domain investigation examples v1

Four fictional cases use the unchanged Core `0.1.0-draft.1` binding. They span all seven investigation domains. They are additional example definitions and records, not revisions of the working graph, published releases, frozen review package, or schema.

- `soc-signin`: Morgan’s sign-in session, external forwarding rule, company approval, unresolved delivery, scoped response, and handoff. This is the interactive counterpart of the website's five-minute introduction.
- `workload-cloud-egress`: workload identity, cloud object read, independent network observations, ticket scope, unknown content delivery, and a bounded response.
- `attachment-host-tool`: mailbox delivery, independent artifact-byte comparison, process execution, application request, retained unknown-to-supported content revision, separate unknown delivery, and scoped containment approval.

- `parallel-followup`: all seven domains, independent mailbox/cloud and host/file branches, retained negative and unknown findings, and a return to the same identity question with a different principal and later interval. The handoff cites both identity contexts.

Each bundle includes an exact-byte pinned composed definition. Question IDs retain their public/vendor/company namespace, and optional question metadata records domain and layer ownership/version. Composition keeps transitions within one artifact as required by the existing binding. It does not pretend a cross-layer selection is a route in the separate public graph. `routes.mjs` explicitly authors the routes; question or timeline order creates none. One outcome can enable several targets. Decisions may select several, select one, or retain an assessment without opening another lead. Each target is assessed independently without inheriting an answer, causality or response permission.

The three layers are public example investigation questions, a fictional vendor's product-specific checks, and a fictional company's policy questions. They are authored examples rather than independent implementations or endorsements. Source evidence is fictional and unavailable; observations explicitly describe the assumed discriminators, provenance basis, and gaps. Validator success checks the record and binding, not the truth of those observations. All action records are planned. No queries, evidence retrieval, permission checks, or response actions execute.

Optional `record.metadata.walkthrough` supplies presentation order and exact assessment/decision entry references. It adds no Core requirement. Consumers can ignore it and still inspect the complete record. The website derives routes from actual definition transitions and recorded Decision selections, not adjacency between frames. The attachment case selects two leads under the original unknown content assessment, then retains a later yes revision with its own evidence. The historical unknown selections are preserved rather than relabeled as yes. All bundles explicitly use historical presentation; a current-view claim needs separately selected review decisions.

Run `node examples/investigations/v1/build.mjs` to regenerate, or add `--check` to verify deterministic bytes. `manifest.json` pins the emitted definitions, bundles, and catalog. `npm run check` includes this verification and positive/negative record tests.

Example version 1.3.0 uses descriptive subject properties in the prose and optional `QuestionInstance.metadata.subjectLabels` keyed by each exact bound URI. These labels are presentation hints, not identity or evidence. Stable entry, question, subject and route IDs are unchanged; the updated definition bytes have new digests. The Core schemas and published graph releases are unchanged.

The guided graph renders bound question occurrences, preserving the source and target instance of each selected transition. It shows unselected options as neutral previews rather than borrowing an answer from another subject. Reassessment of the same context retains history; a return with changed context opens a fresh instance. Timeline ordering does not establish event-time chronology or create a route.
