import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {featureClient} from '../src/feature-client.js';
import {validateWorkspace} from '../src/workspace-state.js';

function setup(){
 const file=new File([Buffer.from('fixture-image')],'screen.png',{type:'image/png',lastModified:1234});
 const item={id:'11111111-1111-4111-8111-111111111111',file,targets:[{id:'phrase',text:'Start',language:'en',mode:'exact',region:null}],payload:null,resultTargets:[],reviews:{},reviewNotes:{}};
 const context={structuredClone,encodeFile:async blob=>'data:'+blob.type+';base64,'+Buffer.from(await blob.arrayBuffer()).toString('base64'),imageRefUrl:ref=>'/api/images?hash='+ref.hash,uploads:0,imageReference:async()=>{context.uploads++;throw Error('Disk full')},fetch:async()=>{throw Error('Unexpected image request')}};
 vm.createContext(context);
 const start=featureClient.indexOf('async function storedItem(');
 vm.runInContext(featureClient.slice(start,featureClient.indexOf('async function workspaceData()',start)),context);
 return{context,item};
}

test('standalone backup exports an unsaved image when application storage cannot accept uploads',async()=>{
 const {context:c,item}=setup(),record=await c.storedItem(item,true);
 assert.equal(c.uploads,0);assert.equal(item.imageRef,undefined);assert.equal(record.image,undefined);
 assert.equal(record.data,'data:image/png;base64,Zml4dHVyZS1pbWFnZQ==');assert.equal(record.name,item.file.name);assert.equal(record.lastModified,1234);
 assert.deepEqual(record.targets,item.targets);assert.equal(validateWorkspace({format:'language-test-workspace',version:1,items:[record]}).items.length,1);
 await assert.rejects(c.storedItem(item),/Disk full/);assert.equal(c.uploads,1);assert.equal(item.imageRef,undefined);
 const reference={hash:'a'.repeat(64),type:'image/png',size:item.file.size};c.imageReference=async file=>{c.uploads++;assert.equal(file,item.file);return reference};
 const saved=await c.storedItem(item);assert.equal(c.uploads,2);assert.deepEqual(saved.image,reference);assert.equal(saved.data,undefined);assert.deepEqual(item.imageRef,reference);
});

test('backup embeds comparison baselines and history without changing their saved references',async()=>{
 const {context:c,item}=setup(),reference={hash:'b'.repeat(64),type:'image/png',size:3};
 item.baseline={name:'baseline.png',image:reference};item.baselineHistory=[{id:'22222222-2222-4222-8222-222222222222',name:'old.png',at:'2026-10-15',image:reference}];
 const before=structuredClone({baseline:item.baseline,baselineHistory:item.baselineHistory});let reads=0;c.fetch=async url=>{reads++;assert.equal(url,'/api/images?hash='+reference.hash);return new Response(new Blob(['old'],{type:'image/png'}))};
 const record=await c.storedItem(item,true);assert.equal(c.uploads,0);assert.equal(reads,1);
 assert.equal(record.baseline.data,'data:image/png;base64,b2xk');assert.equal(record.baselineHistory[0].data,'data:image/png;base64,b2xk');
 assert.deepEqual({baseline:item.baseline,baselineHistory:item.baselineHistory},before);
 assert.equal(validateWorkspace({format:'language-test-workspace',version:1,items:[record]}).items.length,1);
});
