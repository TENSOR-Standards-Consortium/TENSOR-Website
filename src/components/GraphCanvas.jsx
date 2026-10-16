import { useEffect, useRef, useState } from 'react';
import { Panel } from './WorkspaceUI.jsx';
import '../styles/graph-workspace.css';

// Canvas owns rendering only; adapters and accessible lists own investigation meaning.
export default function GraphCanvas({ nodes, edges, selectedId, onSelect, label = 'Directed graph' }) {
  const container = useRef(null);
  const cy = useRef(null);
  const select = useRef(onSelect);
  select.current = onSelect;
  const [status, setStatus] = useState('Preparing graph…');
  const [ready, setReady] = useState(false);
  const limited = nodes.length > 300;
  useEffect(() => {
    let disposed = false;
    let observer;
    setReady(false);
    if (limited || nodes.length === 0) { setStatus(limited ? 'This record exceeds the 300-node canvas limit. Use the complete question list below.' : 'No question instances are visible at this step.'); return; }
    setStatus('Preparing graph…');
    import('cytoscape').then(({ default: cytoscape }) => {
      if (disposed || !container.current) return;
      const css = getComputedStyle(container.current);
      const token = (name) => css.getPropertyValue(name).trim();
      const colors = { yes: token('--accent-success'), no: token('--accent-danger'), unknown: token('--accent-warning'), unresolved: token('--text-secondary') };
      let narrow = container.current.clientWidth < 600;
      const layout = () => ({ name: 'breadthfirst', directed: true, spacingFactor: 1.3, padding: 24, animate: false, circle: false,
        transform: (_node, position) => narrow ? position : { x: position.y * 1.7, y: position.x * .7 } });
      const instance = cytoscape({
        container: container.current,
        elements: [...nodes.map((node) => ({ data: { id: node.id, label: node.label } })), ...edges.map((edge) => ({ data: { ...edge, color: colors[edge.outcome] || colors.unresolved } }))],
        style: [
          { selector: 'node', style: { 'background-color': token('--bg-input'), 'border-color': token('--accent-secondary'), 'border-width': 2, color: token('--text-primary'), label: 'data(label)', 'font-family': token('--font-body'), 'font-size': narrow ? 16 : 14, 'text-wrap': 'wrap', 'text-max-width': narrow ? 135 : 170, 'text-valign': 'center', 'text-halign': 'center', width: narrow ? 150 : 190, height: narrow ? 110 : 94, shape: 'round-rectangle' } },
          { selector: 'edge', style: { width: 2, 'line-color': 'data(color)', 'target-arrow-color': 'data(color)', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier', label: 'data(label)', color: token('--text-primary'), 'font-size': 12, 'text-background-color': token('--bg-app'), 'text-background-opacity': 1, 'text-background-padding': 3, 'text-rotation': 'autorotate' } },
          { selector: 'edge[outcome = "unresolved"]', style: { 'line-style': 'dashed' } },
          { selector: '.is-selected', style: { 'border-color': token('--accent-primary'), 'border-width': 4 } },
        ],
        layout: layout(),
        minZoom: .01, maxZoom: 2.5,
      });
      cy.current = instance;
      instance.on('tap', 'node', (event) => select.current(event.target.id()));
      observer = new ResizeObserver(() => {
        if (disposed) return;
        instance.resize();
        const nextNarrow = container.current.clientWidth < 600;
        if (nextNarrow !== narrow) {
          narrow = nextNarrow;
          instance.style().selector('node').style({ width: narrow ? 150 : 190, height: narrow ? 110 : 94, 'font-size': narrow ? 16 : 14, 'text-max-width': narrow ? 135 : 170 }).update();
          instance.layout(layout()).run();
        }
        instance.fit(undefined, 24);
      });
      observer.observe(container.current);
      setReady(true); setStatus(`${nodes.length} nodes · ${edges.length} directed routes. Select a node or use the question list.`);
    }).catch(() => { if (!disposed) setStatus('Canvas unavailable. All questions and routes remain accessible in the text view.'); });
    return () => { disposed = true; observer?.disconnect(); cy.current?.destroy(); cy.current = null; };
  }, [nodes, edges, limited]);
  useEffect(() => {
    const instance = cy.current;
    if (!instance) return;
    instance.nodes().removeClass('is-selected');
    instance.getElementById(selectedId || '').addClass('is-selected');
  }, [selectedId, ready]);
  return <Panel className="tensor-graph-canvas-panel" aria-label={label}>
    <div className="tensor-graph-toolbar"><span className="tensor-graph-caption" aria-live="polite">{status}</span><div className="tensor-graph-actions">
      <button type="button" className="btn btn-secondary" disabled={!ready} onClick={() => cy.current?.fit(undefined, 32)}>Fit graph</button>
      <button type="button" className="btn btn-secondary" aria-label="Zoom in" disabled={!ready} onClick={() => { const c = cy.current; if (c) c.zoom({ level: c.zoom() * 1.25, renderedPosition: { x: c.width() / 2, y: c.height() / 2 } }); }}>+</button>
      <button type="button" className="btn btn-secondary" aria-label="Zoom out" disabled={!ready} onClick={() => { const c = cy.current; if (c) c.zoom({ level: c.zoom() / 1.25, renderedPosition: { x: c.width() / 2, y: c.height() / 2 } }); }}>−</button>
    </div></div>
    <div ref={container} className="tensor-graph-canvas" role="img" aria-label={`${label}. Use the adjacent question list and route controls for keyboard navigation.`} data-graph-ready={ready ? 'true' : 'false'} data-node-count={nodes.length} data-edge-count={edges.length} />
    <p className="tensor-graph-caption tensor-graph-key">Arrows show direction. <span className="tone-yes">yes</span> · <span className="tone-no">no</span> · <span className="tone-unknown">unknown</span> · dashed: unresolved selection. Orange outline: selected question. Drag to pan; use Fit graph to reset.</p>
  </Panel>;
}
