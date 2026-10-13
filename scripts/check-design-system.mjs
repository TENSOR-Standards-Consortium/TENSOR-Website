import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Prevent page/workspace skins from silently bypassing the common foundation.
export function auditStyleOwnership(source, filename) {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const errors = [];
  if (!filename.endsWith('/tokens.css') && /#[\da-f]{3,8}\b|\brgba?\(/i.test(css)) errors.push('Colors must use semantic tokens from tokens.css');
  if (!filename.endsWith('/tokens.css') && /:root\s*\{/.test(css)) errors.push('Root tokens belong in tokens.css');
  if (!filename.endsWith('/global.css') && /(?:^|\})\s*body(?:\s|:|\{|\.)/m.test(css)) errors.push('Page and workspace styles cannot replace the global body theme');
  if (!filename.endsWith('/shell.css') && /(?:^|\})\s*\.(?:site-header|header-inner|footer-bar|page-title-bar)\b/m.test(css)) errors.push('Shell styling belongs in shell.css');
  return errors;
}

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : path.join(directory, entry.name)))).flat();
}

export async function checkDesignSystem(root = process.cwd()) {
  const errors = [];
  for (const file of await files(path.join(root, 'src'))) {
    const source = await readFile(file, 'utf8');
    const relative = path.relative(root, file).split(path.sep).join('/');
    if (file.endsWith('.css')) errors.push(...auditStyleOwnership(source, relative).map(error => `${relative}: ${error}`));
    if (file.endsWith('.astro')) {
      for (const [, css] of source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) errors.push(...auditStyleOwnership(css, relative).map(error => `${relative}: ${error}`));
    }
  }
  const tokens = await readFile(path.join(root, 'src/styles/tokens.css'), 'utf8');
  const theme = tokens.match(/--bg-app:\s*(#[\da-f]{6})/i)?.[1];
  const manifest = JSON.parse(await readFile(path.join(root, 'public/manifest.webmanifest'), 'utf8'));
  if (!theme || manifest.theme_color !== theme || manifest.background_color !== theme) errors.push('PWA chrome must match the central application background');
  if (errors.length) throw new Error(errors.join('\n'));
  return 'Design ownership checks passed: semantic colors, shared shell, and PWA theme';
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(await checkDesignSystem()); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
