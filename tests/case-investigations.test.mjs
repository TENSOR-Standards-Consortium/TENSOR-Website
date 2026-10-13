import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { caseModel, caseTrace } from '../src/lib/caseInvestigations.mjs';
const read=async name=>JSON.parse(await readFile(new URL(`../public/investigations/v1/${name}.bundle.json`,import.meta.url),'utf8'));
const soc=await read('soc-signin'),attachment=await read('attachment-host-tool');
test('case projection uses actual definitions, attributed assessments, and explicit recorded selections',()=>{
  const before=structuredClone(soc),model=caseModel(soc);
  assert.equal(model.graph.nodes.length,7);assert.equal(model.frames.length,7);
  assert.equal(model.frames[1].assessment.outcome,'unknown');assert.equal(model.frames[1].actor.kind,'agent');
  assert.equal(model.frames[3].node.layerId,'company');assert.equal(model.frames[3].assessment.outcome,'no');
  const first=caseTrace(model,0,'path');assert.deepEqual(first.visibleIds,['S1','S2']);
  const final=caseTrace(model,6);assert.equal(final.selectedEdges.length,6);
  for(const edge of final.selectedEdges) assert.ok(model.graph.edges.some(e=>e.id===edge.id));
  const publicOnly=caseTrace(model,6,'all',['public']);assert.equal(publicOnly.visibleIds.length,4);
  assert.deepEqual(soc,before,'layer display cannot alter the bundle');
});
test('a reassessment frame never creates a self-route or selects a future decision',()=>{
  const model=caseModel(attachment),early=model.frames.findIndex(f=>f.assessment.outcome==='unknown'&&f.node.id==='S5');
  assert.ok(early>=0);assert.equal(model.frames[early+1].node.id,'S5');
  assert.equal(model.frames[early+1].assessment.outcome,'yes');
  assert.ok(caseTrace(model,early).selectedEdges.every(e=>e.source!=='S5'));
  assert.ok(caseTrace(model,early+1).selectedEdges.some(e=>e.source==='S5'&&e.decision==='yes'));
  assert.ok(caseTrace(model,model.frames.length-1).selectedEdges.every(e=>e.source!==e.target));
});
test('optional walkthrough metadata cannot invent or mispair record entries',()=>{
  const broken=structuredClone(soc);broken.record.metadata.walkthrough.frames[0].assessmentId='urn:missing';assert.throws(()=>caseModel(broken));
  const mispaired=structuredClone(soc);mispaired.record.metadata.walkthrough.frames[0].decisionId=mispaired.record.metadata.walkthrough.frames[1].decisionId;assert.throws(()=>caseModel(mispaired));
  const future=structuredClone(soc);future.record.metadata.walkthrough.frames[0].through=1;assert.throws(()=>caseModel(future));
  const old=structuredClone(soc);delete old.record.metadata.walkthrough;assert.equal(caseModel(old),null);
  const labels=structuredClone(soc);labels.record.metadata.walkthrough.title={invalid:true};assert.throws(()=>caseModel(labels));
  const domains=structuredClone(soc);domains.record.metadata.walkthrough.domains={unsupported:true};assert.deepEqual(caseModel(domains).domains,['Identity','Email']);
});
