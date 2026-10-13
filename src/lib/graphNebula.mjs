import { DOMAINS, STAGES, DOMAIN_COLORS } from './graphAtlas.mjs';

// Display geometry only: domain and archetype are source metadata. Link attraction
// improves neighborhood reading; proximity never asserts a new relationship.
// Fixed iterations and ID ordering keep reloads and reversed inputs identical.
export function nebulaLayout(graph) {
  const ordered = [...graph.nodes].sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
  const domains = DOMAINS.filter(domain => ordered.some(n => n.category === domain));
  // Asymmetric volume rather than lanes or a planar ring. These are display
  // anchors, not domain relationships; simulation retains each local cluster.
  const domainAnchors = [[-440,260,-130],[-410,-170,230],[-80,-350,-160],[380,-210,120],[470,220,-160],[50,250,240],[20,-30,-330]];
  const topics = ['Authentication · privilege','Execution · persistence','Sessions · transport','Control plane · workloads','Messages · collaboration','Requests · sessions','Artifacts · content'];
  const clusters = domains.map(domain => {
    const [x,y,z] = domainAnchors[DOMAINS.indexOf(domain)];
    return { domain, topic: topics[DOMAINS.indexOf(domain)], color: DOMAIN_COLORS[DOMAINS.indexOf(domain)], position: {x,y,z} };
  });
  const centers = new Map(clusters.map(c => [c.domain, c.position]));
  const groups = new Map();
  for (const n of ordered) {
    const key = `${n.category}:${n.archetype}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(n);
  }
  const anchors = [], state = ordered.map(n => {
    const c = centers.get(n.category) || { x: 0, y: 0, z: 0 };
    const stage = Math.max(0, STAGES.indexOf(n.archetype));
    const azimuth = stage * 2.399963229728653;
    const elevation = 1 - 2 * (stage + .5) / STAGES.length;
    const ring = Math.sqrt(1 - elevation * elevation);
    const anchor = { x: c.x + Math.cos(azimuth) * ring * 135, y: c.y + elevation * 135, z: c.z + Math.sin(azimuth) * ring * 135 };
    const group = groups.get(`${n.category}:${n.archetype}`), slot = group.indexOf(n);
    if (!slot) anchors.push({ domain: n.category, stage: n.archetype, position: anchor });
    const t = slot * 2.399963229728653, h = 1 - 2 * (slot + .5) / group.length;
    const radius = 20 + Math.cbrt(group.length) * 17, r = Math.sqrt(1 - h * h);
    return { n, anchor, x: anchor.x + Math.cos(t) * r * radius, y: anchor.y + h * radius, z: anchor.z + Math.sin(t) * r * radius, vx: 0, vy: 0, vz: 0 };
  });
  const byId = new Map(state.map((p, i) => [p.n.id, i]));
  const links = [...graph.edges].sort((a, b) => a.id.localeCompare(b.id)).map(e => [byId.get(e.source), byId.get(e.target)]).filter(([a, b]) => a !== undefined && b !== undefined && a !== b);
  for (let tick = 0; tick < 160; tick++) {
    const cooling = 1 - tick / 190;
    for (const p of state) {
      p.vx += (p.anchor.x - p.x) * .035;
      p.vy += (p.anchor.y - p.y) * .035;
      p.vz += (p.anchor.z - p.z) * .035;
    }
    for (const [a, b] of links) {
      const p = state[a], q = state[b], local = p.n.category === q.n.category;
      const dx = q.x - p.x, dy = q.y - p.y, dz = q.z - p.z;
      const distance = Math.max(1, Math.hypot(dx, dy, dz));
      const strength = (distance - (local ? 95 : 500)) / distance * (local ? .008 : .0004);
      p.vx += dx * strength; p.vy += dy * strength; p.vz += dz * strength;
      q.vx -= dx * strength; q.vy -= dy * strength; q.vz -= dz * strength;
    }
    for (let i = 0; i < state.length; i++) for (let j = i + 1; j < state.length; j++) {
      const p = state[i], q = state[j], dx = q.x - p.x, dy = q.y - p.y, dz = q.z - p.z;
      const square = dx * dx + dy * dy + dz * dz;
      if (square > 10000) continue;
      const d = Math.sqrt(square) || 1;
      const strength = (100 - d) / d * .025;
      p.vx -= dx * strength; p.vy -= dy * strength; p.vz -= dz * strength;
      q.vx += dx * strength; q.vy += dy * strength; q.vz += dz * strength;
    }
    for (const p of state) {
      p.vx *= .65; p.vy *= .65; p.vz *= .65;
      p.x += p.vx * cooling; p.y += p.vy * cooling; p.z += p.vz * cooling;
    }
  }
  return { nodes: state.map(p => ({ ...p.n, color: DOMAIN_COLORS[DOMAINS.indexOf(p.n.category)] || 'var(--domain-uncategorized)', position: { x: p.x, y: p.y, z: p.z } })), clusters, anchors };
}
