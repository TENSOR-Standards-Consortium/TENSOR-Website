# TENSOR current technical review

This package contains the **same current public reference dataset** used by the website, graph, profiles and Lab examples. There is no reviewer-only graph. The public graph has 609 questions and 2131 routes across 7 domains, with 16 event profiles, 567 qualified definitions and 3 cross-domain reference cases.

Graph: **0.20261013b**. Dataset: **urn:tensor:dataset:sha256:48840d95be44369a0d8beb34bd25aefadc21567ad316bfe5b5e295739c5551ad**. Exact source: **a1cc5eb9bd72dc014ae95f738e4b5dba31a69d6b**. `dataset.json` identifies every active artifact and its SHA-256. Graph and Core schema versions describe their respective formats; case records and vendor/company layers are contexts and additions, not alternate public datasets.

Download [the ZIP](review-package.zip). Extract it into an empty directory. Verify the source archive before extracting it with `python3 verify-snapshot.py`, then verify an extracted source directory with `python3 verify-snapshot.py /absolute/path/to/source`. The archive contains committed source at the identified commit, excluding generated `review/current` packaging to avoid recursion. Historical releases and the earlier review snapshot remain archives.

Use [the walkthrough](walkthrough.md) and [finding form](review-form.md). The candidate remains unratified. Passing author-side checks is distinct from independent review, authenticated incident evidence and interoperability between separately developed implementations.

## Reproduce

From the extracted source, use Node 24.21.0 and Python 3.11 or later:

```sh
npm ci
npm run check
node scripts/build_dataset.mjs --check
python3 -m unittest discover -s tests/legacy -q
python3 scripts/verify_semantic_review.py
python3 scripts/restore_original_questions.py --check
python3 scripts/build_event_profiles.py --check
python3 scripts/audit_graph_coverage.py --check
python3 scripts/evaluate_entry_scenarios.py
python3 scripts/validate_release_contract.py
```

`validation.json` records observed results and exclusions. Current stewardship and the public finding process are in `docs/stewardship.md` and `docs/review-process.md` in the source. No invitations are sent by publishing this package.
