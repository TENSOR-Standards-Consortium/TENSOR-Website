import { useEffect, useMemo, useRef, useState } from 'react';
import { nebulaLayout } from '../lib/graphNebula.mjs';

// One scene, one renderer. Positions are definition coordinates, never causal distance.
export default function GraphThreeCanvas({ graph, view, selectedId, trace, onSelect, onFallback, shell }) {
  const spatial = useMemo(() => nebulaLayout(graph), [graph]);
  const host = useRef(null), engine = useRef(null);
  const live = useRef({ selectedId, trace, view, onSelect });
  live.current = { selectedId, trace, view, onSelect };
  const [ready, setReady] = useState(false), [error, setError] = useState(''), [labels, setLabels] = useState([]), [hover, setHover] = useState(null);
  const [notice, setNotice] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const previousSubset = useRef(false), previousFocus = useRef(false);
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
      const nodeColors = spatial.nodes.map(n => new THREE.Color(css.getPropertyValue(n.color.slice(4,-1)).trim()));
      const positions = spatial.nodes.map(n => new THREE.Vector3(n.position.x, n.position.y, n.position.z));
      const byId = new Map(spatial.nodes.map((n,i) => [n.id, i]));
      const dummy = new THREE.Object3D();
      const geometry = new THREE.IcosahedronGeometry(1, 2);
      const material = new THREE.MeshStandardMaterial({ roughness: .32, metalness: .25 });
      const nodes = new THREE.InstancedMesh(geometry, material, positions.length);
      nodes.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(nodes);
      const routes = new THREE.Group(); scene.add(routes);
      // Each glow belongs to an actual question; domain haze marks grouping only.
      const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 64;
      const ctx = glowCanvas.getContext('2d');
      const gradient = ctx.createRadialGradient(32,32,0,32,32,32);
      gradient.addColorStop(0,'rgba(255,255,255,1)'); gradient.addColorStop(.12,'rgba(255,255,255,.65)'); gradient.addColorStop(.4,'rgba(255,255,255,.12)'); gradient.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=gradient; ctx.fillRect(0,0,64,64);
      const glowTexture = new THREE.CanvasTexture(glowCanvas);
      const glowGeometry = new THREE.BufferGeometry().setFromPoints(positions);
      glowGeometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(positions.length*3),3));
      const glowMaterial = new THREE.PointsMaterial({size:42,map:glowTexture,vertexColors:true,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false});
      const glows = new THREE.Points(glowGeometry,glowMaterial); scene.add(glows);
      const clouds = new THREE.Group(); scene.add(clouds);
      const anchors = spatial.clusters.map(c => {
        const color = nodeColors[byId.get(spatial.nodes.find(n=>n.category===c.domain).id)];
        const cloud = new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,color,transparent:true,opacity:.11,blending:THREE.AdditiveBlending,depthWrite:false}));
        cloud.position.set(c.position.x,c.position.y,c.position.z); cloud.scale.set(680,680,1); cloud.userData.domain=c.domain; clouds.add(cloud);
        const radial = new THREE.Vector3(c.position.x,c.position.y,0).normalize().multiplyScalar(230);
        return { text:c.domain.toUpperCase(), detail:c.topic, domain:c.domain, point:new THREE.Vector3(c.position.x+radial.x,c.position.y+radial.y,c.position.z), kind:'domain',color:c.color };
      });
      spatial.anchors.forEach(a => anchors.push({text:a.stage.toUpperCase(),domain:a.domain,stage:a.stage,point:new THREE.Vector3(a.position.x,a.position.y+35,a.position.z),kind:'stage'}));
      const halo = new THREE.Mesh(new THREE.TorusGeometry(14,.9,8,48),new THREE.MeshBasicMaterial({color:'#ffd083'})); scene.add(halo);
      let frame = 0, hoveredId = null, visibleIds = null, width = 1, height = 1;
      const bg = new THREE.Color('#0c141e');
      function clearRoutes() { while(routes.children.length) { const item = routes.children[0]; routes.remove(item); item.geometry.dispose(); item.material.dispose(); } }
      function update() {
        const { trace: currentTrace, selectedId: current } = live.current;
        visibleIds = currentTrace?.visibleIds ? new Set(currentTrace.visibleIds) : null;
        clouds.visible = !visibleIds;
        const visited = new Set(currentTrace?.visitedIds || []), next = new Set(currentTrace?.nextIds || []);
        const neighbors = new Set(graph.edges.filter(e => e.source === current || e.target === current).flatMap(e => [e.source,e.target]));
        positions.forEach((p,i) => {
          const id = spatial.nodes[i].id, active = id === current || id === currentTrace?.currentId;
          const important = active || visited.has(id) || next.has(id) || (!currentTrace && neighbors.has(id));
          dummy.position.copy(p); dummy.scale.setScalar(visibleIds && !visibleIds.has(id) ? 0 : active ? 12 : important ? 8 : 6); dummy.quaternion.identity(); dummy.updateMatrix(); nodes.setMatrixAt(i, dummy.matrix);
          const color = active || visited.has(id) ? new THREE.Color('#ffd083') : nodeColors[i].clone();
          if ((currentTrace || current) && !important) color.lerp(bg, .55);
          nodes.setColorAt(i, color);
          glowGeometry.attributes.color.setXYZ(i,...color.toArray());
          if (visibleIds && !visibleIds.has(id)) glowGeometry.attributes.color.setXYZ(i,0,0,0);
        });
        glowGeometry.attributes.color.needsUpdate = true;
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
          const key = `${traversed ? 'path' : connected ? 'next' : 'context'}:${e.decision}:${spatial.nodes[byId.get(e.source)].category === spatial.nodes[byId.get(e.target)].category ? 'local' : 'bridge'}`;
          if (!buckets.has(key)) buckets.set(key, { points: [], arrows: [] });
          const a = positions[byId.get(e.source)], b = positions[byId.get(e.target)];
          const mid = a.clone().lerp(b,.5); mid.z += 18 + (e.decision === 'yes' ? 12 : e.decision === 'no' ? -12 : 0);
          const curve = new THREE.QuadraticBezierCurve3(a,mid,b), points = curve.getPoints(16);
          const bucket = buckets.get(key);
          for(let i=0;i<points.length-1;i++) { if(e.decision === 'unknown' && i%2) continue; bucket.points.push(points[i],points[i+1]); }
          bucket.arrows.push({ point: curve.getPoint(.84), direction: curve.getTangent(.84), size: connected || traversed ? 5 : 2.5 });
        });
        for(const [key,bucket] of buckets) {
          const [kind,outcome,scope] = key.split(':');
          const color = kind === 'path' ? '#ffd083' : kind === 'next' ? ({yes:'#6ee7b7',no:'#ffb3b3',unknown:'#efcd84'}[outcome]) : '#6488a4';
          const opacity = kind === 'context' ? currentTrace || current ? .07 : scope === 'bridge' ? .045 : .25 : 1;
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
        const activeDomain=spatial.nodes[byId.get(selected)]?.category;
        const projected = visibleIds ? [] : anchors.filter(a => a.kind === 'domain' || (!traceNow && width > 650 && a.domain === activeDomain && camera.position.distanceTo(a.point) < 1800));
        positions.forEach((p,i) => { const id = spatial.nodes[i].id; if((!visibleIds || visibleIds.has(id)) && (important.has(id) || camera.position.distanceTo(p)<550)) projected.push({ text:id, point:p, kind:'node', active:id===(traceNow?.currentId||selected) }); });
        let projectedLabels = projected.map(label => { const p=label.point.clone().project(camera); return {...label,point:undefined,x:(p.x*.5+.5)*width,y:(-.5*p.y+.5)*height,inFrame:p.z<1 && p.z>-1 && Math.abs(p.x)<.97 && Math.abs(p.y)<.87}; }).filter(l=>l.inFrame);
        // In the whole-graph guide overview, retain every node but suppress
        // colliding passive IDs. Current, hover and next choices take priority.
        if (traceNow && !visibleIds) {
          const next=new Set(traceNow.nextIds), placed=[];
          const priority=l=>l.active||l.text===hoveredId?0:next.has(l.text)?1:2;
          projectedLabels.sort((a,b)=>priority(a)-priority(b));
          projectedLabels=projectedLabels.filter(label=>{
            if(label.kind!=='node') return true;
            const overlaps=placed.some(p=>Math.abs(p.x-label.x)<40&&Math.abs(p.y-label.y)<18);
            if(overlaps && !label.active && label.text!==hoveredId) return false;
            placed.push(label); return true;
          });
        }
        setLabels(projectedLabels);
      }
      function requestRender() { if(!disposed && !frame) frame=requestAnimationFrame(render); }
      function fit(points, padding = 1.25, minimum = 300) {
        if (!points.length) return;
        const center = new THREE.Box3().setFromPoints(points).getCenter(new THREE.Vector3());
        // Fit the actual oriented extents, including depth and space reserved
        // for caption/camera controls. A sphere wastes most wide-screen space.
        const direction = new THREE.Vector3(.18,.1,1).normalize();
        const right = new THREE.Vector3(0,1,0).cross(direction).normalize();
        const up = direction.clone().cross(right).normalize();
        const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
        const safeHeight = Math.max(80,height - (width < 650 ? 170 : 150));
        const vertical = tangent * safeHeight / height, horizontal = tangent * camera.aspect;
        let distance = minimum;
        points.forEach(p => {
          const relative=p.clone().sub(center), depth=relative.dot(direction);
          distance=Math.max(distance,depth+(Math.abs(relative.dot(right))+35)/horizontal,depth+(Math.abs(relative.dot(up))+35)/vertical);
        });
        distance *= padding;
        controls.target.copy(center); camera.position.copy(center).add(direction.multiplyScalar(distance));
        camera.far=Math.max(10000,distance*4); camera.updateProjectionMatrix(); controls.maxDistance=Math.max(4300,distance*2);
        controls.update(); requestRender();
      }
      function home() { fit([...positions,...anchors.filter(a=>a.kind==='domain').map(a=>a.point)],1.04); }
      function focus() {
        const selected = live.current.selectedId;
        const domain=spatial.nodes[byId.get(selected)]?.category;
        const ids = live.current.trace?.visibleIds || (live.current.view==='focus' ? spatial.nodes.filter(n=>n.category===domain).map(n=>n.id) : [selected,...graph.edges.filter(e=>e.source===selected||e.target===selected).flatMap(e=>[e.source,e.target])]);
        fit(ids.map(id=>positions[byId.get(id)]).filter(Boolean),1.15);
      }
      const resize = new ResizeObserver(() => { width=element.clientWidth; height=element.clientHeight; renderer.setSize(width,height); camera.aspect=width/height; camera.setViewOffset(width,height,0,width<650?20:0,width,height); camera.updateProjectionMatrix(); if(live.current.trace?.visibleIds || live.current.view === 'focus') focus(); else home(); requestRender(); }); resize.observe(element);
      controls.addEventListener('change',requestRender);
      const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
      function pick(event) {
        const rect=renderer.domElement.getBoundingClientRect(); pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
        ray.setFromCamera(pointer,camera);
        return ray.intersectObject(nodes).find(hit => !visibleIds || visibleIds.has(spatial.nodes[hit.instanceId]?.id));
      }
      let down = null;
      const pointerDown = e => { down={x:e.clientX,y:e.clientY}; };
      const pointerUp = e => { if(down && Math.hypot(e.clientX-down.x,e.clientY-down.y)<6) { const hit=pick(e); if(hit) live.current.onSelect(spatial.nodes[hit.instanceId].id); } down=null; };
      const pointerMove = e => { if(e.buttons) return; const hit=pick(e); hoveredId=hit ? spatial.nodes[hit.instanceId].id : null; const n=hit ? spatial.nodes[hit.instanceId] : null; setHover(n ? `${n.id} · ${n.category} / ${n.archetype} · ${n.label}` : null); renderer.domElement.style.cursor=hit?'pointer':'grab'; requestRender(); };
      const pointerLeave = () => { hoveredId=null; setHover(null); requestRender(); };
      const lost = e => { e.preventDefault(); if(!disposed) { setReady(false); setError('The 3D graphics context was lost. Return to the atlas to continue.'); } };
      renderer.domElement.addEventListener('pointerdown',pointerDown); renderer.domElement.addEventListener('pointerup',pointerUp); renderer.domElement.addEventListener('pointermove',pointerMove); renderer.domElement.addEventListener('pointerleave',pointerLeave); renderer.domElement.addEventListener('webglcontextlost',lost);
      engine.current = { update, home, focus, zoom: factor=>{ camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target); controls.update(); requestRender(); }, orbit: delta=>{ const offset=camera.position.clone().sub(controls.target); offset.applyAxisAngle(new THREE.Vector3(0,1,0),delta); camera.position.copy(controls.target).add(offset); controls.update(); requestRender(); } };
      home(); update(); if(live.current.trace?.visibleIds) focus(); setReady(true);
      teardown = () => { if(frame) cancelAnimationFrame(frame); resize.disconnect(); controls.removeEventListener('change',requestRender); controls.dispose(); renderer.domElement.removeEventListener('webglcontextlost',lost); clearRoutes(); scene.traverse(item => { if(item.geometry) item.geometry.dispose(); if(item.material) item.material.dispose(); }); glowTexture.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); engine.current=null; };
    }).catch(() => { if(!disposed) setError('3D could not start on this device. The atlas, timeline and question list remain available.'); });
    return () => { disposed=true; teardown(); };
  }, [graph, spatial]);
  useEffect(() => { if(ready) { engine.current?.update(); if(trace?.visibleIds || view === 'focus') engine.current?.focus(); else if(previousSubset.current || previousFocus.current) engine.current?.home(); previousSubset.current=!!trace?.visibleIds; previousFocus.current=view==='focus'; } }, [selectedId,trace,view,ready]);
  return <div className="atlas-map-wrap atlas-three">
    <div ref={host} className="atlas-stage" role="img" aria-label="3D clustered definition graph. Drag to orbit, pinch to zoom. Use Questions for accessible selection." data-graph-ready={String(ready)} data-renderer="three" data-node-count={graph.nodes.length} data-edge-count={graph.edges.length} data-layout="nebula" tabIndex={0} onKeyDown={e=>{ if(e.key==='ArrowLeft'||e.key==='ArrowRight') { e.preventDefault(); engine.current?.orbit(e.key==='ArrowLeft'?-.15:.15); } if(e.key==='+'||e.key==='-') { e.preventDefault(); engine.current?.zoom(e.key==='+'?.8:1.25); } }} />
    <div className="three-labels" aria-hidden="true">{labels.map((l,i)=><span key={`${l.text}-${i}`} className={`three-label three-label-${l.kind} ${l.active?'is-active':''}`} style={{left:l.x,top:l.y,color:l.color}}>{l.text}{l.detail && <small>{l.detail}</small>}</span>)}</div>
    <div className="atlas-map-caption"><span className="atlas-status-light"/><span role="status">{error || notice || (ready ? `${graph.nodes.length} questions · ${graph.edges.length.toLocaleString()} routes · nebula ready` : 'Loading the 3D graph…')}<small>{trace?.visibleIds ? `${graph.nodes.find(n=>n.id===trace.currentId)?.category} / ${graph.nodes.find(n=>n.id===trace.currentId)?.archetype} · ${trace.visitedIds.length} visited · ${trace.nextIds.length} next options` : 'Domain clusters · stage subgroups · arrows define routes'}</small></span></div>
    {error && <div className="three-fallback"><p>{error}</p><button className="btn btn-primary" onClick={onFallback}>Return to atlas</button></div>}
    {hover && !error && <div className="three-tooltip" aria-hidden="true">{hover}</div>}
    <div className="atlas-camera-controls" role="group" aria-label="3D camera"><button className="btn btn-secondary" disabled={!ready} onClick={()=>engine.current?.home()}>Reset view</button><button className="btn btn-secondary" disabled={!ready||(!selectedId&&!trace)} onClick={()=>engine.current?.focus()}>Focus path</button><button className="btn btn-secondary" aria-label="Zoom in" disabled={!ready} onClick={()=>engine.current?.zoom(.75)}>+</button><button className="btn btn-secondary" aria-label="Zoom out" disabled={!ready} onClick={()=>engine.current?.zoom(1.3)}>−</button><button className="btn btn-secondary" aria-label={fullscreen ? 'Exit full screen' : 'Enter full screen'} onClick={async()=>{ try { if(document.fullscreenElement) await document.exitFullscreen(); else if(shell.current?.requestFullscreen) await shell.current.requestFullscreen(); else setNotice('Full screen is unavailable. The camera controls remain available.'); } catch { setNotice('Full screen is unavailable. The camera controls remain available.'); } }}>{fullscreen ? 'Exit ↙' : 'Expand ↗'}</button></div>
    <div className="atlas-map-key"><span>Arrow = route</span><span className="tone-yes">yes</span><span className="tone-no">no</span><span className="tone-unknown">unknown · dashed</span><span>Drag to orbit · pinch to zoom</span></div>
  </div>;
}
