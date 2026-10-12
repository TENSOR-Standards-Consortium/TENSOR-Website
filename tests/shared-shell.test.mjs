import assert from 'node:assert/strict';
import test from 'node:test';
import { validateShell } from '../scripts/hosting-check-build.mjs';
const page = '<header><nav aria-label="Primary"><a href="/graphs/">Graph</a></nav></header><main><h1>TENSOR</h1></main><footer><a href="/governance/">Governance</a></footer>';
test('built shell gate detects missing or duplicate landmarks and titles', () => {
  assert.deepEqual(validateShell(page).errors, []);
  assert.ok(validateShell(page.replace('<footer>', '<div>').replace('</footer>', '</div>')).errors.some((message) => message.includes('one footer')));
  assert.ok(validateShell(page.replace('</main>', '<h1>Duplicate</h1></main>')).errors.some((message) => message.includes('one h1')));
});
test('built shell gate detects navigation drift while permitting active page state', () => {
  const signature = validateShell(page).signature;
  assert.deepEqual(validateShell(page.replace('href="/graphs/"', 'aria-current="page" href="/graphs/"'), 'active', signature).errors, []);
  assert.ok(validateShell(page.replace('/graphs/', '/other/'), 'drift', signature).errors.some((message) => message.includes('differs')));
});
