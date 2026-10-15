import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {localOcr} from '../src/local-ocr.js';
const bytes=Buffer.from('private-image'),value=text=>({lines:[{text}]});
function runtime(){
 const workers=[];
 const spawnProcess=()=>{
  const worker=new EventEmitter();worker.stdin=new PassThrough();worker.stdout=new PassThrough();worker.stderr=new PassThrough();worker.requests=[];worker.killed=false;
  worker.stdin.on('data',chunk=>worker.requests.push(JSON.parse(chunk.toString().trim())));
  worker.kill=()=>{worker.killed=true;worker.stdin.destroy();worker.stdout.destroy();worker.stderr.destroy();worker.emit('exit',0);return true};
  worker.respond=data=>worker.stdout.write(JSON.stringify(data)+'\n');workers.push(worker);return worker;
 };
 return{workers,spawnProcess};
}

test('local OCR serializes queued images and reuses its live worker',async()=>{
 const fake=runtime(),engine=localOcr(fake);
 try{
  const first=engine.extract('local',bytes,'image/png'),second=engine.extract('local',Buffer.from('second'),'image/png');
  assert.equal(fake.workers.length,1);assert.equal(fake.workers[0].requests.length,1);
  fake.workers[0].respond(value('first'));assert.equal((await first).lines[0].text,'first');assert.equal(fake.workers[0].requests.length,2);
  fake.workers[0].respond(value('second'));assert.equal((await second).lines[0].text,'second');assert.equal(fake.workers.length,1);
 }finally{engine.close()}
});

test('queued OCR cancellation rejects immediately without interrupting the active worker',async()=>{
 const fake=runtime(),engine=localOcr(fake),controller=new AbortController();
 try{
  const active=engine.extract('local',bytes,'image/png'),queued=engine.extract('local',bytes,'image/png',controller.signal);
  const rejected=assert.rejects(queued,e=>e.name==='AbortError');controller.abort();await rejected;assert.equal(fake.workers[0].killed,false);
  fake.workers[0].respond(value('active'));await active;assert.equal(fake.workers[0].requests.length,1);
 }finally{engine.close()}
});

test('closing local OCR rejects active and queued requests and prevents worker resurrection',async()=>{
 const fake=runtime(),engine=localOcr(fake);
 const first=engine.extract('local',bytes,'image/png'),second=engine.extract('local',bytes,'image/png');
 const rejected=Promise.all([assert.rejects(first,/종료/),assert.rejects(second,/종료/)]);engine.close();await rejected;
 assert.equal(fake.workers[0].killed,true);assert.equal(fake.workers.length,1);assert.equal(engine.available(),false);
 await assert.rejects(engine.extract('local',bytes,'image/png'),/종료/);assert.equal(fake.workers.length,1);engine.close();
});

test('active OCR cancellation terminates its worker and starts the next queued request in a new worker',async()=>{
 const fake=runtime(),engine=localOcr(fake),controller=new AbortController();
 try{
  const first=engine.extract('local',bytes,'image/png',controller.signal),second=engine.extract('local',bytes,'image/png');
  const rejected=assert.rejects(first,e=>e.name==='AbortError');controller.abort();await rejected;
  assert.equal(fake.workers[0].killed,true);assert.equal(fake.workers.length,2);fake.workers[1].respond(value('next'));assert.equal((await second).lines[0].text,'next');
 }finally{engine.close()}
});

test('a stalled OCR timeout terminates only that worker and permits retry',async()=>{
 const fake=runtime(),engine=localOcr({...fake,requestTimeout:25});
 try{
  await assert.rejects(engine.extract('local',bytes,'image/png'),/時間|시간/);assert.equal(fake.workers[0].killed,true);
  const retry=engine.extract('local',bytes,'image/png');fake.workers[1].respond(value('retry'));assert.equal((await retry).lines[0].text,'retry');
 }finally{engine.close()}
});

test('unexpected worker exit fails the active request and does not strand queued OCR',async()=>{
 const fake=runtime(),engine=localOcr(fake);
 try{
  const first=engine.extract('local',bytes,'image/png'),second=engine.extract('local',bytes,'image/png'),rejected=assert.rejects(first,/종료/);
  fake.workers[0].emit('exit',1);await rejected;assert.equal(fake.workers.length,2);
  fake.workers[1].respond(value('next'));assert.equal((await second).lines[0].text,'next');
 }finally{engine.close()}
});

test('invalid worker JSON rejects safely and restarts instead of crashing or reusing bad output',async()=>{
 const fake=runtime(),engine=localOcr(fake);
 try{
  for(const response of ['not JSON','null','{}']){
   const pending=engine.extract('local',bytes,'image/png'),rejected=assert.rejects(pending,/응답/),worker=fake.workers.at(-1);
   worker.stdout.write(response+'\n');await rejected;assert.equal(worker.killed,true);
  }
  const retry=engine.extract('local',bytes,'image/png');fake.workers.at(-1).respond(value('valid'));assert.equal((await retry).lines[0].text,'valid');
 }finally{engine.close()}
});
