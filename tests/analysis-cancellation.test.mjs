import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {clientSource} from '../src/client-source.js';
import {featureClient} from '../src/feature-client.js';
import {workspaceClient} from '../src/workspace-client.js';

const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}};
function context({existing=true}={}){
 const target={id:'text-a',text:'Start',language:'en',mode:'exact'},payload={id:'original',result:{results:[{...target,found:false}],lines:[]}};
 const item={id:'image-a',file:new File(['fixture'],'test.png',{type:'image/png'}),targets:[target],resultTargets:[target],payload:existing?payload:null,comparison:{changed:9},problem:'',reviews:{'text-a':{verdict:'issue',note:'keep review'}},reviewNotes:{'text-a':'keep memo'}};
 const elements=new Map(),c={W:{items:[item],active:item.id,busy:false,operation:false},S:{authenticated:true,last:item.payload,targets:item.resultTargets,selectedResult:'text-a'},UX:{viewImage:item.id,filter:'issue',search:'Start'},AbortController,structuredClone,URL,errors:[],shown:[],saved:[],document:{querySelectorAll:()=>item.targets},read:x=>x,activeItem:()=>item};
 c.$=id=>{if(!elements.has(id))elements.set(id,{value:id==='cloudProject'?'codex':id==='analysisMode'?'fast':id==='autoReviewProvider'?'off':'',scrollTop:id==='resultsPane'?220:0,files:[item.file]});return elements.get(id)};
 c.error=message=>c.errors.push(message);c.dirty=()=>{};c.queue=()=>{};c.progress=()=>{};c.refreshWorkbench=()=>{};c.refreshFeatures=()=>{};c.migrateReviews=()=>{};c.needsAttention=()=>true;c.reviewOverview=()=>({unresolved:[target]});
 c.featureBusy=()=>!!(c.W.busy||c.W.operation||c.S.controller);c.lockWorkspace=()=>{c.W.operation=true;return()=>c.W.operation=false};
 c.activate=id=>{c.W.active=id;c.S.last=item.payload;c.S.targets=item.resultTargets};
 c.resetComparisonView=()=>{};c.resetResult=()=>{c.S.last=null;c.S.targets=[];c.S.selectedResult=null;c.$('resultsPane').scrollTop=0};
 c.show=async(p,t,_file,persist=true)=>{c.shown.push({payload:p,persist});if(persist){c.snapshot();c.saved.push(structuredClone(item.payload))}};
 c.saveDraft=async()=>{c.snapshot();return{ok:true,saved:true}};
 vm.createContext(c);
 vm.runInContext(workspaceClient.slice(workspaceClient.indexOf('function snapshot()'),workspaceClient.indexOf('function dirty()')),c);
 vm.runInContext(featureClient.slice(featureClient.indexOf('function captureAnalysisResult('),featureClient.indexOf('function refreshFeatures(')),c);
 vm.runInContext(clientSource.slice(clientSource.indexOf('async function run('),clientSource.indexOf("$('run').onclick=")),c);
 vm.runInContext(featureClient.slice(featureClient.indexOf('function batchSignature(')),c);
 return {c,item,payload};
}

test('cancelled full reanalysis restores old results, comparison, selection and manual notes without new history',async()=>{
 const {c,item,payload}=context(),gate=deferred();c.analyzeImage=async()=>{await gate.promise;throw new DOMException('Cancelled','AbortError')};
 const task=c.run();assert.equal(item.payload,null);c.S.controller.abort();gate.resolve();await task;
 assert.deepEqual(item.payload,payload);assert.equal(c.S.last,item.payload);assert.deepEqual(item.comparison,{changed:9});assert.equal(item.reviews['text-a'].note,'keep review');assert.equal(item.reviewNotes['text-a'],'keep memo');assert.equal(c.S.selectedResult,'text-a');assert.equal(c.UX.filter,'issue');assert.equal(c.$('resultsPane').scrollTop,220);assert.equal(c.shown.at(-1).persist,false);assert.equal(c.saved.length,0);assert.match(c.errors.at(-1),/이전 결과.*유지/);assert.equal(c.W.operation,false);assert.equal(c.S.controller,null);
});

test('a late successful OCR response after cancellation is discarded and retry can succeed',async()=>{
 const {c,item,payload}=context(),gate=deferred();c.analyzeImage=async()=>{await gate.promise;return{id:'too-late'}};
 const task=c.run();c.S.controller.abort();gate.resolve();await task;assert.deepEqual(item.payload,payload);assert.equal(c.saved.length,0);
 c.analyzeImage=async()=>({id:'retry',result:payload.result});await c.run();assert.equal(item.payload.id,'retry');assert.equal(c.saved.length,1);assert.equal(c.S.controller,null);
});

test('first analysis cancellation has no previous success to restore',async()=>{
 const {c,item}=context({existing:false});c.analyzeImage=async()=>{c.S.controller.abort();throw Error('transport closed')};await c.run();assert.equal(item.payload,null);assert.equal(item.problem,'취소됨');assert.equal(c.shown.length,0);assert.match(c.errors.at(-1),/분석 대기를 취소/);assert.equal(c.$('run').disabled,false);
});

test('ordinary OCR failure still clears a previous success and reports the failure',async()=>{
 const {c,item}=context();c.analyzeImage=async()=>{throw Error('Service unavailable')};await c.run();assert.equal(item.payload,null);assert.equal(item.problem,'Service unavailable');assert.equal(c.S.last,null);assert.equal(c.shown.length,0);assert.equal(c.W.operation,false);
});

test('cancelled partial batch discards mutated temporary OCR and remains resumable with old results',async()=>{
 const {c,item,payload}=context(),gate=deferred();c.reviewPending=async(_file,previous)=>{previous.id='partial';previous.result.results[0].found=true;await gate.promise;return previous};
 const task=c.runBatch('pending');while(!c.S.controller)await Promise.resolve();c.S.controller.abort();gate.resolve();await task;
 assert.deepEqual(item.payload,payload);assert.equal(item.problem,'');assert.equal(c.W.batch.status,'paused');assert.equal(c.W.batch.done[item.id],undefined);assert.equal(c.W.busy,false);assert.equal(c.W.operation,false);assert.equal(item.running,false);assert.equal(c.saved.length,0);
 c.analyzeImage=async()=>({id:'resumed',result:payload.result});await c.runBatch('resume');assert.equal(item.payload.id,'resumed');assert.equal(c.W.batch.status,'complete');assert.equal(c.W.batch.done[item.id],c.batchSignature(item));assert.equal(c.saved.length,1);
});

test('cancellation of a batch without previous OCR keeps the item pending and releases all locks',async()=>{
 const {c,item}=context({existing:false});c.analyzeImage=async()=>{c.S.controller.abort();return{id:'late'}};await c.runBatch();assert.equal(item.payload,null);assert.equal(item.problem,'취소됨');assert.equal(c.W.batch.status,'paused');assert.equal(c.S.controller,null);assert.equal(c.W.operation,false);assert.equal(c.saved.length,0);
});
