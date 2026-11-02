import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {browserRuntime} from './browser-runtime.mjs';
import {makeServer} from '../src/server.js';
import {styles} from '../src/styles.js';

// A real, isolated workbench with synthetic image/OCR. No user store or AI account.
const {chromium,expect,launch}=browserRuntime();
const output=process.env.LANGUAGE_TEST_TEST_OUTPUT||await mkdtemp(join(tmpdir(),'language-test-design-'));
await mkdir(output,{recursive:true});
const data=await mkdtemp(join(output,'design-data-'));
const fixture=await readFile(new URL('./fixtures/local-ocr.png',import.meta.url));
let mockText='Start 42%',mockLines=[{text:'Start 42%',confidence:.99,boundingBox:{x:.025,y:.32,width:.29,height:.36}}];
const server=makeServer({projectRoot:join(data,'projects'),cacheRoot:join(data,'cache'),availability:async()=>true,authentication:async()=>true,extractor:async()=>({provider:'mock-codex',extractedText:mockText,lines:mockLines})});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port,checks=[],errors=[],unexpectedLocalOcr=[];
let browser;
try{
 browser=await chromium.launch(launch);
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
 await page.route('**/*',route=>{const request=route.request(),url=new URL(request.url());if(url.origin!==base)return route.abort('blockedbyclient');if(url.pathname==='/api/v1/jobs'&&request.headers()['x-lingualens-provider']==='local'){unexpectedLocalOcr.push(request.url());return route.abort('blockedbyclient')}return route.continue()});
 await page.goto(base);await page.locator('#cloudProject').selectOption('codex');await expect(page.locator('#connectState')).toContainText('로그인됨');
 await page.locator('#openSettings').click();await page.locator('#autoReviewProvider').selectOption('off');await page.getByRole('button',{name:'도구와 설정 닫기',exact:true}).click();
 if(process.env.LANGUAGE_TEST_DESIGN_BEFORE!=='1'){
  await page.setViewportSize({width:390,height:844});await page.locator('button[data-mobile-view="review"]').click();await expect(page.locator('.phrase')).toBeVisible();checks.push('empty compact workbench exposes phrase setup');await page.setViewportSize({width:1440,height:900});
 }
 await page.locator('.phrase').fill('Start');
 for(const text of ['42%','Continue']){await page.locator('#addEntry').click();await page.locator('.phrase').last().fill(text)}
 await page.locator('#imageInput').setInputFiles([{name:'튜토리얼-시작.png',mimeType:'image/png',buffer:fixture},{name:'튜토리얼-다음.png',mimeType:'image/png',buffer:fixture}]);
 await expect(page.locator('.image-tab')).toHaveCount(2);await page.locator('#run').click();await expect(page.locator('#summary')).toContainText(/자동:\s*2\s*\/\s*3/);
 await page.locator('.result-item').last().click();await page.locator('#reviewNote').fill('다음 화면으로 진행하는 문구 확인 필요. 원문과 게임 빌드를 다시 확인하세요.');await page.locator('#issueReview').click();
 await expect(page.locator('#humanVerdict')).toContainText('문제 있음');
 const before=process.env.LANGUAGE_TEST_DESIGN_BEFORE==='1';
 await page.screenshot({path:join(output,before?'before-desktop.png':'desktop-review.png')});
 if(!before){
  for(const size of [{width:1440,height:900},{width:1280,height:720},{width:1024,height:700}]){
   await page.setViewportSize(size);
   const geometry=await page.evaluate(()=>{const box=id=>{const r=document.getElementById(id).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,height:r.height}};return {note:box('reviewNote'),accept:box('acceptNext'),panel:box('manualReviewPanel'),canvas:box('canvasViewport'),results:box('resultsPane'),run:box('run'),width:innerWidth,scrollWidth:document.documentElement.scrollWidth}});
   assert.ok(geometry.note.top>=geometry.panel.top&&geometry.note.bottom<=geometry.panel.bottom,JSON.stringify(geometry));
   assert.ok(geometry.accept.bottom<=geometry.panel.bottom&&geometry.run.bottom<=geometry.panel.top&&geometry.canvas.bottom<=geometry.panel.top+1,JSON.stringify(geometry));
   assert.ok(geometry.canvas.height>=160&&geometry.results.height>=120,JSON.stringify(geometry));
   assert.ok(geometry.panel.left<=geometry.canvas.left+1&&geometry.panel.right>=geometry.run.right,JSON.stringify(geometry));
   assert.ok(geometry.scrollWidth<=size.width+1,JSON.stringify(geometry));checks.push('spanning review dock preserves memo, decisions and image space at '+size.width+'×'+size.height);
   assert.ok(await page.locator('.result-item').evaluateAll(rows=>rows.some(row=>{const r=row.getBoundingClientRect(),p=document.getElementById('resultsPane').getBoundingClientRect();return Math.min(r.bottom,p.bottom,innerHeight)-Math.max(r.top,p.top,0)>=30})));checks.push('result row has readable viewport intersection at '+size.width+'px');
  }
  await page.setViewportSize({width:1440,height:900});
  const look=await page.evaluate(()=>({header:getComputedStyle(document.querySelector('.topbar')).backgroundColor,side:getComputedStyle(document.querySelector('.workspace-card')).backgroundColor,canvas:getComputedStyle(document.getElementById('canvasViewport')).backgroundImage,h1:[...document.querySelectorAll('h1')].filter(n=>n.getBoundingClientRect().width).length}));
  assert.equal(look.header,look.side);assert.equal(look.canvas,'none');assert.equal(look.h1,1);checks.push('stone L-frame, flat canvas and one visible page title');
  const old=await page.locator('.workbench-right').evaluate(n=>n.getBoundingClientRect().width);
  const grip=page.locator('.panel-grip.right'),gripBox=await grip.boundingBox();await page.mouse.move(gripBox.x+4,gripBox.y+100);await page.mouse.down();await page.mouse.move(gripBox.x-35,gripBox.y+100,{steps:4});await page.mouse.up();
  assert.ok(await page.locator('.workbench-right').evaluate(n=>n.getBoundingClientRect().width)>old);checks.push('panel resizing survives restyle');
  await page.locator('#focusCanvas').click();await expect(page.locator('.workbench-right')).toBeHidden();await page.locator('#focusCanvas').click();await expect(page.locator('#reviewNote')).toHaveValue(/다음 화면/);checks.push('canvas focus returns to intact review');
  await page.locator('#settingsTab').click();await expect(page.locator('#manualReviewPanel')).toBeHidden();await page.locator('#resultsTab').click();await expect(page.locator('#reviewNote')).toHaveValue(/다음 화면/);checks.push('settings tab hides dock and results restore the memo');
  await page.locator('#reviewNote').fill('키보드 검수 메모');await page.keyboard.press('a');await expect(page.locator('#humanVerdict')).toContainText('문제 있음');checks.push('memo typing preserves manual verdict');
 }
 await page.setViewportSize({width:1440,height:900});await page.locator('#saveLocal').click();await expect(page.locator('#saveIndicator')).toContainText('저장됨');
 await page.locator('#openSettings').click();await page.screenshot({path:join(output,before?'before-settings.png':'settings.png')});await page.getByRole('button',{name:'도구와 설정 닫기',exact:true}).click();
 await page.locator('#openLibrary').click();await expect(page.locator('[data-open]')).toHaveCount(1);await page.screenshot({path:join(output,before?'before-library.png':'library.png')});await page.getByRole('button',{name:'저장 작업 닫기',exact:true}).click();
 await page.getByText('작업 도구 더보기',{exact:true}).click();await page.locator('#openCompare').click();await page.locator('#baselineCurrent').click();await page.locator('#runCompare').click();await expect(page.locator('#diffInfo')).toContainText('0픽셀');
 if(!before){const heading=await page.locator('#compareDialog .dialog-heading').boundingBox();assert.ok(heading.y>=0&&heading.y+heading.height<=900);checks.push('comparison heading and close remain visible while scrolling')}
 await page.screenshot({path:join(output,before?'before-comparison.png':'comparison.png')});await page.getByRole('button',{name:'이전 화면과 비교 닫기',exact:true}).click();
 for(const width of [768,390]){
  await page.setViewportSize({width,height:844});
  if(!before)await page.locator('button[data-mobile-view="review"]').click();
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:join(output,(before?'before-':'')+(width===390?'mobile-review.png':'tablet-review.png')),fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));checks.push('no horizontal overflow at '+width+'px');
  if(!before){
   assert.ok(await page.locator('.result-item').evaluateAll(rows=>rows.some(row=>{const r=row.getBoundingClientRect(),p=document.getElementById('resultsPane').getBoundingClientRect();return Math.min(r.bottom,p.bottom,innerHeight)-Math.max(r.top,p.top,0)>=30})));assert.ok(await page.locator('.review-scroll').evaluate(node=>node.clientHeight)>=140);checks.push('compact results and OCR evidence have readable space at '+width+'px');
   await page.locator('#reviewNote').fill('다음 화면으로 진행하는 문구 확인 필요. 원문과 게임 빌드를 다시 확인하세요.');
   await page.locator('button[data-mobile-view="images"]').click();await expect(page.locator('.workspace-card')).toBeVisible();await page.locator('button[data-mobile-view="canvas"]').click();await expect(page.locator('#canvasViewport')).toBeVisible();
   await page.locator('#zoomIn').click();const zoom=await page.locator('#zoomLabel').textContent();await page.locator('button[data-mobile-view="review"]').click();await page.locator('button[data-mobile-view="canvas"]').click();assert.equal(await page.locator('#zoomLabel').textContent(),zoom);checks.push('compact navigation preserves manual zoom at '+width+'px');
   checks.push('compact navigation shows one work region at '+width+'px');
  }
 }
 if(!before){
  await page.setViewportSize({width:1440,height:900});await page.locator('#resultsTab').click();await page.locator('#reviewNote').fill('다음 화면으로 진행하는 문구 확인 필요. 원문과 게임 빌드를 다시 확인하세요.');
  await page.locator('#fitImage').click();await page.locator('.desk-title').click();await page.screenshot({path:join(output,'desktop-review.png')});
  const html=await page.evaluate(image=>{const clone=document.documentElement.cloneNode(true);clone.querySelectorAll('script,link').forEach(node=>node.remove());clone.querySelectorAll('img').forEach(node=>node.src=image);clone.querySelectorAll('textarea').forEach(node=>node.textContent=document.getElementById(node.id)?.value||'');return '<!doctype html>'+clone.outerHTML},'data:image/png;base64,'+fixture.toString('base64'));
  await writeFile(join(output,'review-snapshot.html'),html.replace('</head>','<style>'+styles+'</style></head>'));
  await page.locator('#resultSearch').fill('일치하는 문구가 없는 검색');await expect(page.locator('#manualReviewPanel')).toBeHidden();await expect(page.locator('#results')).toContainText('해당 결과가 없습니다.');await page.locator('#resultSearch').fill('');await expect(page.locator('#manualReviewPanel')).toBeVisible();checks.push('empty filtered results release the dock and restore selection');
  // Draw test data, not a product illustration. Its actual 16:9 geometry catches
  // viewport starvation that the original 800×150 OCR fixture cannot reveal.
  const gameData=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1280;c.height=720;const x=c.getContext('2d');x.fillStyle='#213a3b';x.fillRect(0,0,1280,720);x.fillStyle='#3b5951';x.fillRect(0,380,1280,340);x.fillStyle='#49675b';x.beginPath();x.moveTo(0,400);x.lineTo(270,200);x.lineTo(500,400);x.lineTo(820,160);x.lineTo(1280,400);x.fill();x.fillStyle='#a0b29b';x.fillRect(490,250,180,270);x.fillStyle='#294541';x.fillRect(550,370,60,150);x.fillStyle='#142e30';x.fillRect(24,24,1232,68);x.font='22px sans-serif';x.fillStyle='#e0e8dc';x.fillText('SYNTHETIC QA · TRAINING GROUNDS',48,67);x.font='18px sans-serif';x.fillText('Tutorial / en-US',1020,65);x.fillStyle='#142e30';x.fillRect(48,548,1184,128);x.strokeStyle='#839b89';x.strokeRect(48,548,1184,128);x.font='18px sans-serif';x.fillStyle='#c5d2c1';x.fillText('Objective: reach the training gate',80,582);x.fillStyle='#e3e9da';x.fillRect(80,602,230,46);x.fillStyle='#203c3d';x.font='24px sans-serif';x.fillText('Start',100,634);x.fillStyle='#e3e9da';x.fillText('42%',1090,634);return c.toDataURL('image/png')});
  const gameFixture=Buffer.from(gameData.split(',')[1],'base64');await writeFile(join(output,'synthetic-game-frame.png'),gameFixture);
  mockLines=[{text:mockText,confidence:.99,boundingBox:{x:.0625,y:.83,width:.19,height:.075}}];
  await page.locator('#imageInput').setInputFiles({name:'합성-게임-튜토리얼-16대9.png',mimeType:'image/png',buffer:gameFixture});await expect(page.locator('.image-tab')).toHaveCount(3);await page.locator('.image-tab').last().click();await page.locator('#settingsTab').click();await page.locator('.phrase').fill('Start');for(const text of ['42%','Continue']){await page.locator('#addEntry').click();await page.locator('.phrase').last().fill(text)}await page.locator('#run').click();await expect(page.locator('.result-item')).toHaveCount(3);await page.locator('.result-item').last().click();await page.locator('#reviewNote').fill('합성 게임 화면의 다음 진행 문구 확인');await page.locator('#issueReview').click();await page.locator('#fitImage').click();
  for(const size of [{width:1440,height:900},{width:1280,height:720},{width:1024,height:700}]){
   await page.setViewportSize(size);await page.locator('#fitImage').click();
   const space=await page.evaluate(()=>{const v=document.getElementById('canvasViewport').getBoundingClientRect(),p=document.getElementById('resultsPane').getBoundingClientRect(),rows=[...document.querySelectorAll('.result-item')].map(n=>n.getBoundingClientRect());return {image:v.height,readable:rows.filter(r=>Math.min(r.bottom,p.bottom,innerHeight)-Math.max(r.top,p.top,0)>=30).length,width:document.documentElement.scrollWidth}});
   await page.screenshot({path:join(output,'game-review-'+size.width+'.png'),fullPage:true});assert.ok(space.image>=160&&space.readable>=2&&space.width<=size.width+1,JSON.stringify({size,space}));checks.push('16:9 image and two readable result rows at '+size.width+'×'+size.height);
  }
  await page.setViewportSize({width:1440,height:900});await page.locator('#originalImage').click();await page.locator('#canvasViewport').evaluate(n=>{n.scrollLeft=50;n.scrollTop=25});const manual=await page.evaluate(()=>({zoom:document.getElementById('zoomLabel').textContent,left:document.getElementById('canvasViewport').scrollLeft,top:document.getElementById('canvasViewport').scrollTop}));await page.locator('#settingsTab').click();await page.locator('#resultsTab').click();assert.equal(await page.locator('#zoomLabel').textContent(),'100%');assert.equal(await page.locator('#zoomLabel').textContent(),manual.zoom);assert.deepEqual(await page.evaluate(()=>({left:document.getElementById('canvasViewport').scrollLeft,top:document.getElementById('canvasViewport').scrollTop})),{left:manual.left,top:manual.top});checks.push('dock appearance preserves manual zoom and pan');
  for(const mode of ['image','text','standard']){await page.locator('[data-layout-mode="'+mode+'"]').click();await expect(page.locator('#reviewNote')).toHaveValue('합성 게임 화면의 다음 진행 문구 확인');assert.ok(await page.locator('#manualReviewPanel').evaluate(n=>n.getBoundingClientRect().width)>600);assert.equal(await page.locator('#zoomLabel').textContent(),manual.zoom)}checks.push('image and text layouts span the dock without changing manual zoom');
  await page.locator('#focusCanvas').click();await expect(page.locator('#manualReviewPanel')).toBeHidden();await page.locator('#focusCanvas').click();await expect(page.locator('#manualReviewPanel')).toBeVisible();checks.push('canvas focus hides and restores the spanning dock');
  await page.locator('#fitImage').click();await page.screenshot({path:join(output,'desktop-game-review.png'),fullPage:true});
  // Stress long CJK strings and enough results to exercise list scrolling.
  await page.locator('#settingsTab').click();const longKorean='기지를 떠나기 전에 장비와 임무 목표를 다시 확인하세요. '.repeat(6),longJapanese='次のエリアへ進む前に装備と目的をもう一度確認してください。'.repeat(5);await page.locator('.phrase').first().fill(longKorean);await page.locator('.phrase').nth(1).fill(longJapanese);
  for(let i=0;i<7;i++){await page.locator('#addEntry').click();await page.locator('.phrase').last().fill('훈련 임무 '+(i+1)+' · 표시 문구 확인')}
  mockText='기지를 떠나기 전에 장비와 임무 목표를 확인하세요.\n次のエリアへ進む前に装備を確認してください。';mockLines=mockText.split('\n').map((text,i)=>({text,confidence:.8,boundingBox:{x:.08,y:.7+i*.1,width:.7,height:.06}}));assert.ok((await page.request.post(base+'/api/ocr-cache/clear',{headers:{origin:base}})).ok());await page.locator('#run').click();await expect(page.locator('.result-item')).toHaveCount(10);await expect(page.locator('#ocrText')).toContainText('次のエリア');await page.locator('.result-item').first().click();await page.locator('#reviewNote').fill('긴 한국어와 일본어 OCR 근거를 끝까지 읽고 기록합니다. '.repeat(10));
  await writeFile(join(output,'long-geometry.json'),JSON.stringify(await page.evaluate(()=>Object.fromEntries(['manualReviewPanel','reviewDetailBody','canvasViewport'].map(id=>{const n=document.getElementById(id),r=n.getBoundingClientRect(),s=getComputedStyle(n);return[id,{top:r.top,bottom:r.bottom,height:r.height,cssHeight:s.height,min:s.minHeight,max:s.maxHeight,display:s.display,rows:s.gridTemplateRows,overflow:s.overflow}]}))),null,2));await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:join(output,'long-evidence-desktop.png'),fullPage:true});assert.equal(await page.locator('.review-scroll').evaluate(n=>getComputedStyle(n).overflowY),'visible');assert.ok(await page.locator('.text-comparison pre').first().evaluate(n=>n.clientHeight>=n.scrollHeight-1));assert.ok(await page.locator('.review-scroll').evaluate(n=>n.getBoundingClientRect().bottom<=document.getElementById('manualReviewPanel').getBoundingClientRect().bottom));assert.ok(await page.locator('#canvasViewport').evaluate(n=>n.clientHeight)>=160);await page.locator('#acceptNext').scrollIntoViewIfNeeded();await expect(page.locator('#acceptNext')).toBeInViewport();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));checks.push('long CJK evidence grows the dock with reachable decisions and protected image space');await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:join(output,'long-evidence-desktop.png'),fullPage:true});
  // CDP page-scale only magnifies pixels. Keyboard zoom exercises actual browser
  // reflow; verify the viewport halves before claiming a 200% browser check.
  await page.keyboard.press('Control+0');for(let i=0;i<4;i++)await page.keyboard.press('Control++');
  const zoomWidth=await page.evaluate(()=>innerWidth);await writeFile(join(output,'browser-zoom.json'),JSON.stringify({requested:'200%',innerWidth:zoomWidth,outerWidth:await page.evaluate(()=>outerWidth)},null,2));
  if(zoomWidth<=780){await page.locator('button[data-mobile-view="review"]').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('#reviewNote').scrollIntoViewIfNeeded();await expect(page.locator('#reviewNote')).toBeInViewport();checks.push('actual 200% browser zoom reflows to compact review');await page.screenshot({path:join(output,'browser-zoom-200.png'),fullPage:true})}
  else{await page.setViewportSize({width:720,height:450});await page.locator('button[data-mobile-view="review"]').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('#reviewNote').scrollIntoViewIfNeeded();await expect(page.locator('#reviewNote')).toBeInViewport();checks.push('200% equivalent CSS viewport retains long evidence and memo (headless browser zoom unavailable)');await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:join(output,'zoom-equivalent-review.png'),fullPage:true})}
  await page.keyboard.press('Control+0');await page.setViewportSize({width:390,height:844});await page.locator('button[data-mobile-view="review"]').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(await page.locator('.review-scroll').evaluate(n=>getComputedStyle(n).overflowY),'visible');await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:join(output,'long-evidence-mobile.png'),fullPage:true});checks.push('long mobile evidence uses document flow without nested scrolling');
 }
 assert.deepEqual(unexpectedLocalOcr,[]);checks.push('all OCR uses the mock extractor without local fallback');assert.deepEqual(errors,[]);checks.push('zero browser errors');
 await writeFile(join(output,'design-result.json'),JSON.stringify({ok:true,before,checks,errors},null,2));console.log(JSON.stringify({ok:true,checks:checks.length,output}));
}catch(error){await writeFile(join(output,'design-result.json'),JSON.stringify({ok:false,checks,errors,error:error.stack},null,2));throw error}
finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
