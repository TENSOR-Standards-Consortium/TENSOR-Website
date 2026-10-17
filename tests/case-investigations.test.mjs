import test from 'node:test';
import {compactQuestionLabel} from '../src/lib/displayLabels.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { validateBundle } from '../src/vendor/tensor-core/index.mjs';
import { caseModel, caseTrace, caseLayout, caseOccurrenceView } from '../src/lib/caseInvestigations.mjs';
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


test('seven-domain occurrence view keeps returns, parallel branches and retained unknowns separate',async()=>{
  const bundle=await read('parallel-followup'),model=caseModel(bundle);
  assert.equal(new Set(model.graph.nodes.map(n=>n.category)).size,7);
  assert.equal(model.frames.length,9);
  const first=model.frames[0],returned=model.frames[7];
  assert.equal(first.node.id,returned.node.id,'A reusable question, not a duplicate definition');
  assert.notEqual(first.instance.id,returned.instance.id);
  assert.notDeepEqual(first.instance.subjectBindings,returned.instance.subjectBindings);
  assert.notDeepEqual(first.instance.timeContext,returned.instance.timeContext);
  const initial=caseOccurrenceView(model,0,'all');
  assert.ok(!initial.graph.nodes.some(n=>n.instance?.id===returned.instance.id),'Future subject context is not revealed');
  const parallel=caseOccurrenceView(model,1,'path');
  assert.equal(parallel.trace.nextIds.filter(id=>!parallel.trace.visitedIds.includes(id)&&!id.startsWith('option:')).length,3);
  const complete=caseOccurrenceView(model,8,'all');
  assert.equal(complete.graph.nodes.filter(n=>n.definitionNodeId===first.node.id&&!n.preview).length,2);
  const labels=complete.graph.nodes.filter(n=>n.definitionNodeId===first.node.id&&!n.preview).map(n=>compactQuestionLabel(n));
  assert.equal(new Set(labels).size,2);assert.ok(labels.some(label=>label.includes('Morgan'))&&labels.some(label=>label.includes('workload')));
  assert.ok(complete.trace.visitedIds.includes(first.instance.id));
  assert.ok(complete.trace.visitedIds.includes(returned.instance.id));
  assert.equal(complete.graph.nodes.find(n=>n.id===model.frames[2].instance.id).assessmentSummary,'no');
  assert.equal(complete.graph.nodes.find(n=>n.id===model.frames[4].instance.id).assessmentSummary,'unknown');
  assert.ok(complete.trace.unresolvedIds.includes(model.frames[4].instance.id),'The other branch keeps its attachment gap');
  assert.ok(complete.trace.selectedEdges.some(e=>e.target===returned.instance.id));
  const layout=caseLayout(complete.graph),byId=new Map(layout.nodes.map(n=>[n.id,n]));
  assert.ok(byId.get(returned.instance.id).position.y>byId.get(first.instance.id).position.y,'A return is a distinct causal occurrence, not a collapsed cycle');
  assert.equal((await validateBundle(bundle)).status,'pass');
});

test('occurrence previews never borrow another subject answer or relabel historical revision selections',()=>{
  const model=caseModel(attachment),early=model.frames.findIndex(f=>f.assessment.outcome==='unknown'&&f.node.id==='S5');
  const revised=caseOccurrenceView(model,early+1,'all');
  const historical=revised.trace.selectedEdges.filter(e=>e.source===model.frames[early].instance.id);
  assert.ok(historical.length>0&&historical.every(e=>e.decision==='unknown'));
  for(const preview of revised.graph.nodes.filter(n=>n.preview))assert.equal(preview.instance,undefined);
  assert.ok(!revised.trace.unresolvedIds.includes(model.frames[early].instance.id));
});


test('a same-answer revision keeps earlier selections historical and offers fresh unselected contexts',async()=>{
  const bundle=structuredClone(attachment),entries=bundle.record.entries;
  const later=entries.find(e=>e.type==='Assessment'&&e.id.endsWith(':assessment-5'));
  later.outcome='unknown';later.rationale='The later acquisition still lacks the required discriminator.';
  later.unknownReasons=[{code:'insufficient',explanation:later.rationale}];
  assert.equal((await validateBundle(bundle)).status,'pass');
  const model=caseModel(bundle),index=model.frames.findIndex(f=>f.assessment.id===later.id);
  const view=caseOccurrenceView(model,index,'all');
  const history=view.trace.selectedEdges.filter(e=>e.source===model.frames[index].instance.id);
  assert.equal(history.length,2);assert.ok(history.every(e=>e.selectedAssessmentId!==later.id));
  const previews=view.graph.edges.filter(e=>!e.recorded&&e.source===model.frames[index].instance.id);
  assert.equal(previews.length,2);assert.ok(previews.every(e=>e.target.startsWith('option:')));
  assert.ok(previews.every(e=>!history.some(old=>old.target===e.target)));
});
