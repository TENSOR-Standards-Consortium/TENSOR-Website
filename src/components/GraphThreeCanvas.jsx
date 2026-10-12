import { useEffect, useRef, useState } from 'react';
import { DOMAINS, STAGES } from '../lib/graphAtlas.mjs';

// One scene, one renderer. Positions are definition coordinates, never causal distance.
export default function GraphThreeCanvas({ graph, layout, selectedId, trace, onSelect, onFallback, shell }) {
  const host = useRef(null), engine = useRef(null);
  const live = useRef({ selectedId, trace, onSelect });
  live.current = { selectedId, trace, onSelect };
  const [ready, setReady] = useState(false), [error, setError] = useState(''), [labels, setLabels] = useState([]), [hover, setHover] = useState(null);
  const [notice, setNotice] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const previousSubset = useRef(false);
  useEffect(() => {
    const changed = () => setFullscreen(document.fullscreenElement === shell.current);
    document.addEventListener('fullscreenchange', changed);
    return () => document.removeEventListener('fullscreenchange', changed);
  }, [shell]);
  useEffect(() => {
    let disposed = false, teardown = () => {};
    setReady(false); setError(''); setLabels([]); setHover(null);
    Promise.all([import('three'), import('three/addons/controls/OrbitControls.js')]).then(([THREE, { OrbitControls }]) => {
      if (disposed || !host.current) return;
      const element = host.current;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setClearColor('#0c141e'); renderer.outputColorSpace = THREE.SRGBColorSpace;
      element.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 1, 10000);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = false; controls.minDistance = 80; controls.maxDistance = 4300;
      controls.maxPolarAngle = Math.PI * .94; controls.enablePan = true;
      scene.add(new THREE.HemisphereLight(0xe7f5ff, 0x29445e, 2.8));
      const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(400, 700, 900); scene.add(light);
      const css = getComputedStyle(element);
      const nodeColors = layout.nodes.map(n => new THREE.Color(css.getPropertyValue(n.color.slice(4,-1)).trim()));
      // X = stage/slot, Y = position within domain, Z = ordered domain tier.
      const positions = layout.nodes.map(n => new THREE.Vector3(
        (n.position.x - layout.width / 2) * .72,
        (layout.height / 2 - n.position.y) * .95,
        (DOMAINS.indexOf(n.category) - 3) * 85,
      ));
      const byId = new Map(layout.nodes.map((n,i) => [n.id, i]));
      const dummy = new THREE.Object3D();
      const geometry = new THREE.IcosahedronGeometry(1, 2);
      const material = new THREE.MeshStandardMaterial({ roughness: .32, metalness: .25 });
      const nodes = new THREE.InstancedMesh(geometry, material, positions.length);
      nodes.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(nodes);
      const routes = new THREE.Group(); scene.add(routes);
      const plates = new THREE.Group(); scene.add(plates);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(14, .9, 8, 48), new THREE.MeshBasicMaterial({ color: '#ffd083' }));
      scene.add(halo);
      const anchors = [];
      DOMAINS.forEach((domain, i) => {
        const domainNodes = layout.nodes.filter(n => n.category === domain);
        const ys = domainNodes.map(n => positions[byId.get(n.id)].y);
        const y = Math.max(...ys) + 38, z = (i-3) * 85;
        const points = [new THREE.Vector3(-layout.width*.36, y, z), new THREE.Vector3(layout.width*.36-95, y, z)];
        const tier = new THREE.Group(); tier.userData.domain = domain; plates.add(tier);
        tier.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: nodeColors[byId.get(domainNodes[0].id)], transparent: true, opacity: .25 })));
        const bottom = Math.min(...ys) - 28;
        const sheet = new THREE.Mesh(new THREE.PlaneGeometry(layout.width*.72-95, y-bottom), new THREE.MeshBasicMaterial({ color: nodeColors[byId.get(domainNodes[0].id)], transparent:true, opacity:.035, depthWrite:false, side:THREE.DoubleSide }));
        sheet.position.set(-47.5,(y+bottom)/2,z-8); tier.add(sheet);
        tier.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-layout.width*.36,y,z),new THREE.Vector3(-layout.width*.36,bottom,z),new THREE.Vector3(layout.width*.36-95,bottom,z),new THREE.Vector3(layout.width*.36-95,y,z)
        ]),new THREE.LineBasicMaterial({color:nodeColors[byId.get(domainNodes[0].id)],transparent:true,opacity:.12})));
        anchors.push({ text: domain.toUpperCase(), domain, point: new THREE.Vector3(-layout.width*.36+30, y-18, z), kind: 'domain', color: `var(--domain-${domain.toLowerCase()})` });
      });
      STAGES.forEach((stage, i) => anchors.push({ text: `${String(i+1).padStart(2,'0')} / ${stage.toUpperCase()}`, stage, point: new THREE.Vector3((230+i*layout.stageWidth-layout.width/2)*.72, layout.height*.475+80, -255), kind: 'stage' }));
      let frame = 0, hoveredId = null, visibleIds = null, width = 1, height = 1;
      const bg = new THREE.Color('#0c141e');
      function clearRoutes() { while(routes.children.length) { const item = routes.children[0]; routes.remove(item); item.geometry.dispose(); item.material.dispose(); } }
      function update() {
        const { trace: currentTrace, selectedId: current } = live.current;
        visibleIds = currentTrace?.visibleIds ? new Set(currentTrace.visibleIds) : null;
        plates.children.forEach(tier => { tier.visible = !visibleIds || layout.nodes.some(n=>n.category===tier.userData.domain && visibleIds.has(n.id)); });
        const visited = new Set(currentTrace?.visitedIds || []), next = new Set(currentTrace?.nextIds || []);
        const neighbors = new Set(graph.edges.filter(e => e.source === current || e.target === current).flatMap(e => [e.source,e.target]));
        positions.forEach((p,i) => {
          const id = layout.nodes[i].id, active = id === current || id === currentTrace?.currentId;
          const important = active || visited.has(id) || next.has(id) || (!currentTrace && neighbors.has(id));
          dummy.position.copy(p); dummy.scale.setScalar(visibleIds && !visibleIds.has(id) ? 0 : active ? 12 : important ? 8 : 6); dummy.quaternion.identity(); dummy.updateMatrix(); nodes.setMatrixAt(i, dummy.matrix);
          const color = active || visited.has(id) ? new THREE.Color('#ffd083') : nodeColors[i].clone();
          if ((currentTrace || current) && !important) color.lerp(bg, .55);
          nodes.setColorAt(i, color);
        });
        nodes.instanceMatrix.needsUpdate = true; if (nodes.instanceColor) nodes.instanceColor.needsUpdate = true;
        nodes.computeBoundingSphere();
        const activeIndex = byId.get(currentTrace?.currentId || current);
        halo.visible = activeIndex !== undefined;
        if (halo.visible) halo.position.copy(positions[activeIndex]);
        clearRoutes();
        const buckets = new Map();
        graph.edges.forEach(e => {
          if (visibleIds && (!visibleIds.has(e.source) || !visibleIds.has(e.target))) return;
          const traversed = currentTrace?.selectedEdges.some(s => s.source === e.source && s.target === e.target && s.decision === e.decision);
          const connected = e.source === (currentTrace?.currentId || current) || (!currentTrace && e.target === current);
          const key = `${traversed ? 'path' : connected ? 'next' : 'context'}:${e.decision}`;
          if (!buckets.has(key)) buckets.set(key, { points: [], arrows: [] });
          const a = positions[byId.get(e.source)], b = positions[byId.get(e.target)];
          const mid = a.clone().lerp(b,.5); mid.z += 18 + (e.decision === 'yes' ? 12 : e.decision === 'no' ? -12 : 0);
          const curve = new THREE.QuadraticBezierCurve3(a,mid,b), points = curve.getPoints(16);
          const bucket = buckets.get(key);
          for(let i=0;i<points.length-1;i++) { if(e.decision === 'unknown' && i%2) continue; bucket.points.push(points[i],points[i+1]); }
          bucket.arrows.push({ point: curve.getPoint(.84), direction: curve.getTangent(.84), size: connected || traversed ? 5 : 2.5 });
        });
        for(const [key,bucket] of buckets) {
          const [kind,outcome] = key.split(':');
          const color = kind === 'path' ? '#ffd083' : kind === 'next' ? ({yes:'#6ee7b7',no:'#ffb3b3',unknown:'#efcd84'}[outcome]) : '#6488a4';
          const opacity = kind === 'context' ? currentTrace || current ? .14 : .35 : 1;
          routes.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(bucket.points), new THREE.LineBasicMaterial({ color, transparent: true, opacity })));
          const arrows = new THREE.InstancedMesh(new THREE.ConeGeometry(1,3,5), new THREE.MeshBasicMaterial({ color, transparent: true, opacity }), bucket.arrows.length);
          bucket.arrows.forEach((a,i) => { dummy.position.copy(a.point); dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),a.direction); dummy.scale.setScalar(a.size); dummy.updateMatrix(); arrows.setMatrixAt(i,dummy.matrix); });
          routes.add(arrows);
        }
        requestRender();
      }
      function render() {
        frame = 0; if(disposed) return;
        halo.quaternion.copy(camera.quaternion);
        renderer.render(scene,camera);
        const selected = live.current.selectedId, traceNow = live.current.trace;
        const important = new Set([selected, hoveredId, ...(traceNow?.visitedIds || []), ...(traceNow?.nextIds || []), ...graph.edges.filter(e=>e.source === selected).map(e=>e.target)]);
        const projected = visibleIds ? [] : anchors.filter(a => a.kind !== 'stage' || width > 650);
        positions.forEach((p,i) => { const id = layout.nodes[i].id; if((!visibleIds || visibleIds.has(id)) && (important.has(id) || (graph.nodes.length<=110 && width>650) || camera.position.distanceTo(p)<600)) projected.push({ text:id, point:p, kind:'node', active:id===(traceNow?.currentId||selected) }); });
        setLabels(projected.map(label => { const p=label.point.clone().project(camera); return {...label,point:undefined,x:(p.x*.5+.5)*width,y:(-.5*p.y+.5)*height,inFrame:p.z<1 && p.z>-1 && Math.abs(p.x)<.97 && Math.abs(p.y)<.87}; }).filter(l=>l.inFrame));
      }
      function requestRender() { if(!disposed && !frame) frame=requestAnimationFrame(render); }
      function home() { controls.target.set(0,0,0); const distance=layout.width*.78 / Math.min(1,camera.aspect); camera.position.set(distance*.48,distance*.38,distance); camera.lookAt(controls.target); controls.update(); requestRender(); }
      function focus() {
        const ids = live.current.trace?.visibleIds || [live.current.selectedId];
        const points = ids.map(id=>positions[byId.get(id)]).filter(Boolean);
        if(!points.length) return;
        const box = new THREE.Box3().setFromPoints(points).expandByScalar(35), center = box.getCenter(new THREE.Vector3()), size=box.getSize(new THREE.Vector3());
        const vertical = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        const distance = Math.max(300, size.x / (vertical * camera.aspect), size.y / vertical) * 1.2;
        controls.target.copy(center); camera.position.copy(center).add(new THREE.Vector3(30,distance*.23,distance)); controls.update(); requestRender();
      }
      const resize = new ResizeObserver(() => { width=element.clientWidth; height=element.clientHeight; renderer.setSize(width,height); camera.aspect=width/height; camera.updateProjectionMatrix(); if(live.current.trace?.visibleIds) focus(); else home(); requestRender(); }); resize.observe(element);
      controls.addEventListener('change',requestRender);
      const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
      function pick(event) {
        const rect=renderer.domElement.getBoundingClientRect(); pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
        ray.setFromCamera(pointer,camera);
        return ray.intersectObject(nodes).find(hit => !visibleIds || visibleIds.has(layout.nodes[hit.instanceId]?.id));
      }
      let down = null;
      const pointerDown = e => { down={x:e.clientX,y:e.clientY}; };
      const pointerUp = e => { if(down && Math.hypot(e.clientX-down.x,e.clientY-down.y)<6) { const hit=pick(e); if(hit) live.current.onSelect(layout.nodes[hit.instanceId].id); } down=null; };
      const pointerMove = e => { if(e.buttons) return; const hit=pick(e); hoveredId=hit ? layout.nodes[hit.instanceId].id : null; const n=hit ? layout.nodes[hit.instanceId] : null; setHover(n ? `${n.id} · ${n.label}` : null); renderer.domElement.style.cursor=hit?'pointer':'grab'; requestRender(); };
      const pointerLeave = () => { hoveredId=null; setHover(null); requestRender(); };
      const lost = e => { e.preventDefault(); if(!disposed) { setReady(false); setError('The 3D graphics context was lost. Return to the atlas to continue.'); } };
      renderer.domElement.addEventListener('pointerdown',pointerDown); renderer.domElement.addEventListener('pointerup',pointerUp); renderer.domElement.addEventListener('pointermove',pointerMove); renderer.domElement.addEventListener('pointerleave',pointerLeave); renderer.domElement.addEventListener('webglcontextlost',lost);
      engine.current = { update, home, focus, zoom: factor=>{ camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target); controls.update(); requestRender(); }, orbit: delta=>{ const offset=camera.position.clone().sub(controls.target); offset.applyAxisAngle(new THREE.Vector3(0,1,0),delta); camera.position.copy(controls.target).add(offset); controls.update(); requestRender(); } };
      home(); update(); if(live.current.trace?.visibleIds) focus(); setReady(true);
      teardown = () => { if(frame) cancelAnimationFrame(frame); resize.disconnect(); controls.removeEventListener('change',requestRender); controls.dispose(); renderer.domElement.removeEventListener('webglcontextlost',lost); clearRoutes(); scene.traverse(item => { if(item.geometry) item.geometry.dispose(); if(item.material) item.material.dispose(); }); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); engine.current=null; };
    }).catch(() => { if(!disposed) setError('3D could not start on this device. The atlas, timeline and question list remain available.'); });
    return () => { disposed=true; teardown(); };
  }, [graph, layout]);
  useEffect(() => { if(ready) { engine.current?.update(); if(trace?.visibleIds) engine.current?.focus(); else if(previousSubset.current) engine.current?.home(); previousSubset.current=!!trace?.visibleIds; } }, [selectedId,trace,ready]);
  return <div className="atlas-map-wrap atlas-three">
    <div ref={host} className="atlas-stage" role="img" aria-label="3D directed definition graph. Drag to orbit, pinch to zoom. Use Questions for accessible selection." data-graph-ready={String(ready)} data-renderer="three" data-node-count={graph.nodes.length} data-edge-count={graph.edges.length} tabIndex={0} onKeyDown={e=>{ if(e.key==='ArrowLeft'||e.key==='ArrowRight') { e.preventDefault(); engine.current?.orbit(e.key==='ArrowLeft'?-.15:.15); } if(e.key==='+'||e.key==='-') { e.preventDefault(); engine.current?.zoom(e.key==='+'?.8:1.25); } }} />
    <div className="three-labels" aria-hidden="true">{labels.map((l,i)=><span key={`${l.text}-${i}`} className={`three-label three-label-${l.kind} ${l.active?'is-active':''}`} style={{left:l.x,top:l.y,color:l.color}}>{l.text}</span>)}</div>
    <div className="atlas-map-caption"><span className="atlas-status-light"/><span role="status">{error || notice || (ready ? `${graph.nodes.length} questions · ${graph.edges.length.toLocaleString()} routes · 3D ready` : 'Loading the 3D graph…')}<small>{trace?.visibleIds ? `${graph.nodes.find(n=>n.id===trace.currentId)?.category} / ${graph.nodes.find(n=>n.id===trace.currentId)?.archetype} · ${trace.visitedIds.length} visited · ${trace.nextIds.length} next options` : 'Stage → · domain tiers in depth · arrows define routes'}</small></span></div>
    {error && <div className="three-fallback"><p>{error}</p><button className="btn btn-primary" onClick={onFallback}>Return to atlas</button></div>}
    {hover && !error && <div className="three-tooltip" aria-hidden="true">{hover}</div>}
    <div className="atlas-camera-controls" role="group" aria-label="3D camera"><button className="btn btn-secondary" disabled={!ready} onClick={()=>engine.current?.home()}>Reset view</button><button className="btn btn-secondary" disabled={!ready||(!selectedId&&!trace)} onClick={()=>engine.current?.focus()}>Focus path</button><button className="btn btn-secondary" aria-label="Zoom in" disabled={!ready} onClick={()=>engine.current?.zoom(.75)}>+</button><button className="btn btn-secondary" aria-label="Zoom out" disabled={!ready} onClick={()=>engine.current?.zoom(1.3)}>−</button><button className="btn btn-secondary" aria-label={fullscreen ? 'Exit full screen' : 'Enter full screen'} onClick={async()=>{ try { if(document.fullscreenElement) await document.exitFullscreen(); else if(shell.current?.requestFullscreen) await shell.current.requestFullscreen(); else setNotice('Full screen is unavailable. The camera controls remain available.'); } catch { setNotice('Full screen is unavailable. The camera controls remain available.'); } }}>{fullscreen ? 'Exit ↙' : 'Expand ↗'}</button></div>
    <div className="atlas-map-key"><span>Arrow = route</span><span className="tone-yes">yes</span><span className="tone-no">no</span><span className="tone-unknown">unknown · dashed</span><span>Drag to orbit · pinch to zoom</span></div>
  </div>;
}
