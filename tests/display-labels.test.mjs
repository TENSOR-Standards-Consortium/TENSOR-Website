import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { questionLabel, compactQuestionLabel, propertyLabel, subjectLabel, entryTitle, valueLabel, questionKey } from '../src/lib/displayLabels.mjs';
import { getDefinitionQuestions, indexEntries } from '../src/lib/investigationLab.mjs';
import { recordedView } from '../src/lib/graphViews.mjs';
import { caseModel } from '../src/lib/caseInvestigations.mjs';

test('missing properties never become inferred names from opaque IDs', () => {
  for (const value of ['urn:example:host:x-644', 's-17', 'X644', { id: 'x-644' }]) assert.equal(propertyLabel(value), 'Name not supplied');
  assert.equal(propertyLabel({ id: 'x-644', hostname: 'finance-laptop.example' }), 'finance-laptop.example');
  assert.equal(questionLabel({ id: 'X644', text: 'Was the invoice attachment opened?' }), 'Was the invoice attachment opened?');
  assert.doesNotMatch(valueLabel({ subject: 'urn:example:host:x-644' }), /x-644/);
  assert.equal(propertyLabel({ label: '<script>literal text</script>' }), '<script>literal text</script>', 'React renders labels as text');
  assert.equal(propertyLabel({ path: '/reports/quarterly.pdf' }), '/reports/quarterly.pdf');
  assert.equal(valueLabel('https://evidence.example/reports/receipt'), 'https://evidence.example/reports/receipt');
  assert.ok(compactQuestionLabel({ text: 'A '.repeat(100) }).length <= 46);
});

test('subject properties apply only to their exact binding; display cannot change identity', () => {
  const a = { id: 'a', type: 'QuestionInstance', subjectBindings: { host: 'urn:host:a' }, metadata: { subjectLabels: { 'urn:host:a': 'Finance workstation', 'urn:host:b': 'Other host' } } };
  const b = structuredClone(a); b.id = 'b'; b.subjectBindings.host = 'urn:host:b';
  assert.equal(subjectLabel(a), 'host: Finance workstation');
  assert.equal(subjectLabel(b), 'host: Other host');
  delete b.metadata.subjectLabels['urn:host:b'];
  assert.match(subjectLabel(b), /name not supplied/);
  const duplicate = indexEntries([{ ...a, id: 'urn:instance' }, { ...b, id: 'urn:instance' }]);
  const assessment = { type: 'Assessment', targetInstanceId: 'urn:instance', outcome: 'yes' };
  assert.equal(entryTitle(assessment, { entriesById: duplicate }), 'Assessment');
});

test('all case labels are descriptive while records, routes and definition bytes remain intact', async () => {
  const catalog = JSON.parse(await readFile(new URL('../public/investigations/v1/catalog.json', import.meta.url)));
  for (const sample of catalog.scenarios) {
    const bundle = JSON.parse(await readFile(new URL(`../public/investigations/v1/${sample.bundle}`, import.meta.url)));
    const before = JSON.stringify(bundle), questions = await getDefinitionQuestions(bundle), entriesById = indexEntries(bundle.record.entries);
    const model = caseModel(bundle), view = recordedView(bundle, questions);
    for (const node of model.graph.nodes) { assert.doesNotMatch(node.displayLabel, /\bS\d+\b/); assert.equal(node.title, node.question.metadata.title); }
    for (const entry of bundle.record.entries.filter(e=>e.type==='QuestionInstance')) {
      assert.equal(entryTitle(entry, { questions, entriesById }), questions.get(questionKey(entry.definitionRef, entry.questionId)).prompt);
      assert.doesNotMatch(subjectLabel(entry), /urn:|\b(?:s-42|job-17|req-42)\b/);
    }
    assert.equal(view.nodes.length, bundle.record.entries.filter(e=>e.type==='QuestionInstance').length);
    assert.equal(JSON.stringify(bundle), before);
  }
});
