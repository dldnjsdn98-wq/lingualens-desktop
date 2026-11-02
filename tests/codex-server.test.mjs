import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {codexServer} from '../src/codex-server.js';
test('Codex connection reuses its process, delivers final output and restarts after cancellation',async()=>{
  const server=codexServer({timeout:2000}),cli={file:process.execPath,prefix:[fileURLToPath(new URL('./fixtures/mock-codex-server.cjs',import.meta.url))]};
  const options={cwd:process.cwd(),image:'image.png',prompt:'OCR',schema:{type:'object'}};
  try{
    assert.equal(JSON.parse(await server.extract(cli,options)).lines[0].text,'1');
    const progress=[];assert.equal(JSON.parse(await server.extract(cli,{...options,onProgress:stage=>progress.push(stage)})).lines[0].text,'2');assert.ok(progress.some(x=>x.includes('응답')));
    const controller=new AbortController();let turnStarted=false;
    await assert.rejects(server.extract(cli,{...options,prompt:'WAIT',signal:controller.signal,onProgress:stage=>{
      if(stage.includes('응답')){turnStarted=true;controller.abort()}
    }}),{name:'AbortError'});
    assert.equal(turnStarted,true,'cancel only after the mock confirms the submitted turn has started');
    assert.equal(JSON.parse(await server.extract(cli,options)).lines[0].text,'1');
  }finally{server.close()}
});
