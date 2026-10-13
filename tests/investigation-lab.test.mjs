import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parseBundle, serializeBundle, validateBundle, semanticEqual } from '../src/vendor/tensor-core/index.mjs';
import {
  CASES, MAX_BUNDLE_BYTES, asText, attributionLabel, decodeBundleBytes, downloadName, filterEntries, getDefinitionQuestions, getEntries,
  groupEntries, indexEntries, questionKey, serializeForLab, summarizeValidation, validateImportSize,
} from '../src/lib/investigationLab.mjs';

async function example(id = 'case-a') {
  const sample=CASES.find(c=>c.id===id);
  const text = await readFile(new URL(`../public${sample.path}`, import.meta.url), 'utf8');
  return parseBundle(validateImportSize(text), { maxBytes: MAX_BUNDLE_BYTES });
}

test('all selectable reference cases validate against the vendored runtime', async () => {
  for (const sample of CASES) {
    const bundle = await example(sample.id);
    const report = await validateBundle(bundle, { maxBytes: MAX_BUNDLE_BYTES });
    assert.equal(report.status, 'pass', JSON.stringify(report.checks.filter((check) => check.status !== 'pass')));
    assert.ok(report.checks.length > 20, 'examples must receive semantic checks, not only envelope validation');
    const entries = getEntries(bundle);
    const groups = groupEntries(entries);
    assert.ok(groups.QuestionInstance.length >= 2);
    assert.ok(groups.Assessment.some((entry) => entry.outcome === 'unknown'));
    assert.ok(groups.Decision.length > 0);
    const questions = await getDefinitionQuestions(bundle);
    for (const instance of groups.QuestionInstance) {
      assert.ok(questions.get(questionKey(instance.definitionRef, instance.questionId))?.prompt);
    }
  }
});

test('the Lab export path retains opaque metadata, revisions and exact definition strings', async () => {
  const bundle = await example();
  bundle.record['urn:example:vendor:metadata'] = { unknown: true, nested: ['quoted " text', { '0': 'zero', '': 'empty key' }] };
  const imported = parseBundle(serializeForLab(bundle), { maxBytes: MAX_BUNDLE_BYTES });
  assert.equal(semanticEqual(bundle, imported), true);
  assert.equal(bundle.definitions[0].content, imported.definitions[0].content);
  assert.deepEqual(bundle.record.entries.filter((entry) => entry.supersedes), imported.record.entries.filter((entry) => entry.supersedes));
  assert.deepEqual(bundle.record['urn:example:vendor:metadata'], imported.record['urn:example:vendor:metadata']);
});

test('an edited digest fails validation without losing the imported content', async () => {
  const bundle = await example();
  bundle.definitions[0].content += '\n';
  const report = await validateBundle(bundle);
  assert.equal(report.status, 'fail');
  assert.ok(report.checks.some((check) => check.status === 'fail' && check.requirement === 'TC-06'));
  assert.equal(parseBundle(serializeBundle(bundle)).definitions[0].content, bundle.definitions[0].content);
  assert.equal(summarizeValidation(report).title, 'Validation failed');
});

test('unsupported required extensions remain visible as indeterminate, not passed', async () => {
  const bundle = await example();
  bundle.record.extensions = [{ namespace: 'urn:example:vendor:required', version: '1', requiredForInterpretation: true, data: { rule: 'not understood' } }];
  const report = await validateBundle(bundle);
  assert.equal(report.status, 'indeterminate');
  assert.ok(summarizeValidation(report).counts.indeterminate > 0);
  assert.equal(summarizeValidation(report).title, 'Interpretation remains indeterminate');
  assert.deepEqual(parseBundle(serializeBundle(bundle)).record.extensions, bundle.record.extensions);
});

test('import limits count UTF-8 bytes and reject empty or duplicate-member JSON', () => {
  assert.throws(() => validateImportSize(' '), /empty/);
  assert.throws(() => validateImportSize('a'.repeat(MAX_BUNDLE_BYTES + 1)), /2 MiB/);
  assert.throws(() => validateImportSize('é'.repeat(MAX_BUNDLE_BYTES / 2 + 1)), /2 MiB/);
  assert.throws(() => parseBundle('{"format":"tensor-investigation-bundle","format":"other"}'), /Duplicate JSON member/);
  assert.equal(validateImportSize('{}'), '{}');
  assert.throws(() => decodeBundleBytes(new Uint8Array([123, 34, 97, 34, 58, 34, 255, 34, 125])), /invalid UTF-8/);
  assert.equal(decodeBundleBytes(new TextEncoder().encode('{"label":"é"}')), '{"label":"é"}');
});

test('readable export falls back to compact JSON when formatting would exceed the import limit', async () => {
  const bundle = await example();
  bundle.record.metadata = { padding: Array.from({ length: 18000 }, () => 'x'.repeat(106)) };
  const compactBytes = new TextEncoder().encode(JSON.stringify(bundle)).byteLength;
  assert.ok(compactBytes < MAX_BUNDLE_BYTES);
  assert.ok(new TextEncoder().encode(serializeBundle(bundle)).byteLength > MAX_BUNDLE_BYTES);
  const exported = serializeForLab(bundle);
  assert.ok(new TextEncoder().encode(exported).byteLength <= MAX_BUNDLE_BYTES);
  assert.equal(semanticEqual(bundle, parseBundle(exported, { maxBytes: MAX_BUNDLE_BYTES })), true);
});

test('view indexing refuses ambiguous IDs and preserves every history entry', () => {
  const entries = [{ id: 'urn:x:a', type: 'Actor', label: 'First' }, { id: 'urn:x:a', type: 'Actor', label: 'Conflicting' }, { id: 'urn:x:b', type: '__proto__' }];
  const bundle = { record: { entries: [null, 1, ...entries] } };
  assert.equal(getEntries(bundle).length, 3);
  assert.equal(indexEntries(entries).get('urn:x:a'), null);
  assert.equal(groupEntries(entries).Actor.length, 2);
  assert.equal(groupEntries(entries).__proto__.length, 1);
  assert.equal(Object.getPrototypeOf(groupEntries(entries)), null);
  const malformedId = { toString: 0 };
  assert.doesNotThrow(() => asText(malformedId));
  assert.equal(indexEntries([{ id: malformedId, type: 'Actor' }]).size, 0);
});

test('definition lookup includes artifact identity and refuses ambiguous question IDs', async () => {
  const bundle = await example();
  const original = await getDefinitionQuestions(bundle);
  assert.equal(original.size, 2);
  const instance = bundle.record.entries.find((entry) => entry.type === 'QuestionInstance');
  assert.equal(original.get(questionKey({ ...instance.definitionRef, sha256: '0'.repeat(64) }, instance.questionId)), undefined);
  bundle.definitions.push({ ...bundle.definitions[0] });
  assert.equal((await getDefinitionQuestions(bundle)).size, 0);
});

test('following a reference targets the exact entry rather than every referring entry', () => {
  const entries = [{ id: 'urn:a', reference: 'urn:target' }, { id: 'urn:b', reference: 'urn:target' }, { id: 'urn:target' }];
  assert.equal(filterEntries(entries, 'urn:target').length, 3);
  assert.deepEqual(filterEntries(entries, 'urn:target', 'urn:target'), [entries[2]]);
});

test('attribution never presents a non-Actor entry or ambiguous ID as an actor', () => {
  const actor = { id: 'urn:actor', type: 'Actor', label: 'Maya' };
  const evidence = { id: 'urn:evidence', type: 'EvidenceReference', label: 'Misleading actor label' };
  const index = indexEntries([actor, evidence]);
  assert.equal(attributionLabel({ attribution: { actorId: actor.id } }, index), 'Maya');
  assert.equal(attributionLabel({ attribution: { actorId: evidence.id } }, index), 'Attribution unresolved');
  assert.equal(attributionLabel({ attribution: { actorId: actor.id } }, indexEntries([actor, { ...actor }])), 'Attribution unresolved');
});

test('display values remain text and download names cannot contain path traversal', () => {
  assert.equal(asText({ label: '<script>alert(1)</script>' }), '{"label":"<script>alert(1)</script>"}');
  const name = downloadName({ record: { investigationId: 'urn:example:../../name\"<script>' } });
  assert.match(name, /^tensor-[a-zA-Z0-9_-]+\.bundle\.json$/);
  assert.ok(name.length < 100);
  assert.equal(downloadName(null, 'validation'), 'tensor-investigation.validation.json');
});
