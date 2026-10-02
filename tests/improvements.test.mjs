import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewMatch} from '../src/review-policy.js';
import {validate} from '../src/matcher.js';
import {regionCopy,workspaceMatches} from '../src/workspace-tools.js';
import {workspaceStore} from '../src/workspace-store.js';
import {projectStore} from '../src/project-store.js';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';import vm from 'node:vm';
const box={x:.1,y:.1,width:.3,height:.1},target={id:'a',text:'Start 42',language:'en',mode:'exact',region:null};
test('low scores and contradictory readings require review; mismatches never pass',()=>{
  for(const confidence of [.51,.79]){const lines=[{text:target.text,confidence,boundingBox:box}];const result=reviewMatch(validate(target,lines,''),lines);assert.equal(result.found,false);assert.equal(result.status,'review');assert.equal(result.textMatched,true);assert.equal(reviewMatch(result,lines).status,'review')}
  const lines=[{text:target.text,confidence:.99,boundingBox:box},{text:'Start 43',confidence:.99,boundingBox:box}];assert.equal(reviewMatch(validate(target,lines,''),lines).reasonCode,'conflicting_readings');
  assert.equal(reviewMatch(validate({...target,text:'Start 44'},lines,''),lines).status,'failed');
  const accurate=[lines[0]];assert.equal(reviewMatch(validate(target,accurate,''),accurate).status,'passed');
});
test('aspect mismatch is detected and text-only copying preserves the source',()=>{
  const source={width:2340,height:1080},targets=[{...target,region:box}],dest={width:1080,height:2340};
  assert.equal(regionCopy(source,dest,targets).mismatch,true);assert.equal(regionCopy(source,dest,targets,{omitRegions:true}).targets[0].region,null);assert.deepEqual(targets[0].region,box);
  assert.equal(regionCopy(source,{width:1170,height:540},targets).mismatch,false);
  assert.equal(workspaceMatches({name:'LINE CHEF',folder:'완료',count:2,passed:1},{search:'line',status:'pending'}),true);
});
test('drafts, presets and trash survive a new store instance and keep image bytes available',async()=>{
  const root=await mkdtemp(join(tmpdir(),'workspace-new-'));const workspace={format:'language-test-workspace',version:1,name:'Draft',folder:'A',items:[{name:'image.png',data:'data:image/png;base64,AAAA',targets:[target],payload:null,resultTargets:[]}]};
  try{
    const state=workspaceStore(root),saved=await state.saveDraft({...workspace,sourceProjectId:null});const restarted=workspaceStore(root);assert.equal((await restarted.draft(saved.id)).items[0].data,workspace.items[0].data);
    const preset=await state.savePreset({name:'preset',targets:[target],image:{width:2340,height:1080}});assert.equal((await restarted.presets())[0].id,preset.id);
    await assert.rejects(state.savePreset({targets:[{...target,region:{...box,width:2}}],image:{width:1,height:1}}),/형식/);
    const store=projectStore(root),project=await store.save(workspace);await store.discard(project.id);assert.equal((await store.list()).length,0);assert.equal((await projectStore(root).trash())[0].id,project.id);await store.restore(project.id);assert.equal((await store.get(project.id)).items[0].data,workspace.items[0].data);
    await state.removeDraft(saved.id);assert.equal((await restarted.drafts()).length,0);
  }finally{await rm(root,{recursive:true,force:true})}
});
test('updated SheetJS reads and writes multilingual workbooks with exact spacing',async()=>{
  const context=vm.createContext({});vm.runInContext(await readFile(new URL('../vendor/xlsx.full.min.js',import.meta.url),'utf8'),context);const x=context.XLSX;assert.equal(x.version,'0.20.3');
  const book=x.utils.book_new();x.utils.book_append_sheet(book,x.utils.aoa_to_sheet([['文구','언어'],['게임  시작 42','ko'],['夥伴組合包','zh-TW']]),'문구');
  const loaded=x.read(x.write(book,{type:'array',bookType:'xlsx'}),{type:'array'}),rows=x.utils.sheet_to_json(loaded.Sheets['문구'],{header:1});assert.equal(rows[1][0],'게임  시작 42');assert.equal(rows[2][0],'夥伴組合包');
});
