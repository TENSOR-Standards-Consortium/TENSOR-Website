import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// Isolate the optional Worker dependency; exercise the real browser fallback
// implementation with fetch observations, without calling live providers.
const source = await readFile(new URL('../src/lib/frameworkDataApi.js', import.meta.url), 'utf8');
const isolated = source.replace("import { fetchApiJson } from './runtimeApi';", "const fetchApiJson = async () => { throw new Error('No optional Worker configured'); };");
const { fetchReleaseManifest, buildFrameworkAssetUrls, isTrustedReleaseUrl } = await import(`data:text/javascript;base64,${Buffer.from(isolated).toString('base64')}`);
const manifest = JSON.parse(await readFile(new URL('../public/assets/releases/manifest.json', import.meta.url), 'utf8'));
const main = 'https://raw.githubusercontent.com/tensor-standards-consortium/tensor-framework/main/releases/manifest.json';
const master = main.replace('/main/', '/master/');
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

test('successful main manifest stops without contacting historical mirrors or local fallback', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url) => { calls.push(url); assert.equal(url, main); return response(manifest); });
  const result = await fetchReleaseManifest();
  assert.equal(result.requestUrl, main);
  assert.equal(result.data.latestGraphVersion, manifest.latestGraphVersion);
  assert.deepEqual(calls, [main]);
});

test('a failed main request uses the next trusted source and then stops', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url) => { calls.push(url); return url === main ? response({}, 503) : response(manifest); });
  const result = await fetchReleaseManifest();
  assert.equal(result.requestUrl, master);
  assert.deepEqual(calls, [main, master]);
});

test('an unusable 200 manifest does not suppress a valid fallback', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url) => { calls.push(url); return response(url === main ? {} : manifest); });
  const result = await fetchReleaseManifest();
  assert.equal(result.requestUrl, master);
  assert.deepEqual(calls, [main, master]);
});

test('canonical paths prefer raw main over historical URLs embedded in the manifest', async (t) => {
  const payload = structuredClone(manifest);
  payload.releases[0].graphUrl = `https://tensor-standards-consortium.github.io/TENSOR-Framework/${payload.releases[0].graphPath}`;
  payload.releases[0].schemaUrl = `https://tensor-standards-consortium.github.io/TENSOR-Framework/${payload.releases[0].schemaPath}`;
  t.mock.method(globalThis, 'fetch', async () => response(payload));
  const result = await fetchReleaseManifest();
  assert.equal(result.data.releases[0].graphUrl, `https://raw.githubusercontent.com/tensor-standards-consortium/tensor-framework/main/${payload.releases[0].graphPath}`);
  assert.equal(result.data.releases[0].schemaUrl, `https://raw.githubusercontent.com/tensor-standards-consortium/tensor-framework/main/${payload.releases[0].schemaPath}`);
});

test('release URL policy still rejects external, insecure, and traversal targets', () => {
  assert.equal(isTrustedReleaseUrl(main), true);
  for (const url of [main.replace('https:', 'http:'), '//evil.example/releases/manifest.json', 'https://evil.example/releases/manifest.json', main.replace('/releases/manifest.json', '/../../secrets'), 'https://raw.githubusercontent.com/another/repository/main/releases/manifest.json']) assert.equal(isTrustedReleaseUrl(url), false, url);
  for (const path of ['../secrets', 'releases/../secrets', '//evil.example/releases/manifest.json', 'releases\\secrets']) assert.deepEqual(buildFrameworkAssetUrls(path), []);
});
