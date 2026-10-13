import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.TENSOR_QA_BASE||'http://127.0.0.1:4321';
const temporary=await mkdtemp(path.join(tmpdir(),'tensor-cases-'));
const output=process.env.TENSOR_CASE_OUTPUT||temporary;await mkdir(output,{recursive:true});
const catalog=JSON.parse(await readFile('public/investigations/v1/catalog.json','utf8'));
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce',acceptDownloads:true});
const errors=[],consoleErrors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});page.on('request',r=>requests.push({method:r.method(),url:r.url()}));
const results={base,cases:[],mobile:[]};
async function ready(){await page.locator('[data-case-ready=true]').waitFor();await page.locator('[data-graph-ready=true]').waitFor();}
async function at(index){await page.waitForFunction(i=>document.querySelector('[data-case-ready=true]')?.getAttribute('data-case-step')===String(i),index);}
try {
 await page.goto(base+'/start/');await page.getByRole('link',{name:'Follow this case in the graph',exact:false}).click();await page.waitForURL(base+'/investigations/soc-signin/');await ready();
 await page.goto(base+'/graphs/?investigation=agent-request');await page.locator('[data-graph-ready=true]').waitFor();await page.locator('#guide-select').selectOption('case:soc-signin');await page.waitForURL(base+'/investigations/soc-signin/');await ready();results.publicAtlasDiscovery='passed';
 for(const sample of catalog.scenarios){
  const source=JSON.parse(await readFile(`public/investigations/v1/${sample.bundle}`,'utf8'));
  const definition=JSON.parse(source.definitions[0].content),frames=source.record.metadata.walkthrough.frames;
  await page.goto(base+`/investigations/${sample.id}/`);await ready();await page.evaluate(()=>document.fonts.ready);
  assert.match(await page.title(),new RegExp(sample.title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.equal(await page.getByRole('heading',{name:'Case walkthrough',exact:true}).count(),1);
  assert.equal(await page.locator('astro-error-overlay, vite-error-overlay').count(),0);
  assert.equal(await page.locator('.atlas-stage').getAttribute('data-node-count'),String(definition.questions.length));
  for(const [i,frame] of frames.entries()){
   await at(i);const assessment=source.record.entries.find(e=>e.id===frame.assessmentId),instance=source.record.entries.find(e=>e.id===assessment.targetInstanceId),question=definition.questions.find(q=>q.id===instance.questionId);
   assert.equal(await page.locator('.case-current h3').textContent(),question.prompt);
   assert.doesNotMatch(await page.locator('.case-workspace').innerText(), /\bS\d+\b|urn:tensor:|\b(?:s-42|r-7|job-17|tx-71|obj-9|h-17|req-42)\b/, 'Ordinary case UI uses properties, not opaque aliases');
   assert.equal(await page.locator('.case-assessment .tensor-badge').textContent(),assessment.outcome);
   assert.match(await page.locator('.case-current .section-kicker').textContent(),new RegExp(question.metadata.layerId));
   assert.equal(await page.locator('.case-step-navigation [aria-current=step]').count(),1);
   const retained=source.record.entries.slice(0,frame.through),assessed=new Set(retained.filter(e=>e.type==='Assessment').map(e=>e.targetInstanceId));
   const pending=new Set(retained.filter(e=>e.type==='Decision').flatMap(e=>(e.selections||[]).map(s=>s.targetInstanceId)).filter(id=>!assessed.has(id)));
   assert.match(await page.locator('.case-leads strong').textContent(),new RegExp(`^${pending.size} open leads?$`));
   assert.equal(await page.locator('.case-leads li').count(),pending.size);
   if(question.metadata.archetype!=='terminal')assert.ok(await page.locator('.case-next-options button').count()>0);
   const guardTexts=await page.locator('.case-next-options button > span').allTextContents();assert.ok(guardTexts.every(t=>t.startsWith(assessment.outcome+' →')));
   if(i<frames.length-1)await page.getByRole('button',{name:'Next case step',exact:true}).click();
  }
  assert.equal(await page.getByRole('button',{name:'Next case step',exact:true}).isDisabled(),true);
  await page.locator('.case-step-navigation button').first().click();await at(0);
  await page.getByRole('button',{name:'Toggle overview map',exact:true}).click();
  const mini=page.locator('.atlas-minimap rect:not(.atlas-viewport)');assert.equal(await mini.count(),definition.questions.length);
  await page.getByRole('checkbox',{name:'Vendor',exact:true}).uncheck();assert.equal(await mini.count(),definition.questions.filter(q=>q.metadata.layerId!=='vendor').length);
  await page.getByRole('checkbox',{name:'Company',exact:true}).uncheck();assert.equal(await mini.count(),definition.questions.filter(q=>q.metadata.layerId==='public').length);
  await page.getByRole('checkbox',{name:'Public',exact:true}).uncheck();assert.equal(await page.getByText('No question layers are visible.',{exact:true}).isVisible(),true);
  await page.getByRole('button',{name:'Show all layers',exact:true}).click();await ready();
  await page.getByRole('button',{name:'Path + open leads',exact:true}).click();await page.getByRole('button',{name:'Toggle overview map',exact:true}).click();const firstAssessment=source.record.entries.find(e=>e.id===frames[0].assessmentId),firstInstance=source.record.entries.find(e=>e.id===firstAssessment.targetInstanceId);
  const firstOptions=new Set(definition.transitions.filter(t=>t.sourceQuestionId===firstInstance.questionId&&t.guardOutcome===firstAssessment.outcome).map(t=>t.targetQuestionId));assert.equal(await mini.count(),firstOptions.size+1);
  await page.locator('.case-next-options button[data-route-status=recorded]').first().focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('.case-workspace').getAttribute('data-case-step'),'0');assert.match(await page.locator('.case-current').textContent(),/No assessment for this question is visible/);
  await page.getByRole('button',{name:'Next case step',exact:true}).click();await at(1);
  await page.getByRole('button',{name:'All case questions',exact:true}).click();
  await page.getByRole('button',{name:'3D nebula',exact:true}).click();await page.locator('.atlas-stage[data-renderer=three][data-graph-ready=true]').waitFor();
  assert.equal(await page.locator('.atlas-stage').getAttribute('data-node-count'),String(definition.questions.length));
  await page.waitForTimeout(500);await page.locator('.case-body').screenshot({path:output+`/${sample.id}-3d.png`});
  await page.getByRole('button',{name:'Atlas',exact:true}).click();await ready();
  await page.getByRole('button',{name:'Play',exact:true}).click();await page.waitForTimeout(7200);await at(2);assert.equal(await page.getByRole('button',{name:'Pause',exact:true}).isVisible(),true);
  await page.getByRole('checkbox',{name:'Vendor',exact:true}).uncheck();assert.equal(await page.getByRole('button',{name:'Play',exact:true}).isVisible(),true);await page.getByRole('checkbox',{name:'Vendor',exact:true}).check();
  await page.waitForTimeout(500);await page.locator('.case-body').screenshot({path:output+`/${sample.id}-atlas.png`});
  await page.getByRole('link',{name:'Open this step in the Lab',exact:false}).click();await page.waitForURL(base+`/investigation-lab/?case=${sample.id}&step=2`);await ready();await at(2);
  assert.match(await page.locator('#il-validation-title').textContent(),/checks passed/i);
  await page.getByRole('button',{name:'Next case step',exact:true}).click();await at(3);
  await page.getByRole('button',{name:'Inspect this assessment and its inputs',exact:true}).click();assert.equal(await page.locator('.il-entry').count(),1);
  assert.doesNotMatch(await page.locator('.il-entry').innerText(), /urn:tensor:|\b(?:s-42|r-7|job-17|tx-71|obj-9|h-17|req-42)\b/);
  const inspectedAssessment=source.record.entries.find(e=>e.id===frames[3].assessmentId);
  const inspectedInstance=source.record.entries.find(e=>e.id===inspectedAssessment.targetInstanceId);
  const inspectedQuestion=definition.questions.find(q=>q.id===inspectedInstance.questionId);
  const reference=page.locator('.il-entry .il-reference').first();
  assert.equal(await reference.textContent(),inspectedQuestion.prompt);
  await reference.click();assert.equal(await page.locator('.il-entry h3').textContent(),inspectedQuestion.prompt);
  await page.locator('.il-entry-id summary').click();assert.match(await page.locator('.il-entry-id').innerText(),/urn:tensor:/);
  await page.locator('.il-entry-id summary').click();
  await page.getByRole('button',{name:'Case walkthrough',exact:true}).click();await ready();await at(3);
  assert.equal(await page.getByRole('link',{name:'Open this step in the graph',exact:false}).getAttribute('href'),`/investigations/${sample.id}/?step=3`);
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download bundle ↓',exact:true}).click();const download=await downloadPromise;const filename=output+`/${sample.id}.bundle.json`;await download.saveAs(filename);
  assert.deepEqual(JSON.parse(await readFile(filename,'utf8')),source,'graph and Lab must retain the same record and exact definition strings');
  await page.locator('#il-bundle-file').setInputFiles(filename);await page.waitForFunction(()=>document.querySelector('.il-workspace-bar .il-eyebrow')?.textContent.includes('Imported record'));assert.match(await page.locator('#il-validation-title').textContent(),/checks passed/i);
  await page.getByRole('button',{name:'Case walkthrough',exact:true}).click();await ready();assert.equal(await page.getByRole('link',{name:'Open this step in the graph',exact:false}).count(),0,'private imports do not produce share URLs from their metadata');
  results.cases.push({id:sample.id,frames:frames.length,questions:definition.questions.length,playback:'passed',layers:'passed',roundTrip:'exact',graphLabStep:'retained',keyboardPreview:'passed'});
 }
 for(const width of [390,320]){await page.setViewportSize({width,height:844});for(const sample of catalog.scenarios){
  await page.goto(base+`/investigations/${sample.id}/`);await ready();await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const map=await page.locator('.case-map').boundingBox();const visible=Math.min(map.y+map.height,844)-Math.max(map.y,0);
  assert.ok(visible>=180,`${width} ${sample.id}: current case and useful map share first viewport (${visible})`);
  assert.equal(await page.locator('.case-mobile-current').isVisible(),true);
  await page.getByRole('button',{name:'Case view options',exact:true}).click();assert.equal(await page.getByRole('button',{name:'3D nebula',exact:true}).isVisible(),true);
  await page.getByRole('button',{name:'Case view options',exact:true}).click();
  await page.waitForTimeout(500);await page.screenshot({path:output+`/${sample.id}-${width}.png`});results.mobile.push({width,id:sample.id,mapVisible:visible});
  await page.getByRole('button',{name:'Next case step',exact:true}).click();await at(1);
  await page.getByRole('link',{name:'Open this step in the Lab',exact:false}).click();await ready();await at(1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(sample.id==='soc-signin')await page.screenshot({path:output+`/lab-${width}.png`});
 }}
 const reading=await browser.newContext({javaScriptEnabled:false});const plain=await reading.newPage();await plain.goto(base+'/investigations/soc-signin/');assert.equal(await plain.locator('noscript li').count(),7);await reading.close();results.noJavaScript='passed';
 const noGl=await browser.newPage();await noGl.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return String(kind).includes('webgl')?null:original.call(this,kind,...args);};});await noGl.goto(base+'/investigations/soc-signin/?renderer=3d&step=2');await noGl.getByRole('button',{name:'Return to atlas',exact:true}).click();await noGl.locator('[data-graph-ready=true]').waitFor();assert.equal(await noGl.locator('.case-workspace').getAttribute('data-case-step'),'2');await noGl.close();results.webGlFallback='passed';
 const failure=await browser.newPage({serviceWorkers:'block'});await failure.goto(base+'/investigation-lab/?case=soc-signin');await failure.locator('[data-case-ready=true]').waitFor();await failure.route('**/investigations/v1/workload-cloud-egress.bundle.json',route=>route.fulfill({status:404,body:'Unavailable example'}));await failure.locator('.il-examples summary').click();await failure.getByRole('button',{name:/Workload identity, cloud read, and network egress/}).click();await failure.getByRole('alert').waitFor();assert.equal(await failure.locator('.il-workspace-bar h2').textContent(),catalog.scenarios[0].title);await failure.close();results.failedLoadRetainsRecord='passed';
 assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);results.pageErrors=errors;results.consoleErrors=consoleErrors;results.labPosts=requests.filter(r=>r.method==='POST'&&r.url.includes('/api/'));assert.deepEqual(results.labPosts,[]);
 await writeFile(output+'/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify({base,cases:results.cases.length,frames:results.cases.reduce((n,c)=>n+c.frames,0),mobile:results.mobile.length,errors,output}));
}finally{await browser.close();await rm(temporary,{recursive:true,force:true});}
