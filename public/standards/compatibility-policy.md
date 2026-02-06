# TENSOR Compatibility Policy

## Scope
The compatibility policy defines how TENSOR core graph/schema releases evolve while preserving deterministic investigation semantics.

## Rules
1. Major releases may introduce breaking schema or semantic changes.
2. Minor releases may add nodes, edges, categories, and extension guidance without breaking existing valid graphs.
3. Patch releases may correct documentation, labels, examples, or metadata without semantic changes.
4. Node IDs and edge ID encoding remain stable unless explicitly deprecated.
5. Deprecated fields and semantics remain supported for at least 365 days.

## Layering model
Core investigation semantics are governed by the consortium. Organization and vendor logic should be implemented in overlay layers so business/tooling behavior can evolve independently of core investigative semantics.

## Validation requirement
All production graph packages should be validated in CI against the pinned schema version before publication.
