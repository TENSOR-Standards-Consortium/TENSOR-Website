import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
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
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    for (const route of routes) {
      await page.goto(base + route);
      await page.waitForTimeout(150);
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

  // Standalone images cannot inherit page CSS. Catch lost chart paint in exports.
  await page.goto(base + '/metrics/');
  const exportButton = page.getByRole('button', { name: 'Export Trend PNG', exact: true });
  await exportButton.waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent === 'Export Trend PNG' && !button.disabled));
  const downloadEvent = page.waitForEvent('download');
  await exportButton.click();
  const download = await downloadEvent;
  const pngPath = path.join(temporary, 'trend.png');
  await download.saveAs(pngPath);
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
    let amber = 0, green = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] > 140 && pixels[i + 1] > 90 && pixels[i + 1] < pixels[i] && pixels[i + 2] < pixels[i + 1] * .8) amber++;
      if (pixels[i + 1] > 140 && pixels[i + 1] > pixels[i] * 1.3 && pixels[i + 2] < pixels[i + 1]) green++;
    }
    return { amber, green };
  }, bytes.toString('base64'));
  assert.ok(coloredPixels.amber > 10 && coloredPixels.green > 10, 'PNG must preserve visible colored curves');
  assert.deepEqual(errors, []);
  if (output) await writeFile(path.join(output, 'results.json'), JSON.stringify({ base, views: results.length, passed: true, errors, coloredPixels, results }, null, 2));
  console.log(`Design browser checks passed: ${results.length} desktop/mobile views and themed PNG export`);
} finally {
  await browser.close();
  await rm(temporary, { recursive: true, force: true });
}
