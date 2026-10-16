import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export const siteOrigin = 'https://tensor.invalid';
export function markdownLinks(markdown) {
  const text = markdown.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm, '');
  return [...text.matchAll(/\[[^\]]+\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+["'][^"']*["'])?\s*\)|^\s{0,3}\[[^\]]+\]:\s*(\S+)|<a\b[^>]*\bhref=["']([^"']+)["']/gmi)]
    .map(match => (match[1] || match[2] || match[3]).replace(/^<|>$/g, ''));
}
export function siteLink(href, route) {
  const url = new URL(href, siteOrigin + route);
  if (url.origin === 'https://tensor-standards.pages.dev') return new URL(url.pathname + url.search + url.hash, siteOrigin);
  return url;
}
export async function localTarget(root, pathname) {
  const filename = path.resolve(root, '.' + decodeURIComponent(pathname));
  if (filename !== root && !filename.startsWith(root + path.sep)) throw new Error('Link escapes the built site');
  let target = filename;
  try {
    if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html');
    if (!(await stat(target)).isFile()) return null;
  } catch (error) { if (['ENOENT','ENOTDIR'].includes(error.code)) return null; throw error; }
  return { filename:target, route:'/' + path.relative(root,target).split(path.sep).join('/').replace(/index\.html$/,'') };
}

// Source copies keep their exact bytes. Resolve their repository-relative links
// to hosted copies or an exact, inventoried GitHub source instead of rewriting them.
export async function documentAliases(root, provenance, review) {
  if (!/^[0-9a-f]{40}$/.test(review.sourceCommit)) throw new Error('Expected pinned review source');
  const sourceFiles = new Set(review.files.map(file=>file.path));
  const hosted = new Map(provenance.files.filter(f=>f.target.startsWith('public/')).map(f=>[f.source,'/'+f.target.slice(7)]));
  const aliases = new Map();
  for (const file of provenance.files.filter(f=>f.target.startsWith('public/')&&f.target.endsWith('.md'))) {
    const route = '/' + file.target.slice(7);
    const text = await readFile(path.join(root,route),'utf8');
    for (const href of markdownLinks(text)) {
      if (href.startsWith('#')) continue;
      const url = siteLink(href,route);
      if (url.origin !== siteOrigin || await localTarget(root,url.pathname)) continue;
      const sourcePath = decodeURIComponent(new URL(href,siteOrigin+'/'+file.source).pathname).slice(1);
      let to = hosted.get(sourcePath);
      if (to) {
        if (!await localTarget(root,to)) throw new Error(`Hosted source copy missing: ${to}`);
      } else if (sourceFiles.has(sourcePath)) to = `${provenance.sourceRepository}/blob/${review.sourceCommit}/${sourcePath}`;
      else if (sourcePath.endsWith('/') && [...sourceFiles].some(p=>p.startsWith(sourcePath))) to = `${provenance.sourceRepository}/tree/${review.sourceCommit}/${sourcePath}`;
      else throw new Error(`${route}: unresolved document link ${href}`);
      to += url.hash;
      const from = decodeURIComponent(url.pathname);
      if (/[\s?#]/.test(from) || /[\r\n\s]/.test(to)) throw new Error('Unsafe document redirect');
      const previous = aliases.get(from);
      if (previous && previous !== to) throw new Error(`Ambiguous document link: ${from}`);
      aliases.set(from,to);
    }
  }
  return aliases;
}
