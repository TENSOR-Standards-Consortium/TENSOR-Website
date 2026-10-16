import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'parse5';
import { documentAliases, localTarget, markdownLinks, siteLink, siteOrigin } from '../src/lib/documentLinks.mjs';

const root = path.resolve('dist');
const attributes = node => Object.fromEntries((node.attrs || []).map(({ name, value }) => [name, value]));
function walk(node, visit) { visit(node); for (const child of node.childNodes || []) walk(child, visit); }
async function contentFiles(directory) {
  const files=[];
  for(const entry of await readdir(directory,{withFileTypes:true})) {
    const file=path.join(directory,entry.name);
    if(entry.isDirectory())files.push(...await contentFiles(file));
    else if(/\.(html|md)$/.test(entry.name))files.push(file);
  }
  return files;
}
const provenance=JSON.parse(await readFile(path.join(root,'core/0.1.0-draft.1/provenance.json')));
const review=JSON.parse(await readFile(path.join(root,'review/current/manifest.json')));
const expectedAliases=await documentAliases(root,provenance,review);
const redirectText=await readFile(path.join(root,'_redirects'),'utf8');
const aliases=new Map(redirectText.trim().split('\n').filter(Boolean).map(line=>{
  const [from,to,status,...extra]=line.split(/\s+/);
  if(status!=='302'||extra.length)throw new Error(`Unexpected document redirect: ${line}`);
  return [from,to];
}));
if(aliases.size!==expectedAliases.size||[...expectedAliases].some(([from,to])=>aliases.get(from)!==to))throw new Error('Document redirects differ from pinned source resolution');
const pages=new Map();
for(const filename of await contentFiles(root)) {
  const route='/'+path.relative(root,filename).split(path.sep).join('/').replace(/index\.html$/,'');
  const markdown=filename.endsWith('.md'),text=await readFile(filename,'utf8');
  const page={route,markdown,links:[],ids:new Set(),destinations:new Set()};
  if(markdown) {
    page.links=markdownLinks(text);
    const seen=new Map();
    for(const match of text.matchAll(/^#{1,6}\s+(.+?)\s*#*$/gm)) {
      const slug=match[1].toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu,'').replace(/\s/g,'-');
      const n=seen.get(slug)||0;seen.set(slug,n+1);page.ids.add(slug+(n?'-'+n:''));
    }
  } else walk(parse(text),node=>{
    const attrs=attributes(node);
    if(attrs.id)page.ids.add(attrs.id);
    if(node.tagName==='a'&&attrs.href)page.links.push(attrs.href);
  });
  pages.set(route,page);
}
for(const required of ['/','/docs/','/archives/','/questions/','/review/'])if(!pages.has(required))throw new Error(`Missing resource entry page: ${required}`);
const errors=[],targets=new Map();let localLinks=0,redirectedLinks=0;
for(const page of pages.values())for(const href of page.links) {
  let url;
  try{url=siteLink(href,page.route);}catch{errors.push(`${page.route}: invalid link ${href}`);continue;}
  if(url.origin!==siteOrigin)continue;
  localLinks++;
  const alias=aliases.get(decodeURIComponent(url.pathname));
  if(alias){url=siteLink(alias,page.route);redirectedLinks++;if(url.origin!==siteOrigin)continue;}
  if(!targets.has(url.pathname))targets.set(url.pathname,localTarget(root,url.pathname));
  const target=await targets.get(url.pathname);
  if(!target){errors.push(`${page.route}: missing local target ${href}`);continue;}
  if(pages.has(target.route)) {
    page.destinations.add(target.route);
    if(url.hash&&!pages.get(target.route).ids.has(decodeURIComponent(url.hash.slice(1))))errors.push(`${page.route}: missing fragment ${href}`);
  }
}
const visited=new Set(),queue=['/'];
while(queue.length){const route=queue.shift();if(visited.has(route))continue;visited.add(route);for(const to of pages.get(route)?.destinations||[])if(!visited.has(to))queue.push(to);}
const systemPages=new Set(['/404.html','/offline/']);
const html=[...pages.values()].filter(p=>!p.markdown);
for(const page of html)if(!systemPages.has(page.route)&&!visited.has(page.route))errors.push(`${page.route}: unreachable from the homepage`);
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
else console.log(`Resource links passed: ${html.length} HTML pages, ${pages.size-html.length} Markdown documents, ${localLinks} local links, ${redirectedLinks} resolved document links, all public pages reachable from home.`);
