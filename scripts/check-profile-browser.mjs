import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const temporary=await mkdtemp(path.join(tmpdir(),'tensor-profiles-'));
const output=process.env.TENSOR_PROFILE_OUTPUT||temporary;await mkdir(output,{recursive:true});
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.TENSOR_QA_BASE||'http://127.0.0.1:4321';
const root=fileURLToPath(new URL('../public/graphs/working/event-profiles/',import.meta.url));
const catalog=JSON.parse(await readFile(root+'catalog.json','utf8'));
const definitions=JSON.parse(await readFile(root+'definitions.json','utf8'));
const packed=JSON.parse(await readFile(root+'scenarios.json','utf8'));
const {expandProfileScenarios}=await import('../src/lib/profileInvestigations.mjs');
const scenarios={cases:expandProfileScenarios(packed)};
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
const p=await browser.newPage({viewport:{width:1600,height:1100},reducedMotion:'reduce'});
const errors=[];p.on('pageerror',e=>errors.push(e.message));
const ready=()=>p.locator('[data-graph-ready=true]').waitFor();
const cy=()=>p.locator('.atlas-stage').evaluate(el=>({nodes:el._cyreg.cy.nodes().length,visible:el._cyreg.cy.nodes(':visible').length,visited:el._cyreg.cy.nodes('.visited').map(n=>n.id())}));
try {
await p.goto(base+'/graphs/profiles/');assert.equal(await p.locator('.profile-card').count(),16);
let routes=0,steps=0;
for(const [pid,profile] of Object.entries(catalog.profiles)){
 await p.goto(base+`/graphs/profiles/${pid}/`);await ready();
 assert.equal((await cy()).nodes,609);assert.equal(await p.locator('#guide-select optgroup').first().locator('option').count(),9);
 assert.match(await p.locator('.atlas-profile-context').textContent(),new RegExp(profile.title));
 for(const c of scenarios.cases.filter(c=>c.eventProfile===pid)){
  await p.locator('#guide-select').selectOption(c.id);
  assert.equal(await p.locator('#timeline-position').inputValue(),'0');
  for(let index=0;index<c.expectedTrace.length;index++){
   const [nid,outcome]=c.expectedTrace[index];
   assert.equal(await p.locator('#timeline-position').inputValue(),String(index));
   const current=p.locator('.timeline-entries li.is-current');
   assert.equal(await current.getAttribute('data-question-id'),nid);
   assert.equal(await current.locator('.tensor-badge').first().textContent(),outcome);
   await current.locator('.timeline-question summary').click();
   assert.equal(await current.locator('.timeline-question code').last().textContent(),definitions.profiles[pid][nid].id);
   await current.locator('.timeline-question summary').click();
   assert.equal((await cy()).nodes,609);
   if(index<c.expectedTrace.length-1)await p.getByRole('button',{name:'Next step',exact:true}).click();
   steps++;
  }
  assert.equal(await p.getByRole('button',{name:'Next step',exact:true}).isDisabled(),true);
  routes++;
 }
 await p.locator('#guide-select').selectOption(pid+'-supported');
 await p.getByRole('button',{name:'Path + next options',exact:true}).click();
 await p.waitForFunction(()=>document.querySelector('.atlas-stage')._cyreg.cy.nodes(':visible').length<609);
 await p.getByRole('button',{name:'Inspect criteria & next routes ↗',exact:true}).click();
 const nid=scenarios.cases.find(c=>c.id===pid+'-supported').expectedTrace[0][0];
 assert.equal(await p.locator('.atlas-inspector h2').textContent(),definitions.profiles[pid][nid].predicate);
 assert.match(await p.locator('.atlas-inspector').textContent(),new RegExp(definitions.profiles[pid][nid].id));
 await p.getByRole('button',{name:'Close inspector',exact:true}).click();
 const url=p.url();await p.reload();await ready();assert.equal(p.url(),url);assert.equal(await p.locator('#guide-select').inputValue(),pid+'-supported');
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
}
await p.goto(base+'/graphs/profiles/application-agent-action/?renderer=3d&investigation=application-agent-action-supported');await ready();
assert.equal(await p.locator('[data-renderer=three]').getAttribute('data-node-count'),'609');
await p.getByRole('button',{name:'Path + next options',exact:true}).click();
await p.getByRole('button',{name:'Play',exact:true}).click();
await p.waitForFunction(()=>new URL(location.href).searchParams.get('step')==='1',null,{timeout:10000});
await p.getByRole('button',{name:'Pause',exact:true}).click();
assert.equal(new URL(p.url()).searchParams.get('renderer'),'3d');
await p.screenshot({path:output+'/profile-nebula.png'});
await p.getByRole('button',{name:'Explore',exact:true}).click();await p.reload();await ready();assert.equal(await p.locator('.investigation-timeline').count(),0);
await p.setViewportSize({width:390,height:844});
await p.goto(base+'/graphs/profiles/email-mailbox-rule/?investigation=email-mailbox-rule-independent-fallback&renderer=3d&step=3&context=path');await ready();
assert.equal(await p.locator('.guide-mobile-current').isVisible(),true);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await p.getByRole('button',{name:'Next step on map',exact:true}).click();
await p.getByRole('button',{name:'Inspect criteria & next routes ↗',exact:true}).click();
assert.match(await p.locator('.atlas-inspector').textContent(),/urn:tensor:event-profile:email-mailbox-rule/);
const inspectorBox=await p.locator('.atlas-inspector').boundingBox();assert.ok(inspectorBox.y>=0 && inspectorBox.y<400,'Mobile inspector must come into the viewport');
assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await p.screenshot({path:output+'/profile-mobile.png'});
const textContext=await browser.newContext({javaScriptEnabled:false});const text=await textContext.newPage();await text.goto(base+'/graphs/profiles/file-unavailable-content/');assert.equal(await text.locator('section[id^="file-unavailable-content-"]').count(),9);
const fallback=await browser.newPage();await fallback.addInitScript(()=>{const orig=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:orig.call(this,type,...args)}});await fallback.goto(base+'/graphs/profiles/host-state/?renderer=3d');await fallback.getByRole('button',{name:'Return to atlas',exact:true}).click();await fallback.locator('[data-graph-ready=true]').waitFor();assert.equal(await fallback.locator('#guide-select').inputValue(),'host-state-supported');
assert.deepEqual(errors,[]);
await writeFile(output+'/results.json',JSON.stringify({base,routes,steps,profileCount:16,passed:true,errors,checks:['all 144 route timelines','qualified question definitions','609-node all/path views','URL restore','actual 3D playback and pause','one current 609-question source','explore mode persistence','mobile inspector','JS-off nine routes','WebGL fallback']},null,2));
console.log('Event-profile browser checks passed',JSON.stringify({base,routes,steps}));} finally {await browser.close();await rm(temporary,{recursive:true,force:true});}
