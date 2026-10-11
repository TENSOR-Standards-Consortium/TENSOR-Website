# TENSOR Core candidate implementation

**Binding version: `0.1.0-draft.1`. Proposal: `0.1.0`. Status: candidate for public review, unratified.**

This directory turns the founding proposal's common investigative layer into a portable data contract. It supports investigations conducted by humans, agents, and mixed teams in any cyber domain. Vendor integrations, operational tools, and organizational policies remain separate layers. Importing a record never authorizes an action.

This is a new candidate track. It does not replace, reclassify, or migrate the existing `releases/core/` graph artifacts. A legacy graph is a reusable investigation definition; it is not evidence that an investigation occurred.

## Start locally

Use Node.js 22 or newer:

```sh
npm ci
npm run check
node core/v0.1.0-draft.1/cli.mjs core/v0.1.0-draft.1/examples/case-a.bundle.json
```

The CLI writes a JSON validation report. Exit codes are `0` for bounded checks passing, `1` for failure, `2` for indeterminate interpretation, and `64` for usage or input errors. A passing result does not mean all Core requirements are automatically decidable. Each report identifies its scope, exclusions, and checks that were not run.

The runtime has **no third-party runtime dependencies** and uses no dynamic code generation. Ajv and its formats package are development dependencies used to independently check the published schema syntax and structural evaluator parity. No registry publishing is configured; `package.json` is private.

## What to read

- [Candidate binding](binding.md): wire representation, equality, extensions, partial exchange, revision and review rules.
- [JSON Schemas](schemas/): separate bundle, record and definition schemas in Draft 2020-12 form.
- [Examples](examples/README.md): two synthetic cases, separate exact-byte definitions, records and self-contained bundles.
- [Check coverage](coverage.md): automated boundaries and requirements needing human or independent review.

## Browser and Node API

```js
import {
  parseBundle, validateBundle, serializeBundle, semanticEqual
} from './core/v0.1.0-draft.1/index.mjs';

const bundle = parseBundle(text, { maxBytes: 2 * 1024 * 1024 });
const report = await validateBundle(bundle, { maxBytes: 2 * 1024 * 1024 });
const exportedText = serializeBundle(bundle, { maxBytes: 2 * 1024 * 1024 });
console.assert(semanticEqual(bundle, parseBundle(exportedText)));
```

`parseBundle` is synchronous, rejects duplicate JSON members and non-JSON values, and checks the transport envelope. It does not imply semantic validity. `validateBundle` is asynchronous because it verifies SHA-256 using Web Crypto. `serializeBundle` is synchronous and preserves all JSON content, including opaque metadata; it does not validate or repair the investigation. Its optional limits match the parser's, and `pretty: false` requests compact output. If pretty output would exceed the byte budget, it falls back to compact output so a valid value remains reimportable under the same budget. A caller may retain and export an invalid record for diagnosis, but must not present it as valid. `semanticEqual` compares parsed values according to this candidate binding.

The browser requires a secure context with Web Crypto. Modules use only relative imports. No runtime module imports Node APIs. The CLI alone imports filesystem APIs. To decode a byte upload, use `new TextDecoder('utf-8', { fatal: true })`; a permissive decoder may replace invalid bytes before the parser sees them.

`validateBundle` returns:

```json
{
  "status": "pass | fail | indeterminate",
  "bindingVersion": "0.1.0-draft.1",
  "scope": { "proposal": "0.1.0", "claims": "bounded candidate checks", "exclusions": [] },
  "checks": [{ "id": "semantic.1", "requirement": "TC-23", "status": "pass | fail | indeterminate | notRun", "message": "...", "path": "/record/entries/7" }],
  "transitions": [],
  "unresolvedReviews": [],
  "summary": { "entries": 20, "suppliedDefinitions": 1, "transitionDecisions": 1 }
}
```

The snippet describes the response shape; its union strings are explanatory placeholders. Check IDs are local report handles, not stable requirement identifiers. Use `requirement` and `path` to relate a finding to a contract requirement and input. A top-level failure takes precedence over indeterminate. Otherwise, any indeterminate check makes the result indeterminate; `notRun` does not become `pass` and remains visible in the report.

Defaults cap JSON at 8 MiB, nesting at 64, values at 100,000, entries at 10,000, supplied definitions at 100, report checks at 20,000, and dependency-analysis steps at 500,000. Callers can lower each bound with `maxBytes`, `maxDepth`, `maxNodes`, `maxEntries`, `maxDefinitions`, `maxChecks`, or `maxDependencySteps`. Exceeding a budget fails safely. A sufficiently reference-heavy record can reach the check or dependency-work budget before reaching the entry limit. A stopped validation does not retain passing transition results whose prerequisite analysis could not finish.

Optional `previousRecords: [record, ...]` compares immutable entry and snapshot identities against supplied history. It also requires a new snapshot to identify a supplied source snapshot when it represents changed content in that investigation. This does not establish integrity against unseen history or validate an append-only storage system.

## Maintenance

`schemas.mjs` is the single schema source used by the runtime. Regenerate public schema JSON with `node core/v0.1.0-draft.1/scripts/write-schemas.mjs`; `npm run check:schemas` detects drift. The focused schema evaluator implements only the keywords emitted by that source. Consumers may use a full JSON Schema Draft 2020-12 implementation, but must also apply the candidate semantic rules.

No test result here proves independent implementation interoperability. That next gate requires a separately implemented reader/exchanger, identified versions and artifacts, loss reporting, and externally reproducible results.
