import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { definitionView, recordedView } from '../src/lib/graphViews.mjs';
import { getDefinitionQuestions, getEntries, questionKey } from '../src/lib/investigationLab.mjs';
const read = async (path) => JSON.parse(await readFile(new URL(`../public/${path}`, import.meta.url), 'utf8'));
const example = (id = 'case-a') => read(`core/0.1.0-draft.1/examples/${id}.bundle.json`);
const instance = (id, questionId = 'same-definition') => ({ type: 'QuestionInstance', id, questionId });
const assessment = (id, targetInstanceId, outcome) => ({ type: 'Assessment', id, targetInstanceId, outcome });
const decision = (id, source, target, selectedAssessmentId) => ({ type: 'Decision', id, targetInstanceId: source, selectedAssessmentId, selections: [{ transitionId: 'declared-transition', targetInstanceId: target }] });
const bundle = (entries) => ({ record: { entries } });

test('working graph and criteria stay pinned together and every route/entry resolves', async () => {
  const graph = await read('graphs/working/tensor.core.graph.json');
  const criteria = await read('graphs/working/entry-evidence-criteria.json');
  const bytes = await readFile(new URL('../public/graphs/working/tensor.core.graph.json', import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), criteria.graphSha256);
  assert.equal(graph.version, criteria.graphVersion);
  assert.deepEqual(new Set(graph.entryNodeIds), new Set([
    ...Object.values(criteria.domains).map(domain => domain.entry), ...criteria.restoration.resumeEntryIds,
    ...graph.nodes.filter(n=>!graph.edges.some(e=>e.target===n.id)).map(n=>n.id),
  ]));
  assert.equal(graph.entryNodeIds.length, 374);
  assert.equal(graph.nodes.length, 609);
  const ids = new Set(graph.nodes.map((node) => node.id));
  for (const node of graph.nodes) {
    const rule = criteria.rules[criteria.nodes[node.id].rule];
    for (const outcome of ['yes', 'no', 'unknown']) assert.ok(rule[outcome]);
  }
  for (const entry of graph.entryNodeIds) assert.ok(ids.has(entry));
  for (const edge of graph.edges) assert.ok(ids.has(edge.source) && ids.has(edge.target));
});

test('focused working view contains exactly the selected node and direct neighbors', async () => {
  const graph = await read('graphs/working/tensor.core.graph.json');
  const focused = definitionView(graph, 'Q1');
  const expected = new Set(['Q1']);
  for (const edge of graph.edges) { if (edge.source === 'Q1') expected.add(edge.target); if (edge.target === 'Q1') expected.add(edge.source); }
  assert.deepEqual(new Set(focused.nodes.map((node) => node.id)), expected);
  assert.ok(focused.edges.every((edge) => expected.has(edge.source) && expected.has(edge.target)));
  assert.equal(definitionView(graph, 'missing').selected, graph.entryNodeIds[0]);
  assert.equal(definitionView(graph, 'Q1', true).nodes.length, graph.nodes.length);
  assert.equal(definitionView(graph, 'Q1', true).edges.length, graph.edges.length);
});

test('both reference scenarios retain each assessment and render only explicit selections', async () => {
  for (const id of ['case-a', 'case-b']) {
    const original = await example(id);
    const before = JSON.stringify(original);
    const questions = await getDefinitionQuestions(original);
    const view = recordedView(original, questions);
    const entries = getEntries(original);
    assert.equal(view.nodes.length, entries.filter((entry) => entry.type === 'QuestionInstance').length);
    assert.equal(view.edges.length, entries.filter((entry) => entry.type === 'Decision').flatMap((entry) => entry.selections || []).length);
    assert.ok(view.nodes.every((node) => node.question?.prompt));
    assert.ok(view.nodes.flatMap((node) => node.assessments).some((entry) => entry.outcome === 'unknown'));
    assert.deepEqual(view.issues, []);
    assert.equal(JSON.stringify(original), before, 'visualization must not mutate bundle content or definitions');
  }
});

test('case A keeps unknown and its later yes revision without rewriting the earlier selected outcome', async () => {
  const original = await example();
  const view = recordedView(original, await getDefinitionQuestions(original));
  const revised = view.nodes.find((node) => node.assessments.some((entry) => entry.supersedes));
  assert.ok(revised.assessments.some((entry) => entry.outcome === 'unknown'));
  assert.ok(revised.assessments.some((entry) => entry.outcome === 'yes' && entry.supersedes));
  for (const edge of view.edges) {
    const selected = original.record.entries.find((entry) => entry.id === edge.entryId).selectedAssessmentId;
    assert.equal(edge.outcome, original.record.entries.find((entry) => entry.id === selected).outcome);
  }
});

test('replay follows file order and never invents causality from timestamps or assessment adjacency', () => {
  const a = instance('a'); const b = instance('b');
  a.recordedAt = '2030-01-01T00:00:00Z'; b.recordedAt = '2020-01-01T00:00:00Z';
  const record = bundle([a, b, assessment('yes', 'a', 'yes'), decision('go', 'a', 'b', 'yes')]);
  assert.deepEqual(recordedView(record, new Map(), 2).entries.map((entry) => entry.id), ['a', 'b']);
  assert.equal(recordedView(record, new Map(), 3).edges.length, 0);
  assert.equal(recordedView(record, new Map(), 4).edges.length, 1);
  assert.equal(recordedView(record, new Map(), 0).nodes.length, 0);
});

test('repeated definitions and cycles retain individual instances and explicit direction', () => {
  const record = bundle([instance('a'), instance('b'), assessment('a-yes', 'a', 'yes'), assessment('b-no', 'b', 'no'), decision('forward', 'a', 'b', 'a-yes'), decision('back', 'b', 'a', 'b-no')]);
  const view = recordedView(record);
  assert.equal(view.nodes.length, 2);
  assert.notEqual(view.nodes[0].id, view.nodes[1].id);
  assert.deepEqual(view.edges.map(({ source, target }) => [source, target]), [['instance-0', 'instance-1'], ['instance-1', 'instance-0']]);
});

test('missing or duplicate IDs never resolve silently, including earlier replay prefixes', () => {
  const record = bundle([instance('a'), instance('b'), decision('go', 'a', 'b', 'missing'), instance('a')]);
  const view = recordedView(record, new Map(), 3);
  assert.equal(view.nodes.length, 1);
  assert.equal(view.edges.length, 0);
  assert.ok(view.issues.length >= 1);
  assert.equal(recordedView(bundle([instance('a'), decision('go', 'a', 'missing', 'none')])).edges.length, 0);
});

test('unavailable or mismatched selected assessments stay unresolved rather than becoming findings', () => {
  for (const extra of [[], [assessment('selected', 'other-instance', 'yes')]]) {
    const record = bundle([instance('a'), instance('b'), ...extra, decision('go', 'a', 'b', 'selected')]);
    const view = recordedView(record);
    assert.equal(view.edges[0].outcome, 'unresolved');
    assert.ok(view.issues.some((issue) => issue.includes('selected assessment')));
  }
});

test('large records keep a complete text model while canvas labels are bounded', () => {
  const entries = Array.from({ length: 301 }, (_, i) => instance(`i-${i}`));
  const record = bundle(entries);
  const questions = new Map([[questionKey(undefined, 'same-definition'), { prompt: 'A'.repeat(10000) }]]);
  const view = recordedView(record, questions);
  assert.equal(view.nodes.length, 301);
  assert.ok(view.nodes[0].label.length < 160);
  assert.equal(view.nodes[0].question.prompt.length, 10000, 'complete text stays available outside the canvas');
});
