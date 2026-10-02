import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
import {mkdtemp,rm,writeFile,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {featureClient} from '../src/feature-client.js';
import {workspaceClient} from '../src/workspace-client.js';
import {imageSummary} from '../src/workbench-tools.js';
import {manualState,reviewSignature,reportRows} from '../src/feature-tools.js';
import {storageMaintenance} from '../src/storage-maintenance.js';
import {projectStore} from '../src/project-store.js';
import {workspaceStore} from '../src/workspace-store.js';
import {migrateReviews} from '../src/enhancement-tools.js';
import {reviewOverview} from '../src/ux-tools.js';
const target={id:'t',text:'Start',language:'en',mode:'exact',region:null};
const payload={id:'old-run',result:{found:true,totalCount:1,foundCount:1,results:[{...target,found:true}],lines:[]}};
function context(item){
 const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:''});return elements.get(id)};
 get('cloudProject').value='codex';get('analysisMode').value='fast';get('autoReviewProvider').value='off';
 const c={W:{items:[item],active:item.id,draftId:'draft-a',batch:{ids:['prior-image'],done:{'prior-image':'prior-signature'},status:'paused'},busy:false},S:{authenticated:true,last:item.payload,targets:item.targets},$:get,errors:[],document:{querySelectorAll:()=>item.targets},read:x=>x,featureBusy:()=>false,error:m=>c.errors.push(m),lockWorkspace:()=>()=>{},dirty:()=>{},queue:()=>{},progress:()=>{},refreshFeatures:()=>{},AbortController,URL,structuredClone};
 c.activate=()=>{c.S.last=item.payload;c.S.targets=item.targets};c.activeItem=()=>item;
 c.saveDraft=async()=>{c.snapshot();return {ok:true,saved:true}};
 c.invalidateFeatureImage=(i,m)=>{i.payload=null;i.resultTargets=[];i.problem=m;c.S.last=null};
 c.analyzeImage=async()=>{throw Error('Network timeout')};
 Object.assign(c,{migrateReviews,reviewOverview});vm.createContext(c);
 vm.runInContext(workspaceClient.slice(workspaceClient.indexOf('function snapshot()'),workspaceClient.indexOf('function dirty()')),c);
 vm.runInContext(featureClient.slice(featureClient.indexOf('function batchSignature(')),c);
 return c;
}
test('failed batch reruns preserve an error and cannot export an old pass',async()=>{
 const item={id:randomUUID(),file:{name:'a.png',size:3},targets:[target],payload:structuredClone(payload),resultTargets:[target],ignoreRegions:[],problem:''},c=context(item);
 await c.runBatch('all');assert.equal(item.problem,'Network timeout');assert.equal(item.payload,null);assert.equal(imageSummary(item).state,'pending');assert.equal(c.W.batch.status,'paused');
 assert.equal(reportRows([item])[1][6],'미검증');assert.equal(reportRows([item])[1].at(-1),'Network timeout');
});
test('invalid batch starts leave the prior resumable job unchanged',async()=>{
 const c=context({id:randomUUID(),targets:[],payload:null,selected:true});const prior=JSON.stringify(c.W.batch);await c.runBatch('selected');assert.equal(JSON.stringify(c.W.batch),prior);assert.match(c.errors[0],/문구/);
});
test('explicit ready-only batch skips missing targets before creating its checkpoint',async()=>{
 const ready={id:randomUUID(),file:{name:'ready.png',size:3},targets:[target],payload:null,resultTargets:[],problem:''},empty={id:randomUUID(),targets:[],payload:null},c=context(ready);c.W.items.push(empty);await c.runBatch('all',{skipMissing:true});assert.deepEqual(Array.from(c.W.batch.ids),[ready.id]);assert.equal(empty.problem,undefined);assert.equal(empty.payload,null);assert.equal(ready.problem,'Network timeout');
});
test('current manual issues enter attention navigation without changing OCR verdicts',()=>{
 const item={targets:[target],payload:structuredClone(payload),reviews:{}};item.reviews.t={signature:reviewSignature(item),verdict:'issue',note:'Wrong screen',at:new Date().toISOString()};
 assert.equal(manualState(item,'t').verdict,'issue');assert.equal(imageSummary(item).state,'issue');assert.equal(item.payload.result.found,true);
 item.payload.id='new-run';assert.equal(imageSummary(item).state,'review');assert.match(imageSummary(item).label,/재검수/);
});
test('pending batch reuses prior results and calls the partial reviewer instead of full OCR',async()=>{
 const item={id:randomUUID(),file:new File(['image'],'a.png',{type:'image/png'}),targets:[target],payload:structuredClone(payload),resultTargets:[target],reviews:{},ignoreRegions:[],problem:''},c=context(item);let full=0,partial=0;
 item.payload.result.results[0].found=false;c.needsAttention=()=>true;c.show=async()=>{};c.analyzeImage=async()=>{full++;return structuredClone(payload)};c.reviewPending=async(file,prior,targets,signal,ids)=>{partial++;assert.equal(prior.id,'old-run');assert.deepEqual(Array.from(ids),['t']);return structuredClone(payload)};
 await c.runBatch('pending');assert.equal(partial,1);assert.equal(full,0);assert.deepEqual(c.errors,[]);assert.equal(c.W.batch.status,'complete');
});
test('watcher stops on project changes and acknowledges only after a successful checkpoint',async()=>{
 const item={id:randomUUID(),file:{name:'a.png',size:3},targets:[target],payload:null},c=context(item),calls=[];
 c.F={watch:{id:'watch-a',draftId:'draft-a'},watchPolling:false};c.clearInterval=()=>{};c.File=File;c.fetch=async()=>({ok:true,blob:async()=>new Blob(['image'],{type:'image/png'})});
 c.projectRequest=async(url)=>{calls.push(url);return url.endsWith('/poll')?{files:[{key:'key',name:'b.png',type:'image/png',size:5}],pending:1}:{ok:true}};
 c.addImages=async files=>{c.W.items.push({id:'new',file:files[0],targets:[]});return true};c.saveDraft=async()=>({ok:false,saved:false});
 vm.runInContext(featureClient.slice(featureClient.indexOf('async function stopWatch('),featureClient.indexOf('async function resumeStoredBatch(')),c);
 await c.pollWatch();assert.ok(calls.includes('/api/watch/stop'));assert.ok(!calls.includes('/api/watch/ack'));assert.equal(c.F.watch,null);
 c.F.watch={id:'watch-b',draftId:'other-draft'};calls.length=0;await c.pollWatch();assert.deepEqual(calls,['/api/watch/stop']);
 c.F.watch={id:'watch-c',draftId:'draft-a'};calls.length=0;c.saveDraft=async()=>{calls.push('saved');return {ok:true,saved:true}};await c.pollWatch();assert.ok(calls.indexOf('saved')<calls.indexOf('/api/watch/ack'));
});
test('storage cleanup retains projects, drafts, trash and fresh uploads; corrupt metadata blocks removal',async()=>{
 const root=await mkdtemp(join(tmpdir(),'language-clean-'));const store=projectStore(root),drafts=workspaceStore(root);
 try{
  const image=await store.putImage(Buffer.from([1,2,3]),'image/png'),unused=await store.putImage(Buffer.from([4,5,6]),'image/png');
  const data={format:'language-test-workspace',version:1,name:'Keep',items:[{id:randomUUID(),name:'a.png',image,targets:[target]}]};
  const saved=await store.save(data),draft=await drafts.saveDraft({...data,items:[{...data.items[0],image:unused}]});
  await store.discard(saved.id);const future=Date.now()+2*86400000;
  assert.equal((await storageMaintenance(root,{remove:true,now:future})).removedFiles,0);
  await drafts.removeDraft(draft.id);assert.equal((await storageMaintenance(root,{remove:true})).removedFiles,0);
  assert.equal((await storageMaintenance(root,{remove:true,now:future})).removedFiles,1);assert.equal((await readdir(join(root,'images'))).length,1);
  await writeFile(join(root,randomUUID()+'.json'),'{broken');await assert.rejects(storageMaintenance(root,{remove:true,now:future}),/중단/);
 }finally{await rm(root,{recursive:true,force:true})}
});
