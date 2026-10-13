const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
const base=process.env.TENSOR_QA_BASE || 'http://127.0.0.1:4321';
const temporary=await mkdtemp(path.join(tmpdir(),'tensor-resources-'));
const output=process.env.TENSOR_RESOURCE_OUTPUT || temporary;
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const introductionConsole=[];page.on('console',message=>{if(page.url().startsWith(base+'/start/')&&['error','warning'].includes(message.type()))introductionConsole.push({type:message.type(),text:message.text()});});
const checks={base};
const data=n=>n.data || n;
async function capture(options){await page.locator('footer').scrollIntoViewIfNeeded();await page.locator('footer .brand-symbol').evaluate(async image=>{image.loading='eager';await image.decode();});await page.evaluate(()=>scrollTo(0,0));return page.screenshot(options);}
try {
 await page.goto(base+'/');
 await page.locator('.hero-text').getByRole('link',{name:'Start here · TENSOR in five minutes',exact:false}).click();
 await page.waitForURL(base+'/start/');
 assert.match(await page.title(),/TENSOR in five minutes/);
 assert.equal(await page.getByRole('heading',{name:'TENSOR in five minutes',exact:true}).count(),1);
 assert.equal(await page.locator('astro-error-overlay, vite-error-overlay').count(),0);
 assert.equal(await page.getByRole('banner').getByRole('link',{name:'Start here',exact:true}).getAttribute('aria-current'),'page');
 assert.equal(await page.locator('.case-timeline > li').count(),5);
 assert.equal(await page.locator('.case-timeline details').count(),0,'introduction does not hide the investigation behind disclosures');
 await page.getByRole('link',{name:'Read the SOC investigation below',exact:false}).click();
 await page.waitForURL(base+'/start/#soc-investigation');
 assert.ok((await page.locator('#soc-investigation').boundingBox()).y<1000);
 for(const [name,url] of [
  ['Follow an investigation','/investigations/soc-signin/'],
  ['Inspect a human–agent handoff','/investigation-lab/?case=soc-signin'],
  ['Add vendor and company layers','/extensions/'],
  ['Implement the shared record','/implement/'],
 ]) {
  const href=await page.getByRole('link',{name,exact:false}).getAttribute('href');
  assert.equal(href,url);
 }
 await capture({path:output+'/start-desktop.png',fullPage:true});
 const introWords=(await page.locator('main').innerText()).split(/\s+/).length;
 assert.ok(introWords<=1250,'five-minute introduction stays within a bounded reading length');
 await page.getByRole('link',{name:'Follow an investigation',exact:false}).click();
 await page.waitForURL(base+'/investigations/soc-signin/');
 await page.locator('[data-case-ready=true]').waitFor();
 await page.locator('[data-graph-ready=true]').waitFor();
 assert.match(await page.locator('.case-heading h2').textContent(),/sign-in and mailbox forwarding/i);
 await page.getByRole('button',{name:'Next case step',exact:true}).click();
 await page.waitForURL(url=>url.pathname==='/investigations/soc-signin/'&&url.searchParams.get('step')==='1');
 checks.firstTimeJourney={steps:5,words:introWords,graphExample:'soc-signin',result:'passed'};
 await page.getByRole('banner').getByRole('link',{name:'Start here',exact:true}).click();
 for(const width of [390,320]) {
  await page.setViewportSize({width,height:844});
  await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await capture({path:output+`/start-${width}.png`,fullPage:true});
 }
 const readingContext=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
 const readingPage=await readingContext.newPage();await readingPage.goto(base+'/start/');
 assert.equal(await readingPage.locator('.case-timeline > li').count(),5);
 assert.equal(await readingPage.getByRole('link',{name:'Implement the shared record',exact:false}).isVisible(),true);
 await readingContext.close();
 checks.introductionWithoutJavaScript='passed';
 await page.setViewportSize({width:1440,height:1000});
 await page.goto(base+'/start/');
 await page.screenshot({path:output+'/start-first-screen.png'});
 await page.getByRole('link',{name:'Read the SOC investigation below',exact:false}).click();
 await page.screenshot({path:output+'/soc-case-first-screen.png'});
 assert.deepEqual(introductionConsole,[]);checks.introductionConsole=introductionConsole;
 await page.goto(base+'/');
 await page.getByRole('banner').getByRole('link',{name:'Resources',exact:true}).click();
 await page.waitForURL(base+'/docs/');
 assert.equal(await page.locator('main .tensor-resource-card').count(),20);
 for(const link of await page.locator('main .tensor-resource-card').all()) assert.equal(await link.isVisible(),true);
 await capture({path:output+'/resources.png',fullPage:true});
 await page.getByRole('banner').getByRole('link',{name:'Vendors & organizations',exact:true}).click();
 await page.waitForURL(base+'/extensions/');
 await capture({path:output+'/layers.png',fullPage:true});
 await page.getByRole('link',{name:'Open the layering example',exact:true}).click();
 await page.waitForURL(/example=cloud-layers/);
 await page.locator('.layer-item').nth(1).waitFor();
 await page.waitForFunction(()=>document.querySelector('#total-nodes').textContent==='590');
 assert.match(await page.locator('#schema-pill').textContent(),/pass|valid/i);
 assert.equal(await page.locator('#total-edges').textContent(),'1556');
 const toggles=page.locator('.layer-item input[type=checkbox]');
 await toggles.nth(0).uncheck();
 await page.waitForFunction(()=>document.querySelector('#total-nodes').textContent==='589');
 await toggles.nth(1).uncheck();
 await page.waitForFunction(()=>document.querySelector('#total-nodes').textContent==='588');
 await toggles.nth(0).check();
 await page.waitForFunction(()=>document.querySelector('#total-nodes').textContent==='589');
 await toggles.nth(1).check();
 await page.waitForFunction(()=>document.querySelector('#total-nodes').textContent==='590');
 const mergedDownload=page.waitForEvent('download');
 await page.locator('#export-merged-btn').click();
 const mergedFile=await mergedDownload;await mergedFile.saveAs(output+'/merged-example.json');
 const merged=JSON.parse(await readFile(output+'/merged-example.json','utf8'));
 const original=JSON.parse(await readFile('public/assets/data/tensor-core.json','utf8'));
 assert.equal(merged.nodes.length,590);
 assert.equal(merged.edges.length,1556);
 assert.deepEqual(merged.edges.slice(0,original.edges.length).map(data),original.edges.map(data));
 for(const raw of original.nodes){const found=data(merged.nodes.find(n=>data(n).id===data(raw).id));for(const [key,value] of Object.entries(data(raw))) assert.deepEqual(found[key],value);}
 assert.equal(data(merged.nodes.find(n=>data(n).id==='Q4')).extensions['tensor.studio:overlays'].length,2);
 assert.equal(data(merged.nodes.find(n=>data(n).id==='Q9001')).extensions['tensor.studio:source'].type,'vendor');
 assert.equal(data(merged.nodes.find(n=>data(n).id==='Q9002')).extensions['tensor.studio:source'].type,'business');
 await capture({path:output+'/layer-preview.png',fullPage:true});
 checks.layering='Passed: autoload, independent toggles, 590/589/588 nodes, merged export, unchanged public questions/routes, distinct layer provenance';
 const packDownload=page.waitForEvent('download');await page.locator('#export-layers-btn').click();const packFile=await packDownload;await packFile.saveAs(output+'/exported-layers.json');
 await page.goto(base+'/studio/');await page.waitForFunction(()=>document.querySelector('#total-nodes')?.textContent==='588');
 await page.locator('#layer-import-input').setInputFiles(output+'/exported-layers.json');
 await page.waitForFunction(()=>document.querySelector('#total-nodes').textContent==='590');
 checks.layerPackRoundTrip='passed';
 await page.goto(base+'/investigation-lab/');await page.locator('.il-case').first().click();await page.locator('.il-workbench').waitFor();
 assert.match(await page.locator('#il-validation-title').textContent(),/checks passed/i);
 const bundleDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Download bundle ↓',exact:true}).click();const bundleFile=await bundleDownload;await bundleFile.saveAs(output+'/lab-bundle.json');
 const bundle=JSON.parse(await readFile(output+'/lab-bundle.json','utf8'));
 const example=JSON.parse(await readFile('public/core/0.1.0-draft.1/examples/case-a.bundle.json','utf8'));
 assert.deepEqual(bundle,example);
 await page.locator('#il-bundle-file').setInputFiles(output+'/lab-bundle.json');await page.waitForFunction(()=>document.querySelector('.il-workspace-bar h2')?.textContent==='lab-bundle.json');
 assert.match(await page.locator('#il-validation-title').textContent(),/checks passed/i);
 checks.recordRoundTrip='Passed: example, validation, exact record/definition values on export, reimport';
 const nav=[];
 for(const width of [320,360,390,700,701,768,850,851,1024,1050,1051,1250,1251,1440]){
  await page.setViewportSize({width,height:width===1440?1000:844});await page.goto(base+'/');await page.evaluate(()=>document.fonts.ready);
  const measured=await page.evaluate(()=>({width:innerWidth,pageWidth:document.documentElement.scrollWidth,links:[...document.querySelectorAll('.header-nav a')].map(a=>{const r=a.getBoundingClientRect();return{text:a.textContent.trim(),left:r.left,right:r.right};})}));
  assert.equal(measured.links.length,7);assert.ok(measured.pageWidth<=width);assert.ok(measured.links.every(l=>l.left>=0&&l.right<=width));nav.push(measured);
  if([320,390,1440].includes(width))await capture({path:output+`/home-${width}.png`,fullPage:true});
 }
 checks.navigationBreakpoints=nav;
 let tableStates=0;
 for(const width of [390,320]){await page.setViewportSize({width,height:844});for(const route of ['/extensions/','/docs/','/implement/']){await page.goto(base+route);await page.evaluate(()=>document.fonts.ready);for(const table of await page.locator('.reference-table').all()){assert.equal(await table.evaluate(el=>el.scrollWidth>el.clientWidth),true);await table.focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(120);assert.ok(await table.evaluate(el=>el.scrollLeft>0));await table.evaluate(el=>el.scrollLeft=0);tableStates++;await table.evaluate(el=>el.blur());}await capture({path:output+`/${route.split('/')[1]}-${width}.png`,fullPage:true});}}
 checks.keyboardScrollableTableStates=tableStates;
 const failure=await browser.newPage({serviceWorkers:'block'});
 await failure.route('**/examples/layers/cloud-investigation.layers.json',route=>route.fulfill({status:404,body:'Unavailable example'}));
 await failure.goto(base+'/studio/?graph=0.20260206e&example=cloud-layers');
 await failure.waitForFunction(()=>document.querySelector('#stats-pill')?.textContent.includes('Example layers unavailable'));
 assert.equal(await failure.locator('#total-nodes').textContent(),'588');
 assert.equal(await failure.locator('.layer-item').count(),0);
 checks.exampleFailure='Passed: unavailable example retains base graph and local layer import';
 await failure.close();
 assert.deepEqual(errors,[]);checks.pageErrors=errors;
 await writeFile(output+'/results.json',JSON.stringify(checks,null,2));
 console.log(JSON.stringify({base,layering:'passed',layerPackRoundTrip:'passed',recordRoundTrip:'passed',resources:20,navigationWidths:nav.length,errors,output}));
}finally{await browser.close();await rm(temporary,{recursive:true,force:true});}
