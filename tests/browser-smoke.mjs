import assert from 'node:assert/strict';
import {browserRuntime} from './browser-runtime.mjs';
import {tmpdir} from 'node:os';
import {readFile,mkdir,writeFile,mkdtemp} from 'node:fs/promises';
import {join} from 'node:path';
import {makeServer} from '../src/server.js';

const {chromium,expect,launch}=browserRuntime();
const output=process.env.LANGUAGE_TEST_TEST_OUTPUT||await mkdtemp(join(tmpdir(),'language-test-ui-'));await mkdir(output,{recursive:true});
const data=await mkdtemp(join(output,'ui-data-'));
const fixture=await readFile(new URL('./fixtures/local-ocr.png',import.meta.url));
const version=(await readFile(new URL('../version.txt',import.meta.url),'utf8')).trim();
let mockText='Start';
const server=makeServer({projectRoot:join(data,'projects'),cacheRoot:join(data,'cache'),availability:async()=>true,authentication:async()=>true,extractor:async()=>({provider:'mock-codex',extractedText:mockText,lines:[{text:mockText,confidence:.99,boundingBox:{x:.1,y:.1,width:.5,height:.5}}]})});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port,checks=[],errors=[];
let browser,page;
try{
 browser=await chromium.launch(launch);
 page=await browser.newPage({viewport:{width:1280,height:720}});page.setDefaultTimeout(10000);
 await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort('blockedbyclient'));
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(base);await expect(page.locator('#versionCheck')).toContainText(version);
 await page.locator('#cloudProject').selectOption('codex');await expect(page.locator('#connectState')).toContainText('로그인됨');
 await page.locator('.phrase').fill('Start');
 await page.locator('#imageInput').setInputFiles([{name:'first.png',mimeType:'image/png',buffer:fixture},{name:'second.png',mimeType:'image/png',buffer:fixture}]);
 await expect(page.locator('.image-tab')).toHaveCount(2);checks.push('two-image upload');
 await page.locator('#run').click();await expect(page.locator('#summary')).toContainText(/자동:\s*1\s*\/\s*1/);
 await expect(page.locator('#run')).toBeEnabled();await page.locator('.review-advanced > summary').click();await page.locator('#regionProvider').selectOption('codex');
 await page.route('**/auth/status?provider=codex',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{message:'QA region auth unavailable'}})}));
 await page.locator('#verifyRegionAi').click();await expect(page.locator('#globalError')).toContainText('QA region auth unavailable');await expect(page.locator('#verifyRegionAi')).toBeEnabled();await expect(page.locator('#summary')).toContainText(/자동:\s*1\s*\/\s*1/);checks.push('region auth failure preserves OCR and restores review controls');
 await page.unroute('**/auth/status?provider=codex');let heldAuth,authStarted;const authReady=new Promise(r=>authStarted=r);await page.route('**/auth/status?provider=codex',route=>{heldAuth=route;authStarted()});
 await page.locator('#verifyRegionAi').click();await authReady;await expect(page.locator('#imageInput')).toBeDisabled();await expect(page.locator('#regionProvider')).toBeDisabled();await page.locator('#cancelRun').click();await expect(page.locator('#globalError')).toContainText('영역 재확인을 취소했습니다');await expect(page.locator('#verifyRegionAi')).toBeEnabled({timeout:1500});await expect(page.locator('#summary')).toContainText(/자동:\s*1\s*\/\s*1/);await heldAuth.abort().catch(()=>{});await page.unroute('**/auth/status?provider=codex');checks.push('cancel during region auth restores controls and preserves OCR');
 await page.locator('#verifyRegionAi').click();await expect(page.locator('#verifyRegionAi')).toBeEnabled();await expect(page.locator('#summary')).toContainText(/자동:\s*1\s*\/\s*1/);checks.push('region verification can run after auth failure and cancellation');
 mockText='Stop';await page.locator('#verifyRegionAi').click();await expect(page.locator('#verifyRegionAi')).toBeEnabled();await expect(page.locator('#summary')).toContainText(/자동:\s*0\s*\/\s*1/);mockText='Start';
 let heldRegion,regionStarted;const regionReady=new Promise(r=>regionStarted=r);await page.route('**/api/v1/jobs',route=>{heldRegion=route;regionStarted()});await page.locator('#retryRegion').click();await regionReady;await page.locator('#cancelRun').click();await expect(page.locator('#globalError')).toContainText('영역 재인식을 취소했습니다');await expect(page.locator('#retryRegion')).toBeEnabled({timeout:1500});await expect(page.locator('#summary')).toContainText(/자동:\s*0\s*\/\s*1/);await heldRegion.abort().catch(()=>{});await page.unroute('**/api/v1/jobs');await page.locator('#retryRegion').click();await expect(page.locator('#retryRegion')).toBeEnabled();await expect(page.locator('#summary')).toContainText(/자동:\s*1\s*\/\s*1/);checks.push('ordinary region OCR cancellation preserves results and permits retry');
 await page.locator('#openSettings').click();await page.locator('#openHistory').click();const historyCount=await page.locator('.history-item').count();assert.ok(historyCount>0);await page.evaluate(()=>{window.__qaHistoryClear=IDBObjectStore.prototype.clear;IDBObjectStore.prototype.clear=function(){throw Error('QA browser storage blocked')}});await page.locator('#clearHistory').click();await expect(page.locator('#workbenchHistory .dialog-error')).toContainText('최근 기록을 정리하지 못했습니다');await expect(page.locator('.history-item')).toHaveCount(historyCount);await expect(page.locator('#clearHistory')).toBeEnabled();await page.evaluate(()=>{IDBObjectStore.prototype.clear=window.__qaHistoryClear;delete window.__qaHistoryClear});checks.push('history deletion failure keeps visible records and restores its button');
 await page.locator('#clearHistory').click();await expect(page.locator('.history-item')).toHaveCount(0);await expect(page.locator('#historyStatus')).toContainText('지웠습니다');await expect(page.locator('#workbenchHistory .dialog-error')).toHaveCount(0);await page.getByRole('button',{name:'최근 검증 기록 닫기',exact:true}).click();await page.getByRole('button',{name:'도구와 설정 닫기',exact:true}).click();await expect(page.locator('#summary')).toContainText(/자동:\s*1\s*\/\s*1/);checks.push('history cleanup retry succeeds while current OCR remains available');
 await page.locator('#reviewNote').fill('오류 테스트 메모');await page.locator('#issueReview').click();
 await expect(page.locator('#summary')).toContainText('수동 검수에서 문제가');checks.push('automatic pass and manual issue remain distinct');
 await page.locator('#saveLocal').click();await expect(page.locator('#saveIndicator')).toContainText('저장됨');
 await page.reload();await page.locator('#openLibrary').click();await page.locator('[data-open]').click();
 await expect(page.locator('.image-tab')).toHaveCount(2);await page.locator('#resultsTab').click();
 await expect(page.locator('#reviewNote')).toHaveValue('오류 테스트 메모');await expect(page.locator('#humanVerdict')).toContainText('문제 있음');checks.push('save and reopen with memo and manual issue');
 await page.locator('#cloudProject').selectOption('codex');await expect(page.locator('#connectState')).toContainText('로그인됨');
 await page.route('**/api/v1/jobs',route=>route.abort('failed'));
 await page.locator('#run').click();await expect(page.locator('#globalError')).not.toBeEmpty();await expect(page.locator('#run')).toBeEnabled();
 await expect(page.locator('#resultCard')).toBeHidden();await expect(page.locator('#globalError')).toContainText('앱 서버에 연결하지 못했습니다');checks.push('failed analysis clears old success and restores controls');
 await page.unroute('**/api/v1/jobs');await page.route('**/api/v1/jobs',route=>route.fulfill({status:502,contentType:'text/html',body:'<h1>QA proxy failed</h1>'}));await page.locator('#run').click();await expect(page.locator('#globalError')).toContainText('검증 요청을 완료하지 못했습니다. (HTTP 502)');await expect(page.locator('#run')).toBeEnabled();checks.push('HTML OCR failure has readable HTTP feedback and permits retry');
 await page.unroute('**/api/v1/jobs');await page.locator('#run').click();await expect(page.locator('#summary')).toContainText(/자동:\s*1\s*\/\s*1/);await expect(page.locator('#run')).toBeEnabled();checks.push('retry after failed analysis');
 await page.locator('#workspaceFile').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{}')});
 await expect(page.locator('#globalError')).toContainText('작업을 불러오지 못했습니다');await expect(page.locator('.image-tab')).toHaveCount(2);checks.push('invalid backup preserves current images');
 const storedProjects=await(await fetch(base+'/api/projects')).json(),validBackup=await(await fetch(base+'/api/projects?id='+storedProjects[0].id+'&references=1')).json();
 const duplicateImages=structuredClone(validBackup);duplicateImages.items[1].id=duplicateImages.items[0].id;await page.locator('#workspaceFile').setInputFiles({name:'duplicate-images.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(duplicateImages))});await expect(page.locator('#globalError')).toContainText('이미지 ID가 중복');await expect(page.locator('.image-tab')).toHaveCount(2);await expect(page.locator('#run')).toBeEnabled();checks.push('duplicate image IDs in backup are rejected before replacing current images');
 const duplicateTargets=structuredClone(validBackup);duplicateTargets.items[0].targets.push(structuredClone(duplicateTargets.items[0].targets[0]));await page.locator('#workspaceFile').setInputFiles({name:'duplicate-targets.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(duplicateTargets))});await expect(page.locator('#globalError')).toContainText('문구·영역 형식');await expect(page.locator('.image-tab')).toHaveCount(2);checks.push('duplicate target IDs in backup are rejected without replacing current work');
 await page.locator('#imageInput').setInputFiles([{name:'valid-third.png',mimeType:'image/png',buffer:fixture},{name:'invalid.png',mimeType:'image/png',buffer:Buffer.from('not a real PNG')}]);
 await expect(page.locator('#globalError')).toContainText('이미지를 읽지 못했습니다. 파일이 손상되었거나 지원하지 않는 형식입니다.');await expect(page.locator('.image-tab')).toHaveCount(2);await expect(page.locator('#run')).toBeEnabled();checks.push('mixed upload with corrupt image preserves workspace and releases controls');
 for(const [width,height] of [[1024,700],[390,844]]){
  await page.setViewportSize({width,height});
  const sizes=await page.evaluate(()=>({width:innerWidth,document:document.documentElement.scrollWidth}));
  assert.ok(sizes.document<=sizes.width+1,JSON.stringify(sizes));checks.push('no horizontal overflow at '+width+'px');
 }
 await page.setViewportSize({width:1280,height:720});await page.screenshot({path:join(output,'ui-proof.png')});
 await page.locator('#reviewNote').fill('저장 실패 시 보존할 메모');
 await page.route('**/api/workspace/drafts',route=>route.request().method()==='POST'?route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:{message:'QA disk full'}})}):route.continue());
 await page.locator('#newWorkspace').click();await expect(page.locator('#globalError')).toContainText('작업 전환을 중단했습니다');await expect(page.locator('#newWorkspace')).toBeEnabled();await expect(page.locator('.image-tab')).toHaveCount(2);await expect(page.locator('#reviewNote')).toHaveValue('저장 실패 시 보존할 메모');checks.push('draft save failure blocks new workspace and preserves edited memo');
 await page.unroute('**/api/workspace/drafts');
 await expect(page.locator('#retryDraft')).toBeVisible();await expect(page.locator('#saveIndicator')).toHaveAttribute('data-state','error');
 await page.screenshot({path:join(output,'draft-retry-proof.png')});
 for(const [width,height] of [[1024,700],[390,844]]){await page.setViewportSize({width,height});const sizes=await page.evaluate(()=>({width:innerWidth,document:document.documentElement.scrollWidth}));assert.ok(sizes.document<=sizes.width+1,JSON.stringify(sizes))}
 await page.setViewportSize({width:1280,height:720});checks.push('draft failure and retry controls fit narrow screens');
 await page.locator('#retryDraft').click();await expect(page.locator('#saveIndicator')).toContainText('임시 저장됨');await expect(page.locator('#retryDraft')).toBeHidden();await expect(page.locator('#reviewNote')).toHaveValue('저장 실패 시 보존할 메모');checks.push('draft retry restores saving without losing memo or images');
 await page.locator('#resultSearch').fill('no-matching-text-qa');await expect(page.locator('.result-item')).toHaveCount(0);await expect(page.locator('#manualReviewPanel')).toBeHidden();await page.locator('#resultsTab').click();await page.keyboard.press('a');await page.keyboard.press('i');await page.locator('#resultSearch').fill('');await expect(page.locator('.result-item')).toHaveCount(1);checks.push('review hotkeys ignore an empty result selection');
 await page.locator('#reviewFilter').selectOption('stale');await expect(page.locator('.result-item')).toHaveCount(1);await page.locator('#reviewFilter').selectOption('all');await page.locator('#issueReview').click();checks.push('a changed OCR result marks the old human review as requiring review again');
 await page.locator('#reviewFilter').selectOption('issue');await expect(page.locator('.result-item')).toHaveCount(1);
 await page.locator('#acceptReview').click();await expect(page.locator('.result-item')).toHaveCount(0);await expect(page.locator('#manualReviewPanel')).toBeHidden();
 await page.locator('#reviewFilter').selectOption('accepted');await expect(page.locator('.result-item')).toHaveCount(1);await expect(page.locator('.result-verdicts')).toContainText('확인 완료');
 await page.locator('#clearReview').click();await expect(page.locator('.result-item')).toHaveCount(0);await page.locator('#reviewFilter').selectOption('all');await expect(page.locator('.result-verdicts')).toContainText('미검수');checks.push('manual review and clearing refresh filters, counts and badges');
 await page.locator('#settingsTab').click();for(let n=0;n<2;n++){await page.locator('#addEntry').click();await page.locator('.phrase').last().fill('Start')}
 await page.locator('#run').click();await expect(page.locator('#summary')).toContainText(/자동:\s*3\s*\/\s*3/);await expect(page.locator('#run')).toBeEnabled();
 const ids=await page.locator('.result-item').evaluateAll(rows=>rows.map(r=>r.dataset.id));await page.locator('#reviewFilter').selectOption('unreviewed');
 await page.locator('#acceptNext').click();await expect(page.locator('.result-item')).toHaveCount(2);await expect(page.locator('.result-item.selected')).toHaveAttribute('data-id',ids[1]);
 await page.locator('#reviewNote').fill('a');await page.keyboard.press('a');await expect(page.locator('.result-item')).toHaveCount(2);checks.push('typing in a memo cannot trigger review shortcuts');
 await page.locator('#acceptNext').click();await expect(page.locator('.result-item')).toHaveCount(1);await expect(page.locator('.result-item.selected')).toHaveAttribute('data-id',ids[2]);
 await page.locator('#acceptNext').click();await expect(page.locator('.image-tab').nth(1)).toHaveAttribute('aria-current','true');await expect(page.locator('#settingsTab')).toHaveAttribute('aria-selected','true');checks.push('accept and next follows filtered rows without skipping then moves to the next image');
 await page.locator('#saveLocal').click();await expect(page.locator('#saveIndicator')).toContainText('저장됨');
 const draftId='11111111-1111-4111-8111-111111111111',presetId='22222222-2222-4222-8222-222222222222';
 await page.route('**/api/workspace/drafts*',route=>route.request().method()==='GET'?route.fulfill({status:route.request().url().includes('?')?500:200,contentType:'application/json',body:JSON.stringify(route.request().url().includes('?')?{error:{message:'QA recovery unavailable'}}:[{id:draftId,name:'QA recovery',folder:'QA',count:1,updated:new Date().toISOString()}])}):route.continue());
 await page.route('**/api/workspace/presets',route=>route.request().method()==='GET'?route.fulfill({contentType:'application/json',body:JSON.stringify([{id:presetId,name:'QA preset',targets:[{text:'Start'}]}])}):route.continue());
 await page.reload();await page.locator('#openLibrary').click();await page.locator('[data-open]').click();await expect(page.locator('.image-tab')).toHaveCount(2);
 await page.locator('[data-recover]').click();await expect(page.locator('#globalError')).toContainText('임시 작업을 복구하지 못했습니다');await expect(page.locator('#newWorkspace')).toBeEnabled();await expect(page.locator('.image-tab')).toHaveCount(2);checks.push('failed recovery reports an error and preserves the current workspace');
 await page.route('**/api/workspace/drafts/delete',route=>route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:{message:'QA delete unavailable'}})}));
 await page.locator('[data-discard-draft]').click();await expect(page.locator('#globalError')).toContainText('임시 작업을 지우지 못했습니다');await expect(page.locator('[data-discard-draft]')).toBeEnabled();checks.push('failed draft deletion keeps the recovery entry available');
 await page.route('**/api/workspace/presets/delete',route=>route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:{message:'QA preset unavailable'}})}));
 await page.locator('#openSettings').click();await page.locator('#presetSelect').selectOption(presetId);await page.locator('#deletePreset').click();await expect(page.locator('#workbenchSettings .dialog-error')).toBeVisible();await expect(page.locator('#workbenchSettings .dialog-error')).toContainText('저장한 설정을 삭제하지 못했습니다');await expect(page.locator('#deletePreset')).toBeEnabled();await expect(page.locator('#presetSelect')).toHaveValue(presetId);await page.screenshot({path:join(output,'settings-error-proof.png')});checks.push('preset deletion errors appear inside the open dialog and preserve selection');
 await page.locator('#workbenchSettings button[aria-label="도구와 설정 닫기"]').click();await page.locator('#openSettings').click();await expect(page.locator('#workbenchSettings .dialog-error')).toHaveCount(0);await page.locator('#workbenchSettings button[aria-label="도구와 설정 닫기"]').click();checks.push('closing a dialog clears its old error notice');
 await page.locator('.workspace-more > summary').click();await page.locator('#openWatcher').click();await page.locator('#watchPath').fill('QA fixture path');
 await page.route('**/api/watch/start',route=>route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:{message:'QA watch missing folder'}})}));
 await page.locator('#startWatch').click();await expect(page.locator('#watchInfo')).toContainText('시작 실패');await expect(page.locator('#startWatch')).toBeEnabled();await expect(page.locator('#watchPath')).toBeEnabled();checks.push('watch start failure restores controls');
 await page.unroute('**/api/watch/start');await page.route('**/api/watch/start',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({id:'qa-watch',path:'QA fixture path'})}));await page.route('**/api/watch/poll',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({files:[],pending:0})}));await page.route('**/api/watch/stop',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true})}));
 await page.locator('#startWatch').click();await expect(page.locator('#watchInfo')).toContainText('켜짐');await expect(page.locator('#stopWatch')).toBeEnabled();await expect(page.locator('#watchPath')).toBeDisabled();await page.locator('#stopWatch').click();await expect(page.locator('#watchInfo')).toContainText('꺼짐');await expect(page.locator('#startWatch')).toBeEnabled();await expect(page.locator('#watchPath')).toBeEnabled();checks.push('watch retry starts one session and stop restores editable settings');
 await page.getByRole('button',{name:'폴더 자동 가져오기 닫기',exact:true}).click();await page.locator('#settingsTab').click();await page.locator('#openOcrDraft').click();
 let heldOcr,ocrStarted;const holdOcr=route=>{heldOcr=route;ocrStarted()};await page.route('**/api/v1/jobs',holdOcr);
 for(const action of ['cancel','close']){const ready=new Promise(r=>ocrStarted=r);await page.locator('#readDraftOcr').click();await ready;await expect(page.locator('#ocrDraftLanguage')).toBeDisabled();await expect(page.locator('#cancelDraftOcr')).toBeEnabled();
  if(action==='cancel'){await expect(page.locator('#ocrDraftInfo')).toContainText('초 경과');await page.locator('#cancelDraftOcr').click();await expect(page.locator('#ocrDraftInfo')).toContainText('취소했습니다');await expect(page.locator('#readDraftOcr')).toBeEnabled({timeout:1500})}
  else{await page.getByRole('button',{name:'OCR에서 검증 항목 만들기 닫기',exact:true}).click();await expect(page.locator('#saveLocal')).toBeEnabled({timeout:1500})}
  await heldOcr.abort().catch(()=>{});checks.push(action+' while reading OCR drafts restores controls promptly');
 }
 await page.unroute('**/api/v1/jobs',holdOcr);await page.route('**/api/v1/jobs',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({result:{lines:[{text:'QA fresh',confidence:.99,boundingBox:{x:.1,y:.2,width:.3,height:.1}}]}})}));
 await page.locator('#openOcrDraft').click();await page.locator('#readDraftOcr').click();await expect(page.locator('#ocrDraftLines')).toContainText('QA fresh');await expect(page.locator('#readDraftOcr')).toBeEnabled();await expect(page.locator('#ocrDraftLanguage')).toBeEnabled();await expect(page.locator('#cancelDraftOcr')).toBeDisabled();await page.screenshot({path:join(output,'ocr-draft-proof.png')});await page.locator('#ocrDraftLines input').check();await page.locator('#addDraftTargets').click();await expect(page.locator('.phrase').last()).toHaveValue('QA fresh');await expect(page.locator('#ocrDraftDialog')).not.toBeVisible();checks.push('OCR draft retry creates an editable target after cancel and close');
 assert.deepEqual(errors,[]);checks.push('no uncaught browser errors');
 await writeFile(join(output,'ui-result.json'),JSON.stringify({status:'pass',version,checks,errors,data},null,2));console.log(JSON.stringify({status:'pass',checks,report:join(output,'ui-result.json')}));
}catch(error){
 await page?.screenshot({path:join(output,'ui-failure.png')}).catch(()=>{});
 await writeFile(join(output,'ui-result.json'),JSON.stringify({status:'fail',checks,errors,error:error.stack,data},null,2));throw error;
}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r))}


