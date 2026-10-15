import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {jsonRequest} from '../src/request-tools.js';
function request(fetch){const c={fetch};vm.createContext(c);vm.runInContext(jsonRequest.toString(),c);return c.jsonRequest}

test('connection errors are readable and leave the original retry decision to the caller',async()=>{
 const call=request(async()=>{throw TypeError('Failed to fetch')});await assert.rejects(call('/api/projects'),/앱 서버.*실행 중.*다시 시도/);
});
test('HTML error responses include the operation and HTTP status',async()=>{
 const call=request(async()=>({ok:false,status:502,json:async()=>{throw SyntaxError('Unexpected <')}}));await assert.rejects(call('/api/projects',{},'저장 요청 실패'),error=>error.status===502&&/저장 요청 실패.*HTTP 502/.test(error.message));
});
test('a server-provided error is kept and includes its HTTP status as metadata',async()=>{
 const call=request(async()=>({ok:false,status:401,json:async()=>({error:{message:'로그인이 필요합니다.'}})}));await assert.rejects(call('/api/v1/jobs'),error=>error.status===401&&error.message==='로그인이 필요합니다.');
});
test('a malformed success response or primitive JSON gets a readable format error',async()=>{
 for(const value of [null,'unexpected',4,true])await assert.rejects(request(async()=>({ok:true,json:async()=>value}))('/api/projects'),/응답 형식/);
 await assert.rejects(request(async()=>({ok:true,json:async()=>{throw SyntaxError('broken JSON')}}))('/api/projects'),/서버 응답을 읽지 못/);
});
test('normal object and array responses are returned unchanged',async()=>{
 for(const data of [{id:'project'},[{id:'preset'}]])assert.equal(await request(async()=>({ok:true,json:async()=>data}))('/api/projects'),data);
});
test('cancelled requests never call fetch',async()=>{
 let calls=0;const controller=new AbortController();controller.abort();await assert.rejects(request(async()=>{calls++})('/api/projects',{signal:controller.signal}),{name:'AbortError'});assert.equal(calls,0);
});
test('cancellation while JSON is decoded takes precedence over a late parse failure',async()=>{
 const controller=new AbortController(),call=request(async()=>({ok:false,status:500,json:async()=>{controller.abort();throw SyntaxError('broken')}}));await assert.rejects(call('/api/projects',{signal:controller.signal}),{name:'AbortError'});
});
test('timeouts stay timeouts so OCR can show its timeout-specific message',async()=>{
 const call=request(async()=>{throw new DOMException('Timed out','TimeoutError')});await assert.rejects(call('/api/v1/jobs'),{name:'TimeoutError'});
});
