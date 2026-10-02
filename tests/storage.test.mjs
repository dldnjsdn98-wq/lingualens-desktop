import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,readdir,rm,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {projectStore} from '../src/project-store.js';
const data={format:'language-test-workspace',version:1,name:'sample',folder:'first',items:[{name:'a.png',data:'data:image/png;base64,AAAA',targets:[]}]};
test('binary storage deduplicates images, moves metadata only, detects damage and preserves shared files',async()=>{
  const root=await mkdtemp(join(tmpdir(),'image-store-')),store=projectStore(root);
  try{
    const a=await store.save(data),b=await store.save(data),files=await readdir(join(root,'images'));assert.equal(files.length,1);
    const manifest=JSON.parse(await readFile(join(root,a.id+'.json'),'utf8'));assert.equal(manifest.storageVersion,2);assert.equal(manifest.items[0].data,undefined);
    assert.deepEqual((await store.get(a.id)).items,data.items);
    const file=join(root,'images',files[0]),before=(await stat(file)).mtimeMs;
    await store.move(a.id,'second');assert.equal((await stat(file)).mtimeMs,before);assert.equal((await store.get(a.id)).folder,'second');
    await store.remove(a.id);assert.equal((await readdir(join(root,'images'))).length,1);
    await writeFile(file,Buffer.from([1,2,3]));await assert.rejects(store.get(b.id),/손상/);
    await store.save({...data,id:b.id});assert.deepEqual((await store.get(b.id)).items,data.items);
    await store.remove(b.id);assert.equal((await readdir(join(root,'images'))).length,0);
  }finally{await rm(root,{recursive:true,force:true})}
});
test('legacy projects open and migrate only after successful validation, retaining a recovery copy',async()=>{
  const root=await mkdtemp(join(tmpdir(),'legacy-store-')),store=projectStore(root),id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  try{
    const legacy={...data,id,updated:new Date().toISOString()},file=join(root,id+'.json');await writeFile(file,JSON.stringify(legacy));
    assert.deepEqual(await store.get(id),legacy);
    await assert.rejects(store.save({...legacy,items:[{targets:[null]}]}));assert.deepEqual(JSON.parse(await readFile(file,'utf8')),legacy);
    await store.save(legacy);assert.deepEqual(JSON.parse(await readFile(file+'.legacy-backup','utf8')),legacy);assert.deepEqual((await store.get(id)).items,legacy.items);
  }finally{await rm(root,{recursive:true,force:true})}
});
