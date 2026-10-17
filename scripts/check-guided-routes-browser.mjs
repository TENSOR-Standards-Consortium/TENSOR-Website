import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GUIDES} from '../src/lib/guidedInvestigations.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.TENSOR_QA_BASE||'http://127.0.0.1:4321';
const graph=JSON.parse(await readFile('public/graphs/working/tensor.core.graph.json','utf8'));
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1100},reducedMotion:'reduce'}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
let frames=0;
try{
 await page.goto(base+'/graphs/');
 await page.locator('[data-graph-ready=true]').waitFor();
 assert.equal(await page.locator('.atlas-stage').getAttribute('data-node-count'),'609');
 await page.goto(base+'/graphs/?investigation='+GUIDES[0].id);
 for(const guide of GUIDES){
  await page.locator('#guide-select').selectOption(guide.id);
  for(const [i,step] of guide.steps.entries()){
   const current=page.locator('.timeline-entries li.is-current');
   assert.equal(await current.getAttribute('data-question-id'),step.questionId);
   const expected=graph.edges.filter(e=>e.source===step.questionId&&e.decision===step.outcome);
   const next=await current.locator('.timeline-next-options .tensor-badge').allTextContents();
   assert.equal(next.length,expected.length);assert.ok(next.every(answer=>answer===step.outcome));
   await page.getByRole('button',{name:'Inspect criteria & next routes ↗',exact:true}).click();
   const routeBadges=await page.locator('.atlas-routes .tensor-badge').allTextContents();
   assert.equal(routeBadges.length,expected.length);assert.ok(routeBadges.every(answer=>answer===step.outcome));
   assert.deepEqual(new Set(await page.locator('.atlas-routes [data-route-target]').evaluateAll(nodes=>nodes.map(n=>n.dataset.routeTarget))),new Set(expected.map(e=>e.target)));
   const others=graph.edges.filter(e=>e.source===step.questionId&&e.decision!==step.outcome);
   assert.equal(await page.locator('.atlas-other-answers li').count(),others.length);
   await page.getByRole('button',{name:'Close inspector',exact:true}).click();
   if(i<guide.steps.length-1)await page.getByRole('button',{name:'Next step',exact:true}).click();
   frames++;
  }
 }
 const catalog=JSON.parse(await readFile('public/graphs/working/event-profiles/catalog.json','utf8'));
 const suite=JSON.parse(await readFile('public/graphs/working/event-profiles/scenarios.json','utf8'));
 const domains=new Set();
 for(const [pid,profile] of Object.entries(catalog.profiles)){
  if(domains.has(profile.domain))continue;domains.add(profile.domain);
  const sample=suite.cases.find(c=>c.id===pid+'-unresolved'),index=sample.expectedTrace.findIndex(([,answer])=>answer==='unknown');
  await page.goto(base+`/graphs/profiles/${pid}/?investigation=${sample.id}&step=${index}`);await page.locator('[data-graph-ready=true]').waitFor();
  assert.equal(await page.locator('#timeline-position').inputValue(),String(index));
  await page.getByRole('button',{name:'Inspect criteria & next routes ↗',exact:true}).click();
  const badges=await page.locator('.atlas-routes .tensor-badge').allTextContents();assert.ok(badges.length>0&&badges.every(answer=>answer==='unknown'));
 }
 assert.equal(domains.size,7);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({base,guides:GUIDES.length,frames,profileDomains:domains.size,timelineAndInspector:'answer-matched',errors}));
}finally{await browser.close();}
