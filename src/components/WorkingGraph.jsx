import { useEffect, useMemo, useState } from 'react';
import GraphCanvas from './GraphCanvas.jsx';
import { Badge, Panel } from './WorkspaceUI.jsx';
import { definitionView } from '../lib/graphViews.mjs';

export default function WorkingGraph({ graph, criteria, source }) {
  const [selectedId, setSelectedId] = useState(graph.entryNodeIds[0]);
  const [whole, setWhole] = useState(false);
  const [query, setQuery] = useState('');
  const [ready, setReady] = useState(false);
  const byId = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph]);
  useEffect(() => {
    const read = () => { const id = new URL(window.location.href).searchParams.get('node'); setSelectedId(byId.has(id) ? id : graph.entryNodeIds[0]); };
    read(); setReady(true); window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, [byId, graph]);
  function select(id) {
    if (!byId.has(id)) return;
    setSelectedId(id);
    const url = new URL(window.location.href); url.searchParams.set('node', id);
    if (url.href !== window.location.href) window.history.pushState(null, '', url);
  }
  const view = useMemo(() => definitionView(graph, selectedId, whole), [graph, selectedId, whole]);
  const node = byId.get(view.selected);
  const evidence = criteria.nodes[node.id];
  const rule = criteria.rules[evidence?.rule];
  const found = graph.nodes.filter((item) => `${item.id} ${item.label} ${item.text} ${item.category}`.toLowerCase().includes(query.toLowerCase().trim()));
  const outgoing = graph.edges.filter((edge) => edge.source === node.id);
  const incoming = graph.edges.filter((edge) => edge.target === node.id);
  return <div className="tensor-graph-workspace" aria-busy={!ready}>
    <Panel className="tensor-graph-heading">
      <div><p className="section-kicker">Working definition · unratified draft</p><h2>{graph.nodes.length} questions. Seven starting points.</h2><p>Choose a starting point, inspect a question, and follow its available branches. Exploring definitions does not record an assessment or create an investigation.</p></div>
      <div className="tensor-graph-source"><Badge value="unknown">Draft {graph.version}</Badge><p>Schema {graph.schemaVersion}</p><a href={`${source.sourceRepository}/tree/${source.sourceCommit}/drafts/core`}>Pinned framework source</a><details><summary>Exact graph digest</summary><code>{criteria.graphSha256}</code></details></div>
    </Panel>
    <nav className="tensor-graph-entries" aria-label="Working graph entry points">{graph.entryNodeIds.map((id) => <a href={`?node=${encodeURIComponent(id)}`} key={id} className={`btn ${node.id === id ? 'btn-primary' : 'btn-secondary'}`} aria-current={node.id === id ? 'true' : undefined} onClick={(event) => { event.preventDefault(); select(id); }}>{byId.get(id)?.category} · {id}</a>)}</nav>
    <div className="tensor-graph-layout">
      <Panel as="aside" className="tensor-graph-outline" aria-label="Question list"><h3>Find a question</h3><label htmlFor="working-node-search">ID, topic, or question text</label><input id="working-node-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} /><p className="tensor-graph-caption">{found.length} questions</p><ul>{found.map((item) => <li key={item.id}><a href={`?node=${encodeURIComponent(item.id)}`} aria-current={node.id === item.id ? 'true' : undefined} onClick={(event) => { event.preventDefault(); select(item.id); }}>{item.id} · {item.label}</a></li>)}</ul></Panel>
      <div className="tensor-graph-main"><div className="tensor-graph-mode"><label><input type="checkbox" checked={whole} onChange={(event) => setWhole(event.target.checked)} /> Show the whole working graph</label><p className="tensor-graph-caption">{whole ? 'Overview: use zoom or clear this option to read a local route.' : 'Focus: the selected question and its direct incoming and outgoing neighbors.'}</p></div><GraphCanvas nodes={view.nodes} edges={view.edges} selectedId={node.id} onSelect={select} label="Working definition graph" />
        <Panel className="tensor-graph-inspector" aria-label="Selected working question"><p className="section-kicker">{node.id} · {node.category} · {node.archetype}</p><h3>{node.text}</h3><p>{outgoing.length ? 'Available outgoing routes' : 'This definition route stops here. The investigation can remain open.'}</p><ul className="tensor-route-list">{outgoing.map((edge) => <li key={edge.id}><Badge value={edge.decision} /><a href={`?node=${encodeURIComponent(edge.target)}`} onClick={(event) => { event.preventDefault(); select(edge.target); }}>{edge.target} · {byId.get(edge.target)?.label}</a></li>)}</ul>
          {incoming.length > 0 && <details><summary>Incoming routes ({incoming.length})</summary><ul>{incoming.map((edge) => <li key={edge.id}><a href={`?node=${encodeURIComponent(edge.source)}`} onClick={(event) => { event.preventDefault(); select(edge.source); }}>{edge.source}</a> on {edge.decision}</li>)}</ul></details>}
          <h4>Evidence criteria</h4>{rule ? <dl>{['yes', 'no', 'unknown'].map((outcome) => <div key={outcome}><dt><Badge value={outcome} /></dt><dd>{rule[outcome]}</dd></div>)}</dl> : <p>Criteria unavailable; do not infer them from the branch label.</p>}
          <details><summary>Required bindings and assessment record</summary><p>Bind: {evidence?.boundSubjectFields?.join(', ')} and the exact time interval.</p><p>Record: {evidence?.requiredAssessmentRecord?.join(', ')}.</p><ul>{criteria.bindingRules.map((text, i) => <li key={i}>{text}</li>)}</ul></details>
        </Panel>
      </div>
    </div>
    <p className="tensor-graph-caption">This working graph is separate from the 588-question published graph and the Core {source.bindingVersion} case definitions. Matching question IDs across versions do not imply matching meaning.</p>
  </div>;
}
