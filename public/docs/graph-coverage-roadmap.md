# Bringing the full investigation knowledge forward

Status: proposed migration work, not approved semantic mappings. TENSOR remains a public standard for all cyber investigations, usable by humans and agents. Public domain profiles are part of this work; vendors and business policy can extend above them.

## What happened

The preserved release `0.20260206e` has 588 questions and 1,554 routes. The working draft `0.20261011b` has 103 questions and 225 routes: 82 rewritten original IDs and 21 new questions. All 82 retained IDs have changed question text. Shared IDs do not establish equivalent meaning.

The sequence is 588 → 219 → 184 → 103. The February technical reduction removed 369 original IDs. Entry evidence repairs detached 49 more and introduced 14 questions. Positive-route evidence repairs detached another 88 and introduced seven. Those repairs removed unsupported pivots and assertions. Reattaching those edges solely for reachability would undo that work.

**506 original questions are absent from the active draft.** They remain retrievable in the release, but preservation does not establish active coverage. Some may be duplicates or belong in public domain profiles; that must be demonstrated question by question. Seven domains and eight archetypes are a structural inventory, not proof of investigation completeness. No comprehensive approved equivalence mapping currently exists.

The reproducible [coverage inventory](../drafts/core/coverage-inventory.json) accounts for every original question, exact source digests, historical removal stage, and the 21 new IDs. Its lineage statuses are factual membership comparisons; all semantic dispositions remain pending. Regenerate with `python3 scripts/audit_graph_coverage.py`; verify with `--check`.

## Prioritized delivery sequence

1. **Publish the coverage baseline and full atlas.** Expose both graph versions, preserve source bytes, and stop implying that 103 questions replaces all 588. This package establishes the baseline; it does not finish migration.
2. **Review the 137 questions detached by evidence repairs first.** Work in seven domain batches, prioritizing common investigation paths and uncertainty handling. For each original question record the proposition, bound subject/time, evidence for yes/no/unknown, applicability, route rationale, and distinct capability it adds. Identify missing prerequisites before adding downstream questions. Assess the 82 rewritten IDs in the same batches; they also need equivalence review.
3. **Review the 369 questions removed during consolidation.** Compare full prompts and routes against proposed replacements. Classify each as restored, revised, merged, split, public-profile, or deferred. Merges require explicit many-to-one mappings and a record of information lost. Deferrals require rationale and an acknowledged coverage gap. Do not classify a question as redundant from ID, wording similarity, or structural metrics alone.
4. **Release additive domain batches with evidence.** Each batch carries a versioned definition, coverage-ledger revision, review sign-off, positive/negative/unknown scenarios, ambiguous and contradictory evidence, cross-domain pivots, and human/agent walkthroughs. Reuse existing schema unless a demonstrated contract defect requires a separately reviewed proposal. Preserve prior releases and the frozen institutional review package.
5. **Validate end-to-end scope before claiming complete migration.** Account for all 588 originals with reviewed dispositions and all 21 additions. Test realistic investigations spanning identity/cloud privilege abuse, endpoint malware, network intrusion, email compromise, application compromise, file integrity/exfiltration, and autonomous-agent/tool misuse. Include benign explanations and unresolved evidence. Structural presence and scenario counts alone cannot prove completeness; publish residual gaps and independent reviewer findings.

## Acceptance for each reviewed disposition

- Pin original definition identity, version, digest, and question/route IDs.
- Identify target definition references; never rely on an unchanged numeric ID.
- State retained meaning, changed meaning, omitted details, and applicability limits.
- Give evidence criteria and explain each route, including no/unknown, without asserting intent, authority, or maliciousness from a matching event alone.
- Provide scenario references and observed results; identify reviewer and review date.
- Publish disagreement, unresolved mapping, and deferred scope as explicit gaps.

The next deliverable is the first reviewed domain batch, not a promise to restore a particular node count. The institutional package can be reviewed now as a bounded candidate, provided this migration gap accompanies it. It cannot yet be presented as a demonstrated full-coverage successor to the published graph.
