import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {browserRuntime} from './browser-runtime.mjs';
import {makeServer} from '../src/server.js';

const {chromium,expect,launch}=browserRuntime();
const output=process.env.LANGUAGE_TEST_TEST_OUTPUT||await mkdtemp(join(tmpdir(),'language-test-lifecycle-'));await mkdir(output,{recursive:true});
const data=await mkdtemp(join(output,'data-')),fixture=await readFile(new URL('./fixtures/local-ocr.png',import.meta.url));
const authenticated={codex:false,gemini:true};let launches=0;
const server=makeServer({projectRoot:join(data,'projects'),cacheRoot:join(data,'cache'),availability:async()=>true,authentication:async provider=>authenticated[provider]??true,startLogin:async()=>({id:'mock-login-'+(++launches),state:'waiting'}),sessionStatus:()=>({state:'waiting'}),extractor:async()=>({provider:'mock-codex',extractedText:'Start',lines:[{text:'Start',confidence:.99,boundingBox:{x:.1,y:.1,width:.5,height:.5}}]})});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port,checks=[],errors=[];let browser,page;
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}};
try{
 browser=await chromium.launch(launch);page=await browser.newPage({viewport:{width:1280,height:800}});page.setDefaultTimeout(10000);
 await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort('blockedbyclient'));page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.locator('#cloudProject').selectOption('codex');await expect(page.locator('#connectState')).toHaveText('로그인 필요');
 const launchReady=deferred();let heldLaunch;await page.route('**/auth/login?provider=codex',route=>{heldLaunch=route;launchReady.resolve()});
 await page.locator('#openSettings').click();await page.locator('#connectGoogle').click();await launchReady.promise;await expect(page.locator('#connectGoogle')).toBeDisabled();
 await page.getByRole('button',{name:'도구와 설정 닫기',exact:true}).click();await page.locator('#cloudProject').selectOption('gemini');await expect(page.locator('#connectState')).toHaveText('로그인됨');
 await heldLaunch.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{message:'QA old launch failed'}})}).catch(()=>{});await page.unroute('**/auth/login?provider=codex');
 await expect(page.locator('#connectState')).toHaveText('로그인됨');await expect(page.locator('#globalError')).toBeEmpty();checks.push('switching provider cancels login launch and ignores its late failure');
 await page.locator('#cloudProject').selectOption('codex');await expect(page.locator('#connectState')).toHaveText('로그인 필요');
 const pollReady=deferred();let heldPoll,polls=0;await page.route('**/auth/session?id=*',route=>{polls++;heldPoll=route;pollReady.resolve()});
 await page.locator('#openSettings').click();await page.locator('#connectGoogle').click();await pollReady.promise;authenticated.codex=true;await page.locator('#refreshCli').click();await expect(page.locator('#connectState')).toHaveText('로그인됨');
 await heldPoll.fulfill({contentType:'application/json',body:JSON.stringify({state:'error',message:'QA stale session failure'})}).catch(()=>{});await page.unroute('**/auth/session?id=*');await expect(page.locator('#connectHelp')).toContainText('로그인이 확인');assert.equal(polls,1);checks.push('manual login status refresh stops an in-flight session poll without stale feedback');
 authenticated.codex=false;await page.locator('#refreshCli').click();await expect(page.locator('#connectState')).toHaveText('로그인 필요');
 await page.route('**/auth/login?provider=codex',route=>route.fulfill({status:502,contentType:'text/html',body:'<h1>QA login proxy failed</h1>'}));await page.locator('#connectGoogle').click();await expect(page.locator('#connectHelp')).toContainText('로그인 페이지를 열지 못했습니다. (HTTP 502)');await expect(page.locator('#connectGoogle')).toBeEnabled();await page.screenshot({path:join(output,'login-error-proof.png')});checks.push('login failure is readable inside the settings dialog and unlocks retry');
 await page.unroute('**/auth/login?provider=codex');await page.route('**/auth/session?id=*',route=>{authenticated.codex=true;return route.fulfill({contentType:'application/json',body:JSON.stringify({state:'complete'})})});await page.locator('#connectGoogle').click();await expect(page.locator('#connectState')).toHaveText('로그인됨');assert.equal(launches,2);await page.unroute('**/auth/session?id=*');await expect(page.locator('#globalError')).toBeEmpty();checks.push('login can retry after a failed launch and complete without duplicate sessions');
 await page.getByRole('button',{name:'도구와 설정 닫기',exact:true}).click();
 await page.locator('.phrase').fill('Start');await page.locator('#imageInput').setInputFiles({name:'batch.png',mimeType:'image/png',buffer:fixture});await page.locator('#run').click();await expect(page.locator('#run')).toBeEnabled();await expect(page.locator('#summary')).toContainText(/자동:\s*1\s*\/\s*1/);
 await page.locator('#reviewNote').fill('batch cancellation memo');await page.locator('#issueReview').click();
 const batchReady=deferred();let heldBatch;await page.route('**/api/v1/jobs',route=>{heldBatch=route;batchReady.resolve()});
 await page.locator('.batch-more > summary').click();await page.locator('#runAll').click();await page.locator('#startReadyBatch').click();await batchReady.promise;await page.locator('#cancelRun').click();
 await expect(page.locator('#run')).toBeEnabled();await expect(page.locator('#humanVerdict')).toContainText('문제 있음');await expect(page.locator('#reviewNote')).toHaveValue('batch cancellation memo');await expect(page.locator('#batchInfo')).toContainText('0/1장 처리');await expect(page.locator('#workspaceStatus')).toContainText('일시정지');
 await heldBatch.abort().catch(()=>{});await page.unroute('**/api/v1/jobs');await page.screenshot({path:join(output,'batch-cancel-proof.png')});checks.push('cancelled batch restores prior OCR and manual review while retaining an unfinished checkpoint');
 await page.locator('#resumeBatch').click();await expect(page.locator('#batchInfo')).toContainText('일괄 검증 완료');await expect(page.locator('#batchInfo')).toContainText('1/1장 처리');await expect(page.locator('#run')).toBeEnabled();await expect(page.locator('#reviewNote')).toHaveValue('batch cancellation memo');checks.push('cancelled batch resumes successfully without losing the saved review memo');
 assert.deepEqual(errors,[]);checks.push('no uncaught browser errors');await writeFile(join(output,'lifecycle-result.json'),JSON.stringify({checks,errors,data},null,2));console.log(JSON.stringify({status:'pass',checks}));
}catch(error){if(page)await page.screenshot({path:join(output,'failure.png'),fullPage:true}).catch(()=>{});throw error}
finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
