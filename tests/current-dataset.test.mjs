import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { datasetArtifact } from '../src/lib/datasetArtifact.mjs';
import { checkLayerBase, mergeLegacyGraphWithLayers } from '../src/lib/legacyGraph.mjs';
const read = p => readFile(new URL('../public/'+p,import.meta.url));
const dataset=JSON.parse(await read('dataset/current.json'));
const digest=raw=>createHash('sha256').update(raw).digest('hex');

test('the public inventory, current review and every active artifact agree exactly',async()=>{
  assert.deepEqual(JSON.parse(await read('review/current/dataset.json')),dataset);
  const review=JSON.parse(await read('review/current/manifest.json'));
  assert.equal(review.dataset.id,dataset.id);assert.deepEqual(review.dataset.counts,dataset.counts);
  assert.equal(dataset.files.filter(f=>f.publicPath.endsWith('/tensor.core.graph.json')).length,1);
  for(const file of dataset.files){
    const bytes=await read(file.publicPath.slice(1));
    assert.equal(bytes.length,file.bytes,file.publicPath);assert.equal(digest(bytes),file.sha256,file.publicPath);
    const archived=review.files.find(f=>f.path===file.source);
    assert.ok(archived,file.source);assert.equal(archived.sha256,file.sha256);assert.equal(archived.bytes,file.bytes);
  }
  const graph=JSON.parse(await read(dataset.graph.slice(1)));
  assert.equal(dataset.counts.questions,graph.nodes.length);assert.equal(dataset.counts.routes,graph.edges.length);
  const pack=JSON.parse(await read('examples/layers/cloud-investigation.layers.json'));
  assert.equal(pack.metadata.baseGraphVersion,graph.version);
  assert.equal(pack.metadata.baseGraphSha256,digest(await read(dataset.graph.slice(1))));
});

test('public loads retain exact source bytes and reject a different artifact of the same size',async()=>{
  const raw=Buffer.from('{"answer":"unknown"}');const pin={bytes:raw.length,sha256:digest(raw)};
  assert.deepEqual(Buffer.from(await datasetArtifact(new Response(raw),pin)),raw);
  const changed=Buffer.from('{"answer":"altered"}');assert.equal(changed.length,raw.length);
  await assert.rejects(datasetArtifact(new Response(changed),pin),/differs from the current dataset/);
  await assert.rejects(datasetArtifact(new Response(raw),null),/unavailable/);
  await assert.rejects(datasetArtifact(new Response(raw,{status:404}),pin),/unavailable/);
});

test('layer declarations reject another version or exact base, including same-version drift',()=>{
  const graph={version:'0.20261013b'};
  checkLayerBase({metadata:{baseGraphVersion:graph.version,baseGraphSha256:'correct'}},graph,'correct');
  assert.throws(()=>checkLayerBase({baseGraphVersion:'0.20260206e'},graph,'correct'),/different base graph/);
  assert.throws(()=>checkLayerBase({metadata:{baseGraphVersion:graph.version,baseGraphSha256:'different'}},graph,'correct'),/different base graph bytes/);
  assert.throws(()=>checkLayerBase({metadata:{baseGraphVersion:graph.version},layers:[{metadata:{baseGraphVersion:'0.20260206e'}}]},graph,'correct'),/different base graph/);
  assert.throws(()=>checkLayerBase({baseGraphSha256:'different',metadata:{baseGraphSha256:'correct'}},graph,'correct'),/different base graph bytes/);
});

test('current-layer compositions retain existing public evidence extensions unchanged',async()=>{
  const graph=JSON.parse(await read(dataset.graph.slice(1)));
  const pack=JSON.parse(await read('examples/layers/cloud-investigation.layers.json'));
  const layers=pack.layers.map(layer=>({...layer.metadata,nodes:layer.nodes,edges:layer.edges}));
  const merged=mergeLegacyGraphWithLayers(graph,layers);
  const original=graph.nodes.find(n=>n.id==='Q4'),composed=merged.nodes.find(n=>(n.data||n).id==='Q4');
  for(const [key,value] of Object.entries(original.extensions))assert.deepEqual((composed.data||composed).extensions[key],value);
  assert.equal((composed.data||composed).extensions['tensor.studio:overlays'].length,2);
  assert.equal(graph.nodes.length,dataset.counts.questions);
});
