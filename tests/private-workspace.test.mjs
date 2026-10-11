import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

test('investigation workspace suppresses telemetry even when operator enables its endpoint', async () => {
  const source = await readFile(new URL('../public/assets/js/app-init.js', import.meta.url), 'utf8');
  const handlers = new Map();
  const requests = [];
  const context = vm.createContext({
    window: {
      location: { pathname: '/investigation-lab/' },
      addEventListener: (name, callback) => handlers.set(name, callback),
    },
    document: {
      body: { dataset: { privateWorkspace: 'true', tensorUseSameOriginApi: 'true' } },
      addEventListener() {},
    },
    navigator: {}, URL,
    fetch: (...args) => { requests.push(args); return Promise.resolve(); },
  });
  vm.runInContext(source, context);
  handlers.get('error')({ message: 'sensitive imported evidence' });
  handlers.get('unhandledrejection')({ reason: 'sensitive imported evidence' });
  context.window.__tensorTelemetry.send('manual', { content: 'sensitive imported evidence' });
  assert.deepEqual(requests, []);
});
