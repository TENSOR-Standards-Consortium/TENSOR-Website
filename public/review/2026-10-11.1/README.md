# TENSOR institutional technical review · 2026-10-11.1

**Purpose:** assess whether TENSOR preserves investigative meaning when humans and agents hand a cyber investigation between people and tools. This is a technical review candidate, not a stable Core release, certification, institutional endorsement or invitation already sent.

AI security teams are the first recruitment audience. The standard's scope remains **all cyber investigations**; public profiles, vendor products and business policy sit above shared Core meaning.

## The frozen target

Source: Framework commit **`c82cd1c540b2ca6fbf5ba7ee3e38edcd2e1e6f8f`**, after PR #9. [Browse that exact source](https://github.com/TENSOR-Standards-Consortium/TENSOR-Framework/tree/c82cd1c540b2ca6fbf5ba7ee3e38edcd2e1e6f8f).

| Artifact | Identity | What it means |
| --- | --- | --- |
| Founding proposal | `proposals/founding-core-v0.1.0/`, proposal 0.1.0 | Purpose, 38 logical requirements and proposed governance |
| Investigation-record Core | `core/v0.1.0-draft.1/` | Trial binding, validator, schemas and two synthetic bundles |
| Evidence-route graph | `drafts/core/tensor.core.graph.json`, 0.20261011b | 103 questions, 225 edges; accompanying evidence cards and 252 author-side scenarios |
| Published graph archive | `releases/`, graph/schema 0.20260206e | Original 588-question, 1,554-edge graph; unchanged published bytes |

A graph defines reusable investigative questions and routes. A record captures a particular investigation's context, attributed evidence, assessments, decisions and revisions. The draft graph has **not** been automatically migrated into a Core record definition. The browser question catalog and legacy Studio continue to show the published graph; the new draft is available in this snapshot for source review.

## Start with one bounded task

Read [the first-hour walkthrough](walkthrough.md), then choose one:

1. **Meaning and evidence:** challenge an exact TC requirement or graph predicate with a counterexample. Does “unknown” remain distinct from a bounded negative finding? Does a positive classification require the claimed evidence?
2. **Exchange:** independently implement a small reader/writer and exchange both cases in both directions. Preserve context, omissions, disagreement, revisions and unsupported requirements. Disclose shared code and losses.
3. **Practical handoff:** ask another practitioner to explain what was investigated, why an assessment changed and what remains unresolved. Record confusion and effort; do not require matching conclusions.
4. **Standards reuse:** map one complete case to CASE/UCO and identify reuse, gaps and round-trip loss. A separately justified permanent binding remains an open decision.

Use [the review form](review-form.md). Feedback and ongoing stewardship are recorded separately from this immutable technical target in [the review process](../../docs/review-process.md) and [accepted bootstrap record](../../docs/stewardship.md). No formal review closing date is set.

## Reproduce and verify

Download `source.tar.gz` beside this file and inspect `manifest.json`. Extract into an empty directory, then run `python3 verify-snapshot.py /absolute/path/to/extracted-source`. The verifier checks archive integrity and all 175 source-file pins; it does not authenticate evidence or confer approval. Hashes are an integrity inventory, not signatures.

From the extracted source, use Node **24.21.0**, npm **11.19.0** and Python 3:

```sh
npm ci
npm run check
python3 -m unittest discover -s tests/legacy -q
python3 scripts/validate_release_contract.py
python3 scripts/evaluate_entry_scenarios.py
python3 scripts/lint_core_graph_quality.py --graph-path drafts/core/tensor.core.graph.json --entry-path drafts/core/source/entry_nodes.json --output-dir /tmp/tensor-review-assurance
```

Keep your environment, full outputs and exclusions with your finding. The archive intentionally has no `.git` directory; its identity comes from the recorded commit and byte pins. You can alternatively clone the repository and check out the full source commit detached.

## Observed baseline and limits

On October 11, 2026, source checks passed: **161 Node tests**, both Core examples, **58 Python regression tests**, release-contract validation and **252/252 graph scenarios**. Default authoring assurance also passed. `validation.json` records the commands and limits.

The graph scenarios contain seven public-report-only cases and 245 explicitly synthetic reconstructions. They are not original incident logs, independent evaluations or proof of real incident conclusions. The evaluator uses supplied normalized observations and provenance claims. Topology diagnostics do not measure investigative truth or security effectiveness.

The Core validator checks representations and declared dependencies; it does not establish evidence truth, identity, authorization, legal admissibility or safety. Human/agent local round trips use one reference implementation. Independent exchange, external reviews, CASE/UCO loss analysis, field usefulness and adopted representative governance remain unproven. Published releases and candidate schemas are unchanged by this review package.
