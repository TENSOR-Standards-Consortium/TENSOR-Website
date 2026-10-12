import { useEffect, useMemo, useRef, useState } from 'react';
import GraphAtlasCanvas from './GraphAtlasCanvas.jsx';
import { Badge } from './WorkspaceUI.jsx';
import { atlasLayout, DOMAINS, DOMAIN_COLORS, readAtlasState, writeAtlasState } from '../lib/graphAtlas.mjs';
import '../styles/graph-atlas.css';

export default function WorkingGraph({ graph: working, published, criteria, source }) {
  const graphs = useMemo(() => ({ working, published }), [working, published]);
  const [state, setState] = useState({ dataset: 'working', node: null, view: 'all' });
  const [outline, setOutline] = useState(false), [query, setQuery] = useState('');
  const [ready, setReady] = useState(false), [orientation, setOrientation] = useState('wide');
  const shell = useRef(null), inspectorTitle = useRef(null), searchInput = useRef(null), findButton = useRef(null);
  const graph = graphs[state.dataset], isWorking = state.dataset === 'working';
  const layout = useMemo(() => atlasLayout(graph, orientation), [graph, orientation]);
  const byId = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph]);
  useEffect(() => {
    const read = () => setState(readAtlasState(window.location.search, graphs));
    const media = window.matchMedia('(max-width: 600px)');
    const resize = () => setOrientation(media.matches ? 'portrait' : 'wide');
    read(); resize(); setReady(true); window.addEventListener('popstate', read); media.addEventListener('change', resize);
    return () => { window.removeEventListener('popstate', read); media.removeEventListener('change', resize); };
  }, [graphs]);
  useEffect(() => { if (state.node) inspectorTitle.current?.focus({ preventScroll: true }); }, [state.node, state.dataset]);
  useEffect(() => { if (outline) searchInput.current?.focus({ preventScroll: true }); }, [outline]);
  const change = (patch) => {
    const next = { ...state, ...patch };
    setState(next);
    const url = new URL(window.location.href); url.search = writeAtlasState(url.search, next);
    if (url.href !== window.location.href) window.history.pushState(null, '', url);
  };
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
      <a className="atlas-lab-link" href="/investigation-lab/">Follow an investigation <span aria-hidden="true">↗</span></a>
    </div>
    <div className="atlas-toolbar">
      <div className="atlas-source-tabs" role="group" aria-label="Graph version">
        <button aria-pressed={isWorking} onClick={() => { change({ dataset: 'working', node: null, view: 'all' }); setQuery(''); }}><span>Working draft</span><strong>{working.nodes.length}</strong></button>
        <button aria-pressed={!isWorking} onClick={() => { change({ dataset: 'published', node: null, view: 'all' }); setQuery(''); }}><span>Published graph</span><strong>{published.nodes.length}</strong></button>
      </div>
      <div className="atlas-version"><span>{isWorking ? 'UNRATIFIED' : 'PRESERVED RELEASE'}</span><code>{graph.version}</code></div>
      <button ref={findButton} className="btn btn-secondary atlas-find" aria-expanded={outline} aria-controls="atlas-questions" onClick={() => setOutline(!outline)}>⌕ Questions <span>{graph.nodes.length}</span></button>
    </div>
    <div className="atlas-workbench">
      <GraphAtlasCanvas graph={graph} layout={layout} selectedId={state.node} view={state.view} onSelect={select} onWhole={() => change({ view: 'all' })} onFocus={() => change({ view: 'focus' })} shell={shell} />
      {outline && <aside className="atlas-question-drawer" id="atlas-questions" aria-label="Find a question"><div className="atlas-drawer-title"><h2>Questions</h2><button aria-label="Close questions" onClick={() => { setOutline(false); findButton.current?.focus(); }}>×</button></div><label htmlFor="atlas-search">Search ID, topic, or question</label><input ref={searchInput} id="atlas-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} /><p>{found.length} of {graph.nodes.length} questions</p><ul>{found.map((n) => <li key={n.id}><button aria-pressed={n.id === state.node} onClick={() => { select(n.id); setOutline(false); }}><code>{n.id}</code><span>{n.label}<small>{n.category} / {n.archetype}</small></span></button></li>)}</ul></aside>}
      {node && <aside className="atlas-inspector" aria-label="Selected question"><div className="atlas-drawer-title"><p className="section-kicker">{node.id} / {node.category}</p><button aria-label="Close inspector" onClick={() => { change({ node: null, view: 'all' }); findButton.current?.focus(); }}>×</button></div><p className="atlas-node-stage">{node.archetype} · {isWorking ? 'Working definition' : 'Published definition'}</p><h2 ref={inspectorTitle} tabIndex={-1}>{node.text}</h2>
        <h3>{outgoing.length ? 'Follow a route' : 'Route endpoint'}</h3>{!outgoing.length && <p>This route stops here. The investigation can remain open.</p>}
        <ul className="atlas-routes">{outgoing.map((e, i) => <li key={i}><Badge value={e.decision} /><button onClick={() => select(e.target)}><code>{e.target}</code> {byId.get(e.target)?.label}<span aria-hidden="true">→</span></button></li>)}</ul>
        {incoming.length > 0 && <details><summary>Incoming routes · {incoming.length}</summary><ul>{incoming.map((e, i) => <li key={i}><button onClick={() => select(e.source)}>{e.source} on {e.decision}</button></li>)}</ul></details>}
        <h3>Evidence criteria</h3>{rule ? <dl>{['yes', 'no', 'unknown'].map((outcome) => <div key={outcome}><dt><Badge value={outcome} /></dt><dd>{rule[outcome]}</dd></div>)}</dl> : <p>This preserved release predates the working evidence criteria. Its question and routes are shown as published; current criteria are not silently applied to it.</p>}
        {evidence && <details><summary>Bindings and assessment record</summary><p>Bind: {evidence.boundSubjectFields?.join(', ')} and the exact time interval.</p><p>Record: {evidence.requiredAssessmentRecord?.join(', ')}.</p><ul>{criteria.bindingRules.map((text, i) => <li key={i}>{text}</li>)}</ul></details>}
        {!isWorking && <a href={`/questions/0.20260206e/${node.id}/`}>Open published question page ↗</a>}
      </aside>}
    </div>
    <div className="atlas-domain-nav" role="group" aria-label="Start with a domain">{DOMAINS.map((domain, i) => <button key={domain} onClick={() => change({ node: graph.entryNodeIds.find((id) => byId.get(id)?.category === domain) || graph.nodes.find((n) => n.category === domain)?.id, view: 'focus' })}><i style={{ backgroundColor: DOMAIN_COLORS[i] }} />{domain}<span>{graph.nodes.filter((n) => n.category === domain).length}</span></button>)}</div>
    <div className="atlas-footnote"><p>Position = domain &amp; question stage. Only arrows assert routes. This is a definition map; recorded investigation paths live in the Lab.</p><details><summary>Source &amp; exact digest</summary><a href={`${source.sourceRepository}/blob/${source.sourceCommit}/${file?.source}`}>Pinned framework source</a><code>{file?.sha256}</code><p>Schema {graph.schemaVersion}. Matching IDs across versions do not imply equivalent meaning.</p></details></div>
  </div>;
}
