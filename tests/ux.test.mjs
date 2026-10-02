import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewOverview,batchReadiness,fitScale,comparisonArea,editCheckpoint,editStep} from '../src/ux-tools.js';
import {manualState,reviewSignature} from '../src/feature-tools.js';
import {imageSummary} from '../src/workbench-tools.js';
import {uxClient} from '../src/ux-client.js';
import vm from 'node:vm';
const make=()=>({targets:[{id:'a',text:'Start',language:'en',mode:'exact'},{id:'b',text:'Stop',language:'en',mode:'exact'}],reviews:{},payload:{id:'same-request',result:{results:[{id:'a',found:true,observedText:'Start'},{id:'b',found:false,observedText:'Stoop'}]}}});
test('manual issue overrides attention while automatic pass remains visible; accepted mismatches resolve attention',()=>{
 const i=make();i.reviews.a={verdict:'issue',signature:reviewSignature(i,'a')};i.reviews.b={verdict:'accepted',signature:reviewSignature(i,'b')};const s=reviewOverview(i);assert.equal(s.automaticPass,1);assert.equal(s.accepted,1);assert.equal(s.issues,1);assert.deepEqual(s.unresolved.map(r=>r.id),['a']);i.reviews.a.verdict='accepted';assert.equal(reviewOverview(i).unresolved.length,0);i.targets[0].text='Changed';assert.equal(reviewOverview(i).accepted,1);assert.equal(reviewOverview(i).unresolved.length,1);
});
test('confirmation moves to an unreviewed phrase and a manually accepted mismatch leaves attention',async()=>{
 const item=make();item.payload.result.results[1].found=true;item.id='image';item.reviews.a={verdict:'accepted',signature:reviewSignature(item)};const selected=[];const c={featureBusy:()=>false,snapshot:()=>{},activeItem:()=>item,W:{items:[item]},S:{selectedResult:'a'},reviewOverview,manualState,selectReviewTarget:id=>selected.push(id)};vm.createContext(c);vm.runInContext(uxClient.slice(uxClient.indexOf('async function nextReviewTarget('),uxClient.indexOf('function selectReviewTarget(')),c);await c.nextReviewTarget(true);assert.deepEqual(selected,['b']);item.payload.result.results[1].found=false;for(const id of ['a','b'])item.reviews[id]={verdict:'accepted',signature:reviewSignature(item)};assert.equal(imageSummary(item).state,'accepted');assert.equal(reviewOverview(item).unresolved.length,0);assert.match(imageSummary(item).label,/수동 확인 2/);
});
test('rereading a region invalidates manual review even when the request ID remains the same',()=>{
 const i=make();i.reviews.a={verdict:'accepted',signature:reviewSignature(i)};i.payload.result.results[0].observedText='START';assert.equal(manualState(i,'a'),null);
});
test('legacy review signatures remain readable and migrate before rereading',()=>{
 const i=make(),legacy=JSON.parse(reviewSignature(i));delete legacy.readings;i.reviews.a={verdict:'issue',signature:JSON.stringify(legacy)};assert.equal(manualState(i,'a').verdict,'issue');i.reviews.a.signature=reviewSignature(i);i.payload.result.results[0].observedText='different';assert.equal(manualState(i,'a'),null);
});
test('batch preparation separates whitespace-only targets and keeps source order without mutation',()=>{
 const items=[{id:1,targets:[{text:'  '}]},{id:2,targets:[{text:'Start'}]},{id:3,targets:[]}],before=structuredClone(items),state=batchReadiness(items);assert.deepEqual(state.ready.map(i=>i.id),[2]);assert.deepEqual(state.missing.map(i=>i.id),[1,3]);assert.deepEqual(items,before);
});
test('fit scale respects both viewport dimensions while original 100 percent is exactly one',()=>{
 assert.equal(fitScale(2340,1080,1170,800),.5);assert.equal(fitScale(1080,2340,1170,1170),.5);assert.equal(2340*1,2340);assert.equal(fitScale(0,0,100,100),1);
});
test('native region comparison keeps edge pixels and bounds memory; overview retains its resize limit',()=>{
 assert.deepEqual(comparisonArea(2340,1080,{x:.1,y:.2,width:.3,height:.2}),{x:234,y:216,width:702,height:216,ratio:1});assert.ok(comparisonArea(2340,1080).ratio<1);assert.throws(()=>comparisonArea(10000,10000,{x:0,y:0,width:1,height:1}),/800만/);assert.equal(comparisonArea(100,100,{x:.999,y:.999,width:.001,height:.001}).width,1);
});
test('editing undo and redo preserve regions and independent image histories; new changes discard redo',()=>{
 const a={undo:[],redo:[]},b={undo:[],redo:[]},start={targets:[{id:'a',region:{x:.1,y:.2,width:.3,height:.4}}],ignoreRegions:[]},end={targets:[],ignoreRegions:[]};editCheckpoint(a,start);const restored=editStep(a,end,'undo');assert.deepEqual(restored,start);restored.targets[0].region.x=.5;assert.deepEqual(editStep(a,start,'redo'),end);assert.equal(b.undo.length,0);editCheckpoint(a,end);assert.equal(a.redo.length,0);for(let n=0;n<40;n++)editCheckpoint(a,{targets:[{text:String(n)}]});assert.equal(a.undo.length,30);
});
