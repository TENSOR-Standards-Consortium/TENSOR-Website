import { compactQuestionLabel, questionLabel } from '../lib/displayLabels.mjs';
import { useEffect, useRef, useState } from 'react';
import { DOMAINS, STAGES } from '../lib/graphAtlas.mjs';

export default function GraphAtlasCanvas({ graph, layout, selectedId, view, onSelect, onWhole, onFocus, shell, trace, cardLabels = false, showAtlasLabels = true, fitPadding = 80, accessibleLabel = 'Complete directed question graph. Use Questions and route links for keyboard and screen-reader exploration.' }) {
  const host = useRef(null), cy = useRef(null), selected = useRef(onSelect);
  const desired = useRef({ selectedId, view, trace }), previousView = useRef(view);
  selected.current = onSelect; desired.current = { selectedId, view, trace };
  const [renderedLayout, setRenderedLayout] = useState(null), [status, setStatus] = useState('Preparing the complete map…');
  const [camera, setCamera] = useState({ zoom: 1, pan: { x: 0, y: 0 }, width: 1, height: 1 });
  const ready = renderedLayout === layout;
  const [hovered, setHovered] = useState(null);
  const [fullscreen, setFullscreen] = useState(false), [overview, setOverview] = useState(false);
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fit = (elements) => {
    const instance = cy.current;
    if (!instance) return;
    const target = elements;
    const zoom = Math.min((instance.width() - 76) / (layout.width + 80), (instance.height() - 76) / (layout.height + 50));
    const viewport = { zoom, pan: { x: (instance.width() - layout.width * zoom) / 2, y: (instance.height() - layout.height * zoom) / 2 + 20 } };
    instance.stop();
    if (reduced()) { if (target) instance.fit(target, fitPadding); else instance.viewport(viewport); }
    else instance.animate(target ? { fit: { eles: target, padding: fitPadding } } : viewport, { duration: 360, easing: 'ease-in-out-cubic' });
  };
  useEffect(() => {
    let disposed = false, observer, frame;
    setHovered(null); setRenderedLayout(null); setStatus('Preparing the complete map…');
    import('cytoscape').then(({ default: cytoscape }) => {
      if (disposed || !host.current) return;
      const css = getComputedStyle(host.current);
      const color = value => value.startsWith('var(') ? css.getPropertyValue(value.slice(4, -1)).trim() : value;
      const instance = cytoscape({ container: host.current, elements: [
        ...layout.nodes.map((n) => ({ data: { id: n.id, displayLabel:n.displayLabel||compactQuestionLabel(n), title: `${n.category} · ${questionLabel(n)}`, color: color(n.color) }, position: n.position })),
        ...graph.edges.map((e, i) => ({ data: { id: `atlas-edge-${i}`, routeId:e.id, source: e.source, target: e.target, outcome: e.decision } })),
      ], layout: { name: 'preset', fit: false }, minZoom: .025, maxZoom: 3.5, boxSelectionEnabled: false, autoungrabify: true,
      style: [
        { selector: 'node', style: { width: cardLabels?220:130, height:cardLabels?86:46, shape: 'round-rectangle', 'background-color': color('var(--bg-input)'), 'background-opacity': 1, 'border-width': 1.5, 'border-color': 'data(color)', label: 'data(displayLabel)', 'text-max-width': cardLabels?200:118, 'min-zoomed-font-size':cardLabels?0:7, color: color('var(--text-primary)'), 'font-family': 'JetBrains Mono, monospace', 'font-size':cardLabels?15:12, 'text-wrap':'wrap', 'font-weight': 500, 'text-valign': 'center', 'text-halign': 'center', 'text-outline-color': color('var(--bg-input)'), 'text-outline-width': 2 } },
        { selector: 'edge', style: { width: 1.1, opacity: .2, 'line-color': color('var(--graph-route)'), 'target-arrow-color': color('var(--graph-route)'), 'target-arrow-shape': 'triangle', 'arrow-scale': .7, 'curve-style': 'bezier' } },
        { selector: 'edge[outcome = "unknown"]', style: { 'line-style': 'dashed' } },
        { selector: '.neighbor', style: { 'border-width': 2.5, 'background-color': color('var(--bg-card-hover)'), 'z-index': 8 } },
        { selector: 'node.selected', style: { 'border-color': color('var(--accent-primary)'), 'border-width': 4, width:cardLabels?230:140, height:cardLabels?92:50, 'background-color': color('var(--accent-selection)'), 'z-index': 10 } },
        { selector: 'edge.connected', style: { width: 3.5, opacity: 1, label: 'data(outcome)', 'font-size': 14, color: color('var(--text-primary)'), 'text-background-color': color('var(--bg-app)'), 'text-background-opacity': 1, 'text-background-padding': 4, 'z-index': 9, 'text-rotation': 'autorotate' } },
        { selector: '.connected[outcome = "yes"]', style: { 'line-color': color('var(--accent-success)'), 'target-arrow-color': color('var(--accent-success)') } },
        { selector: '.connected[outcome = "no"]', style: { 'line-color': color('var(--accent-danger)'), 'target-arrow-color': color('var(--accent-danger)') } },
        { selector: '.connected[outcome = "unknown"]', style: { 'line-color': color('var(--accent-warning)'), 'target-arrow-color': color('var(--accent-warning)') } },
        { selector: 'node.visited', style: { 'border-width': 3, 'border-color': color('var(--accent-primary)'), 'background-color': color('var(--accent-selection)'), 'z-index': 8 } },
        { selector: 'node.available', style: { 'border-style': 'dashed', 'border-width': 2.5, 'background-color': color('var(--bg-card-hover)'), 'z-index': 8 } },
        { selector: 'edge.traversed', style: { width: 5, opacity: 1, 'line-color': color('var(--accent-primary)'), 'target-arrow-color': color('var(--accent-primary)'), label: 'data(outcome)', color: color('var(--accent-primary)'), 'font-size': 16, 'text-background-color': color('var(--bg-app)'), 'text-background-opacity': 1, 'text-background-padding': 4, 'z-index': 11 } },

      ] });
      cy.current = instance;
      let detailed = false;
      const sync = () => {
        setHovered(null);
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = null;
          if (disposed) return;
          const detail = instance.zoom() > 1.35;
          if (detail !== detailed) {
            detailed = detail;
            instance.edges().style('opacity', desired.current.trace ? .1 : detail || desired.current.selectedId ? .08 : .34);
            instance.edges('.connected').style('opacity', 1);
            instance.edges('.traversed').style('opacity', 1);
          }
          setCamera({ zoom: instance.zoom(), pan: instance.pan(), width: instance.width(), height: instance.height() });
        });
      };
      instance.on('pan zoom', sync);
      instance.on('tap', 'node', (event) => selected.current(event.target.id()));
      instance.on('mouseover', 'node', (event) => {
        const point = event.target.renderedPosition();
        setHovered({ title: event.target.data('title'), x: Math.max(12, Math.min(instance.width() - 290, point.x + 18)), y: Math.max(70, Math.min(instance.height() - 100, point.y + 22)) });
      });
      instance.on('mouseout', 'node', () => setHovered(null));
      const initialZoom = Math.min((instance.width() - 76) / (layout.width + 80), (instance.height() - 76) / (layout.height + 50));
      instance.viewport({ zoom: initialZoom, pan: { x: (instance.width() - layout.width * initialZoom) / 2, y: (instance.height() - layout.height * initialZoom) / 2 + 20 } });
      observer = new ResizeObserver(() => {
        if (disposed) return;
        instance.resize();
        if (desired.current.trace?.visibleIds) instance.fit(instance.elements(':visible'),fitPadding);
        else if (desired.current.view === 'all') {
          const z = Math.min((instance.width() - 76) / (layout.width + 80), (instance.height() - 76) / (layout.height + 50));
          instance.viewport({ zoom: z, pan: { x: (instance.width() - layout.width * z) / 2, y: (instance.height() - layout.height * z) / 2 + 20 } });
        }
        sync();
      });
      observer.observe(host.current);
      sync(); setRenderedLayout(layout); setStatus(`${graph.nodes.length} questions · ${graph.edges.length.toLocaleString()} routes · complete graph loaded`);
    }).catch(() => { if (!disposed) setStatus('Map unavailable. Open Questions or the complete text view below; every question and route remains available.'); });
    return () => { disposed = true; if (frame) cancelAnimationFrame(frame); observer?.disconnect(); cy.current?.destroy(); cy.current = null; };
  }, [graph, layout]);
  useEffect(() => {
    const instance = cy.current;
    if (!instance || !ready) return;
    instance.elements().removeClass('selected neighbor connected visited available traversed');
    instance.elements().style('display', 'element');
    instance.nodes().style('opacity', selectedId ? .5 : 1);
    instance.edges().style('opacity', selectedId || instance.zoom() > 1.35 ? .08 : .34);
    setHovered(null);
    const node = instance.getElementById(selectedId || '');
    node.addClass('selected').style('opacity', 1); node.neighborhood().nodes().addClass('neighbor').style('opacity', 1); node.connectedEdges().addClass('connected').style('opacity', 1);
    if (trace) {
      instance.nodes().style('opacity', .38); instance.edges().style('opacity', .1);
      trace.visitedIds.forEach(id => instance.getElementById(id).addClass('visited').style('opacity', 1));
      trace.nextIds.forEach(id => instance.getElementById(id).addClass('available').style('opacity', 1));
      instance.getElementById(trace.currentId).addClass('selected').style('opacity', 1);
      instance.edges().filter(e => e.source().id() === trace.currentId).addClass('connected').style('opacity', .85);
      instance.edges().filter(e => trace.selectedEdges.some(s => e.source().id() === s.source && e.target().id() === s.target && e.data('outcome') === s.decision)).addClass('traversed').style('opacity', 1);
      if (trace.visibleIds) {
        const visible = new Set(trace.visibleIds);
        instance.nodes().filter(n => !visible.has(n.id())).style('display', 'none');
        instance.edges().filter(e => !visible.has(e.source().id()) || !visible.has(e.target().id())).style('display', 'none');
        if(trace.visibleEdgeIds) {const routes=new Set(trace.visibleEdgeIds);instance.edges().filter(e=>!routes.has(e.data('routeId'))).style('display','none');}
        fit(instance.elements(':visible'));
      } else if (previousView.current === 'path') fit();
    }
    if (!trace && view === 'focus' && node.length) fit(node.closedNeighborhood());
    else if (previousView.current === 'focus') fit();
    previousView.current = trace?.visibleIds ? 'path' : view;
    // Selection in the full atlas preserves the camera and spatial context.
  }, [selectedId, view, ready, trace]);
  useEffect(() => {
    const change = () => setFullscreen(document.fullscreenElement === shell.current);
    document.addEventListener('fullscreenchange', change);
    return () => document.removeEventListener('fullscreenchange', change);
  }, [shell]);
  const zoom = (factor) => { const c = cy.current; if (c) { c.stop(); c.zoom({ level: c.zoom() * factor, renderedPosition: { x: c.width() / 2, y: c.height() / 2 } }); } };
  const pan = (x, y) => { cy.current?.stop(); cy.current?.panBy({ x, y }); };
  const mini = { x: -40, y: -10, width: layout.width + 80, height: layout.height + 20 };
  return <div className="atlas-map-wrap">
    <div className="atlas-stage" ref={host} tabIndex={0} onKeyDown={(event) => { const moves = { ArrowLeft: [140, 0], ArrowRight: [-140, 0], ArrowUp: [0, 140], ArrowDown: [0, -140] }; if (moves[event.key]) { event.preventDefault(); pan(...moves[event.key]); } }} role="img" aria-label={accessibleLabel} data-graph-ready={String(ready)} data-node-count={graph.nodes.length} data-edge-count={graph.edges.length} data-view={view} />
    {showAtlasLabels && !trace?.visibleIds && <svg className="atlas-map-labels" aria-hidden="true" width="100%" height="100%">
      <g transform={`translate(${camera.pan.x} ${camera.pan.y}) scale(${camera.zoom})`}>
        {layout.orientation === 'portrait' ? <>
          {DOMAINS.map((domain, i) => <text key={domain} style={{ fontSize: `${9 / camera.zoom}px`, letterSpacing: 0 }} x={300 + i * layout.domainWidth} y="45" fill={layout.nodes.find(n => n.category === domain)?.color}>{['ID', 'HOST', 'NET', 'CLD', 'MAIL', 'APP', 'FILE'][i]}</text>)}
          {STAGES.map((stage, i) => <g key={stage}><line x1="135" x2={layout.width} y1={80 + i * layout.stageHeight} y2={80 + i * layout.stageHeight} /><text className="atlas-stage-label" style={{ fontSize: `${8 / camera.zoom}px`, letterSpacing: 0 }} x="0" y={130 + i * layout.stageHeight}>{stage}</text></g>)}
        </> : <>
          {DOMAINS.map((domain, i) => <g key={domain}><line x1="160" x2={layout.width} y1={55 + i * layout.laneHeight} y2={55 + i * layout.laneHeight} /><text style={{ fontSize: `${Math.min(14, Math.max(9, 25 * camera.zoom)) / camera.zoom}px` }} x="0" y={100 + i * layout.laneHeight} fill={layout.nodes.find(n => n.category === domain)?.color}>{domain.toUpperCase()}</text></g>)}
          {STAGES.map((stage, i) => <text key={stage} className="atlas-stage-label" style={{ fontSize: `${Math.min(12, Math.max(8, 21 * camera.zoom)) / camera.zoom}px` }} x={230 + i * layout.stageWidth} y="12">{String(i + 1).padStart(2, '0')} / {stage.toUpperCase()}</text>)}
        </>}
      </g>
    </svg>}
    {hovered && <div className="atlas-node-tooltip" aria-hidden="true" style={{ left: hovered.x, top: hovered.y }}>{hovered.title}</div>}
    <div className="atlas-map-caption"><span className="atlas-status-light" /><span aria-live="polite">{status}<small>{trace ? `${graph.nodes.find(n=>n.id===trace.currentId)?.category} / ${graph.nodes.find(n=>n.id===trace.currentId)?.archetype} · ${trace.visitedIds.length} visited · ${trace.nextIds.length} next options` : 'Select a question to illuminate its routes.'}</small></span></div>
    <div className="atlas-camera-controls" role="group" aria-label="Map camera">
      <button className="btn btn-secondary" disabled={!ready} onClick={() => { onWhole(); fit(); }}>Fit all</button>
      {!trace && <button className="btn btn-secondary" disabled={!ready || !selectedId} onClick={() => { onFocus(); const node = cy.current?.getElementById(selectedId || ''); if (node?.length) fit(node.closedNeighborhood()); }}>Focus selection</button>}
      <button className="btn btn-secondary" disabled={!ready} aria-label="Zoom in" onClick={() => zoom(1.5)}>+</button>
      <button className="btn btn-secondary" disabled={!ready} aria-label="Zoom out" onClick={() => zoom(1 / 1.5)}>−</button>
      <button className="btn btn-secondary atlas-fullscreen" onClick={async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else if (shell.current?.requestFullscreen) await shell.current.requestFullscreen(); else setStatus('Full screen is unavailable in this browser. Fit all and zoom remain available.'); } catch { setStatus('Full screen could not open. Fit all and zoom remain available.'); } }} aria-label={fullscreen ? 'Exit full screen' : 'Enter full screen'}>{fullscreen ? 'Exit ↙' : 'Expand ↗'}</button>
    </div>
    <div className={`atlas-orientation ${overview ? 'is-open' : 'is-closed'}`}>
      <button className="atlas-overview-toggle" aria-expanded={overview} aria-label="Toggle overview map" onClick={() => setOverview(!overview)}>Overview <span>{Math.round(camera.zoom * 100)}% {overview ? '−' : '+'}</span></button>
      {overview && <>
      <svg className="atlas-minimap" viewBox={`${mini.x} ${mini.y} ${mini.width} ${mini.height}`} role="img" aria-label="Map overview and current viewport">
        {layout.nodes.filter(n=>!trace?.visibleIds || trace.visibleIds.includes(n.id)).map((n) => <rect key={n.id} x={n.position.x - 14} y={n.position.y - 9} width="28" height="18" fill={n.id === selectedId ? 'var(--accent-primary)' : n.color} opacity={n.id === selectedId ? 1 : .7} />)}
        <rect className="atlas-viewport" x={-camera.pan.x / camera.zoom} y={-camera.pan.y / camera.zoom} width={camera.width / camera.zoom} height={camera.height / camera.zoom} />
      </svg>
      <div className="atlas-pan" role="group" aria-label="Pan map"><button aria-label="Pan left" onClick={() => pan(140, 0)}>←</button><button aria-label="Pan up" onClick={() => pan(0, 140)}>↑</button><button aria-label="Pan down" onClick={() => pan(0, -140)}>↓</button><button aria-label="Pan right" onClick={() => pan(-140, 0)}>→</button></div></>}
    </div>
    <div className="atlas-map-key"><span>Arrow = route</span><span className="tone-yes">yes</span><span className="tone-no">no</span><span className="tone-unknown">unknown · dashed</span><span>Drag / pinch to explore</span></div>
  </div>;
}
