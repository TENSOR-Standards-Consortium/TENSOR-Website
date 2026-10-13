import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { nebulaLayout } from '../src/lib/graphNebula.mjs';

const graphs = await Promise.all(['graphs/working','legacy/0.20260206e'].map(async path => JSON.parse(await readFile(new URL(`../public/${path}/tensor.core.graph.json`,import.meta.url)))));

test('nebula retains every actual definition and gives stable geometry under source reordering', () => {
  for (const graph of graphs) {
    const layout = nebulaLayout(graph);
    assert.equal(layout.nodes.length, graph.nodes.length);
    assert.deepEqual(new Set(layout.nodes.map(n=>n.id)),new Set(graph.nodes.map(n=>n.id)));
    assert.deepEqual(nebulaLayout({...graph,nodes:[...graph.nodes].reverse(),edges:[...graph.edges].reverse()}),layout);
    assert.equal(new Set(layout.nodes.map(n=>JSON.stringify(n.position))).size,graph.nodes.length);
    for (const node of layout.nodes) {
      assert.ok(Object.values(node.position).every(Number.isFinite));
      const center=layout.clusters.find(c=>c.domain===node.category).position;
      assert.ok(Math.hypot(node.position.x-center.x,node.position.y-center.y,node.position.z-center.z)<350);
      assert.equal(node.text,graph.nodes.find(n=>n.id===node.id).text);
    }
    assert.deepEqual(new Set(layout.anchors.map(a=>`${a.domain}:${a.stage}`)),new Set(graph.nodes.map(n=>`${n.category}:${n.archetype}`)));
    assert.ok(Math.max(...layout.nodes.map(n=>n.position.z))-Math.min(...layout.nodes.map(n=>n.position.z))>300,'geometry must have actual depth');
    for(let i=0;i<layout.nodes.length;i++) for(let j=i+1;j<layout.nodes.length;j++) {
      const a=layout.nodes[i].position,b=layout.nodes[j].position;
      assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)>24,'question cores must not overlap, including active selection');
    }
  }
});

test('all published routes resolve to real selectable nodes, including no and unknown', () => {
  for (const graph of graphs) {
    const ids=new Set(nebulaLayout(graph).nodes.map(n=>n.id));
    for (const e of graph.edges) assert.ok(ids.has(e.source)&&ids.has(e.target),e.id);
    for (const n of graph.nodes) {
      const outgoing=graph.edges.filter(e=>e.source===n.id);
      if(n.archetype==='terminal') assert.equal(outgoing.length,0);
      else assert.deepEqual([...new Set(outgoing.map(e=>e.decision))].sort(),['no','unknown','yes'],n.id);
    }
  }
});
