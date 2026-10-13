import { questionLabel } from './displayLabels.mjs';
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
    return {...frame,node,instance:byId.get(assessment.targetInstanceId),assessment,decision,actor,inputs:assessment.inputs.map(input=>byId.get(input.entryId)).filter(Boolean)};
  });
  const layers=definitions[0].metadata?.layers;
  if(!Array.isArray(layers)||layers.length!==3||!layers.every(l=>l&&label(l.label)&&label(l.owner)&&label(l.version))||!['public','vendor','company'].every(id=>layers.some(l=>l.id===id))) throw new Error('Case layer ownership is unavailable.');
  for(const node of nodes) {
    const title=label(node.question.metadata?.title)?node.question.metadata.title:questionLabel(node);
    node.title=title;
    node.displayLabel=`${node.category} · ${node.layerId}\n${title.replace(/(.{1,25})(\s|$)/g,'$1\n').trim()}`;
  }
  const layoutEdgeIds=entries.filter(e=>e.type==='Decision').flatMap(e=>(e.selections||[]).map(s=>s.transitionId));
  return { ...walkthrough, domains:[...new Set(nodes.map(n=>n.category))], entries, byId, instances, frames, layers, graph:{version:definitions[0].version,nodes,edges,layoutEdgeIds,entryNodeIds:definitions[0].entryQuestionIds.map(id=>questionNode.get(id).id)} };
}

export function caseLayout(graph,portrait=false) {
  // Arrange the retained branch structure. Spatial order supplies no route;
  // declared alternatives remain arrows even when they are not selected.
  const selected=new Set(graph.layoutEdgeIds||[]),edges=graph.edges.filter(e=>selected.has(e.id));
  const depth=new Map(graph.nodes.map(n=>[n.id,0]));
  for(let pass=0;pass<graph.nodes.length;pass++) {
    let changed=false;
    for(const e of edges) {const next=Math.min(graph.nodes.length-1,depth.get(e.source)+1);if(next>depth.get(e.target)){depth.set(e.target,next);changed=true;}}
    if(!changed)break;
  }
  const rows=new Map();for(const n of graph.nodes){const d=depth.get(n.id);if(!rows.has(d))rows.set(d,[]);rows.get(d).push(n);}
  const maxWidth=Math.max(...[...rows.values()].map(row=>row.length)),width=portrait?340:Math.max(640,maxWidth*300+80);
  const positions=new Map();let y=110;
  for(const [,row] of [...rows].sort((a,b)=>a[0]-b[0])) {
    row.forEach((n,i)=>positions.set(n.id,{x:portrait?170:width/2+(i-(row.length-1)/2)*300,y:portrait?y+i*170:y}));
    y+=portrait?row.length*170:185;
  }
  const nodes=graph.nodes.map(node=>({...node,color:DOMAIN_COLORS[DOMAINS.indexOf(node.category)],position:positions.get(node.id)}));
  return {nodes,width,height:y,laneHeight:185,stageWidth:300,orientation:portrait?'portrait':'wide',domainWidth:300,stageHeight:185};
}

export function caseTrace(model,index,visibility='all',layers=['public','vendor','company']) {
  const bounded=Math.max(0,Math.min(index,model.frames.length-1)),current=model.frames[bounded];
  const retained=model.entries.slice(0,current.through),assessments=retained.filter(e=>e.type==='Assessment');
  const assessedInstances=new Set(assessments.map(e=>e.targetInstanceId));
  const visitedIds=[...new Set(assessments.map(e=>model.instances.get(e.targetInstanceId)?.id).filter(Boolean))];
  const nextIds=[...new Set(model.graph.edges.filter(e=>e.source===current.node.id&&e.decision===current.assessment.outcome).map(e=>e.target))];
  const selectedEdges=[];
  const openInstances=new Set();
  for(const decision of retained.filter(e=>e.type==='Decision')) {
    const assessment=model.byId.get(decision.selectedAssessmentId);
    for(const selection of decision.selections||[]) {
      const route=model.graph.edges.find(e=>e.id===selection.transitionId);
      if(route&&route.decision===assessment?.outcome&&model.instances.get(decision.targetInstanceId)?.id===route.source&&model.instances.get(selection.targetInstanceId)?.id===route.target) {
        selectedEdges.push(route);if(!assessedInstances.has(selection.targetInstanceId))openInstances.add(selection.targetInstanceId);
      }
    }
  }
  const openLeadInstances=[...openInstances].map(id=>model.byId.get(id));
  const openLeadIds=[...new Set(openLeadInstances.map(instance=>model.instances.get(instance.id).id))];
  const superseded=new Set(assessments.map(e=>e.supersedes?.entryId).filter(Boolean));
  const unresolvedAssessmentIds=assessments.filter(e=>e.outcome==='unknown'&&!superseded.has(e.id)).map(e=>e.id);
  const unresolvedIds=[...new Set(unresolvedAssessmentIds.map(id=>model.instances.get(model.byId.get(id).targetInstanceId).id))];
  const frontier=[...new Set([...openLeadIds,...nextIds])];
  const visibleIds=model.graph.nodes.filter(n=>layers.includes(n.layerId)&&(visibility==='all'||visitedIds.includes(n.id)||frontier.includes(n.id))).map(n=>n.id);
  const visibleEdgeIds=visibility==='path'?[...new Set([...selectedEdges.map(e=>e.id),...model.graph.edges.filter(e=>e.source===current.node.id&&e.decision===current.assessment.outcome).map(e=>e.id)])]:null;
  return {currentId:current.node.id,visitedIds,nextIds:frontier,selectedEdges,openLeadIds,openLeadInstances,unresolvedIds,unresolvedAssessmentIds,visibleEdgeIds,visibleIds:visibility==='all'&&['public','vendor','company'].every(id=>layers.includes(id))?null:visibleIds};
}
