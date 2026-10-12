import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { atlasLayout, readAtlasState, writeAtlasState, DOMAINS, STAGES } from '../src/lib/graphAtlas.mjs';
const bytes = (path) => readFile(new URL(`../public/${path}`, import.meta.url));
const read = async (path) => JSON.parse(await bytes(path));
const graphs = { working: await read('graphs/working/tensor.core.graph.json'), published: await read('legacy/0.20260206e/tensor.core.graph.json') };

test('both complete graphs have stable unique positions inside the atlas, without omitted or synthesized nodes', () => {
  for (const graph of Object.values(graphs)) for (const orientation of ['wide', 'portrait']) {
    const view = atlasLayout(graph, orientation);
    assert.equal(view.nodes.length, graph.nodes.length);
    assert.deepEqual(new Set(view.nodes.map(n => n.id)), new Set(graph.nodes.map(n => n.id)));
    assert.equal(new Set(view.nodes.map(n => `${n.position.x},${n.position.y}`)).size, graph.nodes.length);
    assert.deepEqual(atlasLayout({ ...graph, nodes: [...graph.nodes].reverse() }, orientation).nodes.slice().sort((a,b)=>a.id.localeCompare(b.id)), view.nodes.slice().sort((a,b)=>a.id.localeCompare(b.id)));
    for (const n of view.nodes) {
      assert.ok(DOMAINS.includes(n.category) && STAGES.includes(n.archetype));
      assert.ok(n.position.x > 0 && n.position.x < view.width && n.position.y > 0 && n.position.y < view.height);
    }
  }
});
test('source, selection and focus round-trip through URL; invalid states recover to a full source graph', () => {
  for (const dataset of ['working','published']) {
    const state = { dataset, node: 'Q1', view: 'focus' };
    const search = writeAtlasState('?keep=external', state);
    assert.deepEqual(readAtlasState(search, graphs), state);
    assert.equal(new URLSearchParams(search).get('keep'), 'external');
  }
  assert.deepEqual(readAtlasState('?graph=evil&node=missing&view=focus', graphs), { dataset: 'published', node: null, view: 'all' });
  assert.deepEqual(readAtlasState('', graphs), { dataset: 'published', node: null, view: 'all' });
  assert.deepEqual(readAtlasState('?graph=published&node=Q609', graphs), { dataset: 'published', node: null, view: 'all' });
});
test('coverage ledger is pinned to both graph artifacts and records all originals without equating shared IDs', async () => {
  const ledger = await read('graphs/working/coverage-inventory.json');
  assert.equal(ledger.published.sha256, createHash('sha256').update(await bytes('legacy/0.20260206e/tensor.core.graph.json')).digest('hex'));
  assert.equal(ledger.working.sha256, createHash('sha256').update(await bytes('graphs/working/tensor.core.graph.json')).digest('hex'));
  assert.equal(ledger.originalQuestions.length, 588);
  assert.equal(ledger.summary.absentOriginal, 506);
  assert.equal(ledger.summary.sameIdRewritten, 82);
  assert.equal(ledger.newQuestionIds.length, 21);
  assert.ok(ledger.originalQuestions.every(r => r.semanticReview === 'pending' && r.disposition === null));
});
