export const DEFAULT_LIMITS = Object.freeze({ maxBytes: 8 * 1024 * 1024, maxDepth: 64, maxNodes: 100000, maxEntries: 10000, maxDefinitions: 100, maxChecks: 20000, maxDependencySteps: 500000 });
export function limitsFor(options = {}) {
  const result = { ...DEFAULT_LIMITS };
  for (const key of Object.keys(result)) if (options[key] !== undefined) {
    if (!Number.isSafeInteger(options[key]) || options[key] < 1 || options[key] > DEFAULT_LIMITS[key]) throw new Error(`${key} must be a positive integer no greater than ${DEFAULT_LIMITS[key]}`);
    result[key] = options[key];
  }
  return result;
}
export const byteLength = value => new TextEncoder().encode(value).length;
function wellFormedString(value) {
  for (const character of value) {
    const code = character.codePointAt(0);
    if (code >= 0xD800 && code <= 0xDFFF) throw new Error('JSON strings must contain Unicode scalar values, not lone surrogates');
  }
  return value;
}
export function inspectJSON(value, options = {}) {
  const limits = limitsFor(options); const seen = new Set(); let nodes = 0;
  function visit(item, depth) {
    if (++nodes > limits.maxNodes || depth > limits.maxDepth) throw new Error('JSON structure exceeds node or depth limit');
    if (typeof item === 'string' && item.length > limits.maxBytes) throw new Error('JSON string exceeds byte limit');
    if (typeof item === 'string') { wellFormedString(item); return; }
    if (item === null || typeof item === 'boolean') return;
    if (typeof item === 'number') { if (!Number.isFinite(item)) throw new Error('JSON numbers must be finite'); return; }
    if (typeof item !== 'object') throw new Error('Input must contain only JSON values');
    if (seen.has(item)) throw new Error('Circular input is not JSON');
    if (!Array.isArray(item) && Object.getPrototypeOf(item) !== Object.prototype && Object.getPrototypeOf(item) !== null) throw new Error('Input must use plain JSON objects');
    seen.add(item);
    const descriptors = Object.getOwnPropertyDescriptors(item);
    if (Reflect.ownKeys(descriptors).some(key => typeof key === 'symbol')) throw new Error('Symbol keys are not JSON');
    for (const [key, descriptor] of Object.entries(descriptors)) {
      wellFormedString(key);
      if (Array.isArray(item) && key === 'length') continue;
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) throw new Error('Accessors and hidden properties are not JSON');
      visit(descriptor.value, depth + 1);
    }
    if (Array.isArray(item) && (Object.keys(item).length !== item.length || Object.keys(item).some((key, index) => key !== String(index)))) throw new Error('Sparse or decorated arrays are not JSON');
    seen.delete(item);
  }
  visit(value, 0);
  if (byteLength(JSON.stringify(value)) > limits.maxBytes) throw new Error('JSON input exceeds byte limit');
  return value;
}
// Native JSON.parse silently overwrites duplicate members. This parser rejects
// them so identity comparison cannot depend on a parser's collision policy.
export function parseJSON(text, options = {}) {
  const limits = limitsFor(options);
  if (typeof text !== 'string' || text.length > limits.maxBytes || byteLength(text) > limits.maxBytes) throw new Error('JSON text exceeds byte limit or is not a string');
  let at = 0; let nodes = 0;
  const whitespace = () => { while (/[\t\n\r ]/.test(text[at] ?? '') && at < text.length) at++; };
  function string() {
    const start = at++;
    while (at < text.length) {
      if (text[at] === '\\') { at += 2; continue; }
      if (text[at++] === '"') return wellFormedString(JSON.parse(text.slice(start, at)));
    }
    throw new Error('Unterminated JSON string');
  }
  function value(depth) {
    if (++nodes > limits.maxNodes || depth > limits.maxDepth) throw new Error('JSON structure exceeds node or depth limit');
    whitespace();
    if (text[at] === '{') {
      at++; whitespace(); const result = {}; const keys = new Set();
      if (text[at] === '}') { at++; return result; }
      while (at < text.length) {
        if (text[at] !== '"') throw new Error('Expected JSON member name');
        const key = string(); if (keys.has(key)) throw new Error(`Duplicate JSON member: ${key}`); keys.add(key);
        whitespace(); if (text[at++] !== ':') throw new Error('Expected JSON colon');
        Object.defineProperty(result, key, { value: value(depth + 1), enumerable: true, writable: true, configurable: true });
        whitespace(); const next = text[at++]; if (next === '}') return result;
        if (next !== ',') throw new Error('Expected JSON comma'); whitespace();
      }
      throw new Error('Unterminated JSON object');
    }
    if (text[at] === '[') {
      at++; whitespace(); const result = []; if (text[at] === ']') { at++; return result; }
      while (at < text.length) { result.push(value(depth + 1)); whitespace(); const next = text[at++]; if (next === ']') return result; if (next !== ',') throw new Error('Expected JSON comma'); }
      throw new Error('Unterminated JSON array');
    }
    if (text[at] === '"') return string();
    const match = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(at));
    if (!match) throw new Error('Invalid JSON value'); at += match[0].length; const parsed = JSON.parse(match[0]);
    if (typeof parsed === 'number' && !Number.isFinite(parsed)) throw new Error('JSON numbers must be finite');
    return parsed;
  }
  const result = value(0); whitespace(); if (at !== text.length) throw new Error('Unexpected trailing JSON input'); return result;
}
export function stableJSON(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJSON).join(',')}]`;
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stableJSON(value[k])}`).join(',')}}`;
}
export function semanticEqual(a, b) { inspectJSON(a); inspectJSON(b); return stableJSON(a) === stableJSON(b); }
