import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {makeServer} from '../src/server.js';

async function fixture(t,options={}){
  const root=await mkdtemp(join(tmpdir(),'language-server-errors-'));
  const server=makeServer({projectRoot:root,extractor:async()=>({lines:[]}),availability:async()=>true,authentication:async()=>true,...options});
  t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await rm(root,{recursive:true,force:true})});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  return {server,base,request:path=>fetch(base+path,{signal:AbortSignal.timeout(3000)})};
}

for(const failedProbe of ['availability','authentication'])test(failedProbe+' failure returns a readable error and permits status retry',{timeout:10000},async t=>{
  let fail=true;
  const {request}=await fixture(t,{[failedProbe]:async()=>{if(fail)throw Error('private synthetic probe detail');return true}});
  const response=await request('/auth/status?provider=codex'),body=await response.json();
  assert.equal(response.status,503);assert.equal(body.error.code,'auth_status_failed');assert.match(body.error.message,/로그인 상태.*다시 시도/);assert.doesNotMatch(JSON.stringify(body),/private synthetic/);
  assert.equal((await request('/healthz')).status,200);
  fail=false;const recovered=await request('/auth/status?provider=codex');assert.equal(recovered.status,200);assert.equal((await recovered.json()).authenticated,true);
});

test('unexpected session failure is contained and another request still succeeds',{timeout:10000},async t=>{
  const {request}=await fixture(t,{sessionStatus:()=>{throw Error('private synthetic session detail')}});
  const response=await request('/auth/session?id=synthetic'),body=await response.json();
  assert.equal(response.status,500);assert.equal(body.error.code,'request_failed');assert.doesNotMatch(JSON.stringify(body),/private synthetic/);
  assert.equal((await request('/healthz')).status,200);
});

test('unserializable session data becomes a complete JSON error before headers are sent',{timeout:10000},async t=>{
  const session={state:'waiting'};session.self=session;
  const {request}=await fixture(t,{sessionStatus:()=>session});
  const response=await request('/auth/session?id=synthetic');assert.equal(response.status,500);assert.equal((await response.json()).error.code,'request_failed');
  assert.equal((await request('/healthz')).status,200);
});

test('invalid request URL is rejected without stopping the server',{timeout:10000},async t=>{
  const {base,request}=await fixture(t);
  const result=await new Promise((resolve,reject)=>{
    const req=http.request(base,{path:'http://[',headers:{connection:'close'}},res=>{let text='';res.setEncoding('utf8');res.on('data',chunk=>text+=chunk);res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(text)}))});
    req.on('error',reject);req.setTimeout(3000,()=>req.destroy(Error('Synthetic request timed out')));req.end();
  });
  assert.equal(result.status,400);assert.equal(result.body.error.code,'invalid_request');
  assert.equal((await request('/healthz')).status,200);
});

test('status rejection after the client disconnects does not terminate the app',{timeout:10000},async t=>{
  let entered,rejectProbe;const started=new Promise(resolve=>entered=resolve),probe=new Promise((_,reject)=>rejectProbe=reject);
  const {base,request}=await fixture(t,{availability:()=>{entered();return probe}}),controller=new AbortController();
  const pending=fetch(base+'/auth/status?provider=codex',{signal:controller.signal});
  const cancelled=assert.rejects(pending,{name:'AbortError'});
  await started;controller.abort();await cancelled;rejectProbe(Error('synthetic disconnected probe'));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal((await request('/healthz')).status,200);
});
