import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import vm from 'node:vm';
import {folderWatch} from '../src/folder-watch.js';
import {featureClient} from '../src/feature-client.js';

test('stop during initial folder scan prevents a late start from creating a session',async()=>{
 const root=await mkdtemp(join(tmpdir(),'language-watch-start-')),watch=folderWatch();
 try{const starting=watch.start(root);watch.stop();await assert.rejects(starting,/취소/);await assert.rejects(watch.poll('old'),/다시 시작/)}finally{await rm(root,{recursive:true,force:true})}
});

test('overlapping starts accept only the latest request',async()=>{
 const root=await mkdtemp(join(tmpdir(),'language-watch-double-')),watch=folderWatch();
 try{const first=watch.start(root),second=watch.start(root);const results=await Promise.allSettled([first,second]);assert.equal(results[0].status,'rejected');assert.match(results[0].reason.message,/취소/);assert.equal(results[1].status,'fulfilled');assert.equal((await watch.poll(results[1].value.id)).pending,0)}finally{watch.stop();await rm(root,{recursive:true,force:true})}
});

test('stop while reading or polling rejects the old session with a useful message',async()=>{
 const root=await mkdtemp(join(tmpdir(),'language-watch-read-'));let now=0;const watch=folderWatch({now:()=>now});
 try{await writeFile(join(root,'image.png'),Buffer.from('synthetic'));const session=await watch.start(root,true);await watch.poll(session.id);now=2100;const list=await watch.poll(session.id);const reading=watch.read(session.id,list.files[0].key);watch.stop();await assert.rejects(reading,/종료/);const next=await watch.start(root);const polling=watch.poll(next.id);watch.stop();await assert.rejects(polling,/종료/)}finally{watch.stop();await rm(root,{recursive:true,force:true})}
});

function client(request){
 const elements=new Map(),c={F:{watch:null},W:{items:[{id:'image'}],draftId:'current',operation:false},dirty:()=>{},setInterval:()=>1,clearInterval:()=>{},projectRequest:request,featureBusy:()=>c.W.operation,refreshFeatures:()=>{},pollWatch:async()=>{},$:id=>{if(!elements.has(id))elements.set(id,{value:'QA',checked:false});return elements.get(id)}};
 c.lockWorkspace=()=>{c.W.operation=true;return()=>{c.W.operation=false}};vm.createContext(c);
 vm.runInContext(featureClient.slice(featureClient.indexOf('async function startWatch()'),featureClient.indexOf('async function pollWatch()')),c);return c;
}

test('client locks during start and ignores duplicate start clicks',async()=>{
 let finish,calls=0;const gate=new Promise(r=>finish=r),c=client(async()=>{calls++;return gate});
 const first=c.startWatch();assert.equal(c.W.operation,true);assert.equal(c.F.watchChanging,true);await c.startWatch();assert.equal(calls,1);finish({id:'watch',path:'QA'});await first;assert.equal(c.W.operation,false);assert.equal(c.F.watch.draftId,'current');assert.equal(c.F.watchChanging,false);
});

test('failed start releases lock and permits a retry',async()=>{
 let calls=0;const c=client(async()=>{if(!calls++)throw Error('folder missing');return{id:'retry',path:'QA'}});
 await c.startWatch();assert.equal(c.W.operation,false);assert.equal(c.F.watchChanging,false);assert.equal(c.F.watch,null);assert.match(c.$('watchInfo').textContent,/시작 실패/);await c.startWatch();assert.equal(c.F.watch.id,'retry');
});

test('repeated stop shares one request and prevents start until stop finishes',async()=>{
 let finish,calls=0;const gate=new Promise(r=>finish=r),c=client(async()=>{calls++;return gate});c.F.watch={id:'old'};
 const first=c.stopWatch(),second=c.stopWatch();await c.startWatch();assert.equal(calls,1);assert.equal(c.F.watch,null);assert.equal(c.F.watchChanging,true);finish({ok:true});await Promise.all([first,second]);assert.equal(c.F.watchChanging,false);assert.equal(c.F.watchStopPromise,null);assert.match(c.$('watchInfo').textContent,/꺼짐/);
});
