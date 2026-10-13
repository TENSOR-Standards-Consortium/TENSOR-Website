import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { profileGuides, profileGraph, profileCriteria, expandProfileScenarios } from '../src/lib/profileInvestigations.mjs';
import { readGuideState, guideState } from '../src/lib/guidedInvestigations.mjs';
const directory=new URL('../public/graphs/working/event-profiles/',import.meta.url);
const bytes=async name=>readFile(new URL(name,directory));
const read=async name=>JSON.parse(await bytes(name));
const catalog=await read('catalog.json'), definitions=await read('definitions.json'), scenarios=await read('scenarios.json'), validation=await read('validation.json');
const graph=JSON.parse(await readFile(new URL('../public/graphs/working/tensor.core.graph.json',import.meta.url)));
const criteria=JSON.parse(await readFile(new URL('../public/graphs/working/entry-evidence-criteria.json',import.meta.url)));

test('public profile artifacts pin all seven domains and every validated scenario/definition',async()=>{
  assert.equal(Object.keys(catalog.profiles).length,16);
  assert.equal(new Set(Object.values(catalog.profiles).map(p=>p.domain)).size,7);
  assert.equal(validation.scenarioCount,144); assert.equal(validation.passed,144);
  for(const [name,digest] of Object.entries(validation.artifactPins)) assert.equal(createHash('sha256').update(await bytes(name)).digest('hex'),digest,name);
  for(const pid of Object.keys(catalog.profiles)) {
    const guides=profileGuides(pid,catalog,definitions,scenarios,validation);
    assert.equal(guides.length,9);
    for(const guide of guides) {
      assert.equal(guide.profileId,pid);
      const scenario=expandProfileScenarios(scenarios,pid).find(c=>c.id===guide.id);
      assert.deepEqual(guide.steps.map(s=>[s.questionId,s.outcome]),scenario.expectedTrace);
      for(const [index,step] of guide.steps.entries()) {
        assert.equal(step.definitionId,definitions.profiles[pid][step.questionId].id);
        assert.ok(step.evidence && step.rationale && step.limitation);
        if(index<guide.steps.length-1) assert.ok(graph.edges.some(e=>e.source===step.questionId && e.target===guide.steps[index+1].questionId && e.decision===step.outcome));
        const state=guideState(graph,guide,index,'path');
        assert.ok(state.visibleIds.includes(step.questionId));
        assert.ok(state.nextIds.every(id=>graph.edges.some(e=>e.source===step.questionId && e.target===id)));
      }
      const restored=readGuideState(`?investigation=${guide.id}&step=999&renderer=3d&context=path`,guides);
      assert.equal(restored.guideId,guide.id); assert.equal(restored.step,guide.steps.length-1);
      assert.equal(restored.renderer,'3d'); assert.equal(restored.visibility,'path');
    }
  }
});

test('scoped graph and criteria retain all nodes/routes and never mutate base meanings',()=>{
  const before=JSON.stringify({graph,criteria});
  for(const [pid,profile] of Object.entries(catalog.profiles)) {
    const context={profileId:pid,profile,version:catalog.version,graphVersion:catalog.graphVersion,definitions:definitions.profiles[pid]};
    const scoped=profileGraph(graph,context), cards=profileCriteria(criteria,context);
    assert.equal(scoped.nodes.length,609); assert.deepEqual(scoped.edges,graph.edges);
    for(const node of scoped.nodes) {
      const def=context.definitions[node.id];
      if(def) { assert.equal(node.text,def.predicate); assert.equal(node.profileDefinitionId,def.id); assert.deepEqual(cards.nodes[node.id].boundSubjectFields,profile.bindings); }
      else assert.deepEqual(node,graph.nodes.find(n=>n.id===node.id));
    }
    const published={...graph,version:'0.20260206e'};
    assert.equal(profileGraph(published,context),published);
  }
  assert.equal(JSON.stringify({graph,criteria}),before);
});

test('unsupported profiles and mismatched receipts cannot be silently displayed',()=>{
  assert.throws(()=>profileGuides('unregistered',catalog,definitions,scenarios,validation));
  assert.throws(()=>profileGuides('host-state',catalog,{...definitions,graphSha256:'wrong'},scenarios,validation));
  const bad=structuredClone(validation);bad.results[0].passed=false;
  assert.throws(()=>profileGuides('identity-credential-state',catalog,definitions,scenarios,bad));
  const guides=profileGuides('host-state',catalog,definitions,scenarios,validation);
  assert.equal(readGuideState('?investigation=unregistered',guides).guideId,null);
  assert.equal(readGuideState('?investigation=host-state-supported').guideId,null);
});

test('scenario evidence expands without changing fixtures and rejects unsafe edits',()=>{
  const before=JSON.stringify(scenarios);
  const all=expandProfileScenarios(scenarios);
  assert.equal(all.length,144);
  assert.equal(Object.keys(scenarios.fixtures).length,16);
  assert.equal(JSON.stringify(scenarios),before);
  assert.equal(all.find(c=>c.id==='host-state-refuted').primary.records[0].facts['state.value'].value,'contradicting-observation');
  assert.equal(all.find(c=>c.id==='host-state-supported').primary.records[0].facts['state.value'].value,'disabled');
  const bad=structuredClone(scenarios);
  bad.cases[0].evidenceEdits.push({op:'set',path:['__proto__','polluted'],value:true});
  assert.throws(()=>expandProfileScenarios(bad));
  assert.equal({}.polluted,undefined);
});
