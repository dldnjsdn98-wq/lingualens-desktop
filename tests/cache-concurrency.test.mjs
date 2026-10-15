import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {cachedExtractor} from '../src/ocr-cache.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}};
const bytes=Buffer.from('same-private-image'),value=text=>({lines:[{text}]});

test('identical concurrent OCR requests share extraction and return independent results and progress',async()=>{
 const ready=deferred(),gate=deferred(),firstProgress=[],secondProgress=[];let calls=0,notify;
 const read=cachedExtractor(async(p,b,t,s,options)=>{calls++;notify=options.onProgress;notify('reading');ready.resolve();return gate.promise});
 const first=read('local',bytes,'image/png',undefined,{onProgress:stage=>firstProgress.push(stage)});await ready.promise;
 const second=read('local',bytes,'image/png',undefined,{onProgress:stage=>secondProgress.push(stage)});
 notify('recognizing');gate.resolve(value('Start'));const [a,b]=await Promise.all([first,second]);
 assert.equal(calls,1);assert.deepEqual(firstProgress,['reading','recognizing']);assert.deepEqual(secondProgress,firstProgress);
 a.lines[0].text='changed';assert.equal(b.lines[0].text,'Start');assert.equal((await read('local',bytes,'image/png')).lines[0].text,'Start');
});

test('cancelling one shared request leaves the other subscriber and OCR process running',async()=>{
 const ready=deferred(),gate=deferred(),controller=new AbortController();let activeSignal;
 const read=cachedExtractor(async(p,b,t,signal)=>{activeSignal=signal;ready.resolve();return gate.promise});
 const first=read('local',bytes,'image/png',controller.signal);const cancelled=assert.rejects(first,e=>e.name==='AbortError');await ready.promise;
 const second=read('local',bytes,'image/png');controller.abort();await cancelled;assert.equal(activeSignal.aborted,false);
 gate.resolve(value('kept'));assert.equal((await second).lines[0].text,'kept');
});

test('cancelling the last subscriber aborts OCR and permits a new request immediately',async()=>{
 const ready=deferred();let calls=0,activeSignal;
 const read=cachedExtractor(async(p,b,t,signal)=>{calls++;if(calls>1)return value('retry');activeSignal=signal;ready.resolve();return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}))});
 const controller=new AbortController(),first=read('local',bytes,'image/png',controller.signal),cancelled=assert.rejects(first,e=>e.name==='AbortError');
 await ready.promise;controller.abort();await cancelled;assert.equal(activeSignal.aborted,true);
 assert.equal((await read('local',bytes,'image/png')).lines[0].text,'retry');assert.equal(calls,2);
});

test('fresh OCR supersedes older pending results without overwriting the new cache',async()=>{
 const gates=[deferred(),deferred()];let calls=0;
 const read=cachedExtractor(async()=>gates[calls++].promise);
 const old=read('local',bytes,'image/png'),fresh=read('local',bytes,'image/png',undefined,{fresh:true}),joined=read('local',bytes,'image/png');
 gates[1].resolve(value('new'));assert.equal((await fresh).lines[0].text,'new');assert.equal((await joined).lines[0].text,'new');
 gates[0].resolve(value('old'));assert.equal((await old).lines[0].text,'old');assert.equal((await read('local',bytes,'image/png')).lines[0].text,'new');assert.equal(calls,2);
});

test('clearing during extraction prevents old results from resurrecting memory or disk cache',async()=>{
 const root=await mkdtemp(join(tmpdir(),'language-cache-clear-')),ready=deferred(),gate=deferred();let calls=0;
 try{
  const read=cachedExtractor(async()=>{if(++calls===1){ready.resolve();return gate.promise}return value('new')},{root});
  const first=read('local',bytes,'image/png');await ready.promise;await read.clear();gate.resolve(value('old'));assert.equal((await first).lines[0].text,'old');
  assert.deepEqual(await readdir(root).catch(e=>e.code==='ENOENT'?[]:Promise.reject(e)),[]);
  const next=await read('local',bytes,'image/png');assert.equal(next.cacheHit,false);assert.equal(next.lines[0].text,'new');assert.equal(calls,2);
 }finally{await rm(root,{recursive:true,force:true})}
});

test('shared OCR failure rejects every waiter and is not retained for retries',async()=>{
 const gate=deferred();let calls=0;
 const read=cachedExtractor(async()=>++calls===1?gate.promise:value('recovered'));
 const a=read('local',bytes,'image/png'),b=read('local',bytes,'image/png');
 const failures=Promise.all([assert.rejects(a,/failed/),assert.rejects(b,/failed/)]);gate.reject(Error('failed'));await failures;
 assert.equal((await read('local',bytes,'image/png')).lines[0].text,'recovered');assert.equal(calls,2);
});

test('an already aborted request cannot start OCR or receive a saved result',async()=>{
 let calls=0;const read=cachedExtractor(async()=>{calls++;return value('saved')});await read('local',bytes,'image/png');
 const controller=new AbortController();controller.abort();await assert.rejects(read('local',bytes,'image/png',controller.signal),e=>e.name==='AbortError');assert.equal(calls,1);
});
