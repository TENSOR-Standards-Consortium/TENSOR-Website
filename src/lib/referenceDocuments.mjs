import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { siteOrigin } from './documentLinks.mjs';

export const readerPath = source => `/read${source.replace(/\.md$/,'')}/`;
let pending;
export function referenceDocuments() { return pending ||= loadDocuments(); }
async function loadDocuments() {
  const root=path.resolve('public');
  const provenance=JSON.parse(await readFile(path.join(root,'core/0.1.0-draft.1/provenance.json')));
  const review=JSON.parse(await readFile(path.join(root,'review/current/manifest.json')));
  const hosted=new Map(provenance.files.filter(f=>f.target.startsWith('public/')).map(f=>[f.source,'/'+f.target.slice(7)]));
  const sourceFiles=new Set(review.files.map(f=>f.path));
  const files=[], publicFiles=new Set();
  async function scan(directory){for(const entry of await readdir(directory,{withFileTypes:true})){const filename=path.join(directory,entry.name);if(entry.isDirectory())await scan(filename);else {const route='/'+path.relative(root,filename).split(path.sep).join('/');publicFiles.add(route);if(entry.name.endsWith('.md'))files.push(route);}}}
  await scan(root);
  const known=new Set(files);
  return Promise.all(files.sort().map(async source=>{
    const bytes=await readFile(path.join(root,source));const markdown=bytes.toString('utf8');
    const title=markdown.match(/^#\s+(.+)$/m)?.[1]?.replace(/[*`]/g,'') || source.split('/').at(-1).replace(/\.md$/,'');
    // This reads only repository-owned public artifacts. Raw HTML is not executed.
    const frameworkSource=provenance.files.find(f=>f.target==='public'+source)?.source||source.slice(1);
    const processor=await createMarkdownProcessor({gfm:true,smartypants:false,syntaxHighlight:false,remarkRehype:{allowDangerousHtml:false},rehypePlugins:[()=>tree=>{
      function walk(node){
        if(node.tagName==='a'&&typeof node.properties?.href==='string'){
          let url=new URL(node.properties.href,siteOrigin+source);
          if(url.origin==='https://tensor-standards.pages.dev')url=new URL(url.pathname+url.search+url.hash,siteOrigin);
          if(url.origin===siteOrigin){
            if(!publicFiles.has(url.pathname)&&!node.properties.href.startsWith('#')){
              const sourcePath=new URL(node.properties.href,siteOrigin+'/'+frameworkSource).pathname.slice(1);
              const target=hosted.get(sourcePath);
              if(target)url=new URL(target+url.hash,siteOrigin);
              else if(sourceFiles.has(sourcePath))url=new URL(`${provenance.sourceRepository}/blob/${review.sourceCommit}/${sourcePath}${url.hash}`);
            }
            node.properties.href=url.origin===siteOrigin?(known.has(url.pathname)?readerPath(url.pathname):url.pathname)+url.search+url.hash:url.href;
          }
        }
        if(node.children)node.children=node.children.map(child=>{walk(child);return child.tagName==='table'?{type:'element',tagName:'div',properties:{className:['reference-table'],role:'region',ariaLabel:'Scrollable reference table',tabIndex:0},children:[child]}:child;});
      }
      walk(tree);
    }]});
    const rendered=await processor.render(markdown);
    const first=rendered.metadata.headings.find(h=>h.depth===1);
    const html=rendered.code.replace(/^<h1[^>]*>[\s\S]*?<\/h1>\s*/,'');
    return {source,path:readerPath(source),slug:source.slice(1,-3),title,html,titleId:first?.slug,sha256:createHash('sha256').update(bytes).digest('hex'),historical:/\/review\/2026-|\/reviews\/2026-10-(?:12|13)/.test(source),text:markdown.replace(/```[\s\S]*?```/g,' ').replace(/[#*`|]/g,' ')};
  }));
}
