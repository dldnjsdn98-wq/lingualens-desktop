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
    await assert.rejects(server.extract(cli,{...options,prompt:'WAIT',signal:AbortSignal.timeout(50)}),error=>['TimeoutError','AbortError'].includes(error.name));
    assert.equal(JSON.parse(await server.extract(cli,options)).lines[0].text,'1');
  }finally{server.close()}
});
