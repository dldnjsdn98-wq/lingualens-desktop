import test from 'node:test';
import assert from 'node:assert/strict';
import {run,friendlyError} from '../src/cli.js';
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
