import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readText = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('metrics CSV export neutralizes spreadsheet formulas before download', async () => {
  const source = await readText('src/components/MetricsDashboard.jsx');

  assert.match(source, /CSV_FORMULA_PREFIX = \/\^\[=\+\\-@\\t\\r\]\//);
  assert.match(source, /CSV_FORMULA_PREFIX\.test\(rawText\) \? `'\$\{rawText\}` : rawText/);
  assert.match(source, /rows\.map\(\(row\) => row\.map\(escapeCsvCell\)\.join\(','\)\)/);
});

test('frontend release fetches reject protocol-relative and traversal paths', async () => {
  const source = await readText('src/lib/frameworkDataApi.js');

  assert.match(source, /trimmed\.startsWith\('\/\/'\)/);
  assert.match(source, /segment === '\.\.'?/);
  assert.match(source, /isTrustedReleasePathname\(parsed\)/);
  assert.match(source, /REPORT_TYPES = new Set\(\['math-assurance', 'graph-quality', 'coverage-matrix'\]\)/);
});

test('worker release fetches are constrained by host, path prefix, and response size', async () => {
  const source = await readText('worker/index.mjs');

  assert.match(source, /REMOTE_JSON_MAX_BYTES = 2_000_000/);
  assert.match(source, /path-not-allowed:\$\{host\}\$\{parsed\.pathname\}/);
  assert.match(source, /contentLength > REMOTE_JSON_MAX_BYTES/);
  assert.match(source, /text\.length > REMOTE_JSON_MAX_BYTES/);
  assert.match(source, /JSON\.parse\(text\)/);
});

test('deployment headers and workflows enforce transport and full dependency audit gates', async () => {
  const headers = await readText('public/_headers');
  const pagesWorkflow = await readText('.github/workflows/cloudflare-pages.yml');
  const workerWorkflow = await readText('.github/workflows/cloudflare-worker.yml');

  assert.match(headers, /Strict-Transport-Security: max-age=31536000; includeSubDomains; preload/);
  assert.match(pagesWorkflow, /run: npm audit/);
  assert.doesNotMatch(pagesWorkflow, /npm audit --omit=dev/);
  assert.match(workerWorkflow, /run: npm audit/);
  assert.doesNotMatch(workerWorkflow, /npm audit --omit=dev/);
});
