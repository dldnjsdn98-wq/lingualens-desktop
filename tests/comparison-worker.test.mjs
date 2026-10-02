import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {mkdtemp,writeFile,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
import {enhancementClient} from '../src/enhancement-client.js';

test('comparison cancellation terminates its Worker and rejects before applying a result',async()=>{
 let stopped=0;class PendingWorker{postMessage(){}terminate(){stopped++;}}
 const source=enhancementClient.slice(enhancementClient.indexOf('function diffInWorker('),enhancementClient.indexOf('function comparisonPresentation('));
 const context=vm.createContext({Worker:PendingWorker,DOMException,$:()=>({})});vm.runInContext(source,context);
 const controller=new AbortController(),request=context.diffInWorker(new Uint8Array(4),new Uint8Array(4),1,1,.1,controller.signal);
 controller.abort();await assert.rejects(request,{name:'AbortError'});assert.equal(stopped,1);
});

test('real comparison Worker detects changes and returns transferred mask at 2340x1080',async()=>{
 const root=await mkdtemp(join(tmpdir(),'language-comparison-worker-'));let worker;
 try{
  await writeFile(join(root,'package.json'),'{"type":"module"}');
  for(const name of ['comparison-worker.js','enhancement-tools.js','feature-tools.js'])await copyFile(new URL('../src/'+name,import.meta.url),join(root,name));
  await copyFile(new URL('../vendor/pixelmatch.js',import.meta.url),join(root,'pixelmatch.js'));
  await writeFile(join(root,'entry.mjs'),"import {parentPort} from 'node:worker_threads';globalThis.self={postMessage:(v,t)=>parentPort.postMessage(v,t)};await import('./comparison-worker.js');parentPort.on('message',data=>self.onmessage({data}));");
  worker=new Worker(pathToFileURL(join(root,'entry.mjs')));
  const width=2340,height=1080,before=new Uint8ClampedArray(width*height*4).fill(255),after=before.slice();
  for(let y=400;y<450;y++)for(let x=1000;x<1100;x++){const p=(y*width+x)*4;after[p]=0;after[p+1]=0;after[p+2]=0;}
  const result=await new Promise((resolve,reject)=>{worker.on('error',reject);worker.on('message',r=>{if(!r.stage)resolve(r)});worker.postMessage({before:before.buffer,after:after.buffer,width,height,threshold:.1},[before.buffer,after.buffer]);});
  assert.equal(before.byteLength,0);assert.equal(after.byteLength,0);assert.equal(result.changed,5000);assert.equal(result.mask.byteLength,width*height*4);assert.equal(result.regions.length,1);
  assert.ok(result.regions[0].x<=1000&&result.regions[0].x+result.regions[0].width>=1100);
 }finally{await worker?.terminate();await rm(root,{recursive:true,force:true});}
});
