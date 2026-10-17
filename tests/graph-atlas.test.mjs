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
  assert.deepEqual(readAtlasState('?graph=evil&node=missing&view=focus', graphs), { dataset: 'working', node: null, view: 'all' });
  assert.deepEqual(readAtlasState('', graphs), { dataset: 'working', node: null, view: 'all' });
  assert.deepEqual(readAtlasState('?graph=published&node=Q609', graphs), { dataset: 'published', node: null, view: 'all' });
});
test('coverage ledger is pinned to both graph artifacts and records all originals without equating shared IDs', async () => {
  const ledger = await read('graphs/working/coverage-inventory.json');
  assert.equal(ledger.published.sha256, createHash('sha256').update(await bytes('legacy/0.20260206e/tensor.core.graph.json')).digest('hex'));
  assert.equal(ledger.working.sha256, createHash('sha256').update(await bytes('graphs/working/tensor.core.graph.json')).digest('hex'));
  assert.equal(ledger.originalQuestions.length, 588);
  assert.equal(ledger.summary.absentOriginal, 0);
  assert.equal(ledger.summary.sameIdRewritten, 588);
  assert.equal(ledger.newQuestionIds.length, 21);
  assert.ok(ledger.originalQuestions.every(r => r.semanticReview === 'author-reviewed-agent-audit-external-review-pending' && r.disposition && r.scenarioRefs.length && r.applicabilityLimitations.length && r.agentReviewRef));
  const analysis = await read('graphs/working/reviews/2026-10-12-restoration/analysis.json');
  const routing=await read('graphs/working/reviews/2026-10-13-routing/review.json');
  const semantic=await read('graphs/working/reviews/2026-10-13-semantic/review.json');
  assert.equal(semantic.graphSha256,createHash('sha256').update(await bytes('archives/0.20261013b/tensor.core.graph.json')).digest('hex'));
  assert.equal(semantic.status,'separate-ai-review-complete');
  assert.equal(semantic.institutionalApproval,false);
  assert.equal(routing.graphSha256,'4943feee2af28d414fcfd98194e63d196bee529ce8f85117aed4932d977e4d5e');
  assert.equal(analysis.graphSha256,routing.priorGraphSha256);
  assert.equal(analysis.summary.independentlyApprovedDispositions, 0);
  assert.equal(analysis.summary.distinctSourcePrompts, 479);
  const review = await read('graphs/working/reviews/2026-10-12-independent-review/review.json');
  assert.equal(review.graphSha256,routing.priorGraphSha256);
  assert.equal(review.summary.externalApprovedDispositions, 0);
  assert.equal(review.summary.remainingUnrelatedFixedFacetEdges, 0);
  assert.equal(review.summary.questions, graphs.working.nodes.length);
  assert.equal(review.summary.routes,routing.summary.retainedContinuationRoutes);
  assert.equal(semantic.criteriaSha256,
    createHash('sha256').update(await bytes('archives/0.20261013b/entry-evidence-criteria.json')).digest('hex'));
  const targets = new Map(graphs.working.nodes.map(n => [n.id, n]));
  for (const row of analysis.questions) {
    const lineage=ledger.originalQuestions.find(r=>r.sourceId===row.sourceId);
    assert.equal(lineage.historicalReviewedPredicate,row.targetText);
    assert.equal(targets.get(row.targetId)?.text,lineage.currentPredicate);
    assert.ok(row.issues.length && row.sourceFacet && row.meaningChange && row.scenarioRefs.length);
  }
});

test('historical semantic review mirrors its exact archived graph and pinned final ledgers',async()=>{
 const historical=await read('archives/0.20261013b/tensor.core.graph.json');
 const prefix='graphs/working/reviews/2026-10-13-semantic/';
 const review=await read(prefix+'review.json');
 assert.equal(review.counts.nodes,graphs.working.nodes.length);
 assert.equal(review.counts.edges,historical.edges.length);
 assert.notEqual(review.definitionsSha256,createHash('sha256').update(await bytes('graphs/working/event-profiles/definitions.json')).digest('hex'),'Historical approval cannot pin the current artifact');
 for(const row of review.domains){
  const ledger=await read(prefix+'items/'+row.id+'.json');
  assert.deepEqual(new Set(ledger.nodes.map(n=>n.id)),new Set(graphs.working.nodes.filter(n=>n.category===row.domain).map(n=>n.id)));
  const ids=new Set(ledger.nodes.map(n=>n.id));
  assert.deepEqual(new Set(ledger.edges.map(e=>e.id)),new Set(historical.edges.filter(e=>ids.has(e.source)).map(e=>e.id)));
  assert.ok([...ledger.nodes,...ledger.edges,...ledger.profileDefinitions].every(i=>i.verdict==='accept'));
  for(const kind of ['items','challenges']){
   const file=kind+'/'+row.id+'.json';
   assert.equal(createHash('sha256').update(await bytes(prefix+file)).digest('hex'),review.ledgerPins[file]);
  }
 }
});


test('current answer-route review accounts for every shared destination without claiming independent approval',async()=>{
 const review=await read('graphs/working/reviews/2026-10-16-contextual-routing/review.json');
 assert.equal(review.graphSha256,createHash('sha256').update(await bytes('graphs/working/tensor.core.graph.json')).digest('hex'));
 assert.equal(review.counts.questions,graphs.working.nodes.length);assert.equal(review.counts.routes,graphs.working.edges.length);
 assert.equal(review.reviewedSharedPairs.length,602);assert.equal(review.institutionalApproval,false);
 assert.equal(review.status,'author-repaired-external-review-pending');
 const targets=new Map();for(const e of graphs.working.edges){const key=e.source+'|'+e.target;targets.set(key,[...(targets.get(key)||[]),e.decision]);}
 const shared=[...targets].filter(([,answers])=>answers.length>1);
 assert.deepEqual(new Set(shared.map(([key])=>key)),new Set(review.currentSharedPairs.map(r=>r.source+'|'+r.target)));
 assert.ok(shared.every(([,answers])=>answers.length===2));
});
