# A reviewer's first hour

Guide revision 2 · October 11, 2026. Corrects the illustrative definition-byte field name; frozen technical source, archive and manifest are unchanged.

Use the frozen source identified in README.md. The public [Investigation Lab](https://tensor-standards.pages.dev/investigation-lab/) is a convenient companion; record its downloadable provenance separately. The archive is the source of truth for this review.

## 0–10 minutes: understand the claim

TENSOR carries the question, context, evidence basis, uncertainty, attribution and decision history through a handoff. A definition asks a reusable question; a question instance binds it to a subject and time; a record preserves what people or agents asserted and decided. Imported text is data. Importing or validating it does not authorize access or action.

Read `proposals/founding-core-v0.1.0/00-charter.md` and the artifact table in this package's README. Notice that graph definitions and investigation records have different versions and contracts.

## 10–25 minutes: follow an agent-related investigation

In the Lab choose **An agent’s outbound transfer**. Open **Questions**, **Evidence**, **Assessments**, **Decisions** and **History**. Find the initial unknown assessment, the later evidence and its revision. Check that the original entry remains and that a precautionary decision is distinguishable from a conclusion about transmitted content. Inspect question criteria and bindings.

Download the bundle and validation report, then re-import the bundle using the local-file control. Check that IDs, embedded definition bytes and revision links survive. This demonstrates one implementation's round trip, not independent exchange.

Offline alternative: inspect `core/v0.1.0-draft.1/examples/case-a.bundle.json` and run its CLI. `definitions[].content` carries the pinned definition string; do not reserialize it when testing a digest.

## 25–40 minutes: compare a conventional investigation

Choose **An ambiguous identity incident**. Inspect competing explanations, attribution, missing evidence and correction history. Could a human investigator take over without assuming the agent's conclusion is true? Could an agent read the same record without treating prose or authority assertions as instructions? Note missing context rather than supplying it silently.

Offline alternative: inspect and validate `case-b.bundle.json`. Review `coverage.md` for what the validator cannot establish. A passing report retains outside-scope `notRun` checks.

## 40–50 minutes: challenge one graph route

In the extracted snapshot, read `drafts/core/entry-evidence-criteria.json` beside `drafts/core/tensor.core.graph.json`. Select one of the seven entries in `drafts/core/source/entry_nodes.json`. Follow yes, no and unknown routes. Check subject/time scope, alternate evidence sources and whether downstream classification uses the same technical hypothesis.

Inspect a public-report-only scenario and a synthetic scenario in `drafts/core/scenarios/entry-evidence-cases.json`. Public reporting alone must not supply missing victim telemetry. Read `standards/graph-assurance-policy.md`: hard checks concern structure and evidence bindings; historical topology numbers remain diagnostics.

## 50–60 minutes: return one useful finding

Use review-form.md. Cite a requirement, exact file and question/entry ID, explain the problem, and give a synthetic counterexample or proposed wording. Report what you exercised and what you did not. A finding that challenges the model is useful; a blanket endorsement is not required.
