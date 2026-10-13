import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'parse5';

const root = path.resolve('dist');
const origin = 'https://tensor.invalid';
const attributes = node => Object.fromEntries((node.attrs || []).map(({ name, value }) => [name, value]));
function walk(node, visit) { visit(node); for (const child of node.childNodes || []) walk(child, visit); }
async function htmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(filename));
    else if (entry.name.endsWith('.html')) files.push(filename);
  }
  return files;
}

const files = await htmlFiles(root);
if (!files.length) throw new Error('No built HTML found. Run npm run build first.');
const pages = new Map();
for (const filename of files) {
  const route = '/' + path.relative(root, filename).split(path.sep).join('/').replace(/index\.html$/, '');
  const page = { route, links: [], ids: new Set() };
  walk(parse(await readFile(filename, 'utf8')), node => {
    const attrs = attributes(node);
    if (attrs.id) page.ids.add(attrs.id);
    if (node.tagName === 'a' && attrs.href) page.links.push(attrs.href);
  });
  pages.set(route, page);
}
for (const required of ['/', '/docs/']) if (!pages.has(required)) throw new Error(`Missing resource entry page: ${required}`);
const errors = [];
const targets = new Map();
let localLinks = 0;
for (const page of pages.values()) {
  page.destinations = new Set();
  for (const href of page.links) {
    let url;
    try { url = new URL(href, origin + page.route); } catch { errors.push(`${page.route}: invalid link ${href}`); continue; }
    if (url.origin !== origin) continue;
    localLinks++;
    const route = decodeURIComponent(url.pathname);
    let filename = path.resolve(root, '.' + route);
    if (filename !== root && !filename.startsWith(root + path.sep)) { errors.push(`${page.route}: link escapes the site`); continue; }
    if (route.endsWith('/')) filename = path.join(filename, 'index.html');
    if (!targets.has(filename)) targets.set(filename, stat(filename).then(info => info.isFile()).catch(() => false));
    if (!await targets.get(filename)) { errors.push(`${page.route}: missing local target ${href}`); continue; }
    if (pages.has(route)) {
      page.destinations.add(route);
      if (url.hash && !pages.get(route).ids.has(decodeURIComponent(url.hash.slice(1)))) errors.push(`${page.route}: missing HTML fragment ${href}`);
    }
  }
}
const visited = new Set();
const queue = ['/'];
while (queue.length) {
  const route = queue.shift();
  if (visited.has(route)) continue;
  visited.add(route);
  for (const destination of pages.get(route)?.destinations || []) if (!visited.has(destination)) queue.push(destination);
}
// Error and offline responses are system destinations rather than directory entries.
const systemPages = new Set(['/404.html', '/offline/']);
for (const route of pages.keys()) if (!systemPages.has(route) && !visited.has(route)) errors.push(`${route}: unreachable from the homepage`);
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Resource links passed: ${pages.size} pages, ${localLinks} local links, ${visited.size} pages reachable from home, 2 system pages.`);
