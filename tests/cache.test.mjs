import test from 'node:test';
import assert from 'node:assert/strict';
import {cachedExtractor} from '../src/ocr-cache.js';
import {parse} from '../src/cli.js';
import {mkdtemp,rm,readFile,readdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('disk OCR cache survives restart, separates local languages and recovers from corruption',async()=>{
  const root=await mkdtemp(join(tmpdir(),'ocr-cache-'));let calls=0;
  const extract=async()=>({lines:[{text:'value '+(++calls)}]}),bytes=Buffer.from('private-image');
  try{
    await cachedExtractor(extract,{root})('local',bytes,'image/png',undefined,{languages:['ko']});
    const restarted=cachedExtractor(extract,{root});
    assert.equal((await restarted('local',bytes,'image/png',undefined,{languages:['ko']})).cacheHit,true);assert.equal(calls,1);
    assert.equal((await restarted('local',bytes,'image/png',undefined,{languages:['ja']})).cacheHit,false);
    for(const file of await readdir(root)){const data=await readFile(join(root,file),'utf8');assert.ok(!data.includes('private-image'));await writeFile(join(root,file),'broken')}
    assert.equal((await cachedExtractor(extract,{root})('local',bytes,'image/png',undefined,{languages:['ko']})).cacheHit,false);
    await restarted.clear();assert.equal((await readdir(root)).length,0);
  }finally{await rm(root,{recursive:true,force:true})}
});
test('OCR cache isolates providers, supports fresh reads, and protects stored values',async()=>{
  let calls=0;const read=cachedExtractor(async()=>({lines:[{text:String(++calls)}]}));
  const bytes=Buffer.from('image');
  const first=await read('codex',bytes,'image/png');first.lines[0].text='changed';
  const second=await read('codex',bytes,'image/png');assert.equal(second.cacheHit,true);assert.equal(second.lines[0].text,'1');
  assert.equal((await read('gemini',bytes,'image/png')).cacheHit,false);
  assert.equal((await read('codex',bytes,'image/png',undefined,{fresh:true})).cacheHit,false);
  assert.equal((await read('codex',Buffer.from('other'),'image/png')).cacheHit,false);assert.equal(calls,4);
});
test('failed OCR is not cached',async()=>{
  let calls=0;const read=cachedExtractor(async()=>{calls++;throw Error('failed')});
  for(let i=0;i<2;i++)await assert.rejects(read('codex',Buffer.from('x'),'image/png'),/failed/);
  assert.equal(calls,2);
});
test('text-only results cannot replace region coordinates or standard analysis',async()=>{
  const options=[];const read=cachedExtractor(async(provider,bytes,type,signal,settings)=>{options.push(settings);return {lines:[{text:'test'}]}});
  const bytes=Buffer.from('image');
  await read('codex',bytes,'image/png');
  assert.equal((await read('codex',bytes,'image/png',undefined,{wantBoxes:true})).cacheHit,false);
  assert.equal((await read('codex',bytes,'image/png',undefined,{mode:'standard'})).cacheHit,false);
  assert.deepEqual(options,[{mode:'fast',wantBoxes:false},{mode:'fast',wantBoxes:true},{mode:'standard',wantBoxes:false}]);
});
test('structured result derives exact text without duplicate generation',()=>{
  assert.equal(parse(JSON.stringify({structured_output:{lines:[{text:'한글  42'},{text:'Start!'}]}})).extractedText,'한글  42\nStart!');
  assert.throws(()=>parse('{"lines":[{}]}'),/JSON/);
});
