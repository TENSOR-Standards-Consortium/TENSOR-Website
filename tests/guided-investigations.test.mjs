import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { GUIDES, GUIDE_GRAPH_VERSION, GUIDE_GRAPH_SHA256, GUIDE_CRITERIA_SHA256, guideState, readGuideState } from '../src/lib/guidedInvestigations.mjs';
const bytes = await readFile(new URL('../public/graphs/working/tensor.core.graph.json',import.meta.url));
const criteriaBytes = await readFile(new URL('../public/graphs/working/entry-evidence-criteria.json',import.meta.url));
const graph=JSON.parse(bytes), criteria=JSON.parse(criteriaBytes);
test('every guide is pinned to exact definitions and criteria, with declared outcome-matching routes',()=>{
  assert.equal(graph.version,GUIDE_GRAPH_VERSION);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),GUIDE_GRAPH_SHA256);
  assert.equal(createHash('sha256').update(criteriaBytes).digest('hex'),GUIDE_CRITERIA_SHA256);
  for(const guide of GUIDES) {
    assert.ok(graph.entryNodeIds.includes(guide.steps[0].questionId));
    guide.steps.forEach((step,i)=>{
      assert.ok(graph.nodes.some(n=>n.id===step.questionId));
      assert.ok(criteria.rules[criteria.nodes[step.questionId].rule][step.outcome]);
      assert.ok(step.evidence && step.rationale && step.limitation);
      if(i<guide.steps.length-1) assert.ok(graph.edges.some(e=>e.source===step.questionId && e.target===guide.steps[i+1].questionId && e.decision===step.outcome),`${guide.id}: ${step.questionId} ${step.outcome}`);
      else assert.equal(graph.edges.filter(e=>e.source===step.questionId).length,0);
    });
  }
});
test('progressive visibility reveals only visited definitions and declared next options, preserving explicit edge outcomes',()=>{
  for(const guide of GUIDES) for(let i=0;i<guide.steps.length;i++) {
    const state=guideState(graph,guide,i,'path');
    assert.deepEqual(state.visitedIds,guide.steps.slice(0,i+1).map(s=>s.questionId));
    assert.deepEqual(new Set(state.nextIds),new Set(graph.edges.filter(e=>e.source===guide.steps[i].questionId).map(e=>e.target)));
    assert.deepEqual(new Set(state.visibleIds),new Set([...state.visitedIds,...state.nextIds]));
    for(const edge of state.selectedEdges) assert.ok(graph.edges.some(e=>e.source===edge.source&&e.target===edge.target&&e.decision===edge.decision));
    assert.equal(guideState(graph,guide,i,'all').visibleIds,null);
  }
});
test('negative, unknown, refuted and unresolved walkthroughs do not all collapse into a positive success story',()=>{
  const steps=GUIDES.flatMap(g=>g.steps);
  for(const outcome of ['yes','no','unknown']) assert.ok(steps.some(s=>s.outcome===outcome));
  assert.equal(GUIDES.find(g=>g.id==='host-alternative').steps.at(-1).questionId,'Q604');
  assert.equal(GUIDES.find(g=>g.id==='cloud-gap').steps.at(-1).questionId,'Q599');
  const identity=GUIDES.find(g=>g.id==='identity-session');
  assert.equal(identity.steps.find(s=>s.questionId==='Q379').outcome,'no');
  assert.equal(identity.steps.find(s=>s.questionId==='Q492').outcome,'unknown');
});
test('public presentation URL parsing bounds steps and rejects unknown walkthrough IDs',()=>{
  assert.deepEqual(readGuideState('?renderer=3d&investigation=agent-request&step=900&context=path'),{renderer:'3d',guideId:'agent-request',step:7,visibility:'path'});
  assert.equal(readGuideState('?investigation=cloud-gap&step=-1').step,0);
  assert.equal(readGuideState('?investigation=cloud-gap&step=NaN').step,0);
  assert.equal(readGuideState('?investigation=cloud-gap&step=1.5').step,0);
  assert.equal(readGuideState('?investigation=private-case&renderer=webgl').guideId,null);
});
