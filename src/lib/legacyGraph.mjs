// Bounded checks for the historical graph format. This is deliberately not a
// general JSON Schema evaluator or an investigation-record conformance checker.
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const dataOf = (entry) => object(entry?.data) ? entry.data : entry;
const clone = (value) => JSON.parse(JSON.stringify(value));
const nodeId = /^Q[1-9]\d*$/;
const version = /^\d+\.\d{8}[a-z]?$/;
const extensionKey = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*:[A-Za-z0-9][A-Za-z0-9._-]*$/;
const categories = ['Application', 'Cloud', 'Email', 'File', 'Host', 'Identity', 'Network'];
const archetypes = ['detect', 'validate', 'classify', 'scope', 'correlate', 'attribute', 'impact', 'terminal'];
const decisions = ['yes', 'no', 'unknown'];
const own = (value, key) => Object.hasOwn(value, key);

export function checkLayerBase(payload, graph, digest) {
  for (const declaration of [payload, payload?.metadata]) {
    const version = declaration?.baseGraphVersion;
    const pin = declaration?.baseGraphSha256;
    if (version && version !== graph.version) throw new Error('This layer names a different base graph. Use its archived source or a layer for the current graph.');
    if (pin && pin !== digest) throw new Error('This layer names different base graph bytes. Load its exact source graph before composing it.');
  }
  if (Array.isArray(payload?.layers)) for (const layer of payload.layers) checkLayerBase(layer, graph, digest);
}

export function checkLegacyGraphStructure(graph, schema) {
  const errors = [];
  const error = (message) => errors.push({ message });
  const result = () => ({ valid: errors.length === 0, errors, scope: 'Graph structure only; full schema, investigative meaning, and Core record conformance are not checked.' });
  if (!object(graph)) { error('Graph must be an object'); return result(); }
  const allowedTop = ['namespace', 'product', 'version', 'generatedAt', 'schemaVersion', 'entryNodeIds', 'nodes', 'edges', 'locale', 'extensions'];
  for (const key of Object.keys(graph)) if (!allowedTop.includes(key)) error(`Unsupported top-level key: ${key}`);
  for (const key of ['namespace', 'product', 'version', 'generatedAt', 'schemaVersion', 'nodes', 'edges']) {
    if (!own(graph, key)) error(`Missing top-level key: ${key}`);
  }
  for (const key of Array.isArray(schema?.required) ? schema.required : []) {
    if (!own(graph, key)) error(`Missing selected-schema key: ${key}`);
  }
  if (graph.namespace !== 'tensor' || graph.product !== 'core') error('Expected tensor namespace and core product');
  for (const key of ['version', 'schemaVersion']) if (typeof graph[key] !== 'string' || !version.test(graph[key])) error(`Invalid ${key}`);
  if (typeof graph.generatedAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(graph.generatedAt) || !Number.isFinite(Date.parse(graph.generatedAt))) error('generatedAt must be a timestamp with a timezone');
  if (own(graph, 'locale') && typeof graph.locale !== 'string') error('locale must be a string');
  const extensions = (entry, location) => {
    if (!own(entry, 'extensions')) return;
    if (!object(entry.extensions)) { error(`${location} extensions must be an object`); return; }
    for (const key of Object.keys(entry.extensions)) if (!extensionKey.test(key)) error(`${location} extension key must be namespaced: ${key}`);
  };
  extensions(graph, 'Graph');
  if (!Array.isArray(graph.nodes) || graph.nodes.length === 0) error('nodes must be a nonempty array');
  if (!Array.isArray(graph.edges)) error('edges must be an array');
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) return result();
  const nodes = new Set();
  const edges = new Set();
  const requireArchetype = (schema?.$defs?.nodeFlat?.required || schema?.$defs?.node?.required || []).includes('archetype') || graph.schemaVersion === '0.20260206e';
  const unwrap = (entry, kind, keys) => {
    if (!object(entry)) { error(`${kind} must be an object`); return {}; }
    if (own(entry, 'data')) {
      if (!object(entry.data)) { error(`${kind} data must be an object`); return {}; }
      for (const key of Object.keys(entry)) if (key !== 'data') error(`${kind} wrapper has unsupported key: ${key}`);
    }
    const value = dataOf(entry);
    for (const key of Object.keys(value)) if (!keys.includes(key)) error(`${kind} ${value.id || '?'} has unsupported key: ${key}`);
    extensions(value, `${kind} ${value.id || '?'}`);
    if (own(value, 'label') && typeof value.label !== 'string') error(`${kind} label must be a string`);
    return value;
  };
  for (const raw of graph.nodes) {
    const item = unwrap(raw, 'Node', ['id', 'text', 'category', 'label', 'translations', 'extensions', 'archetype']);
    if (typeof item.id !== 'string' || !nodeId.test(item.id)) error(`Invalid node id: ${String(item.id)}`);
    if (nodes.has(item.id)) error(`Duplicate node id: ${item.id}`);
    nodes.add(item.id);
    if (typeof item.text !== 'string') error(`Node ${item.id || '?'} text must be a string`);
    if (!categories.includes(item.category)) error(`Node ${item.id || '?'} has invalid category`);
    if ((requireArchetype || own(item, 'archetype')) && !archetypes.includes(item.archetype)) error(`Node ${item.id || '?'} has missing or invalid archetype`);
    if (own(item, 'translations')) {
      if (!object(item.translations)) error(`Node ${item.id || '?'} translations must be an object`);
      else for (const [locale, translation] of Object.entries(item.translations)) {
        if (!/^[a-z]{2}(?:-[A-Z]{2})?$/.test(locale) || !object(translation) || typeof translation.text !== 'string' || (own(translation, 'label') && typeof translation.label !== 'string') || Object.keys(translation).some((key) => !['text', 'label'].includes(key))) error(`Node ${item.id || '?'} has invalid translation: ${locale}`);
      }
    }
  }
  if (own(graph, 'entryNodeIds')) {
    if (!Array.isArray(graph.entryNodeIds) || graph.entryNodeIds.length === 0) error('entryNodeIds must be a nonempty array');
    else {
      if (new Set(graph.entryNodeIds).size !== graph.entryNodeIds.length) error('Duplicate entry node id');
      for (const id of graph.entryNodeIds) if (!nodes.has(id)) error(`Entry node does not exist: ${String(id)}`);
    }
  } else if (graph.schemaVersion === '0.20260206e') error('Missing entryNodeIds');
  for (const raw of graph.edges) {
    const item = unwrap(raw, 'Edge', ['id', 'source', 'target', 'decision', 'label', 'extensions']);
    if (typeof item.id !== 'string' || item.id !== `${item.source}-${item.decision}-${item.target}` || !nodeId.test(item.source) || !nodeId.test(item.target)) error(`Invalid or mismatched edge id: ${String(item.id)}`);
    if (edges.has(item.id)) error(`Duplicate edge id: ${item.id}`);
    edges.add(item.id);
    if (!nodes.has(item.source) || !nodes.has(item.target)) error(`Edge ${item.id || '?'} has a missing endpoint`);
    if (!decisions.includes(item.decision)) error(`Edge ${item.id || '?'} has invalid decision`);
  }
  return result();
}

export function mergeLegacyGraphWithLayers(baseGraph, layers, appliedAt = new Date().toISOString()) {
  const merged = clone(baseGraph);
  const active = layers.filter((layer) => layer.enabled);
  if (active.length === 0) return merged;
  if (own(merged, 'extensions') && !object(merged.extensions)) throw new Error('Graph extensions must be an object before merging');
  merged.extensions = { ...(merged.extensions || {}), 'tensor.studio:layers': { active: active.map(({ id, name, owner, type, source }) => ({ id, name, owner, type, source })), appliedAt } };
  for (const collection of ['nodes', 'edges']) {
    const index = new Map(merged[collection].map((entry, i) => [dataOf(entry)?.id, i]));
    for (const layer of active) for (const raw of layer[collection]) {
      const data = clone(dataOf(raw));
      if (!object(data)) throw new Error('Layer entries must be objects');
      if (typeof data.id !== 'string' || !data.id) throw new Error('Layer entries require an explicit id');
      if (own(data, 'extensions') && !object(data.extensions)) throw new Error('Layer extensions must be an object');
      const source = { id: layer.id, name: layer.name, owner: layer.owner, type: layer.type };
      if (index.has(data.id)) {
        const current = dataOf(merged[collection][index.get(data.id)]);
        if (own(current, 'extensions') && !object(current.extensions)) throw new Error('Existing extensions must be an object before merging');
        const ext = object(current.extensions) ? current.extensions : {};
        current.extensions = { ...ext, 'tensor.studio:overlays': [...(Array.isArray(ext['tensor.studio:overlays']) ? ext['tensor.studio:overlays'] : []), { source, data }] };
      } else {
        // An added question or edge must supply its own meaning. Missing fields
        // stay missing so the export check can reject them rather than inventing it.
        data.extensions = { ...(object(data.extensions) ? data.extensions : {}), 'tensor.studio:source': source };
        index.set(data.id, merged[collection].length);
        merged[collection].push({ data });
      }
    }
  }
  return merged;
}
