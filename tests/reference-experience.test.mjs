import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dateTimeLabel,timeLabel,statusLabel,valueLabel } from '../src/lib/displayLabels.mjs';
import { studioPositions,studioNeighborhoodPositions } from '../src/lib/studioLayout.mjs';
import { referenceDocuments } from '../src/lib/referenceDocuments.mjs';

test('UTC presentation retains offsets and does not rename arbitrary declared properties',()=>{
 assert.equal(dateTimeLabel('2026-10-13T08:42:12+02:00'),'13 Oct 2026, 06:42:12 UTC');
 assert.equal(dateTimeLabel('Unknown time'),'Unknown time');
 assert.equal(dateTimeLabel('2026-99-99T99:00:00Z'),'2026-99-99T99:00:00Z');
 assert.equal(timeLabel({start:'2026-10-13T08:35:00Z',end:'2026-10-13T09:00:00Z'}),'13 Oct 2026, 08:35:00 – 09:00:00 UTC');
 assert.equal(statusLabel('notApplicable'),'Not applicable');
 assert.equal(valueLabel({status:'applicable',rationale:'The exact scope applies.'}),'Applicable · The exact scope applies.');
 assert.equal(statusLabel('toString'),'toString');
 assert.equal(valueLabel('NameWithIntentionalCase'),'NameWithIntentionalCase');
});
test('Studio positions every original and imported node without mutating definitions',async()=>{
 const graph=JSON.parse(await readFile('public/graphs/working/tensor.core.graph.json','utf8'));
 const nodes=[...graph.nodes,{id:'vendor-node',category:'Custom domain',archetype:'Custom stage'},{id:'company-node',category:'Another domain'}];
 const before=JSON.stringify(nodes),positions=studioPositions(nodes);
 assert.equal(positions.size,nodes.length);assert.equal(new Set([...positions.values()].map(p=>JSON.stringify(p))).size,nodes.length);
 assert.deepEqual(positions,studioPositions([...nodes].reverse()));
 assert.equal(JSON.stringify(nodes),before);
});
test('online source readings retain exact download identities and resolve document links',async()=>{
 const docs=await referenceDocuments();assert.ok(docs.length>=32);
 for(const doc of docs){
  const bytes=await readFile('public'+doc.source);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),doc.sha256);
  assert.ok(doc.html.length>100);assert.ok(doc.path.startsWith('/read/'));assert.ok(!doc.html.includes('<h1'));
 }
 const contract=docs.find(d=>d.source==='/founding/01-core-contract.md');
 assert.match(contract.html,/TC-01/);
 const walkthrough=docs.find(d=>d.source==='/review/current/walkthrough.md');
 assert.match(walkthrough.html,/<ol>/);assert.equal(walkthrough.historical,false);
 assert.ok(docs.find(d=>d.source==='/review/2026-10-11.1/README.md').historical);
});

test('Studio neighborhoods keep every card separate and the selected question centered',()=>{
 const nodes=Array.from({length:31},(_,i)=>({id:`q-${i}`,category:['Identity','Cloud'][i%2]})),before=JSON.stringify(nodes);
 const positions=studioNeighborhoodPositions(nodes,'q-15');assert.equal(positions.size,31);assert.deepEqual(positions.get('q-15'),{x:0,y:0});
 assert.deepEqual(positions,studioNeighborhoodPositions([...nodes].reverse(),'q-15'));
 for(const [i,a] of [...positions.values()].entries())for(const b of [...positions.values()].slice(i+1))assert.ok(Math.abs(a.x-b.x)>=175||Math.abs(a.y-b.y)>=70);
 assert.equal(JSON.stringify(nodes),before);
});
