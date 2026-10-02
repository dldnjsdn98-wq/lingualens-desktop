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
