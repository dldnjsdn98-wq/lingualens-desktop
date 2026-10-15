import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {clientSource} from '../src/client-source.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}};

function context(request){
 const elements=new Map(),payload={id:'original',result:{lines:[],results:[{id:'target',text:'Start',found:false,region:{x:0,y:0,width:.2,height:.2}}]}},file={name:'fixture'},c={W:{operation:false},S:{controller:null,last:payload,targets:[{id:'target',text:'Start'}],selectedResult:'target'},AbortController,AbortSignal,structuredClone,jsonRequest:request,selectedArea:item=>item?.region,progress:()=>{},errors:[],shown:0,show:async()=>{c.shown++},refreshConnection:async()=>{},createImageBitmap:async()=>({close:()=>{c.bitmapClosed=true}}),retryRegionGroup:async result=>{result.id='updated'},$:id=>{if(!elements.has(id))elements.set(id,{value:id==='regionProvider'?'codex':'local',files:[file],checked:true});return elements.get(id)}};
 c.error=message=>c.errors.push(message);c.lockWorkspace=()=>{c.W.operation=true;return()=>{c.W.operation=false}};
 vm.createContext(c);vm.runInContext(clientSource.slice(clientSource.indexOf('async function reviewAuthenticated('),clientSource.indexOf('function recount(')),c);
 vm.runInContext(clientSource.slice(clientSource.indexOf("$('verifyRegionAi').onclick="),clientSource.indexOf("$('clearOcrCache').onclick=")),c);return{c,payload};
}

test('manual region auth failure shows an error and keeps original OCR and controls',async()=>{
 const {c,payload}=context(async()=>{throw Error('QA auth offline')});await c.$('verifyRegionAi').onclick();assert.equal(c.S.last,payload);assert.equal(c.shown,0);assert.equal(c.W.operation,false);assert.equal(c.S.controller,null);assert.match(c.errors.at(-1),/QA auth offline/);
});

test('manual region auth checking is locked and cancellation stops before decoding',async()=>{
 let captured,calls=0;const {c,payload}=context(async(_url,{signal})=>{calls++;captured=signal;return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}))});c.createImageBitmap=()=>assert.fail('decode ran after cancellation');
 const first=c.$('verifyRegionAi').onclick();assert.equal(c.W.operation,true);await c.$('verifyRegionAi').onclick();assert.equal(calls,1);c.S.controller.abort();await first;assert.equal(captured.aborted,true);assert.equal(c.S.last,payload);assert.equal(c.W.operation,false);assert.match(c.errors.at(-1),/취소/);
});

test('manual region retry modifies a copy and commits only after successful completion',async()=>{
 const {c,payload}=context(async()=>({authenticated:true}));await c.$('verifyRegionAi').onclick();assert.equal(payload.id,'original');assert.equal(c.S.last.id,'updated');assert.equal(c.shown,1);assert.equal(c.bitmapClosed,true);assert.equal(c.W.operation,false);
});

test('cancelling a region retry discards mutations of its temporary result',async()=>{
 const gate=deferred(),started=deferred(),{c,payload}=context(async()=>({authenticated:true}));c.retryRegionGroup=async result=>{result.id='partial';started.resolve();await gate.promise};
 const first=c.$('verifyRegionAi').onclick();await started.promise;c.S.controller.abort();gate.resolve();await first;assert.equal(c.S.last,payload);assert.equal(payload.id,'original');assert.equal(c.shown,0);assert.equal(c.bitmapClosed,true);
});

test('optional AI auth failure preserves basic OCR and adds a readable note',async()=>{
 const {c,payload}=context(async()=>{throw Error('QA connection failed')}),signal=new AbortController().signal;const before=JSON.stringify(payload.result.results);
 assert.equal(await c.reviewAuthenticated('codex',signal,payload,'login required'),false);assert.equal(JSON.stringify(payload.result.results),before);assert.match(payload.result.autoReviewNote,/기본 OCR 결과.*QA connection failed/);
});

test('optional AI auth timeout keeps base OCR while user cancellation still rejects',async()=>{
 const {c,payload}=context(async()=>{throw new DOMException('Timed out','TimeoutError')});assert.equal(await c.reviewAuthenticated('codex',new AbortController().signal,payload,'login required'),false);assert.match(payload.result.autoReviewNote,/시간이 초과/);
 const controller=new AbortController();controller.abort();await assert.rejects(c.reviewAuthenticated('codex',controller.signal,payload,'login required'),{name:'AbortError'});
});

test('missing optional AI login is reported separately from recognized text',async()=>{
 const {c,payload}=context(async()=>({authenticated:false}));assert.equal(await c.reviewAuthenticated('codex',new AbortController().signal,payload,'AI 로그인이 필요합니다.'),false);assert.equal(payload.result.autoReviewNote,'AI 로그인이 필요합니다.');assert.equal(payload.id,'original');
});

function ordinaryRetry(){const state=context(async()=>({authenticated:true})),{c}=state;const start=clientSource.indexOf("$('retryRegion').onclick=");vm.runInContext(clientSource.slice(start,clientSource.indexOf('\n',start)),c);return state}

test('ordinary region retry commits a copy after successful completion',async()=>{
 const {c,payload}=ordinaryRetry();await c.$('retryRegion').onclick();assert.equal(payload.id,'original');assert.equal(c.S.last.id,'updated');assert.equal(c.W.operation,false);assert.equal(c.shown,1);
});
test('ordinary region retry cancellation discards partial changes and permits retry',async()=>{
 const gate=deferred(),started=deferred(),{c,payload}=ordinaryRetry();c.retryRegionGroup=async result=>{result.id='partial';started.resolve();await gate.promise};const task=c.$('retryRegion').onclick();await started.promise;c.S.controller.abort();gate.resolve();await task;assert.equal(c.S.last,payload);assert.equal(c.$('retryRegion').disabled,false);assert.match(c.errors.at(-1),/영역 재인식을 취소/);assert.equal(c.bitmapClosed,true);
 c.retryRegionGroup=async result=>result.id='success';await c.$('retryRegion').onclick();assert.equal(c.S.last.id,'success');
});
