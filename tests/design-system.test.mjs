import test from 'node:test';
import assert from 'node:assert/strict';
import { auditStyleOwnership, checkDesignSystem } from '../scripts/check-design-system.mjs';

test('design gate catches independent page skins while permitting task layouts', () => {
  assert.deepEqual(auditStyleOwnership('.ledger { display: grid; color: var(--text-primary); }', 'src/pages/ledger.astro'), []);
  assert.ok(auditStyleOwnership('.page { background: #111827; }', 'src/pages/page.astro').some(error => error.includes('Colors')));
  assert.ok(auditStyleOwnership('body:has(.workspace) { background: var(--bg-input); }', 'src/styles/workspace.css').some(error => error.includes('body theme')));
  assert.ok(auditStyleOwnership('.site-header { width: 96vw; }', 'src/pages/page.astro').some(error => error.includes('Shell')));
  assert.ok(auditStyleOwnership(':root { --bg-app: white; }', 'src/styles/workspace.css').some(error => error.includes('Root')));
});

test('all current page and workspace styles respect central design ownership', async () => {
  assert.match(await checkDesignSystem(), /passed/);
});
