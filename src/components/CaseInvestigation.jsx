import { questionLabel, subjectLabel, entryTitle } from '../lib/displayLabels.mjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { validateBundle } from '../vendor/tensor-core/index.mjs';
import { caseModel, caseTrace, caseLayout } from '../lib/caseInvestigations.mjs';
import { asText } from '../lib/investigationLab.mjs';
import GraphAtlasCanvas from './GraphAtlasCanvas.jsx';
import GraphThreeCanvas from './GraphThreeCanvas.jsx';
import { Badge } from './WorkspaceUI.jsx';
import '../styles/graph-atlas.css';
import '../styles/case-investigation.css';

export default function CaseInvestigation({ bundle, initialStep = 0, linkState = false, labMode = false, publicCaseId, onInspect, onStep }) {
  const startStep=useRef(initialStep);
  const [index,setIndex]=useState(Number.isInteger(initialStep)&&initialStep>=0?initialStep:0),[selected,setSelected]=useState(null),[renderer,setRenderer]=useState('atlas');
  const [visibility,setVisibility]=useState('all'),[layers,setLayers]=useState(['public','vendor','company']),[playing,setPlaying]=useState(false);
  const [report,setReport]=useState(null),[error,setError]=useState(''),[portrait,setPortrait]=useState(false);
  const [viewTools,setViewTools]=useState(false);
  const [allOptions,setAllOptions]=useState(false);
  const [selectedInstance,setSelectedInstance]=useState(null);
  const [leadListOpen,setLeadListOpen]=useState(true);
  const shell=useRef(null);
  const projection=useMemo(()=>{try{return {model:caseModel(bundle)};}catch(caught){return {error:caught.message};}},[bundle]);
  const model=projection.model, current=model?.frames[Math.max(0,Math.min(index,model.frames.length-1))];
  const trace=useMemo(()=>model?caseTrace(model,index,visibility,layers):null,[model,index,visibility,layers]);
  const layout=useMemo(()=>model?caseLayout(model.graph,portrait):null,[model,portrait]);
  useEffect(()=>{
    let active=true;setReport(null);setError('');setSelected(null);setSelectedInstance(null);setAllOptions(false);setPlaying(false);setLayers(['public','vendor','company']);
    const query=linkState?new URLSearchParams(window.location.search):null;
    const requested=Number(query?.get('step')??startStep.current);
    setIndex(model&&Number.isInteger(requested)?Math.max(0,Math.min(requested,model.frames.length-1)):0);
    setRenderer(query?.get('renderer')==='3d'?'3d':'atlas');
    validateBundle(bundle).then(result=>{if(active)setReport(result);}).catch(caught=>{if(active)setError(caught.message);});
    return()=>{active=false;};
  },[bundle,model,linkState]);
  useEffect(()=>{
    const media=window.matchMedia('(max-width:600px)'),resize=()=>setPortrait(media.matches);resize();if(media.matches){setVisibility('path');setLeadListOpen(false);}media.addEventListener('change',resize);
    const pause=()=>{if(document.hidden)setPlaying(false);};document.addEventListener('visibilitychange',pause);
    const pop=()=>{if(linkState&&model){const value=Number(new URLSearchParams(location.search).get('step')||0);setIndex(Number.isInteger(value)?Math.max(0,Math.min(value,model.frames.length-1)):0);setSelected(null);setSelectedInstance(null);setPlaying(false);}};
    window.addEventListener('popstate',pop);
    return()=>{media.removeEventListener('change',resize);document.removeEventListener('visibilitychange',pause);window.removeEventListener('popstate',pop);};
  },[linkState,model]);
  function advance(next,automatic=false){
    if(!model)return;const bounded=Math.max(0,Math.min(next,model.frames.length-1));setIndex(bounded);onStep?.(bounded);setSelected(null);setSelectedInstance(null);if(!automatic)setPlaying(false);
    if(linkState){const url=new URL(location.href);url.searchParams.set('step',bounded);history[automatic?'replaceState':'pushState'](null,'',url);}
  }
  useEffect(()=>{
    if(!playing||!model)return;
    if(index>=model.frames.length-1){setPlaying(false);return;}
    const timer=setTimeout(()=>advance(index+1,true),7000);return()=>clearTimeout(timer);
  },[playing,index,model,linkState]);
  if(error||projection.error||!model) return <p role="status">The optional walkthrough is unavailable. The complete bundle and record inspector remain available. {error||projection.error}</p>;
  if(!report)return <p role="status">Checking the case bundle and exact definitions…</p>;
  if(report.status!=='pass')return <p role="alert">The case did not pass reference validation. Use the Lab report to inspect the record; its walkthrough is not interpreted.</p>;
  const inspected=selected?model.graph.nodes.find(n=>n.id===selected):current.node;
  const shown=selectedInstance?model.frames.slice(0,index+1).filter(f=>f.instance.id===selectedInstance).at(-1):current.node.id===inspected.id?current:model.frames.slice(0,index+1).filter(f=>f.node.id===inspected.id).at(-1);
  const layer=model.layers.find(l=>l.id===inspected.layerId), currentLayer=model.layers.find(l=>l.id===current.node.layerId);
  const isCurrentVisible=!trace.visibleIds||trace.visibleIds.includes(current.node.id);
  const outgoing=model.graph.edges.filter(e=>e.source===inspected.id);
  const options=shown&&!allOptions?outgoing.filter(e=>e.decision===shown.assessment.outcome):outgoing;
  const recordedRouteIds=new Set(trace.selectedEdges.map(e=>e.id));
  const futureFrame=model.frames.findIndex((f,i)=>i>index&&(selectedInstance?f.instance.id===selectedInstance:f.node.id===inspected.id));
  function inspect(id,instanceId=null){setPlaying(false);setSelected(id);setSelectedInstance(instanceId);}
  function inspectRecord(id){if(onInspect)onInspect(id);}
  return <div className="case-workspace atlas" ref={shell} data-case-ready="true" data-case-step={index}>
    <div className="case-heading"><div><p className="section-kicker">Core case · Reference checks passed</p><h2>{model.title}</h2><p>{model.graph.nodes.length} questions · <span className="case-domains-wide">{model.domains.join(' → ')}</span><span className="case-domains-mobile">{model.domains.length} domains</span></p></div>{publicCaseId&&<a href={labMode?`/investigations/${publicCaseId}/?step=${index}`:`/investigation-lab/?case=${publicCaseId}&step=${index}`}>{labMode?'Open this step in the graph':'Open this step in the Lab'} ↗</a>}</div>
    <div className="case-controls" data-open={viewTools}>
      <div className="case-playback" role="group" aria-label="Case playback"><button className="btn btn-primary" onClick={()=>{if(index===model.frames.length-1&&!playing)advance(0);setPlaying(!playing);}}>{playing?'Pause':index===model.frames.length-1?'Replay':'Play'}</button><button className="btn btn-secondary" aria-label="Previous case step" disabled={index===0} onClick={()=>advance(index-1)}>←</button><button className="btn btn-secondary" aria-label="Next case step" disabled={index===model.frames.length-1} onClick={()=>advance(index+1)}>→</button><span aria-live="polite">{index+1}/{model.frames.length}</span></div>
      <button className="btn btn-secondary case-view-toggle" aria-label="Case view options" aria-expanded={viewTools} aria-controls="case-view-options" onClick={()=>setViewTools(!viewTools)}>View {viewTools?'−':'+'}</button>
      <div className="case-view-options" id="case-view-options">
      <div className="segmented-control" role="group" aria-label="Case graph context"><button aria-pressed={visibility==='all'} onClick={()=>{setVisibility('all');setPlaying(false);}}>All case questions</button><button aria-pressed={visibility==='path'} onClick={()=>{setVisibility('path');setPlaying(false);}}>Path + open leads</button></div>
      <div className="segmented-control" role="group" aria-label="Case graph presentation"><button aria-pressed={renderer==='atlas'} onClick={()=>{setRenderer('atlas');setPlaying(false);}}>Atlas</button><button aria-pressed={renderer==='3d'} onClick={()=>{setRenderer('3d');setPlaying(false);}}>3D nebula</button></div>
      </div>
    </div>
    <fieldset className="case-layers" aria-label="Visible question layers"><legend>Visible question layers</legend>{model.layers.map(l=><label key={l.id}><input type="checkbox" checked={layers.includes(l.id)} onChange={e=>{setPlaying(false);setLayers(e.target.checked?[...layers,l.id]:layers.filter(id=>id!==l.id));}}/>{l.id==='public'?'Public':l.id==='vendor'?'Vendor':'Company'}</label>)}<small>Display filters retain the complete record.</small></fieldset>
    <div className="case-mobile-current"><p>{current.node.category} · {currentLayer.id} layer · {current.actor.kind}</p><strong>{current.title}</strong><Badge value={current.assessment.outcome}/></div>
    {!isCurrentVisible&&<p className="case-filter-notice" role="status">The current question is hidden by the layer filters. <button className="il-reference" onClick={()=>setLayers([...new Set([...layers,current.node.layerId])])}>Show its layer</button></p>}
    <section className="case-leads" aria-label="Investigation leads" data-open={leadListOpen}><div aria-live="polite"><button className="case-lead-count" aria-expanded={leadListOpen} aria-controls="case-open-leads" onClick={()=>setLeadListOpen(!leadListOpen)}><strong>{trace.openLeadInstances.length} open {trace.openLeadInstances.length===1?'lead':'leads'}</strong><span aria-hidden="true"> {leadListOpen?'−':'+'}</span></button><span>{trace.unresolvedAssessmentIds.length} unresolved {trace.unresolvedAssessmentIds.length===1?'assessment':'assessments'}</span></div><p>Several questions can be open together. The timeline shows when their assessments were retained.</p><ul id="case-open-leads">{trace.openLeadInstances.map(instance=>{const node=model.instances.get(instance.id);return <li key={instance.id}><button className="il-reference" onClick={()=>inspect(node.id,instance.id)}>{questionLabel(node)} · {subjectLabel(instance)}</button></li>;})}</ul></section>
    <div className="case-body">
      <div className="case-map">{trace.visibleIds?.length===0?<div className="case-empty"><p>No question layers are visible.</p><button className="btn btn-secondary" onClick={()=>setLayers(['public','vendor','company'])}>Show all layers</button></div>:renderer==='3d'?<GraphThreeCanvas accessibleLabel="3D composed case graph. Use the case steps, declared options, and complete question list for keyboard exploration." graph={model.graph} view="all" selectedId={selected||current.node.id} trace={trace} onSelect={inspect} onFallback={()=>setRenderer('atlas')} shell={shell}/>:<GraphAtlasCanvas graph={model.graph} layout={layout} cardLabels showAtlasLabels={false} fitPadding={30} accessibleLabel="Composed case question graph. The case steps, declared options, and complete question list provide keyboard exploration." view="all" selectedId={selected||current.node.id} trace={trace} onSelect={inspect} onWhole={()=>setVisibility('all')} onFocus={()=>setVisibility('path')} shell={shell}/>}</div>
      <section className="case-current" aria-label="Case step details" tabIndex={0}>
        <p className="section-kicker">{inspected.category} / {layer.id} layer</p><h3>{inspected.question.prompt}</h3>
        <p className="case-owner">{layer.label} · {layer.owner} · v{layer.version}</p>
        {shown?<><div className="case-assessment"><Badge value={shown.assessment.outcome}/><p>{shown.actor.kind} · {shown.actor.label}</p></div>
          {shown.inputs.map(input=><p className="case-evidence" key={input.id}>{entryTitle(input)}</p>)}
          <p>{shown.assessment.rationale}</p>
          {shown.assessment.supersedes&&<p className="case-revision">Earlier assessment retained: {model.byId.get(shown.assessment.supersedes.entryId)?.outcome}. {shown.assessment.supersedes.reason}</p>}
          <p className="case-limitation"><strong>Limit</strong> {shown.limitation}</p>
          {shown.decision&&<div className="case-decision"><h4>Recorded decision</h4><p>{shown.decision.rationale}</p><p>Policy: {shown.decision.policyStatus.status} · Authority: {shown.decision.authorityStatus.status}</p>{model.entries.slice(0,shown.through).filter(e=>e.type==='ActionRecord'&&e.decisionId===shown.decision.id).map(e=><p key={e.id}><Badge value={e.stage}/>{e.operationDescription}</p>)}</div>}
          {onInspect&&<button className="il-reference" onClick={()=>inspectRecord(shown.assessment.id)}>Inspect this assessment and its inputs</button>}
        </>:<><p>No assessment for this question is visible at this step. A declared next option is not a finding.</p>{trace.openLeadIds.includes(inspected.id)&&futureFrame>=0&&<button className="btn btn-primary" onClick={()=>advance(futureFrame)}>Follow this recorded lead →</button>}</>}
        <details><summary>Evidence criteria and exact identity</summary><dl>{Object.entries(inspected.question.assessmentCriteria).map(([outcome,criterion])=><div key={outcome}><dt>{outcome}</dt><dd>{criterion}</dd></div>)}</dl><p><code>{inspected.question.id}</code></p><p>Definition v{model.graph.version}; exact bytes are included in the bundle.</p></details>
        <div className="case-next-options" role="group" aria-label="Declared case options"><h4>{shown&&!allOptions?'Routes for this answer':'Declared routes by answer'}</h4>{shown&&outgoing.length>0&&<label className="case-alternatives"><input type="checkbox" checked={allOptions} onChange={event=>setAllOptions(event.target.checked)}/>Show other answer routes</label>}{options.map(edge=><button className="btn btn-secondary" key={edge.id} onClick={()=>inspect(edge.target)} title={model.graph.nodes.find(n=>n.id===edge.target)?.question.prompt} data-route-status={recordedRouteIds.has(edge.id)?'recorded':shown&&edge.decision===shown.assessment.outcome?'eligible':'other-outcome'}><span>{edge.decision} → {questionLabel(model.graph.nodes.find(n=>n.id===edge.target))}</span><small>{recordedRouteIds.has(edge.id)?'Recorded selection':shown&&edge.decision===shown.assessment.outcome?'Eligible · unselected':'Other outcome'}</small></button>)}{outgoing.length>0&&<p>One answer can enable several routes. Inspecting an option previews its question; it does not select a route or change the record.</p>}{!outgoing.length&&<p>End of this definition path; the investigation may remain open.</p>}</div>
      </section>
    </div>
    <nav className="case-step-navigation" aria-label="Case investigation steps"><ol>{model.frames.map((frame,i)=><li key={frame.assessment.id}><button aria-current={i===index?'step':undefined} onClick={()=>advance(i)}><span>{String(i+1).padStart(2,'0')} · {frame.node.category} · {frame.node.layerId}</span><strong>{frame.title}</strong><small>{frame.actor.kind} · {frame.assessment.outcome}{frame.decision?.selections?.length>1?` · ${frame.decision.selections.length} leads opened`:''}</small></button></li>)}</ol></nav>
    <details className="case-question-list"><summary>All case questions and layer identities</summary><ul>{model.graph.nodes.map(node=><li key={node.id}><button className="il-reference" onClick={()=>inspect(node.id)}>{questionLabel(node)} · {node.category} · {node.layerId}</button></li>)}</ul></details>
    <p className="case-caption">Fictional case in historical view. Mint routes retain recorded Decision selections, including selections under earlier assessments; other arrows are declared options. Branches show separate leads, and the final handoff retains their independent findings and gaps. Timeline order adds no route. Public, vendor, and company identities remain distinct. No evidence is retrieved and no response action runs. <a href="/graphs/">Open the separate 609-question public atlas ↗</a></p>
  </div>;
}
