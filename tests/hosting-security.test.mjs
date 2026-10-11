import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import { validateHtml } from '../scripts/hosting-check-build.mjs';
import astroConfig from '../astro.config.mjs';

const script = 'window.example = true;';
const digest = createHash('sha256').update(script).digest('base64');
const document = (source = script, policy = `script-src 'self' 'sha256-${digest}'; object-src 'none'`) => `<!doctype html><html><head><meta http-equiv="content-security-policy" content="${policy}"><script>${source}</script></head><body></body></html>`;

test('built CSP accepts exact hydration bytes and rejects a modified script', () => {
  assert.deepEqual(validateHtml(document()), []);
  assert.match(validateHtml(document(`${script}window.injected = true;`)).join('\n'), /exact-byte CSP hash/);
});

test('built CSP rejects permissive script policies and broken structured metadata', () => {
  assert.match(validateHtml(document('', "script-src 'self' 'unsafe-inline'; object-src 'none'")).join('\n'), /prohibited script source/);
  assert.match(validateHtml(document().replace('</head>', '<script type="application/ld+json">not-json</script></head>')).join('\n'), /invalid JSON-LD/);
});

test('built CSP rejects browser-ignored policy placement and duplicate directives', () => {
  const misplacedPolicy = document().replace('<head>', '<head></head><body>').replace('</head><body></body></html>', '</body></html>');
  assert.match(validateHtml(misplacedPolicy).join('\n'), /inside head/);
  assert.match(validateHtml(document(script, `script-src 'none'; script-src 'self' 'sha256-${digest}'; object-src 'none'`)).join('\n'), /duplicate CSP directive/);
});

test('built CSP checks the browser JavaScript MIME variants and import maps', () => {
  for (const type of ['TEXT/JAVASCRIPT', 'text/ecmascript', 'text/javascript1.5', 'importmap']) {
    const html = document('changed').replace('<script>', `<script type="${type}">`);
    assert.match(validateHtml(html).join('\n'), /exact-byte CSP hash/, type);
  }
});

test('Cytoscape renderer style is pinned and allowed by its exact CSS hash', async () => {
  const installed = JSON.parse(await readFile(new URL('../node_modules/cytoscape/package.json', import.meta.url), 'utf8'));
  const declared = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(installed.version, '3.33.3');
  assert.equal(declared.dependencies.cytoscape, installed.version);
  const source = await readFile(new URL('../node_modules/cytoscape/dist/cytoscape.esm.mjs', import.meta.url), 'utf8');
  const rendererStyle = source.match(/var className = '([^']+)';[\s\S]{0,700}stylesheet\.textContent = '([^']*)' \+ className \+ '([^']*)';/);
  assert.ok(rendererStyle, 'Review the renderer stylesheet after changing Cytoscape');
  const css = rendererStyle[2] + rendererStyle[1] + rendererStyle[3];
  assert.equal(css, '.__________cytoscape_container { position: relative; }');
  const cspHash = `sha256-${createHash('sha256').update(css).digest('base64')}`;
  assert.ok(astroConfig.security.csp.styleDirective.hashes.includes(cspHash));
  assert.ok(!astroConfig.security.csp.styleDirective.resources.includes("'unsafe-inline'"));
});

test('service worker produces a Response on an offline cache miss', async () => {
  const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
  const handlers = new Map();
  const cachedPaths = [];
  const context = vm.createContext({
    self: { location: { origin: 'https://tensor.invalid' }, addEventListener: (type, handler) => handlers.set(type, handler) },
    caches: { open: async () => ({ match: async () => undefined, put: (request) => cachedPaths.push(request.url) }) },
    fetch: async () => { throw new Error('offline'); },
    URL, Response,
  });
  vm.runInContext(source, context);
  let response;
  handlers.get('fetch')({ request: { method: 'GET', mode: 'cors', url: 'https://tensor.invalid/_astro/example.js' }, respondWith: (promise) => { response = promise; } });
  assert.equal((await response).type, 'error');
  assert.deepEqual(cachedPaths, []);
});

test('API navigations bypass the service worker cache', async () => {
  const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
  const handlers = new Map();
  let cacheOpened = false;
  const context = vm.createContext({
    self: { location: { origin: 'https://tensor.invalid' }, addEventListener: (type, handler) => handlers.set(type, handler) },
    caches: { open: async () => { cacheOpened = true; throw new Error('API must not use cache'); } },
    fetch: async () => new Response('{}', { headers: { 'content-type': 'application/json' } }),
    URL, Response,
  });
  vm.runInContext(source, context);
  let response;
  handlers.get('fetch')({ request: { method: 'GET', mode: 'navigate', url: 'https://tensor.invalid/api/releases' }, respondWith: (promise) => { response = promise; } });
  assert.equal((await response).status, 200);
  assert.equal(cacheOpened, false);
});
