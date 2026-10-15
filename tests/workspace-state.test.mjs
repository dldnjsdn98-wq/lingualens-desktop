import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateWorkspace,targetSignature} from '../src/workspace-state.js';
const target={id:'a',label:'화면',text:'Start',language:'en',mode:'exact',region:null};
const workspace=()=>({format:'language-test-workspace',version:1,items:[{name:'a.png',data:'data:image/png;base64,AAAA',targets:[{...target}]}]});
test('workspace rejects malformed targets, regions and results before replacing a saved project',()=>{
 assert.equal(validateWorkspace(workspace()).items.length,1);
 for(const change of [w=>w.items[0].targets=[null],w=>w.items[0].targets[0].region={x:0,y:0,width:2,height:1},w=>w.items[0].payload={result:{results:[null],lines:[]}},w=>w.items[0].data='data:image/png;base64,AAA']){
  const w=workspace();change(w);assert.throws(()=>validateWorkspace(w));
 }
});
test('result signature ignores empty placeholder rows and notices text and region changes',()=>{
 assert.equal(targetSignature([target]),targetSignature([target,{...target,id:'empty',text:''}]));
 assert.notEqual(targetSignature([target]),targetSignature([{...target,text:'Stop'}]));
 assert.notEqual(targetSignature([target]),targetSignature([{...target,region:{x:0,y:0,width:.5,height:.5}}]));
});

test('duplicate image IDs are rejected while legacy images without IDs and shared images remain valid',()=>{
 const w=workspace(),id='11111111-1111-4111-8111-111111111111';w.items[0].id=id;w.items.push(structuredClone(w.items[0]));assert.throws(()=>validateWorkspace(w),/이미지 ID.*중복/);
 w.items[1].id='22222222-2222-4222-8222-222222222222';assert.equal(validateWorkspace(w).items.length,2);
 delete w.items[0].id;delete w.items[1].id;assert.equal(validateWorkspace(w).items.length,2);
});

test('target and result target IDs must be unique within each image but can be shared across images',()=>{
 for(const field of ['targets','resultTargets']){const w=workspace();w.items[0][field]=[{...target},{...target}];assert.throws(()=>validateWorkspace(w),/문구.*형식/)}
 const w=workspace();w.items.push(structuredClone(w.items[0]));assert.equal(validateWorkspace(w).items.length,2);
 w.items[0].targets[0].id='';assert.throws(()=>validateWorkspace(w));
});

test('duplicate OCR result and baseline history IDs cannot mix review or baseline selection',()=>{
 const w=workspace(),row={...target,found:true,reason:'matched'};w.items[0].payload={result:{lines:[],results:[row,{...row}]}};assert.throws(()=>validateWorkspace(w),/검증 결과/);
 w.items[0].payload=null;const baseline={id:'11111111-1111-4111-8111-111111111111',name:'baseline.png',at:'2026-10-14',image:{hash:'a'.repeat(64),size:3,type:'image/png'}};w.items[0].baselineHistory=[baseline,{...baseline}];assert.throws(()=>validateWorkspace(w),/이력.*중복/);
});

test('batch rejects duplicate IDs and unrelated completion records but allows previously removed images',()=>{
 const w=workspace();w.batch={ids:['a','a'],done:{},status:'paused'};assert.throws(()=>validateWorkspace(w),/실행 목록/);
 w.batch={ids:['a'],done:{b:'signature'},status:'paused'};assert.throws(()=>validateWorkspace(w),/완료 기록/);
 w.batch={ids:['removed-image'],done:{'removed-image':'signature'},status:'paused'};assert.equal(validateWorkspace(w),w);
});
