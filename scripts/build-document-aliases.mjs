import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { documentAliases } from '../src/lib/documentLinks.mjs';
const root=path.resolve('dist');
const provenance=JSON.parse(await readFile(path.join(root,'core/0.1.0-draft.1/provenance.json')));
const review=JSON.parse(await readFile(path.join(root,'review/current/manifest.json')));
const aliases=await documentAliases(root,provenance,review);
await writeFile(path.join(root,'_redirects'),[...aliases].sort(([a],[b])=>a.localeCompare(b)).map(([from,to])=>`${from} ${to} 302\n`).join(''));
console.log(`Resolved ${aliases.size} repository-relative document links without changing pinned source bytes.`);
