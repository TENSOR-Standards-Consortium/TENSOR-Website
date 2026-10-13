import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.TENSOR_QA_BASE||'http://127.0.0.1:4321';
const graph=JSON.parse(await readFile(new URL('../public/graphs/working/tensor.core.graph.json',import.meta.url)));
const b=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try {
const p=await b.newPage({viewport:{width:1600,height:1100},reducedMotion:'reduce'});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto(base+'/graphs/');await p.locator('[data-graph-ready=true]').waitFor();
assert.equal(await p.locator('.atlas-stage').evaluate(el=>el._cyreg.cy.nodes().length),graph.nodes.length,'default exploration must load every working question');
// Full catalog sweep uses the atlas; both renderers share these inspector handlers.
// Representative real WebGL picking and routing are covered in the guided suite.
// Actual rendered inspector for each public ID, then actual route-button handlers.
let selections=0,routes=0;
for(const n of graph.nodes) {
 await p.evaluate(id=>{history.replaceState(null,'','?graph=working&node='+id);dispatchEvent(new PopStateEvent('popstate'));},n.id);
 await p.waitForFunction(id=>document.querySelector('.atlas-inspector .section-kicker')?.textContent.startsWith(id+' /'),n.id);
 assert.equal(await p.locator('.atlas-inspector h2').textContent(),n.text);selections++;
 const outgoing=graph.edges.filter(e=>e.source===n.id);
 assert.equal(await p.locator('.atlas-routes li').count(),outgoing.length);
 for(let i=0;i<outgoing.length;i++) {
  const e=outgoing[i];
  assert.equal(await p.locator('.atlas-routes li').nth(i).locator('code').textContent(),e.target);
  await p.locator('.atlas-routes li').nth(i).locator('button').evaluate(el=>el.click());
  await p.waitForFunction(id=>document.querySelector('.atlas-inspector .section-kicker')?.textContent.startsWith(id+' /'),e.target);routes++;
  // Restore source through the supported public history route before next choice.
  if(i<outgoing.length-1) {await p.evaluate(id=>{history.replaceState(null,'','?graph=working&node='+id);dispatchEvent(new PopStateEvent('popstate'));},n.id);await p.waitForFunction(id=>document.querySelector('.atlas-inspector .section-kicker')?.textContent.startsWith(id+' /'),n.id);}
 }
 if(selections%100===0) console.log(`${selections} selected, ${routes} routes followed`);
}
assert.equal(selections,graph.nodes.length);assert.equal(routes,graph.edges.length);assert.deepEqual(errors,[]);
console.log('Complete node/route UI checks passed',selections,routes);
} finally { await b.close(); }
