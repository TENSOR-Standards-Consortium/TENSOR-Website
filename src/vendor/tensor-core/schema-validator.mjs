// A deliberately bounded, non-executing evaluator for the keywords used by
// schemas.mjs. Published schemas remain usable by full Draft 2020-12 engines.
import { stableJSON } from './json.mjs';
const unreserved = "A-Za-z0-9._~!$&'()*+,;=\\-";
const uriComponent = (value, extra = '') => new RegExp(`^(?:[${unreserved}${extra}]|%[0-9A-Fa-f]{2})*$`).test(value);
function validIPLiteral(value) {
  if (/^v[0-9A-Fa-f]+\.[A-Za-z0-9._~!$&'()*+,;=:\-]+$/i.test(value)) return true;
  if (!/^[0-9A-Fa-f:.]+$/.test(value) || (value.match(/::/g) ?? []).length > 1) return false;
  const compressed = value.includes('::');
  let parts = value.split(':');
  if (parts.at(-1)?.includes('.')) {
    const octets = parts.pop().split('.');
    if (octets.length !== 4 || octets.some(o => !/^(0|[1-9][0-9]{0,2})$/.test(o) || Number(o) > 255)) return false;
    parts.push('0', '0');
  }
  const groups = parts.filter(Boolean);
  if (groups.some(group => !/^[0-9A-Fa-f]{1,4}$/.test(group))) return false;
  if (compressed) {
    const [left, right] = value.split('::');
    if ((left && left.endsWith(':')) || (right && right.startsWith(':'))) return false;
    return groups.length < 8;
  }
  return groups.length === 8 && parts.every(Boolean);
}
function validAuthority(value) {
  const at = value.indexOf('@');
  if (at !== -1) {
    if (value.indexOf('@', at + 1) !== -1 || !uriComponent(value.slice(0, at), ':')) return false;
    value = value.slice(at + 1);
  }
  if (value.startsWith('[')) {
    const close = value.indexOf(']');
    return close !== -1 && validIPLiteral(value.slice(1, close)) && /^(?::[0-9]*)?$/.test(value.slice(close + 1));
  }
  const colon = value.lastIndexOf(':');
  if (colon !== -1) {
    if (!/^[0-9]*$/.test(value.slice(colon + 1))) return false;
    value = value.slice(0, colon);
  }
  return uriComponent(value);
}
// RFC 3986 generic URI syntax. Parsing does not resolve the identifier or assert
// that a scheme-specific endpoint exists or the namespace is owned.
export function validURI(value) {
  if (typeof value !== 'string') return false;
  const scheme = /^[A-Za-z][A-Za-z0-9+.-]*:/.exec(value);
  if (!scheme) return false;
  let rest = value.slice(scheme[0].length);
  const fragment = rest.indexOf('#');
  if (fragment !== -1) { if (!uriComponent(rest.slice(fragment + 1), ':@/?')) return false; rest = rest.slice(0, fragment); }
  const query = rest.indexOf('?');
  if (query !== -1) { if (!uriComponent(rest.slice(query + 1), ':@/?')) return false; rest = rest.slice(0, query); }
  if (rest.startsWith('//')) {
    const slash = rest.indexOf('/', 2);
    const authority = slash === -1 ? rest.slice(2) : rest.slice(2, slash);
    const path = slash === -1 ? '' : rest.slice(slash);
    return validAuthority(authority) && uriComponent(path, ':@/');
  }
  return uriComponent(rest, ':@/');
}
export function validTimestamp(value) {
  if (typeof value !== 'string') return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!m || m[7] === '-00:00') return false;
  const [, y, mo, day, h, mi, sec] = m.map((x, i) => i > 0 && i < 7 ? Number(x) : x);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return mo >= 1 && mo <= 12 && day >= 1 && day <= days[mo - 1] && h < 24 && mi < 60 && sec < 60 && (m[7] === 'Z' || (Number(m[9]) < 24 && Number(m[10]) < 60));
}
export function compareTimestamps(left, right) {
  const split = value => {
    const match = /^(.*:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
    if (!match || !validTimestamp(value)) throw new Error('Cannot compare invalid timestamps');
    return { seconds: Date.parse(`${match[1]}${match[3]}`) / 1000, fraction: (match[2] ?? '').replace(/0+$/, '') };
  };
  const a = split(left); const b = split(right);
  if (a.seconds !== b.seconds) return a.seconds < b.seconds ? -1 : 1;
  const width = Math.max(a.fraction.length, b.fraction.length);
  const af = a.fraction.padEnd(width, '0'); const bf = b.fraction.padEnd(width, '0');
  return af === bf ? 0 : af < bf ? -1 : 1;
}
export function validateSchema(value, schema, path = '') {
  const errors = []; const root = schema;
  function check(v, s, p, target) {
    if (s === true) return; if (s === false) { target.push({ path: p, message: 'Value is prohibited' }); return; }
    if (s.$ref) { const key = s.$ref.replace('#/$defs/', ''); if (!Object.hasOwn(root.$defs, key)) throw new Error(`Unknown local schema reference ${s.$ref}`); check(v, root.$defs[key], p, target); return; }
    const error = message => { if (target.length < 100) target.push({ path: p || '/', message }); };
    if (s.const !== undefined && stableJSON(v) !== stableJSON(s.const)) error(`Expected ${JSON.stringify(s.const)}`);
    if (s.enum && !s.enum.some(item => stableJSON(item) === stableJSON(v))) error(`Expected one of ${s.enum.join(', ')}`);
    const object = v !== null && typeof v === 'object' && !Array.isArray(v);
    if (s.type) {
      const pass = s.type === 'object' ? object : s.type === 'array' ? Array.isArray(v) : s.type === 'integer' ? Number.isInteger(v) : typeof v === s.type;
      if (!pass) { error(`Expected ${s.type}`); return; }
    }
    if (typeof v === 'string') {
      if (s.minLength && [...v].length < s.minLength) error('String cannot be empty');
      if (s.pattern && !new RegExp(s.pattern).test(v)) error('String does not match the required pattern');
      if (s.format === 'uri' && !validURI(v)) error('Expected an absolute ASCII URI');
      if (s.format === 'date-time' && !validTimestamp(v)) error('Expected a valid RFC 3339 timestamp with a known offset and no leap second');
    }
    if (object) {
      for (const key of s.required ?? []) if (!Object.hasOwn(v, key)) error(`Missing required property ${key}`);
      if (s.minProperties && Object.keys(v).length < s.minProperties) error('Object has too few members');
      for (const key of Object.keys(v)) {
        const childPath = `${p}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`;
        if (Object.hasOwn(s.properties ?? {}, key)) check(v[key], s.properties[key], childPath, target);
        else if (s.additionalProperties === false) error(`Unknown Core property ${key}; put opaque values in metadata or a declared extension`);
        else if (typeof s.additionalProperties === 'object') check(v[key], s.additionalProperties, childPath, target);
      }
    }
    if (Array.isArray(v)) {
      if (s.minItems && v.length < s.minItems) error('Array has too few items');
      if (s.items) v.forEach((item, i) => check(item, s.items, `${p}/${i}`, target));
    }
    for (const child of s.allOf ?? []) check(v, child, p, target);
    for (const keyword of ['anyOf', 'oneOf']) if (s[keyword]) {
      const alternatives = s[keyword].map(child => { const out = []; check(v, child, p, out); return out; });
      const matches = alternatives.filter(a => a.length === 0).length;
      if (matches === 0 || (keyword === 'oneOf' && matches !== 1)) {
        error(keyword === 'oneOf' ? 'Expected exactly one schema alternative' : 'Expected at least one schema alternative');
        if (matches === 0) target.push(...alternatives.sort((a, b) => a.length - b.length)[0].slice(0, 8));
      }
    }
    if (s.not) { const out = []; check(v, s.not, p, out); if (!out.length) error('Prohibited property combination'); }
  }
  check(value, root, path, errors); return errors.slice(0, 100);
}
