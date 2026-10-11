# Founding proposal validation boundaries

The documents in this directory are proposal `0.1.0`. The Core contract retains all 38 original proposed requirements, TC-01 through TC-38. Neither the proposal nor its illustrative JSON is a ratified standard.

## Original illustrative artifacts

The four example JSON files, manifest, and limited authoring checker are preserved from the founding draft. Run from this directory:

```sh
python3 examples/check_authoring.py
```

The checker examines syntax, declared digests, selected reference closure, attribution, parameters, transitions, uncertainty, and revisions for these examples. It is not a general implementation of the contract. See [the examples' coverage and limitations](examples/README.md). A successful result establishes local consistency only.

## Separate candidate evidence

The [implementation candidate](https://github.com/TENSOR-Standards-Consortium/TENSOR-Framework/blob/codex/core-investigation-contract/core/v0.1.0-draft.1/README.md) provides a trial binding, schemas, runtime, CLI, candidate examples, and focused tests. Reproduce its checks from the repository root with `npm ci` followed by `npm run check`. Retain the exact commit, environment, command output, fixture hashes, and known exclusions when publishing a result.

The [candidate coverage statement](https://github.com/TENSOR-Standards-Consortium/TENSOR-Framework/blob/codex/core-investigation-contract/core/v0.1.0-draft.1/coverage.md) distinguishes machine checks from evidence truth, identity verification, authorization, independent exchange, and institutional review. This document does not substitute an earlier test result for a fresh run on a changed implementation.

The C01–C12 independent-exchange trials are **notRun** until separately developed tools exchange the cases and publish the specified evidence. Internal editorial review, a second interface over one runtime, or another process checking the same code is not independent implementation evidence.

## Stable-release limits

The trial makes binding, equality, namespace syntax, and partial-exchange choices testable. Standards reuse, the permanent binding, profile policy, namespace governance, rights policies, accepted stewardship, and independent review remain stable-release decisions. Consult the [release checklist](https://github.com/TENSOR-Standards-Consortium/TENSOR-Framework/blob/codex/core-investigation-contract/docs/release-checklist.md).

All example actors, evidence, policies, approvals, and actions are synthetic. No action described in a record was executed by copying or validating it. No endorsement, governance appointment, partnership, certification, or stable release is established by these documents.
