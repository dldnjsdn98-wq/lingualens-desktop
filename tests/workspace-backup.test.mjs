import test from 'node:test';
import assert from 'node:assert/strict';
import {packWorkspaceBackup,unpackWorkspaceBackup,workspaceBackupBlob,readWorkspaceBackup} from '../src/workspace-backup.js';

const image='data:image/png;base64,'+Buffer.from('synthetic image bytes').toString('base64');
const ref={hash:'a'.repeat(64),type:'image/png',size:21};
function workspace(){
 const target={id:'phrase',text:'시작 Start',language:'ko',mode:'exact',region:null};
 const baseline={id:'11111111-1111-4111-8111-111111111111',name:'기준.png',at:'2026-10-26',image:ref,data:image,x:12,y:-8,threshold:0};
 return {format:'language-test-workspace',version:1,name:'한국어 작업',folder:'검수',watchPath:'',batch:null,items:[
  {id:'22222222-2222-4222-8222-222222222222',name:'현재.png',data:image,targets:[target],baseline,baselineHistory:[baseline],reviewNotes:{phrase:{note:'간격 확인',at:'2026-10-26'}}},
  {id:'33333333-3333-4333-8333-333333333333',name:'복사.png',data:image,targets:[target]}
 ]};
}

test('portable backup stores shared current, baseline and history image bytes once',async()=>{
 const source=workspace(),before=structuredClone(source),packed=packWorkspaceBackup(source);
 assert.equal(packed.version,2);assert.equal(Object.keys(packed.assets).length,1);
 assert.equal(packed.items[0].asset,packed.items[1].asset);assert.equal(packed.items[0].asset,packed.items[0].baseline.asset);
 assert.equal(packed.items[0].data,undefined);assert.equal(packed.items[0].baseline.data,undefined);assert.deepEqual(source,before);
 const blob=workspaceBackupBlob(packed),text=await blob.text();assert.deepEqual(JSON.parse(text),packed);
 const restored=await readWorkspaceBackup(blob);
 assert.equal(restored.version,1);assert.equal(restored.items[0].data,image);assert.equal(restored.items[1].data,image);
 assert.equal(restored.items[0].baseline.data,image);assert.equal(restored.items[0].baselineHistory[0].data,image);
 assert.equal(restored.items[0].baseline.threshold,0);assert.equal(restored.items[0].baseline.x,12);
 assert.deepEqual(restored.items[0].reviewNotes,source.items[0].reviewNotes);
});

test('chunked reading preserves multibyte text and never requests one whole backup string',async()=>{
 const blob=workspaceBackupBlob(packWorkspaceBackup(workspace())),bytes=new Uint8Array(await blob.arrayBuffer());let offset=0,cancelled=false;
 const file={size:blob.size,slice:(...args)=>blob.slice(...args),text:()=>{throw Error('whole-file text must not be used')},stream:()=>new ReadableStream({pull(controller){if(offset>=bytes.length){controller.close();return}const end=Math.min(bytes.length,offset+7);controller.enqueue(bytes.slice(offset,end));offset=end},cancel(){cancelled=true}})};
 const restored=await readWorkspaceBackup(file);assert.equal(restored.name,'한국어 작업');assert.equal(restored.items[0].targets[0].text,'시작 Start');
 assert.equal(restored.items[0].data,image);assert.equal(cancelled,false);
});

test('old version 1 and ordinary JSON version 2 backups remain readable',async()=>{
 const old=workspace(),modern=packWorkspaceBackup(old);
 assert.equal((await readWorkspaceBackup(new Blob([JSON.stringify(old)]))).items[0].data,image);
 assert.equal((await readWorkspaceBackup(new Blob([JSON.stringify(modern,null,2)]))).items[0].baseline.data,image);
});

test('missing, unused, oversized and invalid asset entries are rejected before import',()=>{
 const changes=[
  x=>delete x.assets[x.items[0].asset],x=>x.items[0].asset='image-999',
  x=>x.assets['image-999']=image,x=>x.assets['image-1']='data:image/png;base64,AAA',
  x=>x.assets['image-1']='data:text/html;base64,AAAA',x=>x.assets['image-1']='data:image/png;base64,====',
  x=>x.items[0].baselineHistory={},x=>x.version=9
 ];
 for(const change of changes){const packed=packWorkspaceBackup(workspace());change(packed);assert.throws(()=>unpackWorkspaceBackup(packed))}
});

test('truncated, duplicated or appended asset lines cannot become a partial successful import',async()=>{
 const text=await workspaceBackupBlob(packWorkspaceBackup(workspace())).text(),lines=text.trimEnd().split('\n');
 for(const bad of [lines.slice(0,-1).join('\n'),[lines[0],lines[1],','+lines[1],lines[2]].join('\n'),text+'{}\n'])
  await assert.rejects(readWorkspaceBackup(new Blob([bad])));
});

test('export refuses over-limit backups and import checks size before reading',async()=>{
 const packed=packWorkspaceBackup(workspace());assert.throws(()=>workspaceBackupBlob(packed,{maxBytes:10}),/750MB/);
 await assert.rejects(readWorkspaceBackup({size:751*1024*1024,slice(){throw Error('must not read')}}),/750MB/);
});

test('large repeated images materially reduce backup size without losing bytes',async()=>{
 const source=workspace(),large='data:image/png;base64,'+Buffer.alloc(1024*1024,42).toString('base64');
 for(const item of source.items){item.data=large;if(item.baseline)item.baseline.data=large;for(const b of item.baselineHistory||[])b.data=large}
 const packed=packWorkspaceBackup(source),blob=workspaceBackupBlob(packed);
 assert.ok(blob.size<new Blob([JSON.stringify(source)]).size*.3);
 assert.equal((await readWorkspaceBackup(blob)).items[0].baseline.data,large);
});
