import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {makeServer} from '../src/server.js';
test('saved projects survive a different server port and reject cross-origin writes and traversal',async()=>{
 const root=await mkdtemp(join(tmpdir(),'language-test-'));
 let server;
 const start=async()=>{server=makeServer({projectRoot:root});await new Promise(r=>server.listen(0,'127.0.0.1',r));return 'http://127.0.0.1:'+server.address().port};
 try{let base=await start();const body={format:'language-test-workspace',version:1,name:'화면 A',folder:'출시 전',items:[{name:'a.png',data:'data:image/png;base64,AAAA',targets:[]}]};
 assert.equal((await fetch(base+'/api/projects',{method:'POST',body:JSON.stringify(body),headers:{origin:'https://example.com'}})).status,403);
 const saved=await(await fetch(base+'/api/projects',{method:'POST',body:JSON.stringify(body),headers:{origin:base}})).json();assert.ok(saved.id);
 const invalid={...body,id:saved.id,items:[{...body.items[0],targets:[null]}]};assert.equal((await fetch(base+'/api/projects',{method:'POST',body:JSON.stringify(invalid),headers:{origin:base}})).status,400);assert.equal((await(await fetch(base+'/api/projects?id='+saved.id)).json()).name,body.name);
 await new Promise(r=>server.close(r));base=await start();const loaded=await(await fetch(base+'/api/projects?id='+saved.id)).json();assert.equal(loaded.folder,'출시 전');assert.deepEqual(loaded.items,body.items);
 assert.equal((await fetch(base+'/api/projects?id=../../bad')).status,400);
 assert.equal((await(await fetch(base+'/api/projects')).json()).length,1);await writeFile(join(root,'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.json'),JSON.stringify({id:'bad',items:[]}));assert.equal((await(await fetch(base+'/api/projects')).json()).length,1);const moved={...loaded,folder:'완료'};await fetch(base+'/api/projects',{method:'POST',body:JSON.stringify(moved),headers:{origin:base}});assert.equal((await(await fetch(base+'/api/projects')).json())[0].folder,'완료');
 await fetch(base+'/api/projects/delete',{method:'POST',body:JSON.stringify({id:saved.id}),headers:{origin:base}});assert.equal((await(await fetch(base+'/api/projects')).json()).length,0);
 }finally{if(server)await new Promise(r=>server.close(r));await rm(root,{recursive:true,force:true})}
});
