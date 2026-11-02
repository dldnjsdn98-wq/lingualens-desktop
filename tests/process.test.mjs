import test from 'node:test';
import assert from 'node:assert/strict';
import {run,friendlyError} from '../src/cli.js';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
test('noninteractive command receives EOF instead of waiting for input',async()=>{
  const result=await run(process.execPath,['-e',"process.stdin.resume();process.stdin.on('end',()=>console.log('done'))"],{timeout:2000});
  assert.equal(result.trim(),'done');
});
test('timeout ends a stalled request',async()=>{
  await assert.rejects(run(process.execPath,['-e','setInterval(()=>{},1000)'],{timeout:100}),/응답/);
});
test('Google account rejection is actionable without internal logs',()=>{
  assert.equal(friendlyError('IneligibleTierError UNSUPPORTED_CLIENT'), 'Google에서 이 계정의 Gemini CLI 사용을 허용하지 않습니다. 현재 Codex를 선택해 검증할 수 있습니다.');
});

function fixture(){const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kills=[];child.kill=signal=>child.kills.push(signal);return child}

test('CLI UTF-8 output preserves Korean, Chinese and emoji split across byte chunks',async()=>{
 const child=fixture(),value=JSON.stringify({lines:[{text:'시작 · 德古拉詹姆尼 · 🍳'}]}),task=run('mock-cli',[],{spawnProcess:()=>child});
 for(const byte of Buffer.from(value))child.stdout.write(Buffer.from([byte]));child.emit('close',0);assert.equal(await task,value);assert.equal(child.kills.length,0);
});

test('CLI stderr diagnostics also preserve split multibyte characters',async()=>{
 const child=fixture(),task=run('mock-cli',[],{spawnProcess:()=>child});for(const byte of Buffer.from('로그인 오류: 연결 실패'))child.stderr.write(Buffer.from([byte]));child.emit('close',1);await assert.rejects(task,{message:'로그인 오류: 연결 실패'});
});

test('oversized CLI stdout or stderr rejects clearly, stops reading and kills the owned child',async()=>{
 for(const [stream,limit] of [['stdout',2_000_000],['stderr',1_000_000]]){
  const child=fixture(),task=run('mock-cli',[],{spawnProcess:()=>child});child[stream].write(Buffer.alloc(limit+1,65));await assert.rejects(task,{code:'CLI_OUTPUT_TOO_LARGE'});assert.deepEqual(child.kills,['SIGKILL']);assert.equal(child.stdout.destroyed,true);assert.equal(child.stderr.destroyed,true);child.emit('close',0);
 }
});

test('CLI cancellation rejects promptly and a late successful exit cannot overwrite it',async()=>{
 const child=fixture(),controller=new AbortController(),task=run('mock-cli',[],{signal:controller.signal,spawnProcess:()=>child});controller.abort();child.emit('close',0);await assert.rejects(task,{name:'AbortError'});assert.deepEqual(child.kills,['SIGKILL']);
 let spawned=false;await assert.rejects(run('mock-cli',[],{signal:controller.signal,spawnProcess:()=>{spawned=true}}),{name:'AbortError'});assert.equal(spawned,false);
});

test('CLI timeout reports its configured limit and force-stops an unresponsive owned process',async()=>{
 const child=fixture();await assert.rejects(run('mock-cli',[],{timeout:10,spawnProcess:()=>child}),error=>error.code==='CLI_TIMEOUT'&&/1초/.test(error.message));assert.deepEqual(child.kills,['SIGKILL']);
 await assert.rejects(run('mock-cli',[],{timeout:0,spawnProcess:()=>assert.fail('invalid timeout spawned a process')}),RangeError);
});

test('CLI stream failures are handled and spawn errors retain their diagnostic code',async()=>{
 const child=fixture(),task=run('mock-cli',[],{spawnProcess:()=>child});child.stdout.emit('error',Error('stream failed'));await assert.rejects(task,/stream failed/);assert.deepEqual(child.kills,['SIGKILL']);
 await assert.rejects(run('mock-cli',[],{spawnProcess:()=>{throw Object.assign(Error('not found'),{code:'ENOENT'})}}),{code:'ENOENT'});
});
