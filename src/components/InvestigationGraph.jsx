import { useMemo, useState } from 'react';
import { asText, getEntries, entryTitle } from '../lib/investigationLab.mjs';
import { recordedView } from '../lib/graphViews.mjs';
import GraphCanvas from './GraphCanvas.jsx';
import { Badge, Panel } from './WorkspaceUI.jsx';

export default function InvestigationGraph({ bundle, questions, onInspect }) {
  const entries = useMemo(() => getEntries(bundle), [bundle]);
  const [through, setThrough] = useState(entries.length);
  const [selectedId, setSelectedId] = useState('');
  const [page, setPage] = useState(0);
  const view = useMemo(() => recordedView(bundle, questions, through), [bundle, questions, through]);
  const selected = view.nodes.find((node) => node.id === selectedId) || view.nodes[0];
  const last = entries[through - 1];
  const decisions = selected ? view.entries.filter((entry) => entry.type === 'Decision' && entry.targetInstanceId === selected.entryId) : [];
  function step(next) { setThrough(next); setPage(0); }
  return <div className="tensor-record-graph">
    <div className="il-content-heading"><p className="il-eyebrow">Record replay</p><h2>Recorded investigation path</h2><p className="tensor-graph-caption">Nodes represent question instances; repeated questions can have different subjects or parameters. Arrows represent recorded transition selections. The validation report evaluates those selections.</p></div>
    <Panel className="tensor-graph-replay" aria-label="Record replay">
      <label htmlFor="record-replay">Record prefix: {through} of {entries.length} entries</label>
      <input id="record-replay" type="range" min="0" max={entries.length} value={through} onChange={(event) => step(Number(event.target.value))} />
      <div className="tensor-graph-actions"><button type="button" className="btn btn-secondary" disabled={through === 0} onClick={() => step(through - 1)}>Previous entry</button><button type="button" className="btn btn-secondary" disabled={through === entries.length} onClick={() => step(through + 1)}>Next entry</button><button type="button" className="btn btn-secondary" disabled={through === entries.length} onClick={() => step(entries.length)}>Show complete record</button></div>
      <p className="tensor-graph-caption" aria-live="polite">{last ? `${last.type} · ${asText(last.recordedAt)} · ${entryTitle(last)}` : 'Before the first entry.'}</p>
      {last?.id && <button type="button" className="il-reference" disabled={typeof last.id !== 'string'} onClick={() => onInspect(last.id)}>Inspect this entry</button>}
      <p className="tensor-graph-caption">Steps follow the original file order. Timestamps and adjacency do not establish causality. Later assessments and review decisions remain separate assertions.</p>
    </Panel>
    {view.issues.length > 0 && <div className="tensor-graph-notice" role="status"><ul>{view.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div>}
    <GraphCanvas nodes={view.nodes} edges={view.edges} selectedId={selected?.id} onSelect={setSelectedId} label="Recorded investigation transitions" />
    <div className="tensor-record-details">
      <Panel className="tensor-graph-outline" aria-label="Recorded question instances"><h3>Question instances ({view.nodes.length})</h3><ol start={page * 30 + 1}>{view.nodes.slice(page * 30, (page + 1) * 30).map((node) => <li key={node.id}><button type="button" aria-pressed={selected?.id === node.id} onClick={() => setSelectedId(node.id)}>{asText(node.question?.prompt || node.entry.questionId)}<small>{node.entryId}</small></button></li>)}</ol>{view.nodes.length > 30 && <div className="tensor-graph-actions"><button type="button" className="btn btn-secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous questions</button><button type="button" className="btn btn-secondary" disabled={(page + 1) * 30 >= view.nodes.length} onClick={() => setPage(page + 1)}>Next questions</button></div>}</Panel>
      <Panel className="tensor-graph-inspector" aria-label="Selected recorded instance">{selected ? <>
        <h3>{asText(selected.question?.prompt || 'Exact definition unavailable')}</h3><p className="tensor-graph-caption"><code>{selected.entryId}</code></p><p>Subject bindings: {asText(selected.entry.subjectBindings)}</p><p>Time context: {asText(selected.entry.timeContext)}</p><button type="button" className="il-reference" onClick={() => onInspect(selected.entryId)}>Inspect question, bindings, and criteria</button>
        <h4>Retained assessments ({selected.assessments.length})</h4>{selected.assessments.length === 0 && <p>No assessment recorded at this step.</p>}<ul className="tensor-record-assessments">{selected.assessments.map((assessment, i) => <li key={i}><Badge value={assessment.outcome}>{asText(assessment.outcome || 'Unspecified')}</Badge><button type="button" className="il-reference" disabled={typeof assessment.id !== 'string'} onClick={() => onInspect(assessment.id)}>Inspect assessment</button><p>{asText(assessment.rationale)}</p><p className="tensor-graph-caption">Recorded {asText(assessment.recordedAt)}{assessment.supersedes ? ` · Supersedes ${asText(assessment.supersedes.entryId)}; earlier entry retained.` : ''}</p></li>)}</ul>
        <h4>Recorded decisions ({decisions.length})</h4><ul>{decisions.map((decision, i) => <li key={i}><button type="button" className="il-reference" disabled={typeof decision.id !== 'string'} onClick={() => onInspect(decision.id)}>{asText(decision.disposition)} · inspect decision</button><p className="tensor-graph-caption">Selected assessment: {asText(decision.selectedAssessmentId || 'none specified')}</p></li>)}</ul>
      </> : <p>No uniquely identified question instance is available at this step. Use the original record and validation report to inspect missing or ambiguous entries.</p>}</Panel>
    </div>
  </div>;
}
