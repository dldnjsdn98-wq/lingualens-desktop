import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {reviewSignature,manualState,reportRows,excelAssignments,csvReport} from '../src/feature-tools.js';
import {folderWatch} from '../src/folder-watch.js';
import {projectStore} from '../src/project-store.js';
import {workspaceStore} from '../src/workspace-store.js';
import {makeServer} from '../src/server.js';
import {clientSource} from '../src/client-source.js';
import vm from 'node:vm';
import pixelmatch from '../vendor/pixelmatch.js';
const t={id:'phrase',text:'Start',label:'Menu',language:'en',mode:'exact',region:null};
const item=()=>({id:randomUUID(),name:'menu.png',imageRef:{hash:'a'.repeat(64)},targets:[{...t}],ignoreRegions:[],reviews:{},payload:{id:'run-1',result:{results:[{...t,found:true,matchedText:'Start',confidence:.95}]}}});
test('human reviews remain distinct from OCR and become stale after image, target, ignored area or OCR changes',()=>{
 const i=item();i.reviews.phrase={signature:reviewSignature(i),verdict:'issue',note:'Wrong font',at:new Date().toISOString()};assert.equal(manualState(i,'phrase').verdict,'issue');assert.equal(reportRows([i])[1][6],'통과');assert.equal(reportRows([i])[1][7],'문제 있음');
 for(const mutate of [i=>i.targets[0].text='Stop',i=>i.imageRef.hash='b'.repeat(64),i=>i.ignoreRegions.push({x:0,y:0,width:.1,height:.1}),i=>i.payload.id='run-2']){const copy=structuredClone(i);mutate(copy);assert.equal(manualState(copy,'phrase'),null)}
 assert.match(csvReport([['=FORMULA','"<script>']]),/\t=FORMULA/);
});
test('Excel joins by full path before filename, detects ambiguity and invalid languages or coordinates',()=>{
 const items=[{id:'a',name:'folder/menu.png',targets:[]},{id:'b',name:'other/menu.png',targets:[]}],options={keyColumn:0,textColumn:1,languageColumn:2,regionColumn:3};
 const p=excelAssignments(items,[['folder/menu.png','開始','ja','0,0,.3,.4'],['menu','Start','en',''],['missing','X','en',''],['other/menu.png','X','bad',''],['folder/menu.png','X','en','0,0,2,1']],options);
 assert.equal(p.plan.length,1);assert.equal(p.plan[0].itemId,'a');assert.deepEqual(p.ambiguous,[3]);assert.deepEqual(p.unmatched,[4]);assert.deepEqual(p.errors,[5,6]);
});
test('folder polling skips initial files, waits for stable writes, retries changed files and acknowledges only imported files',async()=>{
 const root=await mkdtemp(join(tmpdir(),'language-watch-'));let time=0;const watch=folderWatch({now:()=>time});
 try{await writeFile(join(root,'old.png'),Buffer.from([1]));const session=await watch.start(root);assert.equal((await watch.poll(session.id)).files.length,0);await writeFile(join(root,'new.png'),Buffer.from([1,2]));assert.equal((await watch.poll(session.id)).files.length,0);time=2001;const first=await watch.poll(session.id);assert.equal(first.files.length,1);const key=first.files[0].key;await writeFile(join(root,'new.png'),Buffer.from([1,2,3]));await assert.rejects(watch.read(session.id,key),/끝난/);await watch.poll(session.id);time=4002;const second=await watch.poll(session.id);const latest=second.files.find(f=>f.size===3);assert.ok(latest);watch.ack(session.id,[latest.key]);assert.equal((await watch.read(session.id,key).catch(()=>null)),null);watch.stop();await assert.rejects(watch.poll(session.id));}finally{await rm(root,{recursive:true,force:true})}
});
test('200-image manifests save binary references and retain queue, review and baseline metadata through draft recovery',async()=>{
 const root=await mkdtemp(join(tmpdir(),'language-manifest-')),store=projectStore(root),drafts=workspaceStore(root);
 try{const image=await store.putImage(Buffer.from([1,2,3]),'image/png'),ids=Array.from({length:200},()=>randomUUID()),data={format:'language-test-workspace',version:1,name:'Large',items:ids.map(id=>({id,name:id+'.png',image,targets:[t],ignoreRegions:[],reviews:{},baseline:{name:'baseline.png',image}})),batch:{ids,status:'paused',done:{[ids[0]]:'signature'}}};const saved=await drafts.saveDraft(data),loaded=await drafts.draft(saved.id,{references:true});assert.equal(loaded.items.length,200);assert.deepEqual(loaded.batch,data.batch);assert.equal(loaded.items[0].data,undefined);assert.equal((await readdir(join(root,'images'))).length,1);const project=await store.save(loaded);await drafts.removeDraft(saved.id);assert.equal((await store.get(project.id,{references:true})).items.length,200);assert.ok((await readFile(join(root,project.id+'.json'))).length<400000);await assert.rejects(store.save({...data,items:[...data.items,data.items[0]]}));}finally{await rm(root,{recursive:true,force:true})}
});
test('ignored text cannot pass matching through fallback OCR text; image routes reject cross-origin writes and traversal',async()=>{
 const root=await mkdtemp(join(tmpdir(),'language-api-'));const server=makeServer({projectRoot:root,extractor:async()=>({lines:[{text:'FPS 29',confidence:.99,boundingBox:{x:.8,y:0,width:.2,height:.1}},{text:'Start',confidence:.99,boundingBox:{x:.1,y:.4,width:.2,height:.1}}],extractedText:'FPS 29\nStart'}),authentication:async()=>true,availability:async()=>true});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 try{const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aSAAAAABJRU5ErkJggg==','base64'),form=new FormData();form.set('image',new Blob([png],{type:'image/png'}),'a.png');form.set('entries',JSON.stringify([{...t,text:'FPS 29'},{...t,id:'other'}]));form.set('ignoreRegions',JSON.stringify([{x:.8,y:0,width:.2,height:.1}]));const result=await(await fetch(origin+'/api/v1/jobs',{method:'POST',headers:{origin,'x-lingualens-provider':'codex'},body:form})).json();assert.equal(result.result.results[0].found,false);assert.equal(result.result.results[1].found,true);assert.equal(result.result.extractedText,'Start');const response=await fetch(origin+'/api/images',{method:'POST',headers:{origin},body:png});const ref=await response.json();assert.ok(ref.hash);assert.equal((await fetch(origin+'/api/images',{method:'POST',headers:{origin:'https://example.com'},body:png})).status,403);assert.equal((await fetch(origin+'/api/images?hash=../bad&type=image/png&size=3')).status,400);const downloaded=Buffer.from(await(await fetch(origin+'/api/images?hash='+ref.hash+'&type=image/png&size='+ref.size)).arrayBuffer());assert.deepEqual(downloaded,png);}finally{await new Promise(r=>server.close(r));await rm(root,{recursive:true,force:true})}
});
test('comparison core detects changed pixels and generated browser bundle is valid JavaScript',()=>{
 const a=new Uint8ClampedArray(16).fill(255),b=new Uint8ClampedArray(a);b[0]=0;b[1]=0;b[2]=0;assert.equal(pixelmatch(a,b,new Uint8ClampedArray(16),2,2,{includeAA:true}),1);assert.doesNotThrow(()=>new vm.Script(clientSource));
});
