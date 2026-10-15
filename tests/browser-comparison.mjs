import assert from 'node:assert/strict';
import {readFile,mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {browserRuntime} from './browser-runtime.mjs';
import {makeServer} from '../src/server.js';
const {chromium,expect,launch}=browserRuntime();
const output=process.env.LANGUAGE_TEST_TEST_OUTPUT||await mkdtemp(join(tmpdir(),'language-test-comparison-'));await mkdir(output,{recursive:true});
const data=await mkdtemp(join(output,'comparison-data-')),fixture=await readFile(new URL('./fixtures/local-ocr.png',import.meta.url));
const server=makeServer({projectRoot:join(data,'projects'),cacheRoot:join(data,'cache'),availability:async()=>false,authentication:async()=>false});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,checks=[],errors=[];let browser,page;
try{
 browser=await chromium.launch(launch);page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(10000);
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort('blockedbyclient'));
 await page.goto(base);await page.locator('.phrase').fill('Start');await page.locator('#imageInput').setInputFiles({name:'current.png',mimeType:'image/png',buffer:fixture});await expect(page.locator('.image-tab')).toHaveCount(1);
 await page.getByText('작업 도구 더보기',{exact:true}).click();await page.locator('#openCompare').click();await page.locator('#baselineCurrent').click();await expect(page.locator('#baselineInfo')).toContainText('현재 이미지를 기준으로 보관');
 await page.locator('#runCompare').click();await expect(page.locator('#diffInfo')).toContainText('0픽셀');await expect(page.locator('#saveDiff')).toBeEnabled();checks.push('real Worker compares identical images as zero changed pixels');
 await page.locator('#compareDisplay').selectOption('slider');await page.locator('#compareBlend').fill('40');await expect(page.locator('#compareFrameLabel')).toContainText('왼쪽 기준 40% · 오른쪽 현재 60%');checks.push('slider caption reflects visible baseline and current proportions');
 await page.locator('#compareDisplay').selectOption('blink');await expect(page.locator('#compareFrameLabel')).toHaveText(/기준 이미지|현재 이미지/);await page.getByRole('button',{name:'이전 화면과 비교 닫기',exact:true}).click();
 const changes=await page.evaluate(()=>new Promise(resolve=>{let changes=0;const observer=new MutationObserver(()=>changes++);observer.observe(document.getElementById('compareFrameLabel'),{childList:true,subtree:true});setTimeout(()=>{observer.disconnect();resolve(changes)},750)}));assert.equal(changes,0);checks.push('closing comparison stops the blink timer');
 await page.locator('#saveLocal').click();await expect(page.locator('#saveIndicator')).toContainText('저장됨');
 const listed=await(await fetch(base+'/api/projects')).json(),id=listed[0].id;
 const stored=async()=>await(await fetch(base+'/api/projects?id='+id+'&references=1')).json();
 const original=await stored();assert.equal(original.items[0].comparison.changed,0);
 await page.locator('#openCompare').click();await page.locator('#baselineFile').setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('broken')});await expect(page.locator('#baselineInfo')).toContainText('이미지를 읽지 못했습니다');await expect(page.locator('.baseline-history-row')).toHaveCount(1);await expect(page.locator('#runCompare')).toBeEnabled();checks.push('corrupt baseline has readable feedback and preserves history');
 await page.route('**/api/images',route=>route.request().method()==='POST'?route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:{message:'QA baseline upload failed'}})}):route.continue());
 await page.locator('#baselineFile').setInputFiles({name:'replacement.png',mimeType:'image/png',buffer:fixture});await expect(page.locator('#baselineInfo')).toContainText('QA baseline upload failed');await expect(page.locator('.baseline-history-row')).toHaveCount(1);await page.unroute('**/api/images');checks.push('failed baseline upload does not change existing history');
 let held,started;const routeImages=async route=>{held=route;started()};await page.route('**/api/images?*',routeImages);
 for(const action of ['cancel','close']){
  const ready=new Promise(r=>started=r);await page.locator('#runCompare').click();await ready;await expect(page.locator('#baselineFile')).toBeDisabled();
  if(action==='cancel'){await page.locator('#cancelCompare').click();await expect(page.locator('#diffInfo')).toContainText('화면 비교를 취소했습니다');await expect(page.locator('#runCompare')).toBeEnabled({timeout:1500})}
  else{await page.getByRole('button',{name:'이전 화면과 비교 닫기',exact:true}).click();await expect(page.locator('#saveLocal')).toBeEnabled({timeout:1500})}
  await held.abort().catch(()=>{});checks.push(action+' during baseline download aborts promptly and restores controls');
 }
 await page.unroute('**/api/images?*',routeImages);await page.locator('#openCompare').click();
 let aligning;const alignmentReady=new Promise(r=>aligning=r);await page.route('**/api/compare/align',route=>{held=route;aligning()});
 await page.locator('#autoAlign').click();await alignmentReady;await expect(page.locator('#cancelCompare')).toBeEnabled();await page.locator('#cancelCompare').click();await expect(page.locator('#diffInfo')).toContainText('자동 위치 맞추기를 취소했습니다');await expect(page.locator('#autoAlign')).toBeEnabled({timeout:1500});await held.abort().catch(()=>{});await page.unroute('**/api/compare/align');checks.push('automatic alignment cancellation aborts its network request');
 await page.locator('#runCompare').click();await expect(page.locator('#diffInfo')).toContainText('0픽셀');await expect(page.locator('#saveDiff')).toBeEnabled();await page.screenshot({path:join(output,'comparison-proof.png')});checks.push('comparison can run successfully after cancellation');
 await page.getByRole('button',{name:'이전 화면과 비교 닫기',exact:true}).click();await page.locator('#saveLocal').click();await expect(page.locator('#saveIndicator')).toContainText('저장됨');const final=await stored();assert.equal(final.items[0].baseline.image.hash,original.items[0].baseline.image.hash);assert.equal(final.items[0].baselineHistory.length,1);assert.equal(final.items[0].comparison.changed,0);checks.push('baseline and comparison survive save after failed or cancelled attempts');
 assert.deepEqual(errors,[]);checks.push('no uncaught browser errors');await writeFile(join(output,'comparison-result.json'),JSON.stringify({status:'pass',checks,errors,data},null,2));console.log(JSON.stringify({status:'pass',checks,report:join(output,'comparison-result.json')}));
}catch(error){await page?.screenshot({path:join(output,'comparison-failure.png')}).catch(()=>{});await writeFile(join(output,'comparison-result.json'),JSON.stringify({status:'fail',checks,errors,error:error.stack,data},null,2));throw error}
finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
