import { useEffect, useRef } from 'react';
import { Badge } from './WorkspaceUI.jsx';
import { GUIDES, GUIDE_PROVENANCE, GUIDE_GRAPH_SHA256, GUIDE_CRITERIA_SHA256 } from '../lib/guidedInvestigations.mjs';

export default function InvestigationTimeline({ guide, index, playing, setPlaying, advance, chooseGuide, graph, criteria, inspect, speed, setSpeed }) {
  const current = guide.steps[index];
  const question = graph.nodes.find(n => n.id === current.questionId);
  const nextRoutes = graph.edges.filter(e => e.source === current.questionId);
  const active = useRef(null);
  useEffect(() => {
    const rail = active.current?.parentElement?.parentElement;
    const item = active.current;
    if (rail && item) rail.scrollTo({ top: item.offsetTop - 12, behavior: 'instant' });
  }, [index, guide]);
  return <aside className="investigation-timeline" aria-label="Guided investigation timeline">
    <div className="timeline-heading"><p className="section-kicker">FOLLOW AN INVESTIGATION</p><label htmlFor="guide-select">Example investigation</label><select id="guide-select" value={guide.id} onChange={e => chooseGuide(e.target.value)}>{GUIDES.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select><p>{guide.description}</p></div>
    <div className="timeline-playback">
      <div className="timeline-playback-buttons"><button className="btn btn-primary" onClick={() => { if (index === guide.steps.length - 1 && !playing) advance(0); setPlaying(!playing); }}>{playing ? 'Pause' : index === guide.steps.length - 1 ? 'Replay' : 'Play'}</button><button className="btn btn-secondary" aria-label="Previous step" disabled={index === 0} onClick={() => { setPlaying(false); advance(index - 1); }}>←</button><button className="btn btn-secondary" aria-label="Next step" disabled={index === guide.steps.length - 1} onClick={() => { setPlaying(false); advance(index + 1); }}>→</button><span>{String(index + 1).padStart(2,'0')} / {String(guide.steps.length).padStart(2,'0')}</span></div>
      <label className="sr-only" htmlFor="timeline-position">Investigation step</label><input id="timeline-position" type="range" min="0" max={guide.steps.length - 1} value={index} onChange={e => { setPlaying(false); advance(Number(e.target.value)); }} aria-valuetext={`Step ${index + 1}: ${current.title}`} />
      <label className="timeline-speed">Playback <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value="7000">7s / step</option><option value="12000">12s / step</option></select></label>
    </div>
    <div className="timeline-next-options" aria-label="Declared next options"><small>{nextRoutes.length ? 'NEXT OPTIONS · PREVIEW A DEFINITION' : 'ROUTE ENDPOINT · INVESTIGATION MAY REMAIN OPEN'}</small>{nextRoutes.map((edge,i)=><button key={i} onClick={()=>{setPlaying(false);inspect(edge.target);}}><Badge value={edge.decision}/><span>{edge.target}</span><span aria-hidden="true">↗</span></button>)}</div>
    <div className="timeline-scroll"><ol className="timeline-entries">{guide.steps.map((entry, i) => <li key={`${guide.id}-${i}`} ref={i === index ? active : null} className={i === index ? 'is-current' : i < index ? 'is-complete' : 'is-pending'}><button aria-current={i === index ? 'step' : undefined} onClick={() => { setPlaying(false); advance(i); }}><span className="timeline-dot">{i < index ? '✓' : String(i + 1).padStart(2,'0')}</span><span><small>{i <= index ? entry.questionId : 'UP NEXT'}</small><strong>{i <= index ? entry.title : graph.nodes.find(n => n.id === entry.questionId)?.archetype}</strong></span>{i <= index && <Badge value={entry.outcome} />}</button>{i === index && <div className="timeline-entry-body" aria-live="polite"><p className="timeline-field">EVIDENCE</p><p>{current.evidence}</p><p className="timeline-field">ASSESSMENT · {criteria.nodes[current.questionId].rule}</p><p>{current.rationale}</p><p className="timeline-limit">{current.limitation}</p><details className="timeline-question"><summary>Exact question · {question.id}</summary><p>{question.text}</p></details><button className="timeline-inspect" onClick={() => { setPlaying(false); inspect(current.questionId); }}>Inspect criteria &amp; next routes ↗</button></div>}</li>)}</ol></div>
    <details className="timeline-provenance"><summary>Scope &amp; provenance</summary><p>{guide.context}</p><p>{GUIDE_PROVENANCE}</p><p>Working graph {graph.version}. The diagram shows definitions; steps retain their separate yes / no / unknown assessments. Next options are declared routes, not findings.</p><p>Graph SHA-256 <code>{GUIDE_GRAPH_SHA256}</code></p><p>Criteria SHA-256 <code>{GUIDE_CRITERIA_SHA256}</code></p><a href="/investigation-lab/">Open the record exchange Lab →</a></details>
  </aside>;
}
