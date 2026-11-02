import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
import {featureClient} from '../src/feature-client.js';
import {reviewSignature,manualState,reportRows} from '../src/feature-tools.js';

function setup(){
 const target={id:'phrase',text:'Start',language:'en',mode:'exact',region:null};
 const item={id:'image',file:new File(['fixture'],'screen.png',{type:'image/png'}),imageRef:{hash:'a'.repeat(64),size:7,type:'image/png'},targets:[target],resultTargets:[structuredClone(target)],payload:{id:'reading',result:{results:[{...target,found:true,matchedText:'Start'}]}},problem:'',reviews:{},reviewNotes:{phrase:{note:'Keep the spacing',at:'2026-10-15'}}};
 item.reviews.phrase={verdict:'issue',note:'Wrong font',at:'2026-10-15',signature:reviewSignature(item,'phrase')};
 const untouched={...structuredClone(item),id:'untouched'};
 const elements=new Map(),context={W:{items:[item,untouched],active:'image',draftId:'draft'},F:{excelPlan:{plan:[{itemId:'image',target:{text:'Play',language:'en',mode:'exact',region:null}}]}},S:{},structuredClone,crypto:{randomUUID},featureBusy:()=>false,snapshot:()=>{},dirty:()=>{},queue:()=>{},$:id=>{if(!elements.has(id))elements.set(id,{disabled:false,textContent:'',close(){}});return elements.get(id)}};
 context.activate=id=>{context.W.active=id};
 vm.createContext(context);
 const storedStart=featureClient.indexOf('async function storedItem(');
 vm.runInContext(featureClient.slice(storedStart,featureClient.indexOf('async function workspaceData()',storedStart)),context);
 for(const name of ['applyMap','undoMap']){const start=featureClient.indexOf('function '+name+'(');vm.runInContext(featureClient.slice(start,featureClient.indexOf('\n',start)),context)}
 return{context,item,untouched};
}

test('Excel undo restores manual verdicts and notes after autosave serializes replacement targets',async()=>{
 const {context:c,item,untouched}=setup(),original=structuredClone(item),untouchedBefore=structuredClone(untouched),reportBefore=reportRows([item]);
 c.applyMap();
 assert.equal(item.targets[0].text,'Play');assert.equal(Object.keys(item.reviews).length,0);assert.equal(Object.keys(item.reviewNotes).length,0);
 const saved=await c.storedItem(item);
 assert.equal(Object.keys(saved.reviews).length,0);assert.equal(Object.keys(saved.reviewNotes).length,0);
 item.reviewNotes[item.targets[0].id]={note:'Temporary replacement note',at:'2026-10-15'};
 c.undoMap();
 for(const key of ['targets','payload','resultTargets','reviews','reviewNotes','problem'])assert.deepEqual(item[key],original[key],key);
 assert.equal(manualState(item,'phrase').verdict,'issue');assert.deepEqual(reportRows([item]),reportBefore);
 assert.deepEqual(untouched,untouchedBefore);assert.equal(c.F.mapUndo,null);assert.equal(c.$('undoMap').disabled,true);
 const restored=await c.storedItem(item);assert.deepEqual(restored.reviews,original.reviews);assert.deepEqual(restored.reviewNotes,original.reviewNotes);
});

test('Excel undo does not restore reviews into a different workspace',()=>{
 const {context:c,item}=setup();c.applyMap();c.W.draftId='another-draft';c.undoMap();
 assert.equal(item.targets[0].text,'Play');assert.equal(Object.keys(item.reviews).length,0);assert.ok(c.F.mapUndo);
});
