import test from 'node:test';
import assert from 'node:assert/strict';
import {makeServer} from '../src/server.js';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Wl6QAAAAASUVORK5CYII=','base64');
test('local CLI result goes through deterministic matcher',async()=>{
  const calls=[];const server=makeServer({availability:async()=>true,authentication:async()=>true,extractor:async(provider,bytes,type)=>{calls.push({provider,type,length:bytes.length});return{provider:provider+'-cli',extractedText:'Start\n42 %\nHello  world',lines:[{text:'Start',confidence:.9,boundingBox:{x:.1,y:.1,width:.3,height:.1}},{text:'42 %',confidence:.9,boundingBox:{x:.1,y:.3,width:.3,height:.1}},{text:'Hello  world',confidence:.9,boundingBox:{x:.1,y:.5,width:.5,height:.1}}]}}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
  try{
    const page=await fetch(base+'/');assert.equal(page.status,200);assert.match(await page.text(),/빠른 로컬 OCR/);
    const status=await(await fetch(base+'/auth/status?provider=codex')).json();assert.equal(status.configured,true);
    const form=new FormData();form.set('image',new Blob([png],{type:'image/png'}),'screen.png');form.set('entries',JSON.stringify([{id:'a',language:'en',text:'Start',region:{x:0,y:0,width:.5,height:.25}},{id:'b',language:'neutral',text:'42 %'},{id:'c',language:'en',text:'Hello world'},{id:'d',language:'en',text:'Hello  world'}]));
    const forbidden=await fetch(base+'/api/v1/jobs',{method:'POST',body:form,headers:{origin:'https://attacker.example','x-lingualens-provider':'codex'}});assert.equal(forbidden.status,403);
    const response=await fetch(base+'/api/v1/jobs',{method:'POST',body:form,headers:{origin:base,'x-lingualens-provider':'codex'}}),data=await response.json();assert.equal(response.status,200,JSON.stringify(data));assert.deepEqual(data.result.results.map(x=>x.reasonCode),['matched','matched','whitespace_mismatch','matched']);assert.equal(data.result.provider,'codex-cli');assert.equal(calls.length,1);
    form.set('entries',JSON.stringify([{id:'changed',language:'en',text:'Absent',region:{x:0,y:0,width:.5,height:.25}}]));
    const cached=await(await fetch(base+'/api/v1/jobs',{method:'POST',body:form,headers:{origin:base,'x-lingualens-provider':'codex'}})).json();
    assert.equal(cached.result.timing.cacheHit,true);assert.equal(cached.result.found,false);assert.equal(calls.length,1);
    await fetch(base+'/api/v1/jobs',{method:'POST',body:form,headers:{origin:base,'x-lingualens-provider':'codex','x-lingualens-fresh':'1'}});assert.equal(calls.length,2);
  }finally{server.close()}
});
test('browser login reports the real session state',async()=>{
  const server=makeServer({availability:async()=>true,authentication:async()=>false,startLogin:async provider=>({id:'test-login',provider,state:'waiting'}),sessionStatus:id=>id==='test-login'?{provider:'gemini',state:'complete',message:'로그인이 완료되었습니다.'}:null});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
  try{
    const status=await(await fetch(base+'/auth/status?provider=gemini')).json();assert.equal(status.configured,true);assert.equal(status.authenticated,false);
    const started=await fetch(base+'/auth/login?provider=gemini',{method:'POST',headers:{origin:base}});assert.equal(started.status,200);assert.equal((await started.json()).id,'test-login');
    assert.equal((await(await fetch(base+'/auth/session?id=test-login')).json()).state,'complete');
    assert.equal((await fetch(base+'/auth/login?provider=gemini',{method:'POST',headers:{origin:'https://elsewhere.example'}})).status,403);
  }finally{server.close()}
});
test('installed but unauthenticated provider cannot start image analysis',async()=>{
  let called=false;const server=makeServer({authentication:async()=>false,extractor:async()=>{called=true}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
  try{const form=new FormData();form.set('image',new Blob([png],{type:'image/png'}),'screen.png');form.set('entries',JSON.stringify([{id:'a',language:'en',text:'Start'}]));
    const response=await fetch(base+'/api/v1/jobs',{method:'POST',body:form,headers:{origin:base,'x-lingualens-provider':'gemini'}});assert.equal(response.status,401);assert.equal(called,false);
  }finally{server.close()}
});
