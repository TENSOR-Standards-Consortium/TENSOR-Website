import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { checkLegacyGraphStructure, mergeLegacyGraphWithLayers } from '../src/lib/legacyGraph.mjs';

const graph = JSON.parse(await readFile(new URL('../public/assets/data/tensor-core.json', import.meta.url)));
const schema = JSON.parse(await readFile(new URL('../public/assets/data/core.schema.json', import.meta.url)));
const copy = (value) => JSON.parse(JSON.stringify(value));
const data = (entry) => entry.data || entry;

test('published legacy graph passes bounded structural checks with an explicit limitation', () => {
  const result = checkLegacyGraphStructure(graph, schema);
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.match(result.scope, /full schema.*not checked/);
  assert.ok(graph.nodes.length > 500);
});

const corruptions = [
  ['required archetype', (g) => { delete data(g.nodes[0]).archetype; }],
  ['archetype enum', (g) => { data(g.nodes[0]).archetype = 'remediate'; }],
  ['text type', (g) => { data(g.nodes[0]).text = 42; }],
  ['category enum', (g) => { data(g.nodes[0]).category = 'Uncategorized'; }],
  ['entry reference', (g) => { g.entryNodeIds = ['Q999999']; }],
  ['entry uniqueness', (g) => { g.entryNodeIds.push(g.entryNodeIds[0]); }],
  ['node uniqueness', (g) => { g.nodes.push(copy(g.nodes[0])); }],
  ['edge uniqueness', (g) => { g.edges.push(copy(g.edges[0])); }],
  ['edge encoding', (g) => { data(g.edges[0]).id = 'Q1-yes-Q999'; }],
  ['edge reference', (g) => { const e = data(g.edges[0]); e.target = 'Q999999'; e.id = `${e.source}-${e.decision}-${e.target}`; }],
  ['decision enum', (g) => { const e = data(g.edges[0]); e.decision = 'maybe'; e.id = `${e.source}-${e.decision}-${e.target}`; }],
  ['non-namespaced graph extensions', (g) => { g.extensions = { layers: {} }; }],
  ['non-namespaced node extensions', (g) => { data(g.nodes[0]).extensions = { layerSource: {} }; }],
  ['extension type', (g) => { data(g.edges[0]).extensions = []; }],
  ['top-level additions', (g) => { g.certified = true; }],
  ['wrapper additions', (g) => { g.nodes[0] = { data: data(g.nodes[0]), injected: true }; }],
  ['malformed translation', (g) => { data(g.nodes[0]).translations = { en: { label: 'Missing text' } }; }],
  ['timestamp shape', (g) => { g.generatedAt = '2026-01-01'; }],
];
for (const [name, corrupt] of corruptions) test(`rejects ${name} that the former partial validator could miss`, () => {
  const altered = copy(graph);
  corrupt(altered);
  assert.equal(checkLegacyGraphStructure(altered, schema).valid, false);
});

test('no enabled layers leaves the graph semantically unchanged', () => {
  assert.deepEqual(mergeLegacyGraphWithLayers(graph, []), graph);
});

test('merged graphs preserve base meaning and use namespaced metadata across JSON roundtrip', () => {
  const base = copy(graph);
  const original = copy(data(base.nodes[0]));
  const layer = { id: 'vendor.review', name: 'Vendor review', owner: 'Example', type: 'vendor', source: 'local', enabled: true,
    nodes: [{ data: { id: original.id, text: 'Override attempt', category: 'Cloud' } }, { data: { id: 'Q999999', text: 'Was the supplied evidence reviewed?', category: 'Host', archetype: 'validate', extensions: { 'example:metadata': { arbitrary: true } } } }],
    edges: [{ data: { id: `${original.id}-unknown-Q999999`, source: original.id, target: 'Q999999', decision: 'unknown' } }] };
  const merged = mergeLegacyGraphWithLayers(base, [layer], '2026-10-10T12:00:00Z');
  assert.equal(data(merged.nodes[0]).text, original.text);
  assert.equal(data(merged.nodes[0]).category, original.category);
  assert.deepEqual(base, graph);
  assert.ok(merged.extensions['tensor.studio:layers']);
  assert.equal(data(merged.nodes[0]).extensions['tensor.studio:overlays'][0].data.text, 'Override attempt');
  assert.deepEqual(copy(merged), merged);
  const result = checkLegacyGraphStructure(copy(merged), schema);
  assert.equal(result.valid, true, JSON.stringify(result.errors));
});

test('merging never invents question text, category, archetype, or branch decision', () => {
  const merged = mergeLegacyGraphWithLayers(graph, [{ id: 'partial', enabled: true, nodes: [{ id: 'Q999999' }], edges: [] }]);
  assert.deepEqual(Object.keys(data(merged.nodes.at(-1))).sort(), ['extensions', 'id']);
  assert.equal(checkLegacyGraphStructure(merged, schema).valid, false);
});

test('malformed layer extensions are not silently replaced', () => {
  assert.throws(() => mergeLegacyGraphWithLayers(graph, [{ id: 'bad', enabled: true, nodes: [{ id: 'Q999999', extensions: [] }], edges: [] }]), /extensions must be an object/);
});
