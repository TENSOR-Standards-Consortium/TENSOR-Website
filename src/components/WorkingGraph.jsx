import { useEffect, useMemo, useRef, useState } from 'react';
import GraphAtlasCanvas from './GraphAtlasCanvas.jsx';
import GraphThreeCanvas from './GraphThreeCanvas.jsx';
import InvestigationTimeline from './InvestigationTimeline.jsx';
import { GUIDES, GUIDE_GRAPH_VERSION, guideState, readGuideState } from '../lib/guidedInvestigations.mjs';
import { Badge } from './WorkspaceUI.jsx';
import { atlasLayout, DOMAINS, DOMAIN_COLORS, readAtlasState, writeAtlasState } from '../lib/graphAtlas.mjs';
import '../styles/graph-atlas.css';

export default function WorkingGraph({ graph: working, published, criteria, source }) {
  const graphs = useMemo(() => ({ working, published }), [working, published]);
  const [state, setState] = useState({ dataset: 'working', node: null, view: 'all', renderer: 'atlas', guideId: null, step: 0, visibility: 'all' });
  const [playing, setPlaying] = useState(false), [speed, setSpeed] = useState(7000);
  const stateRef = useRef(state); stateRef.current = state;
  const [outline, setOutline] = useState(false), [query, setQuery] = useState('');
  const [ready, setReady] = useState(false), [orientation, setOrientation] = useState('wide');
  const shell = useRef(null), inspectorTitle = useRef(null), searchInput = useRef(null), findButton = useRef(null);
  const graph = graphs[state.dataset], isWorking = state.dataset === 'working';
  const layout = useMemo(() => atlasLayout(graph, state.renderer === '3d' ? 'wide' : orientation), [graph, orientation, state.renderer]);
  const guide = state.dataset === 'working' && graph.version === GUIDE_GRAPH_VERSION ? GUIDES.find(g => g.id === state.guideId) : null;
  const trace = useMemo(() => guide ? guideState(graph, guide, state.step, state.visibility) : null, [graph,guide,state.step,state.visibility]);
  const byId = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph]);
  useEffect(() => {
    const read = () => { const atlas = readAtlasState(window.location.search, graphs); const guided = readGuideState(window.location.search); setState({ ...atlas, ...guided, dataset: guided.guideId ? 'working' : atlas.dataset }); setPlaying(false); };
    const media = window.matchMedia('(max-width: 600px)');
    const resize = () => setOrientation(media.matches ? 'portrait' : 'wide');
    read(); resize(); setReady(true); window.addEventListener('popstate', read); media.addEventListener('change', resize);
    return () => { window.removeEventListener('popstate', read); media.removeEventListener('change', resize); };
  }, [graphs]);
  useEffect(() => { if (state.node) inspectorTitle.current?.focus({ preventScroll: true }); }, [state.node, state.dataset]);
  useEffect(() => { if (outline) searchInput.current?.focus({ preventScroll: true }); }, [outline]);
  const change = (patch, replace = false) => {
    const next = { ...stateRef.current, ...patch }; stateRef.current = next;
    setState(next);
    const url = new URL(window.location.href); url.search = writeAtlasState(url.search, next);
    if (next.renderer === '3d') url.searchParams.set('renderer','3d'); else url.searchParams.delete('renderer');
    if (next.guideId) { url.searchParams.set('investigation',next.guideId); url.searchParams.set('step',String(next.step)); } else { url.searchParams.delete('investigation'); url.searchParams.delete('step'); }
    if (next.visibility === 'path') url.searchParams.set('context','path'); else url.searchParams.delete('context');
    if (url.href !== window.location.href) window.history[replace ? 'replaceState' : 'pushState'](null, '', url);
  };
  const advance = (step, replace = false) => change({step, node: null}, replace);
  useEffect(() => {
    if (!playing || !guide) return;
    if (state.step >= guide.steps.length - 1) { setPlaying(false); return; }
    const timer = window.setTimeout(() => advance(state.step + 1, true), speed);
    const pause = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange',pause);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange',pause); };
  }, [playing, guide, state.step, speed]);
  const chooseGuide = (id) => { setPlaying(false); setOutline(false); change({ guideId: id, dataset: 'working', step: 0, node: null, view: 'all' }); };
  const select = (id) => { if (byId.has(id)) change({ node: id }); };
  const node = byId.get(state.node);
  const evidence = isWorking && node ? criteria.nodes[node.id] : null;
  const rule = criteria.rules[evidence?.rule];
  const outgoing = node ? graph.edges.filter((e) => e.source === node.id) : [];
  const incoming = node ? graph.edges.filter((e) => e.target === node.id) : [];
  const found = graph.nodes.filter((n) => `${n.id} ${n.label} ${n.text} ${n.category}`.toLowerCase().includes(query.trim().toLowerCase()));
  const file = source.files.find((f) => f.target === (isWorking ? 'public/graphs/working/tensor.core.graph.json' : 'public/legacy/0.20260206e/tensor.core.graph.json'));
  return <div className="atlas" aria-busy={!ready} ref={shell}>
    <div className="atlas-heading">
      <div><p className="section-kicker">TENSOR / INVESTIGATION KNOWLEDGE</p><h1>The investigation atlas<span>.</span></h1></div>
      <div className="atlas-mode-tabs" role="group" aria-label="Workspace mode"><button aria-pressed={!guide} onClick={() => { setPlaying(false); change({guideId:null,node:null,view:'all'}); }}>Explore</button><button aria-pressed={!!guide} onClick={() => chooseGuide(state.guideId || GUIDES[0].id)}>Follow an investigation</button></div>
    </div>
    <div className="atlas-toolbar">
      <div className="atlas-source-tabs" role="group" aria-label="Graph version">
        <button aria-pressed={isWorking} onClick={() => { setPlaying(false); change({ dataset: 'working', guideId:null, node: null, view: 'all' }); setQuery(''); }}><span>Working draft</span><strong>{working.nodes.length}</strong></button>
        <button aria-pressed={!isWorking} onClick={() => { setPlaying(false); change({ dataset: 'published', guideId:null, node: null, view: 'all' }); setQuery(''); }}><span>Published graph</span><strong>{published.nodes.length}</strong></button>
      </div>
      <div className="atlas-version"><span>{isWorking ? 'UNRATIFIED' : 'PRESERVED RELEASE'}</span><code>{graph.version}</code></div>
      <div className="atlas-render-tabs" role="group" aria-label="Graph presentation"><button aria-pressed={state.renderer === 'atlas'} onClick={() => change({renderer:'atlas'})}>Atlas</button><button aria-pressed={state.renderer === '3d'} onClick={() => change({renderer:'3d'})}>3D nebula</button></div>
      <button ref={findButton} className="btn btn-secondary atlas-find" aria-expanded={outline} aria-controls="atlas-questions" onClick={() => setOutline(!outline)}>⌕ Questions <span>{graph.nodes.length}</span></button>
    </div>
    {guide && <div className="atlas-follow-bar"><span><i className="timeline-live-dot" /><strong>{guide.title}</strong><small>{playing ? 'Playing' : 'Step through'} · {guide.domain}</small></span><div role="group" aria-label="Investigation graph context"><button aria-pressed={state.visibility === 'all'} onClick={() => change({visibility:'all'})}>Whole graph + path</button><button aria-pressed={state.visibility === 'path'} onClick={() => change({visibility:'path'})}>Path + next options</button></div></div>}
    <div className={`atlas-workbench ${guide ? 'is-guided' : ''}`}>
      {guide && <div className="guide-mobile-current"><div><small>STEP {state.step + 1} / {guide.steps.length} · {guide.steps[state.step].questionId}</small><strong>{guide.steps[state.step].title}</strong><Badge value={guide.steps[state.step].outcome} /></div><p>{guide.steps[state.step].evidence}</p><div className="guide-mobile-buttons"><button className="btn btn-primary" onClick={()=>{if(state.step===guide.steps.length-1&&!playing) advance(0);setPlaying(!playing);}}>{playing?'Pause investigation':'Play investigation'}</button><button className="btn btn-secondary" aria-label="Previous step on map" disabled={state.step===0} onClick={()=>{setPlaying(false);advance(state.step-1);}}>←</button><button className="btn btn-secondary" aria-label="Next step on map" disabled={state.step===guide.steps.length-1} onClick={()=>{setPlaying(false);advance(state.step+1);}}>→</button></div></div>}
      {state.renderer === '3d' ? <GraphThreeCanvas graph={graph} view={state.view} selectedId={state.node || trace?.currentId} trace={trace} onSelect={id=>{setPlaying(false);select(id);}} onFallback={()=>change({renderer:'atlas'})} shell={shell} /> : <GraphAtlasCanvas graph={graph} layout={layout} selectedId={state.node || trace?.currentId} view={state.view} trace={trace} onSelect={id=>{setPlaying(false);select(id);}} onWhole={() => change({ view: 'all', visibility:'all' })} onFocus={() => change({ view: 'focus' })} shell={shell} />}
      {guide && <InvestigationTimeline guide={guide} index={state.step} playing={playing} setPlaying={setPlaying} advance={advance} chooseGuide={chooseGuide} graph={graph} criteria={criteria} inspect={select} speed={speed} setSpeed={setSpeed} />}
      {outline && <aside className="atlas-question-drawer" id="atlas-questions" aria-label="Find a question"><div className="atlas-drawer-title"><h2>Questions</h2><button aria-label="Close questions" onClick={() => { setOutline(false); findButton.current?.focus(); }}>×</button></div><label htmlFor="atlas-search">Search ID, topic, or question</label><input ref={searchInput} id="atlas-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} /><p>{found.length} of {graph.nodes.length} questions</p><ul>{found.map((n) => <li key={n.id}><button aria-pressed={n.id === state.node} onClick={() => { select(n.id); setOutline(false); }}><code>{n.id}</code><span>{n.label}<small>{n.category} / {n.archetype}</small></span></button></li>)}</ul></aside>}
      {node && <aside className="atlas-inspector" aria-label="Selected question"><div className="atlas-drawer-title"><p className="section-kicker">{node.id} / {node.category}</p><button aria-label="Close inspector" onClick={() => { change({ node: null, view: 'all' }); findButton.current?.focus(); }}>×</button></div><p className="atlas-node-stage">{node.archetype} · {isWorking ? 'Working definition' : 'Published definition'}</p><h2 ref={inspectorTitle} tabIndex={-1}>{node.text}</h2>
        <h3>{outgoing.length ? 'Follow a route' : 'Route endpoint'}</h3>{!outgoing.length && <p>This route stops here. The investigation can remain open.</p>}
        <ul className="atlas-routes">{outgoing.map((e, i) => <li key={i}><Badge value={e.decision} /><button onClick={() => select(e.target)}><code>{e.target}</code> {byId.get(e.target)?.label}<span aria-hidden="true">→</span></button></li>)}</ul>
        {incoming.length > 0 && <details><summary>Incoming routes · {incoming.length}</summary><ul>{incoming.map((e, i) => <li key={i}><button onClick={() => select(e.source)}>{e.source} on {e.decision}</button></li>)}</ul></details>}
        <h3>Evidence criteria</h3>{rule ? <dl>{['yes', 'no', 'unknown'].map((outcome) => <div key={outcome}><dt><Badge value={outcome} /></dt><dd>{rule[outcome]}</dd></div>)}</dl> : <p>This preserved release predates the working evidence criteria. Its question and routes are shown as published; current criteria are not silently applied to it.</p>}
        {evidence?.sourceFacet && <div className="atlas-resumption"><h3>Assessment context</h3><p>Evidence focus: <strong>{evidence.sourceFacet}</strong>.</p><p>{evidence.resumePrerequisites?.length ? `Before assessing: ${evidence.resumePrerequisites.map(s => s.replaceAll('-', ' ')).join(', ')}. Recheck these against the bound evidence when resuming here.` : 'Bind the subjects, event, evidence material and time interval before assessing.'}</p><p>Each next question needs its own evidence. Following an arrow does not supply its answer.</p><a href={`/graphs/coverage/#${node.id}`}>Original wording &amp; review disposition ↗</a></div>}
        {evidence && <details><summary>Bindings and assessment record</summary><p>Bind: {evidence.boundSubjectFields?.join(', ')} and the exact time interval.</p><p>Record: {evidence.requiredAssessmentRecord?.join(', ')}.</p><ul>{criteria.bindingRules.map((text, i) => <li key={i}>{text}</li>)}</ul></details>}
        {!isWorking && <a href={`/questions/0.20260206e/${node.id}/`}>Open published question page ↗</a>}
      </aside>}
    </div>
    <div className="atlas-domain-nav" role="group" aria-label="Start with a domain">{DOMAINS.map((domain, i) => <button key={domain} onClick={() => { setPlaying(false); change({ guideId:null,node: graph.entryNodeIds.find((id) => byId.get(id)?.category === domain) || graph.nodes.find((n) => n.category === domain)?.id, view: 'focus' }); }}><i style={{ backgroundColor: DOMAIN_COLORS[i] }} />{domain}<span>{graph.nodes.filter((n) => n.category === domain).length}</span></button>)}</div>
    <div className="atlas-footnote"><p>{guide ? `Amber = followed path · ${state.renderer === '3d' ? 'bright domain nodes' : 'dashed node border'} = next options. Example assessments stay separate; a route is not a finding.` : 'Groups = domain & question stage. Spatial proximity is a display aid; only arrows assert routes.'} <a href="/investigation-lab/">Inspect or exchange a record in the Lab ↗</a></p><details><summary>Source &amp; exact digest</summary><a href={`${source.sourceRepository}/blob/${source.sourceCommit}/${file?.source}`}>Pinned framework source</a><code>{file?.sha256}</code><p>Schema {graph.schemaVersion}. Matching IDs across versions do not imply equivalent meaning.</p></details></div>
  </div>;
}
