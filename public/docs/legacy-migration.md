# Legacy graph preservation and migration inventory

TENSOR keeps the existing graph work. The release catalog currently selects graph/schema `0.20260206e` (588 questions, 1,554 edges); the separate working graph is `0.20261012b` (609 questions, 1,554 edges). Those artifacts retain their original contracts and identifiers.

The active draft now includes all 588 original IDs and 21 repair questions. The 82 prior evidence repairs remain; 506 originals return with revised predicates, criteria and routes after author analysis. The earlier 219-, 184- and 103-question drafts remain historical stages. See the [coverage inventory and review roadmap](graph-coverage-roadmap.md) and [per-ID restoration analysis](../drafts/core/reviews/2026-10-12-restoration/README.md). Reinclusion does not establish source/target equivalence, independent semantic approval or full investigative coverage.

The new candidate adds portable records of actual investigative reasoning. It does not automatically migrate the graphs or fabricate completed investigations from reusable questions.

## Produce an inventory

From the repository root, write to a new file outside `releases/`:

```sh
python3 scripts/inventory_legacy_graph.py --graph-path releases/core/graphs/v0.20260206e/tensor.core.graph.json --source-id https://github.com/TENSOR-Standards-Consortium/TENSOR-Framework/tree/main/releases/core/graphs --output /tmp/tensor-legacy-inventory.json
```

The command refuses to overwrite an existing output. It records the exact input digest and version, preserves parsed legacy questions/edges, and proposes deterministic source-scoped identifiers for human review. The source URI identifies a definition series; the digest identifies the actual bytes. A mutable repository URL alone is not an artifact pin.

## Review before mapping

For every candidate question, identify the original source ID and review its proposition, subject, time, parameter types, evidence needs, and criteria for yes/no/unknown. Preserve anything not yet resolved as a gap. Review edge guards and differences between the legacy DAG rule and the candidate's instance-based support for revisiting a question. Declare metadata and extensions explicitly.

An approved migration must create a new artifact/version and include its mapping revision, source identity and digest, losses, unresolved questions, and validation results. Keep the original graph retrievable. An inventory is neither an approved migration nor a conformance assertion.

## Check preservation

```sh
python3 scripts/validate_release_contract.py
python3 -m unittest discover -s tests/legacy -v
```

For an exact branch review, compare all pre-existing `releases/` files with the baseline `221e7d0542df6d51f882f1ab26689084dd976ea9`. A later release needs its own recorded baseline. Never regenerate checksums merely to hide a historical artifact change.
