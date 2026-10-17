// A stable domain/stage atlas. Coordinates organize definitions; only edges assert routes.
export const DOMAINS = ['Identity', 'Host', 'Network', 'Cloud', 'Email', 'Application', 'File'];
export const STAGES = ['detect', 'validate', 'classify', 'scope', 'correlate', 'attribute', 'impact', 'terminal'];
export const DOMAIN_COLORS = DOMAINS.map(domain => `var(--domain-${domain.toLowerCase()})`);
export function atlasLayout(graph, orientation = 'wide') {
  const groups = new Map();
  for (const node of graph.nodes) {
    const key = `${node.category}:${node.archetype}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(node);
  }
  const columns = graph.nodes.length > 300 ? 5 : 3;
  const stageWidth = graph.nodes.length > 300 ? 780 : 480;
  const maxRows = Math.max(1, ...[...groups.values()].map((items) => Math.ceil(items.length / columns)));
  const laneHeight = Math.max(120, maxRows * 58 + 44);
  const narrow = orientation === 'portrait';
  const portraitColumns = graph.nodes.length > 300 ? 3 : 2;
  const domainWidth = graph.nodes.length > 300 ? 470 : 310, stageHeight = Math.max(160, Math.max(...[...groups.values()].map(items => Math.ceil(items.length / portraitColumns))) * 58 + 65);
  const width = narrow ? DOMAINS.length * domainWidth + 280 : STAGES.length * stageWidth + 220;
  const height = narrow ? STAGES.length * stageHeight + 100 : DOMAINS.length * laneHeight + 90;
  const nodes = graph.nodes.map((node) => {
    const group = groups.get(`${node.category}:${node.archetype}`).slice().sort((a, b) => a.id.localeCompare(b.id,'en',{numeric:true}));
    const i = group.findIndex((item) => item.id === node.id);
    const domain = DOMAINS.indexOf(node.category), stage = STAGES.indexOf(node.archetype);
    return { ...node, color: DOMAIN_COLORS[domain] || 'var(--domain-uncategorized)', position: narrow ? { x: 300 + Math.max(0, domain) * domainWidth + (i % portraitColumns) * 145, y: 120 + Math.max(0, stage) * stageHeight + Math.floor(i / portraitColumns) * 58 } : { x: 230 + Math.max(0, stage) * stageWidth + (i % columns) * 145, y: 92 + Math.max(0, domain) * laneHeight + Math.floor(i / columns) * 58 } };
  });
  return { nodes, width, height, laneHeight, stageWidth, orientation, domainWidth, stageHeight };
}
export function readAtlasState(search, graphs) {
  const params = new URLSearchParams(search);
  const dataset = params.get('graph') === 'published' ? 'published' : 'working';
  const graph = graphs[dataset];
  const requested = params.get('node');
  return { dataset, node: graph.nodes.some((n) => n.id === requested) ? requested : null, view: params.get('view') === 'focus' && graph.nodes.some((n) => n.id === requested) ? 'focus' : 'all' };
}
export function writeAtlasState(search, state) {
  const params = new URLSearchParams(search);
  params.set('graph', state.dataset);
  if (state.node) params.set('node', state.node); else params.delete('node');
  if (state.view === 'focus') params.set('view', 'focus'); else params.delete('view');
  return params.toString();
}
