import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { validateBundle } from '../src/vendor/tensor-core/index.mjs';
import { caseModel, caseTrace, caseLayout } from '../src/lib/caseInvestigations.mjs';
const read=async name=>JSON.parse(await readFile(new URL(`../public/investigations/v1/${name}.bundle.json`,import.meta.url),'utf8'));
const soc=await read('soc-signin'),attachment=await read('attachment-host-tool');
test('case projection uses actual definitions, attributed assessments, and explicit recorded selections',()=>{
  const before=structuredClone(soc),model=caseModel(soc);
  assert.equal(model.graph.nodes.length,7);assert.equal(model.frames.length,7);
  assert.equal(model.frames[1].assessment.outcome,'unknown');assert.equal(model.frames[1].actor.kind,'agent');
  assert.equal(model.frames[3].node.layerId,'company');assert.equal(model.frames[3].assessment.outcome,'no');
  const first=caseTrace(model,0,'path');assert.deepEqual(first.visibleIds,['S1','S2','S3']);assert.deepEqual(first.openLeadIds,['S2','S3']);
  assert.equal(first.visibleEdgeIds.length,2);assert.ok(first.visibleEdgeIds.every(id=>model.graph.edges.find(e=>e.id===id).decision==='yes'));
  const final=caseTrace(model,6);assert.equal(final.selectedEdges.length,6);
  for(const edge of final.selectedEdges) assert.ok(model.graph.edges.some(e=>e.id===edge.id));
  const publicOnly=caseTrace(model,6,'all',['public']);assert.equal(publicOnly.visibleIds.length,4);
  assert.deepEqual(soc,before,'layer display cannot alter the bundle');
});

test('returning to an already assessed question opens a fresh pending instance',async()=>{
  const bundle=structuredClone(soc),definition=JSON.parse(bundle.definitions[0].content),entries=bundle.record.entries;
  const original=entries.find(e=>e.id.endsWith(':instance-1')),source=entries.find(e=>e.id.endsWith(':instance-3'));
  const assessment=entries.find(e=>e.id.endsWith(':assessment-3'));
  const transition={id:'urn:example:return-route',sourceQuestionId:source.questionId,targetQuestionId:original.questionId,guardOutcome:'yes'};
  definition.transitions.push(transition);bundle.definitions[0].content=JSON.stringify(definition);
  const digest=createHash('sha256').update(bundle.definitions[0].content).digest('hex');
  for(const pin of [...bundle.record.definitionReferences,...entries.filter(e=>e.type==='QuestionInstance').map(e=>e.definitionRef)])pin.sha256=digest;
  const target=structuredClone(original);target.id='urn:example:fresh-return-instance';
  const decision=structuredClone(entries.find(e=>e.id.endsWith(':decision-3')));decision.id='urn:example:return-decision';decision.targetInstanceId=source.id;decision.selectedAssessmentId=assessment.id;decision.selections=[{transitionId:transition.id,targetInstanceId:target.id}];
  target.origin={kind:'transition',originDecisionId:decision.id,rationale:'Fresh instance for a separately bound revisit.'};
  entries.push(decision,target);bundle.record.metadata.walkthrough.frames.at(-1).through=entries.length;
  assert.equal((await validateBundle(bundle)).status,'pass');
  const model=caseModel(bundle),trace=caseTrace(model,model.frames.length-1,'path');
  assert.ok(trace.visitedIds.includes('S1'));assert.ok(trace.openLeadIds.includes('S1'));
  assert.deepEqual(trace.openLeadInstances.map(e=>e.id),[target.id]);
});
test('a reassessment frame never creates a self-route or selects a future decision',()=>{
  const model=caseModel(attachment),early=model.frames.findIndex(f=>f.assessment.outcome==='unknown'&&f.node.id==='S5');
  assert.ok(early>=0);assert.equal(model.frames[early+1].node.id,'S5');
  assert.equal(model.frames[early+1].assessment.outcome,'yes');
  assert.equal(caseTrace(model,early).selectedEdges.filter(e=>e.source==='S5'&&e.decision==='unknown').length,2);
  assert.ok(caseTrace(model,early+1).selectedEdges.every(e=>e.source!=='S5'||e.decision==='unknown'),'A later yes never relabels historical unknown selections');
  assert.ok(caseTrace(model,model.frames.length-1).selectedEdges.every(e=>e.source!==e.target));
});

test('the view retains parallel pending leads across sibling assessments and uses branch geometry',()=>{
  const model=caseModel(soc);
  assert.deepEqual(caseTrace(model,1,'path').openLeadIds,['S3']);
  assert.deepEqual(caseTrace(model,3,'path').openLeadIds,['S5','S6']);
  assert.deepEqual(caseTrace(model,4,'path').openLeadIds,['S6']);
  const final=caseTrace(model,6,'path');assert.deepEqual(final.openLeadIds,[]);assert.ok(final.unresolvedIds.includes('S2')&&final.unresolvedIds.includes('S5'));
  const layout=caseLayout(model.graph),byId=new Map(layout.nodes.map(n=>[n.id,n]));
  assert.equal(byId.get('S2').position.y,byId.get('S3').position.y,'Two selected root leads share a branch level');
  assert.notEqual(byId.get('S2').position.x,byId.get('S3').position.x);
  assert.equal(byId.get('S5').position.y,byId.get('S6').position.y,'Negative approval opens separate delivery and response leads');
});
test('optional walkthrough metadata cannot invent or mispair record entries',()=>{
  const broken=structuredClone(soc);broken.record.metadata.walkthrough.frames[0].assessmentId='urn:missing';assert.throws(()=>caseModel(broken));
  const mispaired=structuredClone(soc);mispaired.record.metadata.walkthrough.frames[0].decisionId=mispaired.record.metadata.walkthrough.frames[1].decisionId;assert.throws(()=>caseModel(mispaired));
  const future=structuredClone(soc);future.record.metadata.walkthrough.frames[0].through=1;assert.throws(()=>caseModel(future));
  const old=structuredClone(soc);delete old.record.metadata.walkthrough;assert.equal(caseModel(old),null);
  const labels=structuredClone(soc);labels.record.metadata.walkthrough.title={invalid:true};assert.throws(()=>caseModel(labels));
  const domains=structuredClone(soc);domains.record.metadata.walkthrough.domains={unsupported:true};assert.deepEqual(caseModel(domains).domains,['Identity','Email']);
});
