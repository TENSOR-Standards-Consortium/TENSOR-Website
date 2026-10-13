import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, mkdtemp, rm, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Optional gate; no production dependency or network in the offline checks.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TENSOR_QA_BASE || 'http://127.0.0.1:4321';
const output = process.env.TENSOR_DESIGN_OUTPUT;
if (output) await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
const temporary = await mkdtemp(path.join(tmpdir(), 'tensor-design-'));

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const routes = [
    '/', '/core/', '/docs/', '/about/', '/ai-reliability/', '/conformance/',
    '/contribute/', '/extensions/', '/governance/', '/implement/', '/review/',
    '/schemas/', '/standards/', '/questions/', '/questions/0.20260206e/Q1/',
    '/graphs/', '/graphs/coverage/', '/graphs/profiles/',
    '/graphs/profiles/application-agent-action/', '/investigation-lab/',
    '/metrics/', '/studio/', '/offline/', '/404.html',
  ];
  const capture = new Set(['/', '/core/', '/docs/', '/review/', '/graphs/profiles/', '/investigation-lab/']);
  const results = [];
  let commonTheme;
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    for (const route of routes) {
      await page.goto(base + route);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(150);
      if (route === '/') {
        const graph = JSON.parse(await readFile(new URL('../public/graphs/working/tensor.core.graph.json', import.meta.url)));
        assert.equal(await page.locator('.field-nodes > circle').count(), graph.nodes.length, 'hero preserves working-node inventory');
        assert.equal(await page.locator('.field-links > path').count(), graph.edges.length, 'hero uses declared routes');
        assert.match(await page.locator('.candidate-status').textContent(), /implementation candidate/i);
        // Overflow clipping can conceal oversized glyphs without enlarging the page.
        const clippedHeadline = await page.locator('.hero-title').evaluate(title => {
          const bounds = title.getBoundingClientRect();
          const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
          const range = document.createRange();
          while (walker.nextNode()) {
            range.selectNodeContents(walker.currentNode);
            if ([...range.getClientRects()].some(rect => rect.left < bounds.left - 1 || rect.right > Math.min(bounds.right, innerWidth) + 1)) return true;
          }
          return false;
        });
        assert.equal(clippedHeadline, false, `${width}: complete headline must fit`);
      }
      for (const landmark of ['header', 'main', 'footer', 'h1']) assert.equal(await page.locator(landmark).count(), 1, `${route}: ${landmark}`);
      const visual = await page.evaluate(() => {
        const body = getComputedStyle(document.body);
        const header = document.querySelector('header');
        return {
          body: body.backgroundColor, font: body.fontFamily,
          header: getComputedStyle(header).backgroundColor,
          overflow: document.documentElement.scrollWidth > innerWidth,
          headerLeft: header.getBoundingClientRect().x,
          headerWidth: header.getBoundingClientRect().width,
        };
      });
      const theme = { body: visual.body, font: visual.font, header: visual.header };
      commonTheme ??= theme;
      assert.deepEqual(theme, commonTheme, `${route}: shared palette and typography`);
      assert.equal(visual.overflow, false, `${width} ${route}: overflow`);
      assert.equal(visual.headerLeft, 0, route);
      assert.equal(visual.headerWidth, width, route);
      results.push({ width, route, ...visual });
      if (output && capture.has(route)) {
        const name = route === '/' ? 'home' : route.split('/').filter(Boolean).join('-');
        await page.screenshot({ path: path.join(output, `${width}-${name}.png`) });
      }
    }
  }

  // Guided mobile keeps the active evidence and useful graph area together.
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(base + '/graphs/?investigation=agent-request&step=4&renderer=3d');
    await page.locator('[data-graph-ready=true]').waitFor();
    await page.evaluate(() => document.fonts.ready);
    const map = await page.locator('.atlas-map-wrap').boundingBox();
    assert.ok(Math.min(map.y + map.height, 844) - Math.max(map.y, 0) >= 220, `${width}: active step and graph must share the first viewport`);
    assert.equal(await page.locator('.guide-mobile-current p').isVisible(), true);
    assert.equal(await page.locator('.atlas-toolbar').isVisible(), false);
    const toggle = page.locator('.atlas-tools-toggle');
    assert.match(await toggle.textContent(), /Working draft 609 · 3D nebula/);
    if (output) await page.screenshot({ path: path.join(output, `${width}-guided.png`) });
    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    for (const button of await page.locator('.atlas-toolbar button').all()) {
      assert.equal(await button.isVisible(), true);
      assert.ok((await button.boundingBox()).height >= 44, 'mobile view controls retain touch targets');
    }
    await page.getByRole('button', { name: 'Atlas', exact: true }).click();
    await page.locator('.atlas-stage[data-graph-ready=true]:not([data-renderer])').waitFor();
    assert.match(await toggle.textContent(), /· Atlas/);
    await toggle.click();
    assert.equal(await page.locator('.atlas-toolbar').isVisible(), false);
  }

  // Standalone images cannot inherit page CSS. Catch lost chart paint in exports.
  await page.goto(base + '/metrics/');
  const exportButton = page.getByRole('button', { name: 'Export chart PNG', exact: true });
  await exportButton.waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent === 'Export chart PNG' && !button.disabled));
  await page.locator('.metrics-gate-summary').waitFor();
  assert.equal(await page.locator('.matrix-table tbody tr').count(), 7, 'selected release retains domain matrix');
  assert.match(await page.locator('.metrics-gate-summary').textContent(), /Total 11.*Passed 11/);
  assert.deepEqual((await page.locator('.metrics-axis-label').allTextContents()).slice(0, 5), ['0', '25', '50', '75', '100']);
  assert.equal(await page.locator('.metrics-trend-viewport').evaluate(element => element.scrollWidth > element.clientWidth), true, 'mobile chart scrolls inside its panel');
  const downloadEvent = page.waitForEvent('download');
  await exportButton.click();
  const download = await downloadEvent;
  const pngPath = path.join(temporary, 'trend.png');
  await download.saveAs(pngPath);
  if (output) await copyFile(pngPath, path.join(output, 'historical-trend.png'));
  const bytes = await readFile(pngPath);
  const coloredPixels = await page.evaluate(async encoded => {
    const image = new Image();
    image.src = `data:image/png;base64,${encoded}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const roles = ['overall', 'coverage', 'routing', 'robustness'];
    const scratch = document.createElement('canvas').getContext('2d');
    const colors = roles.map(role => {
      scratch.fillStyle = getComputedStyle(document.querySelector(`.metrics-trend-chart .is-${role}`)).stroke;
      scratch.fillRect(0, 0, 1, 1);
      return [...scratch.getImageData(0, 0, 1, 1).data].slice(0, 3);
    });
    const counts = Object.fromEntries(roles.map(role => [role, 0]));
    for (let i = 0; i < pixels.length; i += 4) {
      colors.forEach((color, index) => {
        if (color.every((channel, offset) => Math.abs(channel - pixels[i + offset]) < 12)) counts[roles[index]]++;
      });
    }
    return counts;
  }, bytes.toString('base64'));
  assert.ok(Object.values(coloredPixels).every(count => count > 10), `PNG must preserve every themed series: ${JSON.stringify(coloredPixels)}`);
  assert.deepEqual(errors, []);
  if (output) await writeFile(path.join(output, 'results.json'), JSON.stringify({ base, views: results.length, passed: true, errors, coloredPixels, results }, null, 2));
  console.log(`Design browser checks passed: ${results.length} desktop/mobile views, 2 mobile guided layouts and themed PNG export`);
} finally {
  await browser.close();
  await rm(temporary, { recursive: true, force: true });
}
