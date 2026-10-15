import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {featureClient} from '../src/feature-client.js';
import {clientSource} from '../src/client-source.js';
import {jsonRequest} from '../src/request-tools.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}};

function draft(request){
 const elements=new Map(),item={file:{name:'fixture'},ignoreRegions:[]},c={W:{operation:false},S:{controller:null},F:{},AbortController,activeItem:()=>item,featureBusy:()=>c.W.operation||!!c.S.controller,requestOcr:request,shown:[],showDraftLines:lines=>c.shown.push(lines),setInterval:()=>1,clearInterval:()=>{c.timerCleared=true},$:id=>{if(!elements.has(id))elements.set(id,{value:id==='cloudProject'?'codex':'en',disabled:false,querySelector:()=>null});return elements.get(id)}};
 c.lockWorkspace=()=>{c.W.operation=true;return()=>c.W.operation=false};vm.createContext(c);vm.runInContext(featureClient.slice(featureClient.indexOf('async function readDraftOcr()'),featureClient.indexOf('function showDraftLines(')),c);return{c,item};
}

test('cancelled draft OCR discards a late response and restores controls',async()=>{
 const gate=deferred(),{c}=draft(async()=>gate.promise);const task=c.readDraftOcr();assert.equal(c.$('cancelDraftOcr').disabled,false);assert.equal(c.$('ocrDraftLanguage').disabled,true);c.F.draftController.abort();gate.resolve({result:{lines:[{text:'late'}]}});await task;
 assert.equal(c.shown.length,0);assert.equal(c.S.controller,null);assert.equal(c.F.draftController,null);assert.equal(c.W.operation,false);assert.equal(c.$('readDraftOcr').disabled,false);assert.equal(c.$('cancelDraftOcr').disabled,true);assert.equal(c.timerCleared,true);assert.match(c.$('ocrDraftInfo').textContent,/취소.*다시 읽/);
});

test('draft OCR cancellation during masking prevents the OCR request',async()=>{
 let calls=0;const gate=deferred(),{c,item}=draft(async()=>{calls++});item.ignoreRegions=[{x:0,y:0,width:.1,height:.1}];c.maskedFile=async()=>gate.promise;
 const task=c.readDraftOcr();c.F.draftController.abort();gate.resolve(item.file);await task;assert.equal(calls,0);assert.equal(c.W.operation,false);
});

test('draft OCR failure permits a successful retry and keeps the chosen provider and language',async()=>{
 let calls=0;const {c}=draft(async(_file,targets,_signal,_fresh,provider)=>{assert.equal(targets[0].language,'en');assert.equal(provider,'codex');if(!calls++)throw Error('QA server failed');return{result:{lines:[{text:'Start'}]}}});
 await c.readDraftOcr();assert.match(c.$('ocrDraftInfo').textContent,/QA server/);assert.equal(c.W.operation,false);await c.readDraftOcr();assert.equal(c.shown[0][0].text,'Start');assert.equal(c.W.operation,false);
});

test('draft OCR ignores repeated read clicks while one operation is active',async()=>{
 let calls=0;const gate=deferred(),{c}=draft(async()=>{calls++;return gate.promise});const first=c.readDraftOcr();await c.readDraftOcr();assert.equal(calls,1);gate.resolve({result:{lines:[]}});await first;
});

function requestContext(fetch){
 const c={fetch,FormData,AbortSignal,crypto:{randomUUID:()=> 'qa'},refreshConnection:()=>{},clearInterval:()=>{c.cleared=true},$:()=>({value:'fast',textContent:''})};
 c.setInterval=callback=>{c.tick=callback;return 1};vm.createContext(c);vm.runInContext(jsonRequest.toString(),c);
 vm.runInContext(clientSource.slice(clientSource.indexOf('async function requestOcr('),clientSource.indexOf('async function cropRegion(')),c);return c;
}

test('OCR request does not upload when its signal was already cancelled',async()=>{
 let calls=0;const c=requestContext(async()=>{calls++}),controller=new AbortController();controller.abort();await assert.rejects(c.requestOcr(new Blob(['fixture']),[],controller.signal,false,'local'),{name:'AbortError'});assert.equal(calls,0);
});

test('OCR response decoded after cancellation is rejected and its timer is cleared',async()=>{
 const gate=deferred(),started=deferred(),c=requestContext(async()=>({ok:true,status:200,json:async()=>{started.resolve();return gate.promise}})),controller=new AbortController();
 const task=c.requestOcr(new Blob(['fixture']),[],controller.signal,false,'codex');await started.promise;controller.abort();gate.resolve({result:{lines:[]}});await assert.rejects(task,{name:'AbortError'});assert.equal(c.cleared,true);
});
