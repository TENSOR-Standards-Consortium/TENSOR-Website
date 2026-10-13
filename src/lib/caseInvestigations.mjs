import { parseJSON } from '../vendor/tensor-core/json.mjs';
import { indexEntries, getEntries, MAX_BUNDLE_BYTES } from './investigationLab.mjs';
import { DOMAINS, STAGES, DOMAIN_COLORS } from './graphAtlas.mjs';

// Optional presentation metadata never creates a finding, route, or authority.
// Core validation is required by the caller before exposing interactive results.
export function caseModel(bundle) {
  const walkthrough = bundle.record?.metadata?.walkthrough;
  if (walkthrough?.format !== 'tensor-example-walkthrough' || walkthrough.version !== 1 || !Array.isArray(walkthrough.frames) || !walkthrough.frames.length || walkthrough.frames.length > 100) return null;
  if(bundle.definitions?.length!==1||bundle.record.definitionReferences?.length!==1) return null;
  const label=value=>typeof value==='string'&&value.length>0&&value.length<=500;
  if(!label(walkthrough.title)||!label(walkthrough.id)) throw new Error('Unsupported case presentation labels.');
  const entries = getEntries(bundle), byId = indexEntries(entries);
  if (entries.some(e=>!byId.get(e.id))) throw new Error('Ambiguous case entry IDs.');
  const definitions = bundle.definitions.map(artifact=>parseJSON(artifact.content,{maxBytes:MAX_BUNDLE_BYTES}));
  const questions = definitions.flatMap(d=>d.questions);
  if (questions.length > 100) throw new Error('Case presentation supports up to 100 questions.');
  const nodes = questions.map((q,i)=>{
    if (!DOMAINS.includes(q.metadata?.domain) || !['public','vendor','company'].includes(q.metadata?.layerId)) throw new Error('Case domain or layer metadata is unsupported.');
    return { id:`S${i+1}`, label:q.prompt, text:q.prompt, category:q.metadata.domain, archetype:STAGES.includes(q.metadata.archetype)?q.metadata.archetype:'classify', question:q, layerId:q.metadata.layerId };
  });
  const questionNode = new Map(nodes.map(n=>[n.question.id,n]));
  const instances = new Map(entries.filter(e=>e.type==='QuestionInstance').map(e=>[e.id,questionNode.get(e.questionId)]));
  const edges = definitions.flatMap(d=>d.transitions.map(t=>({ id:t.id, source:questionNode.get(t.sourceQuestionId)?.id, target:questionNode.get(t.targetQuestionId)?.id, decision:t.guardOutcome })));
  if (edges.some(e=>!e.source||!e.target)) throw new Error('Unresolved composed route.');
  let previous=0;
  const frames=walkthrough.frames.map(frame=>{
    if(!label(frame.title)||!label(frame.limitation)) throw new Error('Unsupported case frame labels.');
    const assessment=byId.get(frame.assessmentId), decision=frame.decisionId?byId.get(frame.decisionId):null;
    if (assessment?.type!=='Assessment'||!instances.get(assessment.targetInstanceId)||!Number.isInteger(frame.through)||frame.through<previous||frame.through>entries.length||entries.indexOf(assessment)>=frame.through) throw new Error('Case frame does not resolve to a retained assessment.');
    if(frame.decisionId&&(decision?.type!=='Decision'||decision.selectedAssessmentId!==assessment.id||entries.indexOf(decision)>=frame.through)) throw new Error('Case frame does not resolve to its recorded decision.');
    previous=frame.through;
    const node=instances.get(assessment.targetInstanceId), actor=byId.get(assessment.attribution?.actorId)||{kind:'unknown',label:assessment.attribution?.unknownReason||'Attribution unresolved'};
    return {...frame,node,assessment,decision,actor,inputs:assessment.inputs.map(input=>byId.get(input.entryId)).filter(Boolean)};
  });
  const layers=definitions[0].metadata?.layers;
  if(!Array.isArray(layers)||layers.length!==3||!layers.every(l=>l&&label(l.label)&&label(l.owner)&&label(l.version))||!['public','vendor','company'].every(id=>layers.some(l=>l.id===id))) throw new Error('Case layer ownership is unavailable.');
  for(const node of nodes) {
    const title=frames.find(f=>f.node.id===node.id)?.title||node.id;
    node.displayLabel=`${node.id} · ${node.category} · ${node.layerId}\n${title.replace(/(.{1,25})(\s|$)/g,'$1\n').trim()}`;
  }
  return { ...walkthrough, domains:[...new Set(nodes.map(n=>n.category))], entries, byId, instances, frames, layers, graph:{version:definitions[0].version,nodes,edges,entryNodeIds:definitions[0].entryQuestionIds.map(id=>questionNode.get(id).id)} };
}

export function caseLayout(graph,portrait=false) {
  const columns=portrait?1:3,rows=Math.ceil(graph.nodes.length/columns);
  const nodes=graph.nodes.map((node,i)=>{
    const row=Math.floor(i/columns),column=row%2?columns-1-i%columns:i%columns;
    return {...node,color:DOMAIN_COLORS[DOMAINS.indexOf(node.category)],position:{x:portrait?160:160+column*280,y:110+row*170}};
  });
  return {nodes,width:portrait?340:920,height:rows*170+60,laneHeight:170,stageWidth:280,orientation:portrait?'portrait':'wide',domainWidth:280,stageHeight:170};
}

export function caseTrace(model,index,visibility='all',layers=['public','vendor','company']) {
  const current=model.frames[Math.max(0,Math.min(index,model.frames.length-1))];
  const visitedIds=[...new Set(model.frames.slice(0,index+1).map(f=>f.node.id))];
  const nextIds=[...new Set(model.graph.edges.filter(e=>e.source===current.node.id).map(e=>e.target))];
  const selectedEdges=[];
  for(const decision of model.entries.slice(0,current.through).filter(e=>e.type==='Decision')) {
    const assessment=model.byId.get(decision.selectedAssessmentId);
    for(const selection of decision.selections||[]) {
      const route=model.graph.edges.find(e=>e.id===selection.transitionId);
      if(route&&route.decision===assessment?.outcome&&model.instances.get(decision.targetInstanceId)?.id===route.source&&model.instances.get(selection.targetInstanceId)?.id===route.target) selectedEdges.push(route);
    }
  }
  const visibleIds=model.graph.nodes.filter(n=>layers.includes(n.layerId)&&(visibility==='all'||visitedIds.includes(n.id)||nextIds.includes(n.id))).map(n=>n.id);
  return {currentId:current.node.id,visitedIds,nextIds,selectedEdges,visibleIds:visibility==='all'&&['public','vendor','company'].every(id=>layers.includes(id))?null:visibleIds};
}
