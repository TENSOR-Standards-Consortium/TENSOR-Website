import { readFile } from 'node:fs/promises';

// Preserve the original deployment gate independently of shell/grep behavior.
const paths = ['worker/index.mjs', 'src/lib/frameworkDataApi.js', 'src/components/GraphExplorer.jsx'];
const forbidden = ['javascript:', 'data:text/html', 'file://'];
for (const path of paths) {
  const source = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
  for (const scheme of forbidden) {
    if (source.includes(scheme)) throw new Error(`Forbidden URL scheme ${scheme} in ${path}`);
  }
}
console.log(`URL scheme policy passed for ${paths.length} release-fetch surfaces.`);
