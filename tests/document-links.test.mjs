import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { documentAliases, localTarget, markdownLinks } from '../src/lib/documentLinks.mjs';

test('Markdown links include references and HTML anchors but exclude fenced code',()=>{
  assert.deepEqual(markdownLinks('[Guide](guide.md)\n```md\n[Not a link](missing.md)\n```\n[ref]: target.json\n<a href="source.md">Source</a>'),['guide.md','target.json','source.md']);
});
test('repository-relative document links resolve to hosted copies or exact known source',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'tensor-document-links-'));
  try{
    await mkdir(path.join(root,'docs'),{recursive:true});await mkdir(path.join(root,'graphs'),{recursive:true});
    await writeFile(path.join(root,'docs/method.md'),'[Graph](../drafts/graph.json) · [Verifier](../scripts/verify.py)');
    await writeFile(path.join(root,'graphs/current.json'),'{}');
    const provenance={sourceRepository:'https://github.com/TENSOR-Standards-Consortium/TENSOR-Framework',files:[
      {source:'docs/method.md',target:'public/docs/method.md'},{source:'drafts/graph.json',target:'public/graphs/current.json'}]};
    const review={sourceCommit:'a'.repeat(40),files:[{path:'docs/method.md'},{path:'drafts/graph.json'},{path:'scripts/verify.py'}]};
    const aliases=await documentAliases(root,provenance,review);
    assert.equal(aliases.get('/drafts/graph.json'),'/graphs/current.json');
    assert.equal(aliases.get('/scripts/verify.py'),provenance.sourceRepository+'/blob/'+review.sourceCommit+'/scripts/verify.py');
    await writeFile(path.join(root,'docs/method.md'),'[Missing](../not-in-the-source.md)');
    await assert.rejects(documentAliases(root,provenance,review),/unresolved document link/);
    await assert.rejects(localTarget(root,'/..%2Foutside'),/escapes the built site/);
  }finally{await rm(root,{recursive:true,force:true});}
});
