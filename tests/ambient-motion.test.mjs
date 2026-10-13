import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../public/assets/js/app-init.js', import.meta.url), 'utf8');
function harness(reduced = false) {
  const frame = { dataset: {} };
  const click = new Map(), preferenceEvents = new Map(), documentEvents = new Map();
  const attrs = new Map(), requests = [];
  const toggle = { hidden: true, setAttribute: (key, value) => attrs.set(key, value), addEventListener: (key, fn) => click.set(key, fn) };
  const preference = { matches: reduced, addEventListener: (key, fn) => preferenceEvents.set(key, fn) };
  const document = { body: { dataset: { privateWorkspace: 'true' } }, visibilityState: 'visible', querySelector: selector => selector === '.circuit-frame' ? frame : toggle, addEventListener: (key, fn) => documentEvents.set(key, fn) };
  const context = vm.createContext({ document, window: { location: { pathname: '/investigation-lab/' }, addEventListener() {}, matchMedia: () => preference }, navigator: {}, URL, fetch: (...args) => { requests.push(args); return Promise.resolve(); } });
  vm.runInContext(source, context);
  return { frame, toggle, attrs, click: () => click.get('click')(), preference, change: () => preferenceEvents.get('change')(), document, visibility: () => documentEvents.get('visibilitychange')(), requests };
}

test('ambient framing supports pause and resume without network or private state', () => {
  const h = harness();
  assert.equal(h.frame.dataset.ambientMotion, 'running');
  assert.equal(h.toggle.hidden, false);
  h.click();
  assert.equal(h.frame.dataset.ambientMotion, 'paused');
  assert.equal(h.attrs.get('aria-pressed'), 'true');
  assert.equal(h.toggle.textContent, 'Resume background motion');
  h.click();
  assert.equal(h.frame.dataset.ambientMotion, 'running');
  assert.deepEqual(h.requests, []);
  assert.deepEqual(h.document.body.dataset, { privateWorkspace: 'true' });
});

test('reduced-motion preference overrides ambient animation and live changes', () => {
  const h = harness(true);
  assert.equal(h.frame.dataset.ambientMotion, 'paused');
  assert.equal(h.toggle.disabled, true);
  assert.equal(h.toggle.textContent, 'Background motion off');
  h.preference.matches = false; h.change();
  assert.equal(h.frame.dataset.ambientMotion, 'running');
  h.preference.matches = true; h.change();
  assert.equal(h.frame.dataset.ambientMotion, 'paused');
});

test('hidden pages stop animation while retaining the user pause choice', () => {
  const h = harness();
  h.document.visibilityState = 'hidden'; h.visibility();
  assert.equal(h.frame.dataset.ambientMotion, 'paused');
  h.document.visibilityState = 'visible'; h.visibility();
  assert.equal(h.frame.dataset.ambientMotion, 'running');
  h.click();
  h.document.visibilityState = 'hidden'; h.visibility();
  h.document.visibilityState = 'visible'; h.visibility();
  assert.equal(h.frame.dataset.ambientMotion, 'paused');
});
